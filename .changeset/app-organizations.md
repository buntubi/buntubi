---
"@buntubi/sdk": minor
---

Add `appOrganizationsClient({ issuer, clientId, clientSecret })`, which lists the organizations the app hears of with their latest event sequence, retrieves a specific organization with its members as of that sequence, and fetches and renews its own client-credentials token. Also exports `ORGANIZATION_CLAIMS` (`org_id`, `org_role`) and the `AppOrganization` and `AppOrganizationCopy` types.
