# Mishka backend

Node.js + Express REST API for the Mishka Flutter app, backed by PostgreSQL and Prisma.

## OpenAPI (Swagger)

- **UI:** `GET /api-docs` — interactive Swagger UI (no login required to open the docs; use **Authorize** with `Bearer <token>` from login/register for protected routes in **Try it out**).
- **Raw spec:** `GET /openapi.json` — OpenAPI 3.0 document for codegen or Postman import.
- **Disable:** set env `DISABLE_SWAGGER=true` (e.g. in some production setups).
- **Try-it server URL:** set `SWAGGER_SERVER_URL` (or `SMOKE_BASE_URL`) if the default `http://127.0.0.1:<PORT>` does not match where you call the API from.
- **Documentation depth:** the spec includes **per-status descriptions**, **response examples** (success and error envelopes), **request body examples** on auth and AI routes, **multipart** notes for `/upload`, and expanded **tag** descriptions. Generic CRUD routes use the shared response set (`200`–`500`); see the top **info** block in Swagger for the HTTP status guide.

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

- **`/upload`** → `{ "session_id", "explanation" }` — creates `chat_sessions` with that `id`, first user line `Explain this file. Level: …`, model `explanation`, **`ai_requests`** (`featureType: upload`) with **`request_payload`** (summary level, original filename, stored path, size, MIME) and **`response_payload`** (full upstream JSON). The same **`summaries`** row stores that first model explanation (`chat_session_id` = session, `sourceType` = `upload_model_response`). File bytes are written under **`AI_UPLOAD_STORAGE_DIR`** as above.
- **`/chat`** → `{ "response": "<text>" }` — requires existing tutor session for user; appends user + `ai` **`chat_messages`** and **`ai_requests`** with **`request_payload`** (`session_id`, `message`) and **`response_payload`** (full upstream JSON).
- **REST AI tutor chat** (`POST /chat-sessions/{id}/messages`, `POST /chat-messages`) — flexible payloads for app needs; **`senderType` is forced to `user`** on create. AI messages are written only by the **`/upload`** / **`/chat`** persistence layer, not by clients. **Community group chat** is separate: **`GET` / `POST /communities/{id}/channels/{channelId}/messages`** (must have joined that group); those posts use the stricter **text / material** rules for sharing tutor material in a group.
- **`/generate-tools`** → `{ "status": "success", "tool_type", "content" }` with `tool_type` in `quizzes` \| `flashcards` \| `mind_maps` only:
  - **quizzes** — `content` is an array of **10** items: `{ question, options[4], correct_answer }` where `correct_answer` equals one option string; stored as `quizzes` / `quiz_questions` + `history_items`.
  - **flashcards** — `content` is an array of **10** items: `{ type: term\|fact\|note, front, back }`; stored as `flashcard_sets` / `flashcards` (`question` = `` `[type] front` ``, `answer` = `back`) + `history_items`.
  - **mind_maps** — `content` is `{ title, children: [...] }`; stored as **`mind_maps`** (`title`, JSON `content`) plus `ai_requests` / `history_items` (`referenceId` = mind map id).

Strict parsing lives in **`services/aiTutorContract.js`** and **`services/aiMaterializers.js`**; orchestration in **`services/aiPersistence.js`**. Persistence failures are **logged** only; the client still receives the upstream body inside the usual envelope.

## Roles and authorization

- JWT payload includes `role`: `student`, `teacher`, or `admin` (see Prisma `UserRole`).
- **`admin`**: full access, including `GET /users` (list all users), `POST /users`, `GET/PUT/DELETE /password-reset-tokens/*`, `GET /user-sessions` (global list), and mutating catalog routes (`POST/PUT/DELETE` on `/tips`, `/categories`, `/ai-tools`, `/icons`). **Communities** are mostly user-owned (create/join/roles); global admin can still bypass some checks where the API allows.
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

### Onboarding → sign up (Flutter)

1. After the in-app onboarding screens, collect **education** answers (same payload fields as registration):
   - **`educationStatus`**: `school` \| `university` \| `other`.
   - If **`other`**: **`educationOtherDetail`** (string) — what applies beyond school/university.
   - If **`school`**: **`schoolTrack`** `middle_school` \| `high_school`, and **`schoolGrade`** `1` \| `2` \| `3` (1st–3rd year in that track).
   - If **`university`**: **`universityYear`** integer `1`–`5`.
2. Optional verification: **`POST /auth/send-signup-otp`** with **either** `email` **or** `phoneNumber` (optional `countryCode`). Server stores a short-lived code in **`signup_verifications`**; you deliver it by email/SMS from your app or provider. For local testing only, `RETURN_SIGNUP_OTP_IN_RESPONSE=true` includes the code in JSON (**never** in production).
3. **`POST /auth/register`**: `firstName`, `lastName`, **`phoneNumber`**, optional `countryCode`, `email`, **`agreeTerms`: `true`**, optional **`rememberMe`**, password (unless using reserved OAuth fields below), the education fields above, and when **`SIGNUP_OTP_REQUIRED=true`** in `.env`, **`signupOtp`** is required. Until SMS/email delivery is implemented, **`signupOtp` of `111111`** is always accepted (skips checking `signup_verifications`). Set **`DISABLE_SIGNUP_OTP_BYPASS=true`** in production, or change the placeholder with **`SIGNUP_OTP_BYPASS_CODE`**. Otherwise use the real code from step 2.

**Password rules** (register, reset password, and password updates): length **8–20**, at least **one uppercase**, **one lowercase**, and **one special** (non-alphanumeric) character.

**Sign in:** `POST /auth/login` with **email + password** or **phoneNumber + password** (optional **`countryCode`** for phone). Optional **`rememberMe`** updates the user and uses a longer JWT expiry (`JWT_REMEMBER_ME_EXPIRES_IN`, default `30d`) vs `JWT_EXPIRES_IN` (default `7d`).

**Forgot password:** `POST /auth/forgot-password` with **email** or **phoneNumber** (optional **`countryCode`**). Response is always `{ sent: true }` when the account is missing (no user enumeration). Reset code is only returned in JSON if **`RETURN_RESET_CODE_IN_RESPONSE=true`** (dev).

**Reset password:** `POST /auth/reset-password` with `userId`, `resetCode`, `newPassword` (same password policy).

**OAuth (implemented)** — verify tokens on the server and return the same JWT envelope as password login.

| Route | Body | Env |
|-------|------|-----|
| `POST /auth/oauth/google` | `idToken` (from Google Sign-In), `agreeTerms: true`, optional `rememberMe`, profile overrides, optional education fields | **`GOOGLE_OAUTH_CLIENT_IDS`** — comma-separated OAuth client IDs (Android, iOS, Web) whose `aud` is accepted |
| `POST /auth/oauth/apple` | `identityToken` (JWT from Sign in with Apple), `agreeTerms: true`, same optional fields | **`APPLE_CLIENT_IDS`** (or **`APPLE_CLIENT_ID`**) — comma-separated bundle IDs and/or Services IDs for `aud` matching |
| `POST /auth/oauth/facebook` | `accessToken` (user token from Facebook Login), `agreeTerms: true`, same optional fields | **`FACEBOOK_APP_ID`**, **`FACEBOOK_APP_SECRET`** |

**Behaviour:** looks up `users` by `provider` + `provider_id`; otherwise links an existing account with the same **email** (sets `provider` / `provider_id` / `is_verified`); otherwise **creates** a user (no password). If Apple does not return an email, a stable placeholder address `oauth.apple.{hash}@internal.mishka` is used. **201** when a new user row is created, **200** when signing in to an existing user. **409** `AUTH_OAUTH_EMAIL_CONFLICT` if the email belongs to another provider identity. **503** `OAUTH_NOT_CONFIGURED` if the relevant env vars are missing.

**Flutter / consoles:** enable each provider’s product, register bundle IDs / SHA-1 / key hashes, request **email** scope where needed, and send the token returned by the SDK to the matching route above.

**Production:** HTTPS, rotate secrets, Apple **nonce** if you add stricter checks later, **`DISABLE_SIGNUP_OTP_BYPASS=true`**, and keep OAuth secrets out of client builds.

### Endpoints (summary)

- `POST /auth/send-signup-otp` — request signup OTP (public).
- `POST /auth/register` → `201`, tokens + `data.user` (includes education columns when stored).
- `POST /auth/login` → `200`, same token envelope.
- `POST /auth/oauth/google` \| `POST /auth/oauth/apple` \| `POST /auth/oauth/facebook` → `201` (new user) or `200` (existing), same token envelope.
- `GET /auth/me` — JWT required.

All routes except `/`, `/openapi.json`, `/api-docs`, `/auth/send-signup-otp`, `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/oauth/google`, `/auth/oauth/apple`, `/auth/oauth/facebook` require `Authorization: Bearer <token>`.

## AI (Flutter `MishkaAiService`)

- `POST /upload` — multipart `file`, optional `summary_level` (`simple` \| `detailed`, default `detailed`). Proxies unchanged to `AI_SERVICE_URL/upload`. On upstream success, Node saves the file under **`AI_UPLOAD_STORAGE_DIR`**, creates the tutor **`chat_sessions`** row (with upload metadata columns), seeds messages, and records **`ai_requests`**. Envelope `data` is still the upstream JSON (`session_id`, `explanation`).
- `POST /chat` — JSON body `session_id`, `message`. Proxies as FastAPI query params. On success, appends **`chat_messages`** and **`ai_requests`** (full upstream JSON in **`response_payload`**).
- `POST /generate-tools` — JSON `session_id`, `tool_type`, optional `complexity`. Same proxy pattern; on success persists **`ai_requests`**, materializes quizzes / flashcards / mind maps where applicable.

**Saved tutor material (per type):** same pattern for **quizzes**, **flashcard sets**, **summaries** (`/saved-summaries`, **`POST /summaries/{id}/share`**), and **mind maps** (`/saved-mind-maps`, **`/mind-maps`**, **`POST /mind-maps/{id}/share`**). Each type supports **list saved**, **add**, **delete** (clear `savedAt`), **share to channels**, and **`import-shared`** (clone another user’s item you can see via a channel share). Sharing does **not** depend on `savedAt`. Generic share: **`POST /material-shares`** with `materialType` `quiz` \| `flashcard_set` \| `summary` \| `mind_map`. **`GET /material-shares`** returns shares for **community groups (channels) you have joined** (not every channel in a community). You may **`GET`** the resource by id when it was shared into a group you can access.

**Quiz grading:** **`POST /quizzes/{id}/submit`** with `{ "answers": [ { "questionId": "<uuid>", "selectedOption": "A"|"B"|"C"|"D" } ] }` — must include **every** question exactly once (same visibility as **`GET /quizzes/{id}`**). Response includes **`correctCount`**, **`totalQuestions`**, **`scoreOutOfTen`** (integer **0–10**, `Math.round((correct/total)*10)` for badge tiers even when the quiz is not 10 questions), **`percentage`**, a persisted **`attempt`** row, and **`bestScoreOutOfTen`** for that user on that quiz. History: **`GET /quizzes/{id}/attempts`**.

## Study With Mishka (concentration + call)

Base path **`/study-with-mishka`** (JWT). **`concentration`** and **`call_with_mishka`** are **separate modes** (each with its own timer behavior), not nested URL paths.

- **Countdown / timer:** the server does **not** run a ticking process. It stores start/pause/end and phase settings; **`timerState`** on **`GET …/sessions/{id}`**, **`GET …/sessions/{id}/full-report`**, and each item in **`GET …/reports`** is a **recomputed snapshot** (includes **`serverNow`**). Poll while the session is active if the UI needs a live clock.
- **`GET /study-with-mishka/catalog`** — static definitions: concentration presets (**Classic Pomodoro**, **Flowtime**, **Ultradian**, **Quick sprint**, **Task-based**, **Custom**), defaults, customizable ranges, recommendations, **stage media** placeholders (`image` / `animatedUrl` / optional `videoUrl`). **`call_with_mishka`** documents mascot + camera UX, **ML pipeline** (summaries only — **no raw video** on this API), timers, and suggested telemetry types. Override asset host with env **`STUDY_WITH_MISHKA_MEDIA_BASE`**.
- **Top-level modes:** **`concentration`** (requires `concentrationPreset`) and **`call_with_mishka`** (omit preset; starts in phase **`focus`** for the main session timer). One **active or paused** session per user until **end**.
- **Lifecycle:** **`POST /study-with-mishka/sessions/start`** → **`POST …/sessions/:id/pause`** / **`resume`** → **`POST …/sessions/:id/end`** (`outcome`: `completed` | `abandoned`). **`POST …/sessions/:id/advance-phase`** syncs `focus` / `short_break` / `long_break` / `none` plus optional **`actualFocusMinutes`**, **`completedFocusCycle`**, **`resetAfterLongBreak`** for pomodoro-style counters.
- **Call-with-Mishka break timer:** **`POST …/sessions/:id/call-break/start`** and **`POST …/sessions/:id/call-break/end`** (optional `{ "durationSeconds" }`) — tallies **`totalCallBreakSeconds`** while keeping the call active; ending the session closes an open break automatically.
- **Activity & ML:** **`POST …/sessions/:id/telemetry`** batches **`events`** `{ eventType, payload?, clientTs? }`. **`POST …/sessions/:id/ml-reports`** accepts a **`payload`** object — **schema will tighten** once ML JSON is finalized.
- **Reports:** **`GET …/sessions/:id/full-report`** — **`exportMeta`** (truncation / totals), **session** (+ **`timerState`**), **`catalogSnapshot`** (preset + embedded **`customPreset`** when used), **`linkedTask`** (when **`linkedTaskId`** set), **checkIns**, **activityEvents**, **mlReports**, **`computed`** (telemetry window, **5‑minute activity buckets**, **lifecycle timeline**, check-in summaries, heuristic **ML rollups**, goals vs planned). **`GET /study-with-mishka/reports`** — paginated full-report-shaped **`items[]`**. **Period rollups (UTC):** **`GET /study-with-mishka/reports/day?date=YYYY-MM-DD`**, **`GET …/reports/week?date=YYYY-MM-DD`** (week containing that date, Monday UTC), **`GET …/reports/month?year=&month=`** — **`totals`**, per-session **`sessionSummaries`**, **`userContext`** (daily streak snapshot, completed count, baseline avg main-study from last **90** completed/abandoned sessions vs period average). Optional **`topLevelMode`** on all report list/period routes.
- **Metadata:** **`POST …/sessions/start`** — optional **`tags`** (strings), **`linkedTaskId`** (your task), **`clientAppVersion`**, **`platform`**. **`PATCH …/sessions/:id`** — same fields + **`title`**. **`POST …/sessions/:id/end`** — optional **`outcomeNotes`**. **`POST …/sessions/:id/ml-reports`** — **`payload`** object + optional **`schemaVersion`**.
- **Check-ins:** **`POST …/sessions/:id/check-ins`** with `kind`: **`still_there_yes_no`** | **`mood_scale_5`** | **`mood_scale_10`** | **`progress_yes_no`** and **`responseBool`** or **`responseInt`** as in the catalog.
- **Custom timers:** **`GET/POST /study-with-mishka/custom-timers`**, **`DELETE …/custom-timers/:id`**; **`lastUsedAt`** updates when you **start** with `concentrationPreset: "custom"` + `customPresetId`.
- **Stats:** **`GET /study-with-mishka/stats/summary`** — completed counts (all-time + last 30 days).
- **Flowtime:** **`GET …/sessions/:id`** includes **`flowtimeBreakSuggestion`** when the preset is Flowtime (same rules as catalog).

Legacy **`/study-sessions`** calendar CRUD has been **removed** (table dropped via migration); use Study With Mishka sessions only.

## Communities (v2)

- **Create** (`POST /communities`) — you become **owner**; set `visibility`: **`public`** (anyone can join with `communityId`) or **`private`** (invite-only). Optional `name`, `description`, `imageUrl`, `category`.
- **Join** (`POST /communities/join`) — public: `{ "communityId": "<uuid>" }`. Private: `{ "inviteCode": "…" }` or `{ "inviteToken": "<uuid>" }` from owner/admin (**GET** `…/invite`, **POST** `…/invite/regenerate`).
- **Members** — **GET** `…/members`; owner/admin **POST** `…/members` with `{ "email": "…" }` to add. **PATCH** / **DELETE** `…/members/{userId}` for role (`admin` \| `member`) or removal. Admins cannot change or remove the **owner** or other **admins**.
- **Groups** (`channels`) — **GET/POST** `…/channels`; **PUT/DELETE** `…/channels/{channelId}` (owner or admin). List/create responses include **`createdAt`**, **`createdBy`** (user id + name fields), and **`createdByDisplay`** (convenience string: full name or username). New groups set **`createdByUserId`** to the creator (owner or admin who called **POST**).
- **Duplicate group** — **POST** `…/channels/{channelId}/duplicate` (owner or admin). Copies **title** (optional body `{ "title": "…" }` to override), **description**, and **imageUrl** into a **new** empty group: **no** copied members, chat messages, or material shares; invite people via community membership + **POST** `…/channels/{newChannelId}/join`.
- **Clear group chat** — **DELETE** `…/channels/{channelId}/messages` — **community owner only** (deletes all messages in that channel; members and **material_shares** stay).
- **Community messages** — **GET/POST** `…/channels/{channelId}/messages` (group membership required); posts follow **text/material** validation (not the same as AI tutor REST chat).
- **Leave / save** — **POST** `…/leave` with optional `{ "keepSaved": true }` to bookmark after leaving. **POST/DELETE** `…/pin` saves or clears a bookmark while still a member.
- **Swagger:** see **Communities** tag and `/communities/*` paths in **`GET /openapi.json`** / **`GET /api-docs`** for the full tree.

**Membership flow** (community vs group; API reflects this in checks on each route):

```mermaid
stateDiagram-v2
    [*] --> Authenticated: JWT session

    state "Not a community member" as NM
    state "Community member" as M
    state "Joined this group (channel)" as G

    Authenticated --> NM: default for a given community
    NM --> M: POST /communities/join
    M --> NM: POST /communities/:id/leave (not owner)

    M --> G: POST .../channels/:channelId/join
    G --> M: DELETE .../channels/:channelId/join

    note right of NM
        Join public with body communityId,
        private with inviteCode or inviteToken
    end

    note right of M
        List members and channels,
        pin while member,
        owner or admin edits community and groups
    end

    note right of G
        GET and POST .../messages,
        material-shares for this channel
    end
```

## Setup

1. Install dependencies:

```bash
cd backend
npm install
npx prisma generate
```

2. Copy `.env.example` → `.env` and set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `AI_SERVICE_URL`. For AI uploads, set **`AI_UPLOAD_STORAGE_DIR`**. For stricter signup, set **`SIGNUP_OTP_REQUIRED=true`**; use **`RETURN_SIGNUP_OTP_IN_RESPONSE=true`** only on trusted dev machines. Before launch, set **`DISABLE_SIGNUP_OTP_BYPASS=true`** so placeholder OTP `111111` is rejected.

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

- Set a strong `JWT_SECRET`, restrict `CORS_ORIGIN` (avoid `*` in production). Keep **`FACEBOOK_APP_SECRET`** and other OAuth client secrets server-side only (env / secret manager), not in the Flutter app.
- Run `npx prisma migrate deploy` in CI/CD.
- Keep `RETURN_RESET_CODE_IN_RESPONSE` unset/false in production; deliver reset codes via email/SMS only.
- For AI uploads: point **`AI_UPLOAD_STORAGE_DIR`** at persistent storage (volume mount), ensure the process can read/write it, and include it in backups with **`DATABASE_URL`** data.
