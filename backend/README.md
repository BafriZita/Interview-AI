# InterviewAI backend

Express + Supabase API for the InterviewAI web application. It covers the non-AI application domain: accounts, sessions, profiles, resumes, job descriptions, deterministic resume matching, interview records, reports, history, and saved recommendations.

Authentication is handled by **Supabase Auth** (`auth.users`) with application profiles in **`public.profiles`**. All data access from the server goes through Supabase (GoTrue + PostgREST) using the service-role key.

## Folder structure

```text
backend/
├── database/              Archival MySQL schema (pre-migration reference only)
├── migrations/            Supabase/Postgres DDL applied via the SQL Editor
├── scripts/               Database setup and legacy migration commands
├── src/
│   ├── config/            Environment, Supabase session store configuration
│   ├── middleware/        Authentication, uploads, validation, errors
│   ├── modules/           Feature-owned routes/controllers/schemas
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── interviews/
│   │   ├── jobs/
│   │   ├── profile/
│   │   ├── recommendations/
│   │   ├── reports/
│   │   └── resumes/
│   ├── routes/            API composition
│   ├── services/          Document parser, question bank, AI boundary
│   ├── utils/             Shared HTTP and validation helpers
│   ├── app.js             Express application
│   └── server.js          Supabase check and HTTP listener
└── storage/uploads/       Private resume storage (not web-accessible)
```

## Local setup

1. Copy `.env.example` to `.env` and fill in `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.
2. Run `npm install` inside `backend/`.
3. Apply the schema: run `npm run db:migrate` and paste the printed SQL into your Supabase project's SQL Editor (it creates `profiles`, `user_sessions`, and the other `public` tables). PostgREST auto-detects the new tables within ~1 minute.
4. Run `npm run dev`. The API starts at `http://localhost:5000/api/v1`.

The React client must send cookies with API calls:

```js
fetch('http://localhost:5000/api/v1/auth/me', {
  credentials: 'include',
})
```

## Auth flow (Supabase)

- **Register** — `POST /auth/register` creates the user in Supabase Auth (`auth.users`, confirmed) via the service-role admin API, then inserts a matching row in `public.profiles` using the Auth user UUID as `profiles.user_id`. If either step fails, the Auth user is deleted again to keep both consistent.
- **Login** — `POST /auth/login` authenticates against Supabase Auth (`signInWithPassword`), then starts a server session.
- **Session** — server-side sessions are persisted in `public.user_sessions` (Supabase-backed store), so they survive server restarts.
- **/me** — `GET /auth/me` returns the authenticated Supabase user plus their profile.
- **Logout** — `POST /auth/logout` destroys the server session.
- **Password reset** — `POST /auth/forgot-password` uses Supabase's `resetPasswordForEmail`, sending a link to the frontend's `/reset-password` route, where the new password is set through Supabase.

## API map

| Area | Endpoints |
| --- | --- |
| Health | `GET /health`, `GET /health/supabase` |
| Auth | `POST /auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`; `GET /auth/me` |
| Dashboard | `GET /dashboard` |
| Profile | `GET /profile`, `PUT /profile` |
| Resumes | `GET/POST /resumes`, `GET/DELETE /resumes/:id` |
| Jobs | `GET/POST /jobs`, `GET/DELETE /jobs/:id`, `POST /jobs/match/calculate` |
| Interviews | `GET/POST /interviews`, `GET /interviews/:id`, answer and complete endpoints |
| Reports | `GET /reports`, `GET /reports/:sessionId` |
| Recommendations | `GET /recommendations` |

All paths above are prefixed with `/api/v1`. Except for registration, login, password reset, and health, routes require the secure session cookie.

## Legacy migration

`scripts/migrate_to_supabase.js` migrates existing MySQL users/resumes into Supabase (one-time, dry-run capable). It reads `MYSQL_*` env vars for the old database and `DATABASE_URL` for the new one.

## AI integration boundary

There is intentionally no OpenAI or speech API integration. `src/services/interview-ai.port.js` defines the future contract, while the current interview flow uses a local question bank and stores answers without fabricated evaluation scores. A future provider can implement that interface without changing database or route ownership.

## Storage and security decisions

- Passwords are hashed by Supabase Auth; plaintext is never stored or handled by the app.
- Sessions are server-side in Supabase (`user_sessions`). The browser receives only an HTTP-only session identifier.
- Every private query scopes records to the authenticated user (`req.session.userId`, the Supabase Auth UUID).
- Resume files are stored outside public web assets, with size and MIME restrictions.
- `profiles` (and other user tables) reference `auth.users(id)` with cascading deletes to avoid orphaned user data.
- Production requires explicit secrets and secure cross-site cookies.
