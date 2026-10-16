---
"@buntubi/sdk": minor
---

The new `@buntubi/sdk/webhooks` entry adds a `verifyWebhook({ secret, body, signature, toleranceSeconds, now })` function that validates the Buntubi-Signature header using HMAC-SHA256 with a 300 s tolerance and returns the typed event or throws `WebhookVerificationError` with codes missing_signature, malformed_signature, too_old, bad_signature, or malformed_body, introduces `WEBHOOK_EVENTS` and a discriminated-union `WebhookEvent` with typed data, adds `webhook_url` and `webhook_events` properties to `App`, and exports `WEBHOOK_SCOPES`.
