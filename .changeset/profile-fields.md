---
"@buntubi/sdk": minor
---

The provider keeps the standard OpenID Connect profile claims `birthdate`, `gender`, `middle_name`, `nickname`, `website`, and `zoneinfo`, each hidden (default), optional, or required as set in the `[profile]` section of `platform.toml`. Only required fields appear on the sign-up form, optional and required ones are editable in the account area, hidden ones are never released and shown ones are released under the `profile` scope. The SDK exports `PROFILE_FIELDS`, `FIELD_MODES`, `GENDERS`, and `aboutSchema`, and `AccountSummary.fields` and `ProfilePatch` carry the fields.
