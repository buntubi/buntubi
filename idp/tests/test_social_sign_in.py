"""Social sign-in against a fake Google and GitHub: the round trip, the four outcomes, linking."""

import time
from collections.abc import Iterator
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
import requests
from flask import Flask
from flask.testing import FlaskClient
from joserfc import jwt
from joserfc.jwk import KeySet, RSAKey
from sqlalchemy import select

from buntubi import social
from buntubi.config import get_settings
from buntubi.db import db, utcnow
from buntubi.models import Client, Identity, Invitation, LoginSession, User
from buntubi.models.settings import SIGNUP_OPEN_SETTING, SOCIAL_PROVIDERS_SETTING
from buntubi.services import mail, platform_settings, profile_fields, setup

from conftest import ISSUER, PASSWORD, add_client, api, authorize_query, page_config, pkce, sign_up

GOOGLE_DISCOVERY = "https://accounts.google.com/.well-known/openid-configuration"


class FakeProviders:
    """Answers the adapters' HTTP calls as Google and GitHub would, or fails when told to."""

    def __init__(self) -> None:
        self.key = RSAKey.generate_key(2048, private=True, parameters={"kid": "g1"})
        # The key the key set serves; a test signs with another to forge a token.
        self.served = self.key
        self.nonce = ""
        self.google: dict[str, Any] = {"sub": "g-100", "email": "awa@gmail.test", "email_verified": True}
        self.google_overrides: dict[str, Any] = {}
        self.github_user: dict[str, Any] = {"id": 4242, "login": "awa", "name": "Awa Diop"}
        self.github_emails: list[dict[str, Any]] = [
            {"email": "awa@github.test", "primary": True, "verified": True}
        ]
        self.fail = False

    def id_token(self) -> str:
        now = int(time.time())
        claims = {
            "iss": "https://accounts.google.com",
            "aud": "google-client",
            "iat": now,
            "exp": now + 300,
            "nonce": self.nonce,
            "given_name": "Awa",
            "family_name": "Diop",
            **self.google,
            **self.google_overrides,
        }
        return jwt.encode({"alg": "RS256", "kid": "g1"}, claims, self.key)

    def get(self, url: str, **kwargs: Any) -> requests.Response:
        if self.fail:
            raise requests.Timeout()
        if url == GOOGLE_DISCOVERY:
            return _answer(
                url,
                {
                    "authorization_endpoint": "https://google.test/auth",
                    "token_endpoint": "https://google.test/token",
                    "jwks_uri": "https://google.test/jwks",
                },
            )
        if url == "https://google.test/jwks":
            return _answer(url, KeySet([self.served]).as_dict(private=False))
        if url == "https://api.github.com/user":
            return _answer(url, self.github_user)
        if url == "https://api.github.com/user/emails":
            return _answer(url, self.github_emails)
        return _answer(url, {}, 404)

    def post(self, url: str, **kwargs: Any) -> requests.Response:
        if self.fail:
            raise requests.Timeout()
        if url == "https://google.test/token":
            assert kwargs["data"]["code_verifier"], "PKCE verifier sent"
            return _answer(url, {"id_token": self.id_token(), "access_token": "x"})
        if url == "https://github.com/login/oauth/access_token":
            return _answer(url, {"access_token": "gh-token"})
        return _answer(url, {}, 404)


def _answer(url: str, body: Any, status: int = 200) -> requests.Response:
    response = requests.Response()
    response.status_code = status
    response.url = url
    response._content = requests.compat.json.dumps(body).encode()
    return response


@pytest.fixture
def fake(app: Flask, monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeProviders]:
    providers = FakeProviders()
    monkeypatch.setattr(requests, "get", providers.get)
    monkeypatch.setattr(requests, "post", providers.post)
    settings = get_settings()
    monkeypatch.setattr(settings, "google_client_id", "google-client")
    monkeypatch.setattr(settings, "google_client_secret", type(settings.google_client_secret)("g-secret"))
    monkeypatch.setattr(settings, "github_client_id", "github-client")
    monkeypatch.setattr(settings, "github_client_secret", type(settings.github_client_secret)("gh-secret"))
    google = social.get("google")
    monkeypatch.setattr(google, "_discovery", None)
    monkeypatch.setattr(google, "_keys", None)
    with app.app_context():
        platform_settings.put(SOCIAL_PROVIDERS_SETTING, ["google", "github"])
        db().commit()
    yield providers


def round_trip(browser: FlaskClient, fake: FakeProviders, provider: str, **extra: str) -> Any:
    """To the provider and back; `extra` changes what comes back to the callback."""
    out = browser.get(
        f"/signin/{provider}" + (f"?{urlencode(extra.pop('start'))}" if "start" in extra else "")
    )
    assert out.status_code == 302, out.status_code
    sent = parse_qs(urlparse(out.location).query)
    assert sent["code_challenge_method"] == ["S256"]
    fake.nonce = sent.get("nonce", [""])[0]
    back = {"state": sent["state"][0], "code": "provider-code", **extra}
    return browser.get(f"/signin/{provider}/callback?{urlencode(back)}")


def refusal(reply: Any) -> str | None:
    return parse_qs(urlparse(reply.location).query).get("social_error", [None])[0]


def user_by(app: Flask, email: str) -> User | None:
    with app.app_context():
        return db().scalar(select(User).where(User.email == email))


def test_pages_offer_the_listed_configured_providers(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    offered = page_config(browser, "/signin")["props"]["social"]
    assert offered == [{"id": "google", "label": "Google"}, {"id": "github", "label": "GitHub"}]
    # An app narrows them for its own sign-in.
    add_client(app, first_party=True, social_providers=["github"])
    _, challenge = pkce()
    browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge)))
    assert page_config(browser, "/signin")["props"]["social"] == [{"id": "github", "label": "GitHub"}]
    assert browser.get("/signin/google").status_code == 404


def test_nothing_is_offered_until_the_deployment_lists_a_provider(app: Flask, browser: FlaskClient) -> None:
    assert page_config(browser, "/signin")["props"]["social"] == []
    assert browser.get("/signin/google").status_code == 404


def test_a_new_google_account_is_made_and_signed_in(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    reply = round_trip(browser, fake, "google")
    assert reply.status_code == 302 and urlparse(reply.location).path == "/account"
    user = user_by(app, "awa@gmail.test")
    assert user is not None and user.email_verified and user.password_hash is None
    assert (user.given_name, user.family_name) == ("Awa", "Diop")
    with app.app_context():
        login = db().scalar(select(LoginSession).where(LoginSession.user_id == user.id))
        assert login is not None and login.auth_methods == ["fed"]
    # Next time, the same account through the same Google subject, even with a new address there.
    fake.google["email"] = "awa.new@gmail.test"
    again = round_trip(app.test_client(), fake, "google")
    assert urlparse(again.location).path == "/account"
    with app.app_context():
        assert db().scalar(select(User).where(User.email == "awa.new@gmail.test")) is None
        identity = db().scalar(select(Identity).where(Identity.subject == "g-100"))
        assert identity is not None and identity.last_used_at is not None


def test_the_app_request_resumes_after_the_provider(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    add_client(app, first_party=True)
    _, challenge = pkce()
    browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge)))
    reply = round_trip(browser, fake, "google")
    assert reply.location.startswith("/oauth/authorize?")
    assert "code=" in browser.get(reply.location).location


def test_state_is_checked_and_spent(app: Flask, browser: FlaskClient, fake: FakeProviders) -> None:
    out = browser.get("/signin/google")
    state = parse_qs(urlparse(out.location).query)["state"][0]
    forged = browser.get(f"/signin/google/callback?{urlencode({'state': 'forged', 'code': 'c'})}")
    assert refusal(forged) == "expired"
    # The forged try spent the transaction: the real state no longer works either.
    replayed = browser.get(f"/signin/google/callback?{urlencode({'state': state, 'code': 'c'})}")
    assert refusal(replayed) == "expired"
    assert user_by(app, "awa@gmail.test") is None


@pytest.mark.parametrize(
    "overrides",
    [{"aud": "someone-else"}, {"iss": "https://evil.test"}, {"exp": 1}, {"nonce": "replayed"}],
)
def test_an_id_token_that_does_not_check_out_is_refused(
    app: Flask, browser: FlaskClient, fake: FakeProviders, overrides: dict[str, Any]
) -> None:
    fake.google_overrides = overrides
    assert refusal(round_trip(browser, fake, "google")) == "provider_failed"
    assert user_by(app, "awa@gmail.test") is None


def test_an_id_token_signed_by_another_key_is_refused(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    fake.key = RSAKey.generate_key(2048, private=True, parameters={"kid": "g1"})
    assert refusal(round_trip(browser, fake, "google")) == "provider_failed"
    assert user_by(app, "awa@gmail.test") is None


def test_a_cancelled_or_failing_provider_says_so(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    assert refusal(round_trip(browser, fake, "google", error="access_denied")) == "cancelled"
    out = browser.get("/signin/github")
    state = parse_qs(urlparse(out.location).query)["state"][0]
    fake.fail = True
    reply = browser.get(f"/signin/github/callback?{urlencode({'state': state, 'code': 'c'})}")
    assert refusal(reply) == "provider_failed"


def test_an_address_with_an_account_is_never_linked_by_itself(
    app: Flask, browser: FlaskClient, fake: FakeProviders, outbox: list[mail.Message]
) -> None:
    sign_up(browser, outbox, email="awa@gmail.test")
    other = app.test_client()
    assert refusal(round_trip(other, fake, "google")) == "account_exists"
    with app.app_context():
        assert db().scalar(select(Identity)) is None


def test_an_unverified_or_missing_address_makes_no_account(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    fake.google["email_verified"] = False
    assert refusal(round_trip(browser, fake, "google")) == "no_verified_email"
    fake.github_emails = [{"email": "awa@github.test", "primary": True, "verified": False}]
    assert refusal(round_trip(app.test_client(), fake, "github")) == "no_verified_email"
    assert user_by(app, "awa@github.test") is None


def test_github_keys_on_the_numeric_id_and_the_verified_primary_address(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    fake.github_emails = [
        {"email": "old@github.test", "primary": False, "verified": True},
        {"email": "awa@github.test", "primary": True, "verified": True},
    ]
    assert urlparse(round_trip(browser, fake, "github").location).path == "/account"
    # A new login name at GitHub is the same account.
    fake.github_user["login"] = "awa-renamed"
    assert urlparse(round_trip(app.test_client(), fake, "github").location).path == "/account"
    with app.app_context():
        identity = db().scalar(select(Identity).where(Identity.provider == "github"))
        assert identity is not None and identity.subject == "4242" and identity.email == "awa@github.test"
        assert len(db().scalars(select(User)).all()) == 1


def test_closed_sign_up_refuses_new_accounts_except_invited_ones(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    with app.app_context():
        platform_settings.put(SIGNUP_OPEN_SETTING, False)
        db().commit()
    assert refusal(round_trip(browser, fake, "google")) == "signup_closed"
    csrf = page_config(browser, "/signup")["csrf"]
    body = {"email": "new@example.test", "password": PASSWORD, "given_name": "A", "family_name": "B"}
    assert api(browser, "POST", "/api/signup", body, csrf).json["error"] == "signup_closed"
    assert page_config(browser, "/signup")["props"]["signupOpen"] is False
    sign_up_owner = app.test_client()
    with app.app_context():
        from buntubi.services import platform as p

        organization = p.platform_organization()
        db().add(
            Invitation(
                organization_id=organization.id,
                email="awa@gmail.test",
                role="member",
                app_ids=[],
                expires_at=utcnow().replace(year=utcnow().year + 1),
            )
        )
        db().commit()
    assert urlparse(round_trip(sign_up_owner, fake, "google").location).path == "/account"


def test_an_app_can_close_sign_up_for_its_own_page(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    add_client(app, first_party=True, signup_open=False)
    _, challenge = pkce()
    browser.get("/oauth/authorize?" + urlencode(authorize_query(challenge)))
    assert refusal(round_trip(browser, fake, "google")) == "signup_closed"


def test_required_fields_are_asked_before_the_account_is_made(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    with app.app_context():
        profile_fields.set_modes({"birthdate": "required"})
        db().commit()
    reply = round_trip(browser, fake, "google")
    assert urlparse(reply.location).path == "/signup/complete"
    assert user_by(app, "awa@gmail.test") is None
    config = page_config(browser, "/signup/complete")
    assert config["props"]["fields"] == ["birthdate"] and config["props"]["email"] == "awa@gmail.test"
    missing = api(browser, "POST", "/api/signup/complete", {}, config["csrf"])
    assert missing.json["error"] == "birthdate_required"
    done = api(browser, "POST", "/api/signup/complete", {"birthdate": "1990-04-02"}, config["csrf"])
    assert done.status_code == 200 and done.json["redirect"] == "/account"
    user = user_by(app, "awa@gmail.test")
    assert user is not None and str(user.birthdate) == "1990-04-02"


def test_linking_from_the_account_and_the_second_step_after(
    app: Flask, browser: FlaskClient, fake: FakeProviders, outbox: list[mail.Message]
) -> None:
    from test_mfa import enable

    csrf = sign_up(browser, outbox, email="awa@example.test")
    enable(browser, csrf)
    linked = round_trip(browser, fake, "google", start={"connect": "1"})
    assert linked.location == "/account/security?connected=google"
    listing = browser.get("/api/account/identities").json
    assert [i["provider"] for i in listing["identities"]] == ["google"]
    assert [p["id"] for p in listing["available"]] == ["github"]
    # A provider's sign-in does not stand for the second step.
    other = app.test_client()
    assert urlparse(round_trip(other, fake, "google").location).path == "/mfa"
    # The same Google account cannot go to a second Buntubi account.
    second = app.test_client()
    second_csrf = sign_up(second, outbox, email="bob@example.test")
    assert second_csrf
    taken = round_trip(second, fake, "google", start={"connect": "1"})
    assert refusal(taken) == "already_linked" and taken.location.startswith("/account/security?")


def test_the_last_way_in_cannot_be_unlinked(app: Flask, browser: FlaskClient, fake: FakeProviders) -> None:
    round_trip(browser, fake, "google")
    csrf = page_config(browser, "/account")["csrf"]
    identity = browser.get("/api/account/identities").json["identities"][0]
    refused = api(browser, "DELETE", f"/api/account/identities/{identity['id']}", None, csrf)
    assert refused.status_code == 400 and refused.json["error"] == "last_way_in"
    round_trip(browser, fake, "github", start={"connect": "1"})
    removed = api(browser, "DELETE", f"/api/account/identities/{identity['id']}", None, csrf)
    assert removed.status_code == 200
    assert [i["provider"] for i in browser.get("/api/account/identities").json["identities"]] == ["github"]


def test_a_disabled_account_is_refused(app: Flask, browser: FlaskClient, fake: FakeProviders) -> None:
    round_trip(browser, fake, "google")
    with app.app_context():
        user = db().scalar(select(User).where(User.email == "awa@gmail.test"))
        assert user is not None
        user.disabled_at = utcnow()
        db().commit()
    assert refusal(round_trip(app.test_client(), fake, "google")) == "account_disabled"


def test_the_sign_in_page_names_the_refusal(app: Flask, browser: FlaskClient, fake: FakeProviders) -> None:
    props = page_config(browser, "/signin?social_error=account_exists&provider=google")["props"]
    assert (props["socialError"], props["socialProvider"]) == ("account_exists", "Google")
    assert page_config(browser, "/signin?social_error=<script>")["props"]["socialError"] is None


def test_setup_reads_social_and_signup(app: Flask, tmp_path: Any) -> None:
    path = tmp_path / "platform.toml"
    path.write_text('[social]\nproviders = ["github"]\n[signup]\nopen = false\n')
    with app.app_context():
        assert setup.apply_access(setup.read_access(path)) == ["social.providers", "signup.open"]
        assert platform_settings.social_providers() == ["github"] and not platform_settings.signup_open()
    for text, message in (
        ('[social]\nproviders = ["myspace"]\n', "unknown providers"),
        ("[signup]\nopen = 1\n", "true or false"),
    ):
        path.write_text(text)
        with pytest.raises(setup.SetupError, match=message):
            setup.read_access(path)


def test_the_callback_address_is_fixed_under_the_issuer(
    app: Flask, browser: FlaskClient, fake: FakeProviders
) -> None:
    sent = parse_qs(urlparse(browser.get("/signin/github").location).query)
    assert sent["redirect_uri"] == [f"{ISSUER}/signin/github/callback"]
    assert sent["scope"] == ["read:user user:email"]
    with app.app_context():
        assert db().scalar(select(Client)) is None


def test_the_security_activity_names_the_provider(
    app: Flask, browser: FlaskClient, fake: FakeProviders, outbox: list[mail.Message]
) -> None:
    from test_mfa import enable

    csrf = sign_up(browser, outbox, email="awa@example.test")
    round_trip(browser, fake, "github", start={"connect": "1"})
    _, backups = enable(browser, csrf)
    # Through the second step, the provider is kept for the sign-in's entry.
    other = app.test_client()
    assert urlparse(round_trip(other, fake, "github").location).path == "/mfa"
    other_csrf = page_config(other, "/mfa")["csrf"]
    assert api(other, "POST", "/api/mfa/verify", {"code": backups[0]}, other_csrf).status_code == 200
    events = browser.get("/api/account/activity").json["events"]
    by_github = next(e for e in events if e["kind"] == "sign_in" and e["provider"])
    assert by_github["provider"] == "GitHub" and by_github["two_step"] and not by_github["password"]
    assert next(e for e in events if e["kind"] == "provider_linked")["provider"] == "GitHub"
    by_password = next(e for e in events if e["kind"] == "sign_in" and not e["provider"])
    assert by_password["password"] is True
