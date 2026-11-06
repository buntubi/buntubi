---
"@buntubi/sdk": minor
---

Organization, OrganizationMembership, AdminOrganization and WebhookOrganization expose a `time_zone` that can be an IANA name or null, and `createOrganization` and `updateOrganization` accept this value (null clears it); `organizationSchema` checks its length and the provider checks the name.
