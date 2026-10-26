---
"@buntubi/sdk": patch
---

The provider image runs gunicorn with 8 threads via `GUNICORN_CMD_ARGS`, preventing an idle browser connection from blocking the sole worker and causing token request timeouts.
