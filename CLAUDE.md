# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + client)
npm run install:all

# Run dev (server + client concurrently)
npm run dev

# Run only the backend (port 3001, with --watch)
npm run server

# Run only the frontend (port 5173)
npm run client

# Build for production (client bundle)
npm run build

# Run production server
npm start
```

There are no tests configured in this project.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Supabase in production) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account for Sheets API |
| `GOOGLE_PRIVATE_KEY` | Service account private key (with literal `\n` in .env) |
| `GOOGLE_SPREADSHEET_ID` | ID of the main Google Spreadsheet |
| `TASKS_SHEET_NAME` | Tab name for pending tasks (default: `Trabajo pendiente`) |
| `FINALIZADOS_SHEET_NAME` | Tab name for completed tasks (default: `Finalizados`) |
| `GOOGLE_APPS_SCRIPT_URL` | Deployed Apps Script web app URL for automation |

## Architecture

**Monorepo** with two separate packages:
- `package.json` (root) — Express backend
- `client/package.json` — React + Vite frontend

In dev, Vite proxies `/api/*` to `http://localhost:3001`. In production, Express serves the built Vite bundle from `client/dist` and handles all routes.

### Backend (`server/`)

- `server/index.js` — Entry point. Initializes DB, mounts routers, serves static in production.
- `server/db.js` — PostgreSQL via `pg` Pool. Lazy-initializes with IPv4 DNS resolution. `initDB()` creates tables if they don't exist (`coordinadores`, `doc_folders`, `doc_items`).
- `server/sheets.js` — Google Sheets API client (googleapis). Provides: `getSheetValues`, `updateSheetCell`, `appendRow`, `deleteRow`, `moveRow`. Caches sheet numeric IDs. The `GOOGLE_PRIVATE_KEY` env var is normalized here (strips outer quotes, converts `\n` literals to real newlines).
- `server/routes/coordinadores.js` — CRUD for coordinadores table + `POST /export/sheets` which creates a formatted sheet in the Google Spreadsheet.
- `server/routes/tareas.js` — Tasks backed entirely by Google Sheets (no DB). Reads/writes to the `TASKS_SHEET_NAME` and `FINALIZADOS_SHEET_NAME` tabs. Row index is used as the record identifier (1-based, row 1 is header). Includes archive/reopen (move between sheets) and `POST /automatizar` to trigger an Apps Script.
- `server/routes/import.js` — Imports coordinadores from a public Google Sheets CSV URL (preview + confirm with replace/append modes).
- `server/routes/documentacion.js` — CRUD for `doc_folders` and `doc_items` (stored in PostgreSQL).

### Frontend (`client/src/`)

- `App.jsx` — Single-page app with a collapsible sidebar. Navigation is purely state-based (`useState` for `page`). Pages: `tareas` (default), `coordinadores`, `dashboard`, `documentacion`.
- `pages/Coordinadores.jsx` — Table view of the radar matrix.
- `pages/Dashboard.jsx` — Visual dashboard for coordinadores data (includes `SouthAmericaMap.jsx`).
- `pages/Tareas.jsx` — Task manager backed by Google Sheets.
- `pages/Documentacion.jsx` — Link library with folders/items backed by PostgreSQL.

### Data sources split

| Module | Storage |
|---|---|
| Coordinadores | PostgreSQL (Supabase) |
| Documentacion | PostgreSQL (Supabase) |
| Tareas | Google Sheets (live read/write) |

## Patterns for Adding New Modules

1. Add a new route file in `server/routes/` and mount it in `server/index.js`.
2. Add a new page component in `client/src/pages/`.
3. Add a nav entry in `client/src/App.jsx` (the `PAGES` map and sidebar nav).

## Country Values

The `coordinadores` table columns for each of the 7 countries (`argentina`, `chile`, `ecuador`, `peru`, `bolivia`, `paraguay`, `uruguay`) only accept the values `0`, `50`, or `100`. This constraint is enforced both at the DB level (`CHECK` constraint) and in the route validation.

When exporting to Sheets, values are divided by 100 and written as decimals so Google Sheets' `PERCENT` format displays them correctly (`0.5` → `50%`).
