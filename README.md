# InterviewAI

InterviewAI is an interview-preparation platform designed for students and job seekers in Cameroon. It provides a modern workspace for managing resumes, comparing a candidate’s experience with job descriptions, practising interview questions, reviewing performance, and following career recommendations.

The repository contains a React frontend and a separate Express/MySQL backend. Interview-related AI and speech providers are intentionally not connected yet; the backend provides a clean integration boundary for adding them later.

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
- MySQL 8
- `mysql2` connection pooling
- MySQL-backed Express sessions
- bcrypt password hashing
- Zod request validation
- Multer file uploads
- PDF and DOCX document parsing

## Project structure

```text
my-app/
├── backend/
│   ├── database/             MySQL schema and development seed data
│   ├── scripts/              Migration and seed commands
│   ├── src/
│   │   ├── config/           Environment, database, and session setup
│   │   ├── middleware/       Authentication, uploads, validation, errors
│   │   ├── modules/          Feature-specific API routes and controllers
│   │   ├── routes/           Main API router
│   │   ├── services/         Parsing, question bank, future AI boundary
│   │   ├── utils/            Shared HTTP and validation helpers
│   │   ├── app.js            Express application configuration
│   │   └── server.js         Backend entry point
│   ├── storage/uploads/      Private uploaded resume files
│   ├── .env.example          Backend configuration template
│   └── package.json          Backend dependencies and commands
├── public/                   Static frontend assets
├── src/
│   ├── components/           Shared navigation and interface components
│   ├── pages/
│   │   ├── app/              Authenticated product pages
│   │   ├── auth/             Login and registration pages
│   │   └── public/           Public landing page
│   ├── App.jsx               Route definitions
│   └── main.jsx              React entry point
├── package.json              Frontend and root convenience commands
└── vite.config.js            Vite configuration and API proxy
```

## Requirements

Install these tools before running the project:

- Node.js 20 or newer
- npm 10 or newer
- MySQL 8 or newer

Check your installed versions:

```bash
node --version
npm --version
mysql --version
```

## Installation

From the repository root, install both sets of dependencies:

```bash
npm install
npm --prefix backend install
```

The frontend and backend deliberately have separate `package.json` and lock files. This keeps browser dependencies separate from server dependencies.

## MySQL setup

### 1. Start MySQL

The exact command depends on your operating system. For a Linux installation using systemd:

```bash
sudo systemctl start mysql
```

### 2. Create a database user

Sign in as a MySQL administrator:

```bash
mysql -u root -p
```

Then create a development user. The migration command will create the `interview_ai` database:

```sql
CREATE USER 'interview_ai_user'@'localhost' IDENTIFIED BY 'choose_a_strong_password';
GRANT ALL PRIVILEGES ON interview_ai.* TO 'interview_ai_user'@'localhost';
GRANT CREATE ON *.* TO 'interview_ai_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

If you do not want to grant global `CREATE`, create the database manually instead:

```sql
CREATE DATABASE interview_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON interview_ai.* TO 'interview_ai_user'@'localhost';
```

## Environment configuration

Copy the backend environment template:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and enter your own values:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=interview_ai
DB_USER=interview_ai_user
DB_PASSWORD=choose_a_strong_password
DB_CONNECTION_LIMIT=10

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

## Create the database tables

From the repository root, run:

```bash
npm run db:migrate
```

This command:

1. Connects using the values in `backend/.env`.
2. Creates the configured database when it does not exist.
3. Creates the application tables, indexes, and foreign keys.

Optional development data can be inserted with:

```bash
npm run db:seed
```

The schema is defined in `backend/database/schema.sql`.

## Run the application

The frontend and backend run as two processes. Open two terminal windows in the project root.

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

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite frontend development server |
| `npm run dev:backend` | Start the backend with Node watch mode |
| `npm run build` | Create a production frontend build |
| `npm run preview` | Preview the production frontend build |
| `npm run lint` | Check frontend and backend JavaScript |
| `npm run db:migrate` | Create or update the MySQL structure |
| `npm run db:seed` | Insert optional development data |
| `npm run start:backend` | Start the backend without watch mode |

Backend-only commands may also be run inside `backend/`:

```bash
cd backend
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

- Passwords are hashed with bcrypt and never stored as plain text.
- Sessions are stored in MySQL rather than inside browser-readable tokens.
- Session cookies are HTTP-only and become secure cookies in production.
- Private database queries are restricted to the authenticated user.
- Upload size and MIME type are validated.
- Password-reset tokens are hashed and expire after 30 minutes.
- Foreign keys and cascading deletes prevent orphaned user data.
- Production startup requires explicit database credentials and a session secret.

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

### The backend reports that it cannot connect to MySQL

- Confirm that the MySQL service is running.
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` in `backend/.env`.
- Confirm that the user has access to the database named by `DB_NAME`.
- Try signing in manually with `mysql -u interview_ai_user -p`.

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
