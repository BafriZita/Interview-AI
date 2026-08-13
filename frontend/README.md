# InterviewAI

InterviewAI is an interview-preparation platform designed for students and job seekers in Cameroon. It provides a modern workspace for managing resumes, comparing a candidate’s experience with job descriptions, practising interview questions, reviewing performance, and following career recommendations.

The repository contains a React frontend and a separate Express backend that uses Supabase (Auth + Postgres) for user accounts and data. Interview-related AI and speech providers are intentionally not connected yet; the backend provides a clean integration boundary for adding them later.

## Main features

- Email and password registration and login
- Secure, server-side user sessions
- Editable candidate profiles and professional skills
- PDF, DOC, and DOCX resume uploads
- PDF and DOCX text extraction
- Job-description management
- Resume-to-job matching
- Structured HR, behavioural, technical, situational, and problem-solving interviews
- Interview answers, history, and reports
- Career recommendations and job-expectation pages
- Responsive public, authentication, and authenticated application layouts

## Technology stack

### Frontend

- React 19
- Vite
- JavaScript and CSS
- Browser History API routing

### Backend

- Node.js
- Express 5
- Supabase Auth (users in `auth.users`) and Supabase Postgres (`public.profiles`, etc.)
- `@supabase/supabase-js` service-role and publishable clients
- Supabase-backed Express sessions (`public.user_sessions`)
- Zod request validation
- Multer file uploads
- PDF and DOCX document parsing

## Project structure

```text
frontend/
├── src/
│   ├── components/           Shared navigation and interface components
│   ├── pages/
│   │   ├── app/              Authenticated product pages
│   │   ├── auth/             Login, registration, and password pages
│   │   └── public/           Public landing page
│   ├── App.jsx               Route definitions
│   └── main.jsx              React entry point
├── package.json              Frontend commands
└── vite.config.js            Vite configuration and API proxy

backend/ (sibling of frontend/)
├── database/                 Archival MySQL schema (pre-migration reference only)
├── migrations/               Supabase/Postgres DDL
├── scripts/                  Setup and legacy migration commands
├── src/                      Express application (see backend/README.md)
└── storage/uploads/          Private uploaded resume files
```

## Requirements

Install these tools before running the project:

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project (cloud or self-hosted)

Check your installed versions:

```bash
node --version
npm --version
```

## Installation

From the `frontend/` directory, install both sets of dependencies:

```bash
npm install
npm --prefix ../backend install
```

The frontend and backend deliberately have separate `package.json` and lock files. This keeps browser dependencies separate from server dependencies.

## Supabase setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) and copy its URL, publishable key, and secret key.

### 2. Apply the schema

The backend communicates with Supabase over HTTPS (Auth + PostgREST), so DDL is applied once from the Supabase SQL Editor:

```bash
npm run db:migrate
```

The command prints the full Postgres schema (it creates `public.profiles`, `public.user_sessions`, and the other tables, all linked to `auth.users`). Paste it into **SQL Editor** in the Supabase dashboard and run it.

## Environment configuration

Copy the backend environment template:

```bash
cp ../backend/.env.example ../backend/.env
```

Edit `backend/.env` and enter your own values:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SECRET_KEY=sb_secret_your_key

SESSION_SECRET=replace_this_with_a_long_random_secret
SESSION_NAME=interviewai.sid
SESSION_TTL_HOURS=24

MAX_UPLOAD_MB=10
UPLOAD_DIR=storage/uploads
```

Generate a suitable session secret with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `backend/.env`. It is already excluded by `.gitignore`.

## Run the application

The frontend and backend run as two processes. Open two terminal windows in the `frontend/` directory.

### Terminal 1 — backend

```bash
npm run dev:backend
```

The API will be available at:

```text
http://localhost:5000/api/v1
```

Verify it with:

```bash
curl http://localhost:5000/api/v1/health
```

### Terminal 2 — frontend

```bash
npm run dev
```

Open the URL printed by Vite, normally:

```text
http://localhost:5173
```

During development, Vite forwards requests beginning with `/api` to the backend on port `5000`.

## Useful commands

Run these commands from the `frontend/` directory:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite frontend development server |
| `npm run dev:backend` | Start the backend with Node watch mode |
| `npm run build` | Create a production frontend build |
| `npm run preview` | Preview the production frontend build |
| `npm run lint` | Check frontend JavaScript |
| `npm run db:migrate` | Print the Supabase schema to apply via the SQL Editor |
| `npm run start:backend` | Start the backend without watch mode |

Backend-only commands may also be run inside `backend/`:

```bash
cd ../backend
npm run dev
npm test
```

## API overview

All API paths use the `/api/v1` prefix.

| Feature | Main endpoints |
| --- | --- |
| Health | `GET /health` |
| Authentication | `POST /auth/register`, `/auth/login`, `/auth/logout` |
| Password recovery | `POST /auth/forgot-password`, `/auth/reset-password` |
| Current user | `GET /auth/me` |
| Dashboard | `GET /dashboard` |
| Profile | `GET /profile`, `PUT /profile` |
| Resumes | `GET /resumes`, `POST /resumes`, `GET/DELETE /resumes/:id` |
| Jobs | `GET /jobs`, `POST /jobs`, `GET/DELETE /jobs/:id` |
| Job matching | `POST /jobs/match/calculate` |
| Interviews | `GET /interviews`, `POST /interviews`, `GET /interviews/:id` |
| Interview answers | `POST /interviews/:id/questions/:questionId/answer` |
| Complete interview | `POST /interviews/:id/complete` |
| Reports | `GET /reports`, `GET /reports/:sessionId` |
| Recommendations | `GET /recommendations` |

Authentication uses an HTTP-only session cookie. Browser requests must include credentials:

```js
const response = await fetch('/api/v1/auth/me', {
  credentials: 'include',
})
```

## Resume uploads

Submit resumes as `multipart/form-data` using the field name `resume`:

```js
const form = new FormData()
form.append('resume', selectedFile)

await fetch('/api/v1/resumes', {
  method: 'POST',
  credentials: 'include',
  body: form,
})
```

Supported types are PDF, DOC, and DOCX. PDF and DOCX text extraction is implemented. Legacy DOC files can be stored but require an external document converter for text extraction.

Uploaded documents are stored under `backend/storage/uploads/`. This directory is not exposed as a public static folder.

## Current AI status

OpenAI, Whisper, or other interview AI APIs are not connected yet.

The current backend:

- Creates interviews from a local question bank.
- Stores candidate answers and interview progress.
- Does not invent AI feedback or evaluation scores.
- Defines the future provider contract in `backend/src/services/interview-ai.port.js`.

A future AI implementation can generate personalised questions, evaluate answers, and transcribe audio through that service boundary without restructuring the rest of the application.

## Security notes

- Passwords are hashed by Supabase Auth and never stored or handled by the app.
- Sessions are stored server-side in Supabase (`public.user_sessions`) rather than in browser-readable tokens.
- Session cookies are HTTP-only and become secure cookies in production.
- Private database queries are restricted to the authenticated user (the Supabase Auth UUID).
- Upload size and MIME type are validated.
- Password resets use Supabase's recovery-link mechanism.
- User tables reference `auth.users(id)` with cascading deletes to prevent orphaned data.
- Production startup requires Supabase credentials and a session secret.

## Production build

Create the frontend assets with:

```bash
npm run build
```

The generated files are written to `dist/`. Start the API in production mode using suitable environment variables:

```bash
NODE_ENV=production npm run start:backend
```

In production, serve `dist/` through a web server or static hosting platform and proxy `/api` to the Express server. Set `FRONTEND_URL` to the exact public frontend origin.

## Troubleshooting

### The backend reports that it cannot connect to Supabase

- Confirm `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` in `backend/.env`.
- Check `GET /api/v1/health/supabase` for the connection test result.
- Make sure the schema has been applied (see "Supabase setup") — missing tables return a PostgREST error.

### The frontend receives `401 AUTH_REQUIRED`

- Register or log in first.
- Ensure API requests use `credentials: 'include'`.
- Confirm that `FRONTEND_URL` matches the Vite origin exactly.

### Port 5000 or 5173 is already in use

Change `PORT` in `backend/.env` for the API. If the backend port changes, also update the proxy target in `vite.config.js`.

### A resume upload is rejected

- Use PDF, DOC, or DOCX.
- Keep the file below `MAX_UPLOAD_MB`.
- Ensure the browser sends a multipart request using the field name `resume`.

## Additional documentation

More backend-specific details are available in [`backend/README.md`](backend/README.md).
