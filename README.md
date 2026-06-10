# Secondhand Marketplace

Fullstack social marketplace demo built with `FastAPI`, `SQLAlchemy 2.0`, `PostgreSQL`, and `Next.js`.

## Workspace layout

- `backend/`: FastAPI app, domain models, Alembic migrations, tests, and seed scripts.
- `frontend/`: Next.js App Router client for auth, listings, offers, chat, and moderation.
- `docs/progress/`: phase-by-phase implementation summaries.

## Quick start

1. Copy `backend/.env.example` to `backend/.env` and adjust values if needed.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install backend dependencies with `python -m pip install -e "backend[dev]"`.
4. Run migrations from `backend/` (Alembic `script_location` is relative to that folder):

   ```bash
   cd backend
   python -m alembic upgrade head
   ```

   Or use `.\start.ps1` at the repo root (runs migrate + API).
5. Start the API: `uvicorn app.main:app --reload --app-dir backend`.
6. In `frontend/`, run `npm install` if needed and then `npm run dev`.

## Implemented core capabilities

- Domain-first SQLAlchemy models with mixins, enums, guard methods, and soft-delete filtering.
- JWT auth, profile management, listings, favorites, offers, deals, meetups, chat, reports, and blocks.
- Seed script, Docker Compose, CI workflow, and progress documentation for each phase.

## LAN Testing & Geolocation (Insecure Contexts)

When demoing/testing the frontend on a Local Area Network (LAN) using an IP address (e.g. `http://192.168.1.5:3000`), modern browsers block the Geolocation API (`navigator.geolocation`) because it is not served over HTTPS (considered an insecure context).

Although the app automatically falls back to IP-based Geolocation, you can enable native GPS positioning over HTTP LAN by telling your browser to treat the LAN origin as secure:

### Google Chrome / Microsoft Edge / Chromium-based Browsers

1. Open your browser on the client machine/device and navigate to:
   - **Chrome:** `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
   - **Edge:** `edge://flags/#unsafely-treat-insecure-origin-as-secure`
2. Find the setting named **"Insecure origins treated as secure"**.
3. Toggle the option to **Enabled**.
4. In the text field, enter the full URL of the host server (e.g., `http://192.168.1.5:3000`). If you have multiple hosts, separate them with commas.
5. Click **Relaunch** at the bottom of the browser window to apply changes.
6. Open the app URL, check "Tìm quanh đây" or select the location picker, and allow the location permission prompt.
