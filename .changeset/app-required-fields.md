---
"@buntubi/sdk": minor
---

Each app can specify the profile fields it needs using `required_fields` in `platform.toml` or on the portal's sign-in card, and a user lacking those fields is prompted to provide them during sign-in or while already signed in, with `prompt=none` resulting in `interaction_required`. The SDK's `App` type includes the new `required_fields` and `required_fields_offered` properties.
