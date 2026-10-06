"""Email through Resend. In test mode the message is logged instead, so every flow works locally."""

import html
import logging
from dataclasses import dataclass

import requests

from idp.config import get_settings

log = logging.getLogger(__name__)
RESEND_URL = "https://api.resend.com/emails"


@dataclass(frozen=True)
class Message:
    to: str
    subject: str
    text: str
    html: str


class MailError(Exception):
    pass


def send(message: Message) -> None:
    settings = get_settings()
    if settings.email_test_mode:
        log.warning("[email, test mode] to %s: %s\n%s", message.to, message.subject, message.text)
        return
    if settings.resend_api_key is None:
        raise MailError("IDP_RESEND_API_KEY is not set and email test mode is off")
    response = requests.post(
        RESEND_URL,
        headers={"Authorization": f"Bearer {settings.resend_api_key.get_secret_value()}"},
        json={
            "from": settings.email_from,
            "to": [message.to],
            "subject": message.subject,
            "text": message.text,
            "html": message.html,
        },
        timeout=10,
    )
    if response.status_code >= 300:
        log.error("Resend refused an email (%s): %s", response.status_code, response.text[:300])
        raise MailError("the email could not be sent")


# Inline styles: email clients ignore stylesheets.
_BODY = (
    "margin:0;padding:32px 16px;background:#f3f2ef;color:#1a1916;"
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
)
_CARD = "max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px"
_TITLE = "margin:0 0 20px;font-size:20px"
_PARAGRAPH = "margin:0 0 16px;font-size:15px;line-height:1.6"
_CODE = "margin:0 0 16px;font-size:30px;font-weight:700;letter-spacing:6px"
_BUTTON = (
    "display:inline-block;padding:12px 20px;border-radius:10px;background:#1a1916;"
    "color:#fff;font-weight:600;text-decoration:none"
)


def render(
    subject: str, lines: list[str], *, code: str | None = None, link: tuple[str, str] | None = None
) -> tuple[str, str]:
    """A plain message: paragraphs, then a code to type or a button to press. Returns (text, html)."""
    text = [*lines]
    parts = [f'<p style="{_PARAGRAPH}">{html.escape(line)}</p>' for line in lines]
    if code is not None:
        text.append(code)
        parts.append(f'<p style="{_CODE}">{html.escape(code)}</p>')
    if link is not None:
        label, url = link
        text.append(url)
        href = html.escape(url, quote=True)
        parts.append(
            f'<p style="{_PARAGRAPH}"><a href="{href}" style="{_BUTTON}">{html.escape(label)}</a></p>'
        )
    body = (
        f'<!doctype html><html><body style="{_BODY}"><div style="{_CARD}">'
        f'<h1 style="{_TITLE}">{html.escape(subject)}</h1>{"".join(parts)}</div></body></html>'
    )
    return "\n\n".join(text), body
