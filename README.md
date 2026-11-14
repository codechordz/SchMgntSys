# SchMgntSys

A small school-management-system prototype built with Express, SQLite/Knex, Alpine.js, and Tailwind CSS.

## Run locally

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm start
```

Open <http://localhost:3000>. The Express server serves the frontend from `frontend src/` and creates `frontend src/app.sqlite` on first start. The database is local runtime data and should be backed up; do not commit it or use the included demo records as real student data.

Set `PORT` to change the listening port. For cross-origin development only, set `CORS_ORIGINS` to a comma-separated list of trusted origins (for example, `http://localhost:5173`). Same-origin requests work without enabling cross-origin access.

## Included prototype features

- Student directory and basic admission CRUD
- Mark entry and report-card data
- Fee ledger and payment logging
- Demo licensing screen

The sample license activation endpoint only checks key format; it does not verify a real license. This prototype also does not yet include user authentication or role-based access. **Do not expose it to the public internet or enter real student/payment data until authentication, authorization, privacy controls, backups, and production-grade license verification are implemented.**

## Deployment

This repository does not include a hosted live server. You can deploy the Node app to a Node.js host, but configure persistent storage for SQLite (or migrate to a managed database) before relying on data: ephemeral host filesystems can erase the database on redeploy/restart. Keep the service private until the security items above are addressed.
