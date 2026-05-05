const components = require("./components");
const paths = require("./paths");

const tags = [
  { name: "Public", description: "No authentication." },
  {
    name: "Public app content",
    description:
      "Singleton app copy: **GET /public/app-settings** (no auth) returns privacy policy text and optional help & support fields. **PUT** the same path is **admin-only** (JWT) to update that content.",
  },
  {
    name: "Auth",
    description:
      "Registration (onboarding + education, optional signup OTP), login (email or phone + password), OAuth (Google, Apple, Facebook), password reset, `/auth/me` (JWT).",
  },
  {
    name: "AI proxy",
    description:
      "Proxied to `AI_SERVICE_URL` with the same wire format as FastAPI (multipart `/upload`; query params for `/chat` and `/generate-tools`). Requires JWT. On upstream HTTP 2xx, Express persists tutor data in PostgreSQL (`chat_sessions`, `chat_messages`, `ai_requests`, materialized quizzes/flashcards/mind maps) and stores a copy of uploaded files on disk under `AI_UPLOAD_STORAGE_DIR` (see README). Persistence errors are logged only; responses still use the normal envelope with upstream JSON in `data`.",
  },
  {
    name: "Users",
    description:
      "Admin list/create; self-or-admin for `/{id}` and nested routes. Responses use the standard envelope; list endpoints return `data` as an array of entities.",
  },
  {
    name: "Password reset tokens",
    description: "Admin-only CRUD for `password_reset_tokens`. Standard envelope; list/detail return `data` as array or object.",
  },
  {
    name: "User sessions",
    description: "JWT/session rows. Global list is admin-only; other routes scoped by ownership. **201** on create where applicable.",
  },
  { name: "User preferences", description: "One preference row per user (upsert). **200** on read/update; envelope `data` is the preference object." },
  { name: "Tips", description: "Catalog tips. Authenticated reads; **POST/PUT/DELETE** admin-only. List endpoints return `data` as an array." },
  { name: "User streaks", description: "User streak records. Scoped **GET/POST/PUT/DELETE**; see response schemas for `data` shape." },
  {
    name: "Daily streaks",
    description:
      "UTC calendar-day activity streak: counts when the user performs qualifying actions (or `POST /daily-streaks/ping`). Up to **2 freezes** protect a day without activity. Week view is Monday-based in UTC.",
  },
  {
    name: "Usage tracking",
    description:
      "Hybrid foreground time: **segments** (feature changes / pause) and **heartbeat** deltas while idle on a screen. All dates are **UTC**. Idempotent via `clientRequestId`.",
  },
  { name: "AI tools", description: "AI tool catalog. Writes admin-only. Responses follow global envelope rules." },
  {
    name: "Study With Mishka",
    description:
      "**`concentration`** and **`call_with_mishka`** are separate product modes (each with its own timer semantics), stored as **`study_concentration_sessions`** via **`topLevelMode`**. **`timerState`** on reads is a **server-recomputed snapshot** (poll **`GET …/sessions/{id}`**, **`GET …/full-report`**, or list **`GET …/reports`**) — not a background countdown process unless you add push/WebSockets later. Call mode: **no raw video** — **telemetry** + **`ml-reports`** JSON only (payload flexible until ML schema is finalized). **Pause/resume/end**, **call-break**, **advance-phase**, **check-ins**, **custom timers**, **`PATCH …/sessions/{id}`** metadata; **`GET …/full-report`**, **`GET …/reports`**, **`GET …/reports/day|week|month`** (UTC aggregates). **Localization:** same envelope rules as the rest of the API (`message_en` / `message_ar` always set). **العربية:** أوضاع منفصلة (تركيز / مكالمة مع مشكا)؛ لا يُخزَّن فيديو خام؛ التقارير والحقول الموثقة في Swagger لكل مسار.",
  },
  {
    name: "Communities",
    description:
      "**Communities v2:** public (open join) or private (invite code/token; owner/admin may add by email). Creator is **owner**; **admins** manage members and groups but cannot act on the owner. **Groups** (`channels`) have name, description, image, **createdAt**, **createdBy**; **POST …/duplicate** copies metadata into an empty group; **DELETE …/messages** clears chat (**community owner** only). Members **join or leave each group** separately. **Community group messages** — `GET/POST …/messages` — enforce text/material rules. **Saved communities:** pin while a member, or `keepSaved` on leave. **Material shares:** **POST /material-shares** targets channel ids you may post to; **GET /material-shares** lists shares for **groups you joined**.",
  },
  {
    name: "Saved library",
    description:
      "Per-material-type saved lists and **import-shared** clones: **saved-quizzes**, **saved-flashcard-sets**, **saved-summaries**, **saved-mind-maps** (each: list saved, add, remove, share to channels, import another user’s shared copy).",
  },
  { name: "Categories", description: "Category catalog and saved-by-users relations. Standard list/object `data` patterns." },
  { name: "Icons", description: "Icon catalog. Admin writes; **GET** lists for authenticated users." },
  { name: "Todo lists", description: "Todo lists and nested tasks. Owner-scoped unless admin." },
  { name: "Tasks", description: "Tasks CRUD (scoped). **POST** returns **201** with created row in `data`." },
  { name: "Flashcard sets", description: "Flashcard sets with nested cards. Nested routes return related collections in `data`." },
  { name: "Flashcards", description: "Single flashcard CRUD; parent set ownership enforced." },
  { name: "Quizzes", description: "Quizzes and questions; same envelope and status conventions as other resources." },
  { name: "Quiz questions", description: "Quiz question rows; validate parent quiz ownership via API rules." },
  { name: "Chat sessions", description: "Generic chat sessions (not only AI tutor). Messages nested under `/{id}/messages`." },
  {
    name: "Chat messages",
    description:
      "**AI tutor** session lines (`chat_messages`): flexible REST create/update bodies; `senderType` is forced to **user** on create; AI lines are written by the AI proxy, not clients. For **validated text/material** community posts, use **Communities** → `…/channels/{channelId}/messages`.",
  },
  { name: "AI requests", description: "Persisted AI request audit rows including `request_payload` / `response_payload` where stored." },
  {
    name: "Summaries",
    description:
      "User summaries CRUD. After **POST /upload**, the model explanation is stored as a **summary** row linked to the tutor session. **GET** detail is also allowed for **community members** when the summary was shared to a channel. **POST /summaries/{id}/share** posts to channels.",
  },
  {
    name: "Mind maps",
    description:
      "Mind map documents (`title` + JSON `content` tree) from **POST /generate-tools** (`mind_maps`). Same sharing and saved-library patterns as quizzes.",
  },
  { name: "History items", description: "History items referencing features; envelope `data` varies by query." },
  { name: "User communities", description: "Join table style membership CRUD between users and communities." },
  { name: "User saved categories", description: "Saved category links per user; standard **409** on duplicate insert." },
  { name: "User AI activity", description: "AI activity log rows per user; list responses return arrays in `data`." },
];

function buildOpenApi() {
  const port = process.env.PORT || 3000;
  const base =
    process.env.SWAGGER_SERVER_URL ||
    process.env.SMOKE_BASE_URL ||
    `http://127.0.0.1:${port}`;

  return {
    openapi: "3.0.3",
    info: {
      title: "Mishka API",
      version: "1.0.0",
      description: [
        "REST API for the Mishka Flutter app (Express + PostgreSQL + Prisma).",
        "",
        "**Envelope:** every JSON body uses `success`, `message`, `message_en`, `message_ar`, `data`, `error`, `details`.",
        "Send **`Accept-Language`** (e.g. `ar`, `ar-SA`) to influence **`message`** only; **`message_en`** and **`message_ar`** are always present for bilingual UI.",
        "**Arabic:** استخدم **`message_ar`** للنصوص الثابتة في التطبيق؛ **`message`** يعكس اللغة المفضلة عبر الهيدر.",
        "",
        "**HTTP status (typical):**",
        "- **200** — Success (`ApiSuccessEnvelope`, `data` per route).",
        "- **201** — Created (`ApiSuccessEnvelope`; same shape as 200, used after register / OAuth first sign-in / POST creates).",
        "- **400** — Validation or bad input (`VALIDATION_ERROR`, `details` often lists `{ path, message }[]`).",
        "- **401** — Missing/invalid JWT (`AUTH_MISSING_TOKEN`, `AUTH_INVALID_TOKEN`) or bad password on login.",
        "- **403** — Authenticated but not allowed (`FORBIDDEN`, `CORS_FORBIDDEN`).",
        "- **404** — Unknown route or missing row (`NOT_FOUND`).",
        "- **409** — Unique / conflict (`UNIQUE_VIOLATION`, OAuth email conflict, etc.).",
        "- **502** — AI proxy only: upstream FastAPI error (`AI_SERVICE_ERROR`, `details.upstreamStatus`).",
        "- **503** — Misconfiguration (`SERVICE_UNAVAILABLE`, OAuth not configured, etc.).",
        "- **500** — Unhandled server error (`INTERNAL_ERROR`).",
        "Most operations document these via the **Responses** section; examples show sample envelopes.",
        "",
        "**Auth:** most routes need `Authorization: Bearer <accessToken>` from `/auth/login` or `/auth/register`.",
        "Exceptions: `GET /`, `/openapi.json`, `/api-docs`, `/auth/send-signup-otp`, `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/oauth/google`, `/auth/oauth/apple`, `/auth/oauth/facebook`.",
        "Operations without `security` never return **401** from auth middleware; **401** still applies to wrong password on `POST /auth/login`.",
        "",
        "**Roles:** JWT includes `role` (`student` | `teacher` | `admin`). Admins bypass row-level ownership where the API allows it.",
        "See project `README.md` for admin bootstrap and route notes.",
        "",
        "**Request bodies:** many write endpoints use `#/components/schemas/JsonRecord` (see example there) aligned with Prisma models (`prisma/schema.prisma`). Prefer schema **Example** / **Try it out** for copy-paste payloads.",
        "",
        "**AI tutor:** `POST /upload` saves the file bytes locally after a successful upstream response; `chat_sessions` includes optional upload metadata columns. See `AiTutorUploadData`, `AiTutorChatData`, `AiTutorGenerateToolsData` for typical `data` shapes inside the success envelope.",
        "**Community group chat** is separate: messages under `/communities/.../channels/.../messages`, not `/chat-sessions` / `/chat-messages`. Owner may **DELETE** `…/messages` to clear a group; **POST** `…/duplicate` clones group metadata without members or messages.",
      ].join("\n"),
    },
    servers: [{ url: base, description: "Override with env `SWAGGER_SERVER_URL` or `SMOKE_BASE_URL`" }],
    tags,
    components,
    paths,
  };
}

module.exports = { buildOpenApi };
