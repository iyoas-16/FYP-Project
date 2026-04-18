# PhishGuard

PhishGuard is a phishing detection platform that combines a Flask ML API, a React + TypeScript frontend, and Supabase Auth/PostgreSQL. Users can authenticate, scan URLs, review scan history, and administrators can monitor platform analytics.

## Architecture

- `backend/`: Flask API, URL preprocessing, model loading, Supabase-backed scan persistence, admin analytics.
- `frontend/`: React frontend, Supabase Auth, protected routes, dashboard, history, and admin UI.
- `backend/supabase/migrations/`: Supabase schema, roles, and the `scans` table migration.

## Required environment

Copy `.env.example` to `.env` at the repository root for Docker Compose, and use the service-specific `.env.example` files for local standalone runs.

### Backend

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_JWKS_URL` or `SUPABASE_JWT_SECRET`
- `SUPABASE_JWT_AUDIENCE`
- `SUPABASE_SCANS_TABLE`
- `ADMIN_EMAILS`
- `ADMIN_ROLES`
- `CORS_ALLOWED_ORIGINS`

### Frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL`

## Supabase setup

1. Apply the SQL migrations in `backend/supabase/migrations/`.
2. Keep `profiles` and `user_roles` enabled for auth/role lookup.
3. Use the new `scans` table as the backend persistence target.
4. For local scan/history requests without a service-role key, set `SUPABASE_PUBLISHABLE_KEY` so the backend can use the caller's authenticated JWT against the existing RLS policies.
5. Promote at least one administrator manually in Supabase SQL or the table editor:

```sql
insert into public.user_roles (user_id, role)
values ('YOUR-USER-ID', 'admin')
on conflict (user_id, role) do nothing;
```

## Local development

### Backend

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
python app.py
```

Local standalone backend runs load environment variables from `backend/.env` automatically.

### Frontend

```bash
cd frontend
npm install
npm run dev
```


The frontend expects the Flask API at `VITE_API_BASE_URL`, typically `http://127.0.0.1:5000`. If that variable is omitted in local development, the client falls back to the current hostname on port `5000`.

## Docker

```bash
copy .env.example .env
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Test commands

### Backend

```bash
cd backend
python -m unittest discover -s tests -v
```

### Frontend

```bash
cd frontend
npm run test
npm run test:e2e
```

Playwright uses environment variables from `.env.example`. The E2E suite skips flows if the required credentials are not provided.
