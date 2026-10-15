---
"@buntubi/sdk": patch
---

serveUiPluginFile and createUiPluginHost compare real paths, so a symbolic link inside a plugin's `browser/` folder that points outside the folder is not served. readUiPlugins rejects a manifest whose `browser` or `server` entry is not a `.js` or `.mjs` path inside its own `browser/` or `server/` folder, or contains a `.` or `..` segment.
