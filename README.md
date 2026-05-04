# PhishGuard

PhishGuard is a full-stack phishing detection platform that combines a Flask-based machine learning API, a React + TypeScript frontend, and Supabase for authentication and cloud persistence. The application lets users scan suspicious URLs, review their detection history, and access an administrative analytics dashboard for monitoring platform activity.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Repository Structure](#repository-structure)
5. [Technology Stack](#technology-stack)
6. [Prerequisites](#prerequisites)
7. [Configuration](#configuration)
8. [Running the Project Locally](#running-the-project-locally)
9. [Running with Docker Compose](#running-with-docker-compose)
10. [Supabase Setup](#supabase-setup)
11. [API Reference](#api-reference)
12. [Testing and Quality Checks](#testing-and-quality-checks)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)

## Overview

PhishGuard is designed to support phishing awareness and URL risk assessment in a modern web application. The platform accepts a URL from an authenticated user, applies the backend detection pipeline, returns a verdict with confidence data, and stores the result for later review. If cloud persistence is temporarily unavailable, the backend can fall back to a local SQLite history store to avoid losing scan data.

The repository contains:

- a Flask API for URL analysis, authentication-aware routing, and persistence
- a React frontend for user workflows and administrative reporting
- Supabase migrations for database structure and access policies
- automated test coverage for both backend and frontend flows
- legacy research artifacts, including the original phishing detection notebook and model files

## Key Features

### End-user capabilities

- Account registration through the backend signup endpoint and Supabase Auth
- Secure sign-in and authenticated API requests
- URL scanning with phishing or legitimate verdicts
- Confidence scores and model metadata in scan results
- Personal history view with search, filtering, sorting, pagination, and export

### Administrative capabilities

- Platform-level scan statistics
- Daily activity reporting across configurable time ranges
- Recent scan visibility
- High-risk URL monitoring
- Optional authentication-history reporting through Supabase-backed admin workflows

### Reliability features

- JWT verification for protected routes
- Clear validation errors for malformed requests
- Local SQLite fallback when remote history persistence is unavailable
- Configurable CORS and admin access controls

## Architecture

### High-level flow

1. The frontend authenticates users with Supabase.
2. The frontend sends the access token with scan and history requests.
3. The Flask API verifies the JWT and validates the request payload.
4. The backend runs the phishing detection pipeline and produces a verdict.
5. The result is stored in Supabase when available, or in local SQLite as a fallback.
6. The frontend renders scan results, history, and admin analytics.

### Backend

The backend application lives in `backend/` and is centered around `app.py`, which wires together:

- `routes/api.py` for HTTP endpoints
- `services/model_service.py` for model loading and inference
- `services/scan_service.py` for scanning, persistence, history, and analytics
- `services/auth_service.py` for backend-assisted signup
- `utils/auth.py` and related utilities for JWT verification and error handling

The backend loads configuration from `backend/.env` first, then falls back to the repository root `.env`.

### Frontend

The frontend application lives in `frontend/` and uses Vite, React, and TypeScript. It provides:

- authentication-aware user flows
- a protected dashboard for submitting URLs
- a history page for reviewing past scans
- an admin page for analytics and monitoring
- a typed API client for backend communication

## Repository Structure

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
|  |- vectorizer.pkl
|  |- Phishing URL Detection.ipynb
|  `- requirements.txt
|- frontend/
|  |- src/
|  |- e2e/
|  |- package.json
|  `- vite.config.ts
|- docker-compose.yml
`- README.md
```

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, TanStack Router |
| UI and charts | Radix UI, Recharts |
| Backend API | Flask, Flask-CORS, requests |
| ML and data processing | scikit-learn, pandas, numpy, joblib |
| Authentication and database | Supabase Auth, Supabase Postgres |
| Local fallback storage | SQLite |
| Testing | Python unittest, Vitest, Playwright |
| Containerization | Docker, Docker Compose |

## Prerequisites

Before running the project locally, install:

- Python 3
- Node.js and npm
- Docker Desktop (optional, for containerized setup)
- A Supabase project with authentication enabled

## Configuration

PhishGuard supports two common setups:

1. **Local development** with backend and frontend started separately
2. **Docker Compose** with both services started from the repository root

### Root environment file

For Docker Compose and shared local defaults, copy the root example file:

```bash
copy .env.example .env
```

Example variables:

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

### Backend environment file

For standalone backend development:

```bash
copy backend\.env.example backend\.env
```

Important backend variables:

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Supabase project base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for admin-level backend operations such as signup support |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key used for authenticated access workflows |
| `SUPABASE_JWKS_URL` | JWKS endpoint used for JWT verification |
| `SUPABASE_JWT_SECRET` | Optional JWT secret fallback |
| `SUPABASE_JWT_AUDIENCE` | Expected JWT audience, default `authenticated` |
| `SUPABASE_SCANS_TABLE` | Scan persistence table name |
| `ADMIN_EMAILS` | Comma-separated admin email allowlist |
| `ADMIN_ROLES` | Comma-separated admin roles |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins |
| `MODEL_PATH` | Path to the trained model artifact |
| `VECTORIZER_PATH` | Path to the vectorizer artifact when required |
| `LOCAL_HISTORY_DB_PATH` | SQLite fallback database path |

### Frontend environment file

For standalone frontend development:

```bash
copy frontend\.env.example frontend\.env
```

Frontend variables:

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `VITE_API_BASE_URL` | Base URL for the Flask API |

## Running the Project Locally

### 1. Start the backend

```bash
cd backend
python -m venv .venv
. .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The backend runs on `http://127.0.0.1:5000`.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://127.0.0.1:3000`.

### 3. Recommended development workflow

1. Start the backend.
2. Start the frontend.
3. Create an account or sign in.
4. Submit a URL from the dashboard.
5. Review saved results on the history page.
6. Open the admin dashboard with an authorized admin account.

## Running with Docker Compose

From the repository root:

```bash
copy .env.example .env
docker compose up --build
```

Default service URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

The Compose configuration passes the root `.env` values into both services.

## Supabase Setup

PhishGuard expects a Supabase project with:

- Auth enabled
- the required tables and policies applied
- backend credentials configured through environment variables

Database migrations are stored in `backend/supabase/migrations/`.

### Expected data model

The current application expects database support for:

- `profiles`
- `user_roles`
- `scans`

The `scans` table is used for persisted URL scan history and analytics, with fields for values such as:

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

### Admin role setup

To promote a user to admin in Supabase:

```sql
insert into public.user_roles (user_id, role)
values ('YOUR-USER-ID', 'admin')
on conflict (user_id, role) do nothing;
```

## API Reference

### Public routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/` | Health response with service status and model version |
| `POST` | `/auth/signup` | Creates a user through the backend auth service |

### Authenticated routes

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/scan` | Scans a URL and persists the result |
| `POST` | `/predict` | Returns a simplified prediction response for a URL |
| `GET` | `/history` | Returns paginated scan history for the current user |

### Admin routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/admin/stats` | Returns aggregate analytics and optional auth history |

### Example request

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

### History query parameters

`GET /history` supports:

- `limit` from `1` to `100`
- `offset` of `0` or greater
- `search` for substring matching
- `result` as `phishing` or `legit`
- `sort` as `newest`, `oldest`, `confidence_desc`, or `confidence_asc`

### Admin analytics query parameters

`GET /admin/stats` supports:

- `range` as `7d`, `30d`, or `90d`
- `include_auth_history` as a boolean-style query flag

## Testing and Quality Checks

### Backend tests

```bash
cd backend
python -m unittest discover -s tests -v
```

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

### Frontend production build

```bash
cd frontend
npm run build
```

### Frontend end-to-end tests

```bash
cd frontend
npm run test:e2e
```

## Troubleshooting

### The frontend cannot reach the backend

Check that:

- the backend is running on port `5000`
- `VITE_API_BASE_URL` points to the correct API
- `CORS_ALLOWED_ORIGINS` includes the frontend origin

### Authentication requests fail

Check that:

- Supabase credentials are configured correctly
- the backend can reach the Supabase project
- JWT-related values match your Supabase configuration

### Admin endpoints return forbidden

Check that:

- the account has an `admin` role in `public.user_roles`
- the account email or role is allowed by backend configuration

### Scan history is missing from Supabase

Check that:

- the migrations were applied
- `SUPABASE_SCANS_TABLE` points to the correct table
- row-level security policies exist
- the fallback database at `backend/instance/scan_history.sqlite` is not being used because of an upstream failure

## Contributing

Contributions are welcome. When making changes:

- keep backend and frontend configuration examples up to date
- update this README when setup, architecture, or API behavior changes
- keep frontend API usage aligned with the backend route contract
- include or update tests when functionality changes
