---
"@buntubi/sdk": minor
---

`WEBHOOK_EVENTS.MemberUpdated` (`member.updated`) is the event the provider sends to each organization of a person who changes their name or a displayed profile field. First-party apps receive the updated name and fields in `WebhookMember.profile`, while third-party apps receive the event without that profile data.
