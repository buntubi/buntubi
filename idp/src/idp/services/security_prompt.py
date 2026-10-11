"""The offer, once after signing up, of a passkey or two-step sign-in, with a way to skip it."""

from idp.db import utcnow
from idp.models import User
from idp.services import mfa, passkeys


def applies(user: User) -> bool:
    """Not answered yet, and only a password protects the account."""
    return (
        user.security_prompt_answered_at is None and not mfa.is_enabled(user) and not passkeys.list_for(user)
    )


def answer(user: User) -> None:
    """Skipped or done: either way it is not offered again. Turned on later in the account area."""
    if user.security_prompt_answered_at is None:
        user.security_prompt_answered_at = utcnow()
