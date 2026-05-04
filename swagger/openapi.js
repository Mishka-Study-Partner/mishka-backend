const components = require("./components");
const paths = require("./paths");

const tags = [
  { name: "Public", description: "No authentication." },
  { name: "Auth", description: "Registration, login, password flow. `/auth/me` requires JWT." },
  {
    name: "AI proxy",
    description:
      "Proxied to `AI_SERVICE_URL` with the same wire format as FastAPI (multipart `/upload`; query params for `/chat` and `/generate-tools`). Requires JWT. On upstream HTTP 2xx, Express persists tutor data in PostgreSQL (`chat_sessions`, `chat_messages`, `ai_requests`, materialized quizzes/flashcards/mind maps) and stores a copy of uploaded files on disk under `AI_UPLOAD_STORAGE_DIR` (see README). Persistence errors are logged only; responses still use the normal envelope with upstream JSON in `data`.",
  },
  { name: "Users", description: "Admin list/create; self-or-admin for `/{id}` and nested routes." },
  { name: "Password reset tokens", description: "Admin only." },
  { name: "User sessions", description: "Global list admin-only; scoped CRUD by ownership." },
  { name: "User preferences", description: "Scoped to JWT user unless admin." },
  { name: "Tips", description: "Read for all authenticated users; writes admin-only." },
  { name: "User streaks", description: "Scoped CRUD." },
  { name: "AI tools", description: "Catalog read; writes admin-only." },
  { name: "Study sessions", description: "Scoped CRUD." },
  { name: "Communities", description: "Reads for members; writes admin-only where enforced." },
  { name: "Categories", description: "Catalog read; writes admin-only." },
  { name: "Icons", description: "Catalog read; writes admin-only." },
  { name: "Todo lists", description: "Scoped to owner; nested tasks." },
  { name: "Tasks", description: "Scoped CRUD." },
  { name: "Flashcard sets", description: "Scoped; nested flashcards." },
  { name: "Flashcards", description: "Scoped via parent set." },
  { name: "Quizzes", description: "Scoped; nested questions." },
  { name: "Quiz questions", description: "Scoped via parent quiz." },
  { name: "Chat sessions", description: "Scoped; nested messages." },
  { name: "Chat messages", description: "Scoped via parent session." },
  { name: "AI requests", description: "Scoped CRUD." },
  { name: "Summaries", description: "Scoped CRUD." },
  { name: "History items", description: "Scoped CRUD." },
  { name: "User communities", description: "Membership rows; scoped CRUD." },
  { name: "User saved categories", description: "Scoped CRUD." },
  { name: "User AI activity", description: "Scoped CRUD." },
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
        "Send **`Accept-Language`** (e.g. `ar`) to influence `message`; English and Arabic copies are always present.",
        "",
        "**Auth:** most routes need `Authorization: Bearer <accessToken>` from `/auth/login` or `/auth/register`.",
        "Exceptions: `GET /`, `/openapi.json`, `/api-docs`, `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`.",
        "",
        "**Roles:** JWT includes `role` (`student` | `teacher` | `admin`). Admins bypass row-level ownership where the API allows it.",
        "See project `README.md` for admin bootstrap and route notes.",
        "",
        "**Request bodies:** many write endpoints accept a generic JSON object aligned with Prisma models (`prisma/schema.prisma`).",
        "",
        "**AI tutor:** `POST /upload` saves the file bytes locally after a successful upstream response; `chat_sessions` includes optional upload metadata columns. See component schemas `AiTutorUploadData`, `AiTutorChatData`, `AiTutorGenerateToolsData` for typical `data` shapes inside the success envelope.",
      ].join("\n"),
    },
    servers: [{ url: base, description: "Override with env `SWAGGER_SERVER_URL` or `SMOKE_BASE_URL`" }],
    tags,
    components,
    paths,
  };
}

module.exports = { buildOpenApi };
