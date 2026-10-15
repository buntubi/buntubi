---
"@buntubi/sdk": minor
---

`ROLE_ABILITIES` and `PORTAL_ABILITIES` replace `ABILITIES`; `can(membership, ability)` accepts `{ role, portal_role }` with role values `owner`, `admin`, `billing`, `member`, `guest` and portal roles `developer`, `reviewer`, `viewer`; `portal_role` is available on `Organization`, `Member`, and `Invitation`; `POSITIONS`, `positionOf`, and `rolesOf` are exported from `@buntubi/sdk/roles`. `App` includes the `organization_usage` property, which can be `none`, `optional`, or `required`. The new `@buntubi/sdk/organizations` entry exports `organizationsClient({ issuer, accessToken, fetch })`, which calls `/v1/organizations` as the signed-in person and throws `OrganizationsApiError` with status and code on refusals.
