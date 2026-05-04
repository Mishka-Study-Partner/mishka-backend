# Mishka backend

Node.js + Express REST API for the Mishka Flutter app, backed by PostgreSQL and Prisma.

## OpenAPI (Swagger)

- **UI:** `GET /api-docs` — interactive Swagger UI (no login required to open the docs; use **Authorize** with `Bearer <token>` from login/register for protected routes in **Try it out**).
- **Raw spec:** `GET /openapi.json` — OpenAPI 3.0 document for codegen or Postman import.
- **Disable:** set env `DISABLE_SWAGGER=true` (e.g. in some production setups).
- **Try-it server URL:** set `SWAGGER_SERVER_URL` (or `SMOKE_BASE_URL`) if the default `http://127.0.0.1:<PORT>` does not match where you call the API from.

## Architecture

- **API** — Express (default port `3000`), JSON envelope on every response.
- **Data** — PostgreSQL via Prisma.
- **AI** — Optional separate HTTP service (`AI_SERVICE_URL`); Express proxies `/upload`, `/chat`, `/generate-tools` without changing the FastAPI wire format. Node persists outcomes in Postgres and keeps an on-disk copy of each uploaded file (see below).

## AI tutor (FastAPI) + persistence

The upstream app (see `AI_SERVICE_URL`) is the **Mishka AI Study Partner** FastAPI service from the AI team doc. The Python service is unchanged: multipart and query params stay the same. **Node** adds durable storage after each successful upstream call (HTTP 2xx).

### Upload file copy on disk

- Env **`AI_UPLOAD_STORAGE_DIR`** (default `data/ai-uploads`, relative to the process working directory, or an absolute path): each successful **`POST /upload`** writes the raw bytes under `{userId}/{session_id}/` with a sanitized filename.
- The matching **`chat_sessions`** row stores **`upload_stored_path`** (path relative to that root), **`upload_original_filename`**, **`upload_mime_type`**, **`upload_size_bytes`**.
- Add this directory to backups alongside the database. It is listed in `.gitignore` as `data/ai-uploads/`.

| Upstream route | Express proxy | Upstream wire format |
|----------------|---------------|----------------------|
| `POST /upload` | `POST /upload` | multipart `file`, form `summary_level` (`simple` / `detailed`, default `detailed`) |
| `POST /chat` | `POST /chat` | FastAPI **query** params `session_id`, `message` (Express still accepts JSON body from clients and forwards as query) |
| `POST /generate-tools` | `POST /generate-tools` | FastAPI **query** params `session_id`, `tool_type`, `complexity` (default `Intermediate` if omitted) |

**Upstream JSON (success only, persisted after HTTP 2xx):**

- **`/upload`** → `{ "session_id", "explanation" }` — creates `chat_sessions` with that `id`, first user line `Explain this file. Level: …`, model `explanation`, **`ai_requests`** (`featureType: upload`) with **`request_payload`** (summary level, original filename, stored path, size, MIME) and **`response_payload`** (full upstream JSON). File bytes are written under **`AI_UPLOAD_STORAGE_DIR`** as above.
- **`/chat`** → `{ "response": "<text>" }` — requires existing tutor session for user; appends user + `ai` **`chat_messages`** and **`ai_requests`** with **`request_payload`** (`session_id`, `message`) and **`response_payload`** (full upstream JSON).
- **`/generate-tools`** → `{ "status": "success", "tool_type", "content" }` with `tool_type` in `quizzes` \| `flashcards` \| `mind_maps` only:
  - **quizzes** — `content` is an array of **10** items: `{ question, options[4], correct_answer }` where `correct_answer` equals one option string; stored as `quizzes` / `quiz_questions` + `history_items`.
  - **flashcards** — `content` is an array of **10** items: `{ type: term\|fact\|note, front, back }`; stored as `flashcard_sets` / `flashcards` (`question` = `` `[type] front` ``, `answer` = `back`) + `history_items`.
  - **mind_maps** — `content` is `{ title, children: [...] }`; full tree stays in `ai_requests.response_payload`; `history_items` row references that `ai_requests` id.

Strict parsing lives in **`services/aiTutorContract.js`** and **`services/aiMaterializers.js`**; orchestration in **`services/aiPersistence.js`**. Persistence failures are **logged** only; the client still receives the upstream body inside the usual envelope.

## Roles and authorization

- JWT payload includes `role`: `student`, `teacher`, or `admin` (see Prisma `UserRole`).
- **`admin`**: full access, including `GET /users` (list all users), `POST /users`, `GET/PUT/DELETE /password-reset-tokens/*`, `GET /user-sessions` (global list), and mutating catalog routes (`POST/PUT/DELETE` on `/tips`, `/categories`, `/communities`, `/ai-tools`, `/icons`).
- **Everyone else**: may only access **their own** user id in `/users/:id` and nested routes (`/users/:id/tasks`, …). `GET /users` without being admin returns **403** (`FORBIDDEN`).
- **User-owned rows** (tasks, todo lists, chat sessions, flashcards, quizzes, preferences, etc.): non-admins are scoped to `userId ===` their JWT `sub`. Admins may read/write any row when the API accepts a `userId` on that resource.
- **First admin**: promote a user in the database, e.g. `UPDATE users SET role = 'admin' WHERE email = 'your@email.com';` then log in again so a new JWT includes `admin`.

## Response envelope (Flutter / Dio)

Every JSON response uses the same shape:

```json
{
  "success": true,
  "message": "Localized short summary",
  "message_en": "English summary",
  "message_ar": "Arabic summary",
  "data": {},
  "error": null,
  "details": null
}
```

Errors use `success: false`, `data: null`, `error` as a **stable machine code** (e.g. `AUTH_INVALID_CREDENTIALS`), and `details` for validation issues or extra context.

**Language:** send `Accept-Language: ar` (or `ar-EG`, etc.) to prefer Arabic in `message`. `message_en` and `message_ar` are always present so Flutter models can pick either field.

## Auth

- Register: `POST /auth/register` → `201`, `data.accessToken`, `data.tokenType` (`Bearer`), `data.user`, etc.
- Login: `POST /auth/login` → `200`, same `data` shape.
- Me: `GET /auth/me` with `Authorization: Bearer <accessToken>`.
- Forgot password: `POST /auth/forgot-password` → `data.sent` (reset code is **not** returned unless `RETURN_RESET_CODE_IN_RESPONSE=true` in `.env`).
- Reset password: `POST /auth/reset-password` with `userId`, `resetCode`, `newPassword`.

All routes except `/`, `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` require `Authorization: Bearer <token>`.

## AI (Flutter `MishkaAiService`)

- `POST /upload` — multipart `file`, optional `summary_level` (`simple` \| `detailed`, default `detailed`). Proxies unchanged to `AI_SERVICE_URL/upload`. On upstream success, Node saves the file under **`AI_UPLOAD_STORAGE_DIR`**, creates the tutor **`chat_sessions`** row (with upload metadata columns), seeds messages, and records **`ai_requests`**. Envelope `data` is still the upstream JSON (`session_id`, `explanation`).
- `POST /chat` — JSON body `session_id`, `message`. Proxies as FastAPI query params. On success, appends **`chat_messages`** and **`ai_requests`** (full upstream JSON in **`response_payload`**).
- `POST /generate-tools` — JSON `session_id`, `tool_type`, optional `complexity`. Same proxy pattern; on success persists **`ai_requests`**, materializes quizzes / flashcards / mind maps where applicable.

## Setup

1. Install dependencies:

```bash
cd backend
npm install
npx prisma generate
```

2. Copy `.env.example` → `.env` and set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `AI_SERVICE_URL`. If you use the AI tutor upload route, set **`AI_UPLOAD_STORAGE_DIR`** to a writable path (default `data/ai-uploads` is fine for local dev).

3. Migrations (first time):

```bash
npx prisma migrate dev
```

4. Run:

```bash
node index.js
```

## Smoke test

With the server running:

```bash
npm run test:smoke
```

## Postman

Import `postman/Mishka-Hardened.postman_collection.json`. After login, set collection variable `token` to `data.accessToken` from the response body.

## Production notes

- Set a strong `JWT_SECRET`, restrict `CORS_ORIGIN` (avoid `*` in production).
- Run `npx prisma migrate deploy` in CI/CD.
- Keep `RETURN_RESET_CODE_IN_RESPONSE` unset/false in production; deliver reset codes via email/SMS only.
- For AI uploads: point **`AI_UPLOAD_STORAGE_DIR`** at persistent storage (volume mount), ensure the process can read/write it, and include it in backups with **`DATABASE_URL`** data.
