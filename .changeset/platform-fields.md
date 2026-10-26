---
"@buntubi/sdk": minor
---

The platform exposes its own profile fields under `[[profile.fields]]` in `platform.toml`, supporting types text, number, date, boolean, choice, and choices with French and English labels, which are filled at sign-up, in the account area, or on the next sign-in if required, and apps read them via the `platform_profile` claim in the `platform_profile` scope.
