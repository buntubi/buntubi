---
"@buntubi/sdk": minor
---

A per-app JSON object about each person (up to 16 KiB) is available via `/v1/app/users/{user_id}/data` with GET, PUT, PATCH (merges keys) and DELETE, requiring a client-credentials token with the `app_data` scope and covering only people who consented to the app, or anyone for the platform's own apps. The data export lists each app's object by app name together with every profile value held and the accepted terms.
