# Dev scripts

This folder contains helper scripts for local development.

## start-dev-server.ps1

A PowerShell helper to start the real `server/index.ts` with sane development defaults for required environment variables.

Usage (PowerShell):

```powershell
# from repo root
.\scripts\start-dev-server.ps1
```

Notes:
- This script sets development defaults for `DATABASE_URL`, `SESSION_SECRET`, `REPLIT_DOMAINS`, and a few optional keys so the server can run on a typical developer machine.
- Do NOT use this script in production; it purposefully uses insecure defaults for convenience.
- If you prefer a POSIX-style start, use the `dev` npm script but set env vars appropriately in your shell.
