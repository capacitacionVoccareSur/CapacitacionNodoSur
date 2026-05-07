# Capacitación Nodo Sur - Project Context

## Project Overview
Capacitación Nodo Sur is a full-stack management application designed to coordinate training efforts across multiple South American countries (Argentina, Chile, Ecuador, Peru, Bolivia, Paraguay, and Uruguay). 

The system features:
- **Coordinadores Management:** Tracking training status/progress for personnel in different regions.
- **Dashboard:** Geographic visualization using a South America map.
- **Documentation Management:** Organizing training resources into folders and items.
- **Google Sheets Integration:** Syncing tasks and importing coordinator data directly from public Google Sheets.

## Architecture
- **Backend:** Node.js with Express.
- **Frontend:** React.js (Vite) with `react-simple-maps`.
- **Database:** PostgreSQL.
- **External APIs:** Google Sheets API (v4).

## Project Structure
```text
.
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components (Maps, Tables, Modals)
│   │   └── pages/          # Main application views (Dashboard, Tareas, etc.)
│   └── public/             # Static assets (including TopoJSON for maps)
├── server/                 # Express backend
│   ├── routes/             # API endpoints (coordinadores, import, tareas, docs)
│   ├── db.js               # Database connection and schema initialization
│   ├── sheets.js           # Google Sheets API helper
│   └── index.js            # Main entry point
├── render.yaml             # Render deployment configuration
├── package.json            # Root configuration and workspace scripts
└── .env.example            # Environment variables template
```

## Setup and Commands

### Prerequisites
- Node.js >= 20
- PostgreSQL database
- Google Cloud Service Account (for Sheets integration)

### Key Commands
- **Install all dependencies:** `npm run install:all`
- **Development mode:** `npm run dev` (Runs server and client concurrently)
- **Build for production:** `npm run build`
- **Start production server:** `npm start`

### Environment Variables
Refer to `.env.example` for the required keys:
- `DATABASE_URL`: PostgreSQL connection string.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Service account email for Google API.
- `GOOGLE_PRIVATE_KEY`: Private key for Google API.
- `GOOGLE_SPREADSHEET_ID`: Target spreadsheet ID.
- `TASKS_SHEET_NAME` & `FINALIZADOS_SHEET_NAME`: Specific sheet names for task tracking.

## Development Conventions
- **Surgical Updates:** When modifying the database, check `server/db.js` for the schema initialization logic.
- **Environment Handling:** The server uses `dotenv` and has specific logic for IPv4 resolution in `server/db.js` to ensure stability across different environments.
- **Static Assets:** The map uses `countries-110m.json` located in `client/public/`.
- **API Pattern:** Backend routes are modularized in `server/routes/`. The client communicates with `/api/*`.

## Database Schema
The system automatically initializes three main tables if they don't exist:
1. `coordinadores`: Stores progress (0, 50, 100) for each country.
2. `doc_folders`: Organizes documentation categories.
3. `doc_items`: Stores individual document links and types.
