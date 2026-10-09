"""
The catalogue as code: what the plugins declare becomes rows, on deploy (`flask plugins sync`)
and at start in development.

A plugin's row follows its declaration. One it stops declaring is deprecated, never deleted:
apps keep the scopes they hold. A console row with a declared key is adopted, and audited. Two
plugins declaring the same key is an error rather than a silent winner.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy import select

from idp.db import db, utcnow
from idp.models import ApiProduct, Scope
from idp.plugins import Plugin, Product, ScopeSpec
from idp.services import audit

SENSITIVITIES = frozenset({"public", "sensitive", "restricted"})


@dataclass
class SyncReport:
    added: list[str] = field(default_factory=list)
    updated: list[str] = field(default_factory=list)
    adopted: list[str] = field(default_factory=list)
    deprecated: list[str] = field(default_factory=list)
    restored: list[str] = field(default_factory=list)

    def __bool__(self) -> bool:
        return any((self.added, self.updated, self.adopted, self.deprecated, self.restored))


class CatalogueError(ValueError):
    pass


def sync(plugins: list[Plugin]) -> SyncReport:
    """Bring the rows in line with what `plugins` declare. Commits."""
    report = SyncReport()
    products: dict[str, tuple[str, Product]] = {}
    scopes: dict[str, tuple[str, ScopeSpec]] = {}
    for plugin in plugins:
        catalogue = plugin.catalogue()
        for product in catalogue.products:
            if product.slug in products:
                raise CatalogueError(
                    f"product {product.slug!r} is declared by {products[product.slug][0]} and {plugin.id}"
                )
            products[product.slug] = (plugin.id, product)
        resources = {product.slug: product.resource for product in catalogue.products}
        for scope in catalogue.scopes:
            if scope.name in scopes:
                raise CatalogueError(
                    f"scope {scope.name!r} is declared by {scopes[scope.name][0]} and {plugin.id}"
                )
            if scope.sensitivity not in SENSITIVITIES:
                raise CatalogueError(f"scope {scope.name!r}: unknown sensitivity {scope.sensitivity!r}")
            if scope.product is not None and scope.product not in resources:
                raise CatalogueError(
                    f"scope {scope.name!r}: {plugin.id} declares no product {scope.product!r}"
                )
            scopes[scope.name] = (plugin.id, scope)

    now = utcnow()
    session = db()

    existing_products = {item.slug: item for item in session.scalars(select(ApiProduct))}
    for slug, (owner, declared) in products.items():
        known_product = existing_products.get(slug)
        product_values: dict[str, object] = {
            "names": declared.names.as_dict(),
            "descriptions": declared.descriptions.as_dict(),
            "category": declared.category,
            "auth": list(declared.auth),
            "availability": declared.availability,
            "docs_url": declared.docs_url,
            "position": declared.position,
        }
        if known_product is None:
            session.add(ApiProduct(slug=slug, managed_by=owner, **product_values))
            report.added.append(f"product {slug}")
            continue
        _follow(known_product, f"product {slug}", owner, product_values, report)

    existing_scopes = {item.name: item for item in session.scalars(select(Scope))}
    for name, (owner, spec) in scopes.items():
        product_slug = spec.product
        scope_values: dict[str, object] = {
            "sensitivity": spec.sensitivity,
            "descriptions": spec.descriptions.as_dict(),
            "product": product_slug,
            "resource": products[product_slug][1].resource if product_slug else "",
            "notes": spec.notes,
        }
        known_scope = existing_scopes.get(name)
        if known_scope is None:
            session.add(Scope(name=name, managed_by=owner, **scope_values))
            report.added.append(f"scope {name}")
            continue
        _follow(known_scope, f"scope {name}", owner, scope_values, report)

    # Rows a plugin managed and no longer declares: still there for the apps holding them.
    for old_product in existing_products.values():
        if old_product.managed_by and old_product.slug not in products and old_product.deprecated_at is None:
            old_product.deprecated_at = now
            report.deprecated.append(f"product {old_product.slug}")
    for old_scope in existing_scopes.values():
        if old_scope.managed_by and old_scope.name not in scopes and old_scope.deprecated_at is None:
            old_scope.deprecated_at = now
            report.deprecated.append(f"scope {old_scope.name}")

    for what in report.adopted:
        audit.record("catalogue.adopted", source="plugins", entry=what)
    for what in report.deprecated:
        audit.record("catalogue.deprecated", source="plugins", entry=what)
    session.commit()
    return report


def _follow(
    row: ApiProduct | Scope, label: str, owner: str, values: dict[str, object], report: SyncReport
) -> None:
    if row.managed_by is None:
        report.adopted.append(label)
    elif row.managed_by != owner:
        # Moved from one plugin to another: the new one owns it now.
        report.adopted.append(label)
    if row.deprecated_at is not None:
        row.deprecated_at = None
        report.restored.append(label)
    changed = any(getattr(row, key) != value for key, value in values.items())
    for key, value in values.items():
        setattr(row, key, value)
    row.managed_by = owner
    if changed and label not in report.adopted:
        report.updated.append(label)
