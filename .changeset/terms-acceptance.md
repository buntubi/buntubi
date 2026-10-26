---
"@buntubi/sdk": minor
---

With `[signup] terms_version` in `platform.toml` and `IDP_BRAND_TERMS_URL` set, people accept the terms at sign-up by email or through Google or GitHub, and the version and date are kept on the account. An account that has not accepted the current version, whether created by an admin, invited, from before, or a new version, is asked at its next sign-in and the console shows the version accepted.
