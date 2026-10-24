"""
A catalogue declared as data rather than by a plugin: a JSON file of products and scopes, for a
deployment that has an API to offer and no code to run on the provider. Each file acts as a
plugin with only a catalogue, under the owner it names, so the start-up sync and
`flask platform setup` keep its rows like any plugin's. The settings name the files
(`IDP_CATALOGUE_FILES`).
"""

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from buntubi.plugins import SLUG, Catalogue, Localized, Plugin, Product, ScopeSpec


class CatalogueFileError(RuntimeError):
    pass


class _Words(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fr: str
    en: str


class _Product(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slug: str
    names: _Words
    descriptions: _Words
    resource: str
    category: str = ""
    auth: list[Literal["oauth2", "oidc", "api_key", "webhooks"]] = ["oauth2"]
    availability: str = "ga"
    docs_url: str | None = None
    position: int = 0


class _Scope(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    descriptions: _Words
    sensitivity: str = "public"
    product: str | None = None
    notes: str = ""


class _File(BaseModel):
    model_config = ConfigDict(extra="forbid")
    owner: str = Field(pattern=SLUG.pattern)
    products: list[_Product] = []
    scopes: list[_Scope] = []


class CatalogueFile(Plugin):
    """One file's catalogue, under its owner."""

    version = "file"

    def __init__(self, owner: str, catalogue: Catalogue) -> None:
        self.id = owner
        self._catalogue = catalogue

    def catalogue(self) -> Catalogue:
        return self._catalogue


def _words(words: _Words) -> Localized:
    return Localized(words.fr, words.en)


def load(paths: list[Path]) -> list[Plugin]:
    """The files' catalogues; a file missing or not in the expected shape is an error."""
    loaded: list[Plugin] = []
    for path in paths:
        if not path.is_file():
            raise CatalogueFileError(f"catalogue file {path}: no file there")
        try:
            data = _File.model_validate_json(path.read_text("utf-8"))
        except ValidationError as error:
            raise CatalogueFileError(f"catalogue file {path}: {error}") from None
        catalogue = Catalogue(
            products=tuple(
                Product(
                    slug=p.slug,
                    names=_words(p.names),
                    descriptions=_words(p.descriptions),
                    resource=p.resource,
                    category=p.category,
                    auth=tuple(p.auth),
                    availability=p.availability,
                    docs_url=p.docs_url,
                    position=p.position,
                )
                for p in data.products
            ),
            scopes=tuple(
                ScopeSpec(s.name, _words(s.descriptions), s.sensitivity, s.product, s.notes)
                for s in data.scopes
            ),
        )
        loaded.append(CatalogueFile(data.owner, catalogue))
    return loaded
