"""A catalogue declared as data, without a plugin: a JSON file synced under the owner it names."""

import json
from collections.abc import Iterator
from pathlib import Path

import pytest
from flask import Flask

from buntubi import plugins
from buntubi.app import create_app
from buntubi.config import get_settings
from buntubi.db import db
from buntubi.models import ApiProduct, Scope
from buntubi.plugins.catalogue_file import CatalogueFileError, load
from buntubi.plugins.sync import sync

CATALOGUE = {
    "owner": "acme",
    "products": [
        {
            "slug": "acme-crm",
            "names": {"fr": "Clients", "en": "Clients"},
            "descriptions": {"fr": "Les clients d'Acme.", "en": "Acme's clients."},
            "resource": "https://api.acme.example",
            "auth": ["oauth2", "api_key"],
            "availability": "beta",
        }
    ],
    "scopes": [
        {
            "name": "crm.contacts:read",
            "descriptions": {"fr": "Voir les contacts", "en": "See contacts"},
            "product": "acme-crm",
        },
        {
            "name": "crm.contacts:write",
            "descriptions": {"fr": "Modifier les contacts", "en": "Change contacts"},
            "sensitivity": "sensitive",
            "product": "acme-crm",
        },
    ],
}


@pytest.fixture
def file(tmp_path: Path) -> Iterator[Path]:
    path = tmp_path / "catalogue.json"
    path.write_text(json.dumps(CATALOGUE))
    yield path
    plugins.use([])


def clear(app: Flask) -> None:
    with app.app_context():
        db().query(Scope).filter(Scope.managed_by == "acme").delete()
        db().query(ApiProduct).filter(ApiProduct.managed_by == "acme").delete()
        db().commit()


def test_a_file_is_synced_like_a_plugin_catalogue(app: Flask, file: Path) -> None:
    [declared] = load([file])
    assert declared.id == "acme"
    with app.app_context():
        sync([declared])
        product = db().get(ApiProduct, "acme-crm")
        write = db().get(Scope, "crm.contacts:write")
        assert product is not None and product.managed_by == "acme" and product.availability == "beta"
        assert write is not None and write.sensitivity == "sensitive"
        assert write.resource == "https://api.acme.example"
        assert not sync([declared]), "a second sync changes nothing"
    clear(app)


def test_the_app_syncs_the_files_its_settings_name_at_start(
    app: Flask, file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("IDP_CATALOGUE_FILES", json.dumps([str(file)]))
    get_settings.cache_clear()
    try:
        started = create_app()
        assert [plugin.id for plugin in plugins.active()] == ["acme"]
        with started.app_context():
            assert db().get(ApiProduct, "acme-crm") is not None
    finally:
        get_settings.cache_clear()
        clear(app)


def test_a_file_it_cannot_use_says_why(tmp_path: Path) -> None:
    path = tmp_path / "catalogue.json"
    path.write_text(json.dumps({**CATALOGUE, "owner": "Acme Corp"}))
    with pytest.raises(CatalogueFileError, match="owner"):
        load([path])
    path.write_text("{")
    with pytest.raises(CatalogueFileError, match=str(path)):
        load([path])
    with pytest.raises(CatalogueFileError, match="no file"):
        load([tmp_path / "missing.json"])


def test_a_file_cannot_take_the_id_of_another(
    app: Flask, file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("IDP_CATALOGUE_FILES", json.dumps([str(file), str(file)]))
    get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="share an id"):
            create_app()
    finally:
        get_settings.cache_clear()
