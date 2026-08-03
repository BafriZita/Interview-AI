# InterviewAI backend

Express + MySQL API for the InterviewAI web application. It covers the non-AI application domain: accounts, sessions, profiles, resumes, job descriptions, deterministic resume matching, interview records, reports, history, and saved recommendations.

## Folder structure

```text
backend/
├── database/              MySQL schema and development seed
├── scripts/               Database setup commands
├── src/
│   ├── config/            Environment, pool, and session configuration
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
│   └── server.js          Database check and HTTP listener
└── storage/uploads/       Private resume storage (not web-accessible)
```

## Local setup

1. Install MySQL 8 and create a database user with schema permissions.
2. Copy `.env.example` to `.env` and fill in the MySQL credentials.
3. Run `npm install` inside `backend/`.
4. Run `npm run db:migrate` to create the database and tables.
5. Optionally run `npm run db:seed` for a sample profile.
6. Run `npm run dev`. The API starts at `http://localhost:5000/api/v1`.

The React client must send cookies with API calls:

```js
fetch('http://localhost:5000/api/v1/auth/me', {
  credentials: 'include',
})
```

## API map

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`; `GET /auth/me` |
| Dashboard | `GET /dashboard` |
| Profile | `GET /profile`, `PUT /profile` |
| Resumes | `GET/POST /resumes`, `GET/DELETE /resumes/:id` |
| Jobs | `GET/POST /jobs`, `GET/DELETE /jobs/:id`, `POST /jobs/match/calculate` |
| Interviews | `GET/POST /interviews`, `GET /interviews/:id`, answer and complete endpoints |
| Reports | `GET /reports`, `GET /reports/:sessionId` |
| Recommendations | `GET /recommendations` |

All paths above are prefixed with `/api/v1`. Except for registration, login, password reset, and health, routes require the secure session cookie.

## AI integration boundary

There is intentionally no OpenAI or speech API integration. `src/services/interview-ai.port.js` defines the future contract, while the current interview flow uses a local question bank and stores answers without fabricated evaluation scores. A future provider can implement that interface without changing database or route ownership.

## Storage and security decisions

- Passwords are hashed with bcrypt (cost 12); plaintext is never stored.
- Sessions are server-side in MySQL. The browser receives only an HTTP-only session identifier.
- Every private query scopes records to the authenticated user.
- Resume files are stored outside public web assets, with size and MIME restrictions.
- The schema uses foreign keys and cascading deletes to avoid orphaned user data.
- Password reset tokens are stored as SHA-256 hashes and expire after 30 minutes.
- Production requires explicit secrets and secure cross-site cookies.
