# Mishka backend

Node.js + Express REST API for the Mishka Flutter app, backed by PostgreSQL and Prisma.

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

- `POST /upload` — multipart `file`, optional `summary_level` (requires auth). Proxies to `AI_SERVICE_URL/upload`; response is still wrapped in the envelope (`data` holds upstream JSON).
- `POST /chat`, `POST /generate-tools` — same (envelope + `data`).

## Setup

1. Install dependencies:

```bash
cd backend
npm install
npx prisma generate
```

2. Copy `.env.example` → `.env` and set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `AI_SERVICE_URL`.

3. Migrations:

```bash
npx prisma migrate dev --name init
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
