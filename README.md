# PhishGuard

PhishGuard is a full-stack phishing detection platform built around a Flask machine-learning API, a React + TypeScript frontend, and Supabase for authentication and persistent storage. Authenticated users can scan suspicious URLs, review their personal scan history, and export results. Administrators can view platform-wide analytics, recent detections, and authentication history.

## What the platform does

- Detects whether a submitted URL is likely **phishing** or **legitimate**
- Stores authenticated scan results in Supabase
- Falls back to a local SQLite history store if the remote history store is unavailable
- Lets users review, search, sort, paginate, and export their scan history
- Lets administrators monitor scan activity, phishing trends, risky URLs, and user auth history

## Architecture

### Backend (`backend/`)

The backend is a Flask API that:

- loads the trained model and vectorizer from `model.pkl` and `vectorizer.pkl`
- normalizes and preprocesses URLs before inference
- verifies Supabase JWTs for protected routes
- persists scans to the `scans` table in Supabase
- falls back to `backend\instance\scan_history.sqlite` if Supabase persistence is unavailable
- exposes admin analytics based on stored scan data

Main backend areas:

- `app.py` - Flask app factory and service wiring
- `routes\api.py` - HTTP endpoints
- `services\model_service.py` - ML inference
- `services\scan_service.py` - scanning, persistence, history, analytics
- `services\auth_service.py` - backend-assisted signup via Supabase Admin API
- `supabase\migrations\` - database schema and policy migrations
- `tests\` - backend unit tests

### Frontend (`frontend/`)

The frontend is a React app using Vite, TypeScript, and TanStack Router. It:

- handles sign up and sign in with Supabase Auth
- sends authenticated scan requests to the Flask API
- shows scan verdicts and confidence scores
- provides a history dashboard with filtering, sorting, and CSV export
- provides an admin dashboard for aggregate analytics

Main frontend areas:

- `src\routes\` - route definitions
- `src\pages\LandingPage.tsx` - marketing/entry page
- `src\pages\DashboardPage.tsx` - URL scan flow
- `src\pages\HistoryPage.tsx` - user history and CSV export
- `src\pages\AdminPage.tsx` - admin analytics
- `src\services\api.ts` - typed frontend API client
- `e2e\` - Playwright end-to-end tests

### Data flow

1. A user signs in through Supabase Auth in the frontend.
2. The frontend sends the access token to the Flask API.
3. The backend validates the token, preprocesses the URL, and runs the ML model.
4. The backend stores the result in Supabase (or local SQLite fallback if needed).
5. The frontend displays the verdict and later reads history or analytics from the API.

## Repository structure

```text
FYP-Project/
|- backend/
|  |- app.py
|  |- config/
|  |- routes/
|  |- services/
|  |- supabase/
|  |- tests/
|  |- model.pkl
|  `- vectorizer.pkl
|- frontend/
|  |- src/
|  |- e2e/
|  |- package.json
|  `- vite.config.ts
|- docker-compose.yml
`- README.md
```

## Core features

### User features

- Email/password account creation
- Login with Supabase Auth
- Protected URL scanning dashboard
- Confidence-based phishing verdicts
- Personal history with:
  - text search
  - verdict filtering
  - sorting by date or confidence
  - pagination
  - CSV export

### Admin features

- Overview cards for total scans, phishing detections, unique users, and average confidence
- Daily threat activity charts
- Top risky URLs
- Recent scans view
- Optional authentication-history view using the Supabase Admin API

## Technology stack

| Layer | Tools |
| --- | --- |
| Backend API | Flask, Flask-CORS, requests |
| ML | scikit-learn, pandas, joblib |
| Frontend | React, TypeScript, Vite |
| Routing/Data UI | TanStack Router, Radix UI, Recharts |
| Auth and persistence | Supabase Auth, Supabase Postgres |
| Local fallback storage | SQLite |
| Testing | unittest, Vitest, Playwright |
| Containerization | Docker, Docker Compose |

## Prerequisites

For local development, have the following available:

- Python 3
- Node.js and npm
- Docker Desktop (optional, only for containerized runs)
- A Supabase project with Auth enabled

## Environment configuration

There are two supported ways to run the project:

1. **Local standalone development** - backend and frontend started separately
2. **Docker Compose** - both services started together

Copy the relevant example files before running anything.

### Root `.env` for Docker Compose

Create a root `.env` file from `.env.example`:

```bash
copy .env.example .env
```

The root file contains both backend and frontend variables for Docker Compose:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_JWKS_URL=
SUPABASE_JWT_SECRET=
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_SCANS_TABLE=scans
ADMIN_EMAILS=
ADMIN_ROLES=admin
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_API_BASE_URL=http://localhost:5000

E2E_USER_EMAIL=
E2E_USER_PASSWORD=
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_SIGNUP_EMAIL=
E2E_SIGNUP_PASSWORD=
E2E_SCAN_URL=https://example.com/login
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
```

### Backend environment variables

For standalone backend development, create `backend\.env` from `backend\.env.example`.

Required or commonly used backend settings:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Base URL of the Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Needed for backend signup and admin-level access |
| `SUPABASE_PUBLISHABLE_KEY` | Used when the backend needs to operate on behalf of an authenticated user |
| `SUPABASE_JWKS_URL` | JWKS endpoint used to verify JWTs |
| `SUPABASE_JWT_SECRET` | Optional alternative to JWKS-based JWT verification |
| `SUPABASE_JWT_AUDIENCE` | Expected JWT audience, default `authenticated` |
| `SUPABASE_SCANS_TABLE` | Scan persistence table, default `scans` |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `ADMIN_ROLES` | Comma-separated admin roles |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins |
| `MODEL_PATH` | Path to the trained model file |
| `VECTORIZER_PATH` | Path to the vectorizer file |
| `LOCAL_HISTORY_DB_PATH` | SQLite fallback history path |
| `SUPABASE_TIMEOUT_SECONDS` | Request timeout for upstream Supabase calls |
| `ADMIN_ANALYTICS_FETCH_LIMIT` | Cap for analytics row fetches |

Notes:

- The backend loads `backend\.env` first, then falls back to the repository root `.env`.
- If `SUPABASE_JWKS_URL` is not provided but `SUPABASE_URL` is set, the backend derives the JWKS URL automatically.
- If `SUPABASE_ISSUER` is not provided but `SUPABASE_URL` is set, the backend derives the issuer automatically.

### Frontend environment variables

For standalone frontend development, create `frontend\.env` from `frontend\.env.example`.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key |
| `VITE_API_BASE_URL` | Base URL of the Flask API |

Notes:

- The frontend expects the backend at `VITE_API_BASE_URL`.
- If `VITE_API_BASE_URL` is omitted in the browser, the client falls back to `http(s)://<current-host>:5000`.

## Supabase setup

PhishGuard expects a Supabase project with Auth enabled and the SQL migrations in `backend\supabase\migrations\` applied.

### Required database behavior

The migrations create and/or rely on:

- `profiles`
- `user_roles`
- `scans`
- row-level security policies for user-owned scan access
- a trigger that creates a default profile and `user` role for new accounts

### `scans` table

The current migration creates a `public.scans` table with fields including:

- `user_id`
- `email`
- `url`
- `normalized_url`
- `hostname`
- `inferred_target`
- `result`
- `confidence_score`
- `detection_method`
- `details`
- `model_name`
- `model_version`
- `metadata`
- `created_at`

It also creates indexes for:

- user history lookups
- result/date analytics
- recent scan retrieval
- trigram URL search

### Access and policies

The migration enables row-level security and applies policies so authenticated users can:

- read only their own scans
- insert only their own scans

### Promoting an admin

After creating a user, promote them in Supabase:

```sql
insert into public.user_roles (user_id, role)
values ('YOUR-USER-ID', 'admin')
on conflict (user_id, role) do nothing;
```

You can also list admin emails or roles through:

- `ADMIN_EMAILS`
- `ADMIN_ROLES`

## Running locally

### Backend

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
python app.py
```

The backend starts on:

- `http://127.0.0.1:5000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on:

- `http://127.0.0.1:3000`

### Recommended local development flow

1. Start the backend in one terminal
2. Start the frontend in another terminal
3. Create or log into an account
4. Scan a URL from `/dashboard`
5. Review stored records in `/history`
6. Open `/admin` with an admin account

## Running with Docker Compose

From the repository root:

```bash
copy .env.example .env
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

Docker Compose passes the root `.env` values into both services.

## API overview

The Flask backend exposes these main routes:

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | No | Health/status payload with service name and model version |
| `POST` | `/auth/signup` | No | Creates a new user via Supabase Admin API |
| `POST` | `/scan` | Yes | Validates and scans a URL, then stores the result |
| `GET` | `/history` | Yes | Returns the authenticated user's scan history |
| `GET` | `/admin/stats` | Admin | Returns platform analytics and optional auth history |

### Example: scan a URL

```http
POST /scan
Authorization: Bearer <supabase-access-token>
Content-Type: application/json

{
  "url": "https://example.com/login"
}
```

Example response:

```json
{
  "result": "phishing",
  "confidence": 0.91
}
```

If remote persistence fails, the response may also include:

```json
{
  "result": "phishing",
  "confidence": 0.91,
  "warning": "Scan completed and was saved to local history because the remote history store is unavailable."
}
```

### Example: history query parameters

`GET /history` supports:

- `limit` - 1 to 100
- `offset` - 0 or higher
- `search` - URL substring search
- `result` - `phishing` or `legit`
- `sort` - `newest`, `oldest`, `confidence_desc`, `confidence_asc`

### Example: admin analytics query parameters

`GET /admin/stats` supports:

- `range` - `7d`, `30d`, `90d`
- `include_auth_history` - `true` or `false`

## Testing

### Backend tests

```bash
cd backend
python -m unittest discover -s tests -v
```

The backend tests cover route behavior, validation, auth-related logic, scan services, and fallback storage.

### Frontend unit tests

```bash
cd frontend
npm install
npm run test -- --run
```

### Frontend linting

```bash
cd frontend
npm run lint
```

### Frontend E2E tests

```bash
cd frontend
npm run test:e2e
```

Notes:

- Playwright uses `PLAYWRIGHT_BASE_URL`, defaulting to `http://127.0.0.1:3000`
- The E2E flows depend on the `E2E_*` environment variables in the root `.env`

## Build commands

### Frontend production build

```bash
cd frontend
npm run build
```

## Error handling and fallback behavior

The backend is designed to fail clearly and preserve scan results when possible:

- invalid request bodies return validation errors
- non-admin users are blocked from admin routes
- Supabase upstream failures are surfaced as errors where appropriate
- scan persistence and history retrieval fall back to local SQLite when remote storage is unavailable

## Troubleshooting

### The frontend cannot reach the backend

Check:

- `VITE_API_BASE_URL` is set correctly
- the backend is running on port `5000`
- `CORS_ALLOWED_ORIGINS` includes your frontend origin

### Sign up works poorly or fails

Check:

- `SUPABASE_SERVICE_ROLE_KEY` is configured
- the backend can reach your Supabase project
- the email and password meet validation rules

### Protected requests return unauthorized

Check:

- the user is signed in through Supabase
- the frontend is sending a valid access token
- backend JWT settings match your Supabase project

### Admin page returns forbidden

Check:

- the account has the `admin` role in `public.user_roles`
- the email or role is allowed by backend admin configuration

### Scans are not appearing in Supabase history

Check:

- `SUPABASE_SCANS_TABLE` points to the correct table
- the scans migration was applied
- RLS policies are present
- if Supabase is down, inspect the local fallback database in `backend\instance\scan_history.sqlite`

## Notes for contributors

- Prefer updating the backend and frontend `.env.example` files when new configuration is introduced.
- Keep API behavior aligned with `frontend\src\services\api.ts`.
- If you change persistence or roles behavior, update the Supabase migrations and this README together.

