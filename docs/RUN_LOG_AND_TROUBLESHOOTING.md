# Nhat ky chay thu va xu ly loi — Secondhand Marketplace

Tai lieu ghi lai ket qua chay thuc te tren may dev (Windows / PowerShell), cac loi co the gap va cach khac phuc.

**Ngay ghi log:** 2026-04-14 (workspace thuc thi)

| Buoc | Ket qua | Ghi chu |
|------|---------|---------|
| `pip install -e "backend[dev]"` | Thanh cong | Sau khi them `pwdlib[argon2]` vao `pyproject.toml` |
| `pytest backend/tests` | **5 passed** | Dung SQLite in-memory trong `conftest.py`, khong can Postgres |
| `uvicorn app.main:app --app-dir backend` | Thanh cong | `GET /` tra JSON `Secondhand Marketplace API is running` |
| `docker compose up -d postgres` | **Khong chay duoc** tren may ghi log | `docker` khong co trong PATH (Docker Desktop chua cai hoac chua mo) |
| `alembic upgrade head` (tu thu muc `backend/`) | **Loi ket noi DB** | Postgres tai `localhost:5432` ton tai nhung user `app` / mat khau khong khop (xung dot voi instance Postgres khac) |

---

## 1. `pwdlib.exceptions.HasherNotAvailable: argon2`

**Thong bao mau:**

```text
pwdlib.exceptions.HasherNotAvailable: The argon2 hash algorithm is not available...
Try to run `pip install pwdlib[argon2]`.
```

**Nguyen nhan:** `pwdlib` mac dinh dung Argon2; goi `argon2-cffi` khong duoc cai neu chi khai bao `pwdlib`.

**Khac phuc (da ap dung trong repo):**

- Trong `backend/pyproject.toml` dung dependency: `pwdlib[argon2]`.
- Cai lai: `python -m pip install -e "backend[dev]"`.

---

## 2. Alembic: `Path doesn't exist: alembic`

**Thong bao mau:**

```text
FAILED: Path doesn't exist: alembic. Please use the 'init' command...
```

**Nguyen nhan:** Trong `backend/alembic.ini`, `script_location = alembic` la duong dan **tuong doi theo thu muc lam viec hien tai**. Chay `python -m alembic -c backend/alembic.ini` tu **root repo** khien Alembic tim sai thu muc `alembic`.

**Khac phuc:**

```powershell
cd backend
python -m alembic upgrade head
```

Script `start.ps1` o root da duoc cap nhat de `Push-Location backend` truoc khi chay migrate.

**README:** huong dan migrate tu `backend/`.

---

## 3. Docker: `The term 'docker' is not recognized`

**Nguyen nhan:** Docker CLI khong co trong PATH (chua cai [Docker Desktop](https://www.docker.com/products/docker-desktop/) hoac chua khoi dong / chua them vao PATH).

**Khac phuc:**

1. Cai Docker Desktop, khoi dong, doi engine *Running*.
2. Mo terminal moi, kiem tra: `docker version`.
3. Tu root repo: `docker compose up -d postgres`.

**Thay the (khong dung Docker):** Cai PostgreSQL cuc bo, tao database + user khop `backend/.env` (mac dinh: user `app`, password `app`, DB `secondhand_marketplace`), roi chay migrate tu `backend/`.

---

## 4. Postgres: `password authentication failed for user "app"`

**Thong bao mau:**

```text
FATAL: password authentication failed for user "app"
```

**Nguyen nhan thuong gap:**

- Cong `5432` dang phuc vu **mot Postgres khac** (cai tay, project khac) — user/mat khau khong phai `app`/`app`.
- Container compose chua chay hoac `.env` sai host/port/user.

**Khac phuc:**

1. Xac dinh Postgres nao dang nghe 5432: `Get-NetTCPConnection -LocalPort 5432` (PowerShell) hoac Task Manager / dich vu Windows.
2. **Cach A — dung Docker cua project:** tam dung Postgres cuc bo chiem 5432, hoac trong `docker-compose.yml` doi mapping (vi du `"5433:5432"`) va sua `DATABASE_URL` trong `backend/.env` dung port `5433`.
3. **Cach B — dung Postgres san co:** tao role/database khop `.env`, hoac sua `DATABASE_URL` cho dung user/password that.

---

## 5. PowerShell: `&&` is not a valid statement separator

**Nguyen nhan:** PowerShell cu (5.1) khong ho tro `&&` nhu bash.

**Khac phuc:** Dung `;` hoac lenh tren nhieu dong:

```powershell
Set-Location "d:\path\to\secondhand-marketplace"
.\.venv\Scripts\Activate.ps1
```

Hoac nang PowerShell 7+.

---

## 6. PowerShell: `cannot be loaded because running scripts is disabled`

**Khac phuc (phien hien tai):**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Hoac cho user: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

---

## 7. Next.js dev: `turbo.createProject` / WASM bindings (Windows)

**Trieu chung:** Cua so `npm run dev` thoat, trinh duyet `ERR_CONNECTION_REFUSED` tren `127.0.0.1:3000`, log co dong kieu:

```text
Error: 'turbo.createProject' is not supported by the wasm bindings
```

**Nguyen nhan:** Dev server mac dinh co the dung Turbopack (WASM); tren mot so moi truong Windows binding WASM khong day du.

**Khac phuc (da ap dung trong repo):** Trong `frontend/package.json`, script `dev` dung Webpack: `next dev --webpack` (dong bo voi `build` da dung `--webpack`).

---

## 8. `docker-compose.yml` — YAML sai thut le (service `backend`)

**Trieu chung:** `docker compose config` bao loi parse hoac bien moi truong `JWT_SECRET_KEY` khong ap dung.

**Da sua:** Khoi `environment` cua service `backend` phai thut le dung cap voi `DATABASE_URL` va `BACKEND_CORS_ORIGINS` (truoc day mot dong `JWT_SECRET_KEY` bi lech indent).

---

## Lenh tham chieu nhanh (Windows)

```powershell
# Repo root
cd "d:\User\Workspace\secondhand-marketplace"

# Venv + cai dat
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e "backend[dev]"

# DB (khi da co Docker)
docker compose up -d postgres

# Migrate (bat buoc tu backend/)
cd backend
python -m alembic upgrade head
cd ..

# API
uvicorn app.main:app --reload --app-dir backend

# Test (khong can Postgres)
pytest backend/tests -v
```

Hoac mot lan: `.\start.ps1` (migrate + mo API trong cua so PowerShell moi; tuy chon frontend).

---

## Tom tat thay doi ma nguon lien quan log nay

- `backend/pyproject.toml`: `pwdlib` -> `pwdlib[argon2]`.
- `docker-compose.yml`: sua indent `JWT_SECRET_KEY`.
- `start.ps1`: chay Alembic tu `backend/`; cho Postgres san sang (pg_isready) truoc migrate khi dung Docker.
- `frontend/package.json`: `dev` dung `next dev --webpack` de tranh Turbopack WASM tren Windows.
- `README.md`: huong dan migrate dung thu muc.
