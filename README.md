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
