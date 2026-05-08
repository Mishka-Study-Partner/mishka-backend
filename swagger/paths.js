const R = require("./responses");
const Ex = require("./examples");

const lang = [{ $ref: "#/components/parameters/AcceptLanguage" }];
const bearer = [{ bearerAuth: [] }];

/** Appended to Study With Mishka operations: envelope + bilingual fields. */
const studyI18n =
  "**Localization:** Every response uses the global envelope (`success`, `message`, `message_en`, `message_ar`, `data`, `error`, `details`). Send **`Accept-Language: ar`** (or regional variants) so **`message`** prefers Arabic; Flutter should prefer **`message_en` / `message_ar`** for consistent UI copy. **توطين:** الحقول **`message_en`** و **`message_ar`** دائمة؛ الهيدر **`Accept-Language`** يغيّر **`message`** فقط.";

const todoListQueryParams = [
  ...lang,
  {
    name: "q",
    in: "query",
    required: false,
    schema: { type: "string" },
    description: "Substring match on **`listName`** (case-insensitive).",
  },
  {
    name: "listType",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["calendar", "college", "work", "personal"] },
    description: "Filter by catalog list kind.",
  },
  {
    name: "limit",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
    description: "Max rows (default **50**, max **100**).",
  },
  {
    name: "offset",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 0, default: 0 },
    description: "Pagination skip.",
  },
];

const taskListQueryParamsAdminUser = {
  name: "userId",
  in: "query",
  required: false,
  schema: { type: "string", format: "uuid" },
  description:
    "**Admin only** on **`GET /tasks`**. Restrict results to one owner; omit to search across **all** users’ tasks (heavy). Ignored for non-admins.",
};

const taskListQueryParamsCore = [
  {
    name: "q",
    in: "query",
    required: false,
    schema: { type: "string" },
    description: "Search **`title`** or **`description`** (case-insensitive).",
  },
  {
    name: "status",
    in: "query",
    required: false,
    schema: { type: "string", example: "pending,missed" },
    description: "Comma-separated: **`pending`**, **`completed`**, **`missed`**.",
  },
  {
    name: "listId",
    in: "query",
    required: false,
    schema: { type: "string", format: "uuid" },
    description: "Only tasks in this list. **Ignored** when calling **`GET /todo-lists/{id}/tasks`** (path id wins).",
  },
  {
    name: "dueDateFrom",
    in: "query",
    required: false,
    schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    description: "Inclusive UTC date lower bound (`dueDate` column).",
  },
  {
    name: "dueDateTo",
    in: "query",
    required: false,
    schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    description: "Inclusive UTC date upper bound (`dueDate` column).",
  },
  {
    name: "dueOn",
    in: "query",
    required: false,
    schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    description: "Calendar shortcut: tasks due on this **UTC day**. Mutually exclusive with **`dueDateFrom`/`dueDateTo`**.",
  },
  {
    name: "upcomingOnly",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["true", "false"], default: "false" },
    description:
      "When **`true`**: **`pending`** only and combined due instant (**`dueDate` + `dueTime`**, UTC) **≥ now**. Good for home/deadlines widgets.",
  },
  {
    name: "withinDays",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 0, maximum: 366 },
    description:
      "Restrict to due instant between **start of today UTC** and **end of today+N UTC**. Combine with **`upcomingOnly`** for “next N days” deadlines.",
  },
  {
    name: "limit",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 200, default: 100 },
    description: "Page size after filters.",
  },
  {
    name: "offset",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 0, default: 0 },
    description: "Pagination skip after filters.",
  },
];

const taskListQueryParamsScoped = [...lang, ...taskListQueryParamsCore];
const taskListQueryParamsGlobal = [...lang, taskListQueryParamsAdminUser, ...taskListQueryParamsCore];

/**
 * Default response set for authenticated CRUD routes.
 * **401** / **403** apply only when `security: bearer` is set on the operation.
 */
const std = (extra = {}) => ({
  200: R.OkEnvelope,
  201: R.CreatedEnvelope,
  400: R.BadRequest,
  401: R.Unauthorized,
  403: R.Forbidden,
  404: R.NotFound,
  409: R.Conflict,
  500: R.InternalError,
  ...extra,
});

/**
 * @param {string} schemaRef
 * @param {string} [desc]
 * @param {unknown} [example] Optional OpenAPI `example` for Try it out / codegen.
 */
const jsonBody = (schemaRef, desc, example) => {
  const appJson = {
    schema: { $ref: schemaRef },
    description: desc || undefined,
  };
  if (example !== undefined) {
    appJson.example = example;
  }
  return {
    required: true,
    content: {
      "application/json": appJson,
    },
  };
};

/** @type {Record<string, unknown>} */
const paths = {
  "/": {
    get: {
      tags: ["Public"],
      summary: "API info",
      description: "No authentication. Returns service name, status, and links to Swagger UI and OpenAPI JSON.",
      parameters: lang,
      responses: {
        200: {
          description:
            "**200 OK** — Public metadata. `data` includes `swaggerUi` and `openApiJson` URLs when the `Host` header is present.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiSuccessEnvelope" },
              examples: {
                root: {
                  summary: "Root payload",
                  value: Ex.envelopeSuccess(Ex.rootData),
                },
              },
            },
          },
        },
        400: R.BadRequest,
        500: R.InternalError,
      },
    },
  },

  "/public/app-settings": {
    get: {
      tags: ["Public app content"],
      summary: "Privacy policy and help & support (public)",
      description:
        "No authentication. Returns singleton `privacyPolicyText` (admin-edited) and optional support fields (`supportEmail`, `supportPhone`, `supportFacebookUrl`, `supportInstagramUrl`).",
      parameters: lang,
      responses: {
        200: R.OkEnvelope,
        400: R.BadRequest,
        500: R.InternalError,
      },
    },
    put: {
      tags: ["Public app content"],
      summary: "Update privacy policy and support contacts (admin)",
      description: "Requires JWT with `admin` role. Partial updates allowed.",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/UpdateAppPublicSettingsBody", ""),
      responses: std(),
    },
  },

  "/auth/send-signup-otp": {
    post: {
      tags: ["Auth"],
      summary: "Send signup verification code (email or phone)",
      description:
        "Request a one-time code **before** `POST /auth/register`. Send **either** `email` **or** `phoneNumber` (with optional `countryCode`), not both. Codes expire in 15 minutes. If `SIGNUP_OTP_REQUIRED=true`, registration must include `signupOtp`; until real delivery exists, `signupOtp` equal to `SIGNUP_OTP_BYPASS_CODE` (default `111111`) is accepted without a DB row. Integrate SMS/email in production; for local dev, `RETURN_SIGNUP_OTP_IN_RESPONSE=true` returns the code in the envelope (never enable in production).",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/SendSignupOtpBody", "", { email: "norhankandil160@gmail.com" }),
      responses: {
        ...std({ 409: R.defaultError }),
        200: R.SendSignupOtp200Ok,
      },
    },
  },
  "/auth/verify-signup-otp": {
    post: {
      tags: ["Auth"],
      summary: "Verify signup OTP",
      description:
        "Checks if `signupOtp` is valid for the provided email/phone and not expired or consumed. Useful for a dedicated verify screen before calling `POST /auth/register`.",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/VerifySignupOtpBody", "", {
        email: "norhankandil160@gmail.com",
        signupOtp: "111111",
      }),
      responses: {
        ...std(),
        200: R.VerifySignupOtp200Ok,
      },
    },
  },
  "/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register",
      description:
        "Password accounts require `phoneNumber`, `agreeTerms: true`, and password policy (8–20 chars, upper, lower, special). `educationStatus` is optional, but if sent then conditional school/university fields are validated. When `SIGNUP_OTP_REQUIRED=true`, call `/auth/send-signup-otp` first and send `signupOtp` (or use bypass code `111111` until real delivery). Optional `provider` + `providerId` for reserved manual linking; prefer **`POST /auth/oauth/*`** for Google, Apple, and Facebook.",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/RegisterBody", "", Ex.registerRequestExample),
      responses: (() => {
        const out = { ...std({ 409: R.defaultError }) };
        delete out["200"];
        out["201"] = R.CreatedEnvelope;
        return out;
      })(),
    },
  },
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login",
      description: "Sign in with **email + password** or **phoneNumber + password** (optional `countryCode` when using phone). Optional `rememberMe` updates the user and issues a longer-lived JWT when true.",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/LoginBody", "", Ex.loginRequestExample),
      responses: {
        ...std(),
        200: R.Login200Ok,
      },
    },
  },
  "/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Current user (JWT)",
      description:
        "Requires `Authorization: Bearer <accessToken>`. Returns `data.user` (no password) and `data.preference` (`user_preferences` row or `null`). Legacy accounts without `username` receive one on this call (derived from name).",
      parameters: lang,
      security: bearer,
      responses: {
        ...std(),
        200: R.AuthMe200Ok,
      },
    },
  },
  "/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Logout (invalidate current JWT session)",
      description:
        "Requires `Authorization: Bearer <accessToken>`. Marks the matching `user_sessions` row inactive so the same token should be rejected if you add session checks later. Client should discard the token.",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Request password reset",
      description:
        "Send **either** `email` **or** `phoneNumber` (with optional `countryCode` to disambiguate). Always returns `{ sent: true }` when no user exists (no enumeration). Reset code is emailed/SMS’d by your integration unless `RETURN_RESET_CODE_IN_RESPONSE=true` (dev only).",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/ForgotPasswordBody", "", { email: "norhankandil160@gmail.com" }),
      responses: {
        ...std(),
        200: R.ForgotPassword200Ok,
      },
    },
  },
  "/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password with code",
      description:
        "`newPassword` must satisfy the same policy as registration (8–20 chars, upper, lower, special). Identity may be provided as `userId` or `email` or `phoneNumber` + optional `countryCode`.",
      parameters: lang,
      requestBody: jsonBody(
        "#/components/schemas/ResetPasswordBody",
        "",
        { email: "norhankandil160@gmail.com", resetCode: "12345", newPassword: "N3w!Strong1" }
      ),
      responses: {
        ...std(),
        200: R.ResetPassword200Ok,
      },
    },
  },
  "/auth/oauth/google": {
    post: {
      tags: ["Auth"],
      summary: "Sign in or register with Google",
      description:
        "Verifies `idToken` from the Google SDK (`GOOGLE_OAUTH_CLIENT_IDS` must list your Android/iOS/Web client IDs). Creates a user on first sign-in or links by verified email. Returns `201` when a new user row is created, otherwise `200`. Requires `agreeTerms: true`.",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/OauthGoogleBody", "", {
        idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.example.google-id-token",
        agreeTerms: true,
        rememberMe: false,
      }),
      responses: {
        ...std({ 201: R.CreatedEnvelope, 409: R.defaultError, 503: R.ServiceUnavailable }),
        200: R.OAuthReturn200Ok,
      },
    },
  },
  "/auth/oauth/apple": {
    post: {
      tags: ["Auth"],
      summary: "Sign in or register with Apple",
      description:
        "Verifies `identityToken` (JWT) from Sign in with Apple (`APPLE_CLIENT_IDS` comma-separated bundle / services IDs). If Apple does not return email, a stable placeholder `@internal.mishka` address is used. `201` on first account creation.",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/OauthAppleBody", "", {
        identityToken: "eyJraWQiOiJXWkQiLCJhbGciOiJSUzI1NiJ9.example.apple-identity-token",
        agreeTerms: true,
      }),
      responses: {
        ...std({ 201: R.CreatedEnvelope, 409: R.defaultError, 503: R.ServiceUnavailable }),
        200: R.OAuthReturn200Ok,
      },
    },
  },
  "/auth/oauth/facebook": {
    post: {
      tags: ["Auth"],
      summary: "Sign in or register with Facebook",
      description:
        "Validates the user `accessToken` via Graph `debug_token` (`FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`). `201` on first account creation.",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/OauthFacebookBody", "", {
        accessToken: "EAABsbCS1iHgBO7ZC.example-facebook-user-access-token",
        agreeTerms: true,
      }),
      responses: {
        ...std({ 201: R.CreatedEnvelope, 409: R.defaultError, 503: R.ServiceUnavailable }),
        200: R.OAuthReturn200Ok,
      },
    },
  },

  "/upload": {
    post: {
      tags: ["AI proxy"],
      summary: "Proxy file upload to AI service",
      description: [
        "Multipart `file` and optional form field `summary_level` (`simple` or `detailed`, default `detailed`).",
        "Forwards unchanged to FastAPI `POST /upload`. Requires `AI_SERVICE_URL`.",
        "On upstream **2xx**, Node writes the file under `AI_UPLOAD_STORAGE_DIR` (`{userId}/{session_id}/…`), creates `chat_sessions` (with `upload_stored_path`, original name, MIME, size), seeds the first tutor messages, and inserts `ai_requests` (`featureType: upload`) with storage metadata in `request_payload` and the upstream JSON in `response_payload`.",
        "Envelope `data` matches upstream: see schema `AiTutorUploadData`.",
        "**Try it out:** choose a small PDF as `file`; `summary_level` can be omitted (defaults to `detailed`).",
      ].join(" "),
      parameters: lang,
      security: bearer,
      requestBody: {
        required: true,
        description:
          "Use **Try it out** → **Choose File** for `file`. Curl example: `curl -H 'Authorization: Bearer <token>' -F 'file=@./notes.pdf' -F 'summary_level=detailed' http://127.0.0.1:3000/upload`.",
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: {
                file: { type: "string", format: "binary", description: "PDF or other material; proxied as-is to FastAPI." },
                summary_level: {
                  type: "string",
                  enum: ["simple", "detailed"],
                  description: "Defaults to `detailed` if omitted.",
                },
              },
            },
          },
        },
      },
      responses: {
        ...std({ 502: R.BadGatewayAi, 503: R.ServiceUnavailable }),
        200: R.AiUpload200Ok,
      },
    },
  },
  "/chat": {
    post: {
      tags: ["AI proxy"],
      summary: "Proxy chat to AI service",
      description: [
        "Client sends JSON (`session_id`, `message`). Express forwards to FastAPI as **query** params on `POST /chat`, matching the AI Study Partner app.",
        "On upstream **2xx**, Node appends `chat_messages` (user + AI) and `ai_requests` (`featureType: chat`) with full upstream JSON in `response_payload`.",
        "Envelope `data` shape: `AiTutorChatData`.",
      ].join(" "),
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/AiChatBody", "", Ex.aiChatRequestExample),
      responses: {
        ...std({ 502: R.BadGatewayAi, 503: R.ServiceUnavailable }),
        200: R.AiChat200Ok,
      },
    },
  },
  "/generate-tools": {
    post: {
      tags: ["AI proxy"],
      summary: "Proxy generate-tools to AI service",
      description: [
        "Client sends JSON. Express forwards `session_id`, `tool_type`, `complexity` as **query** params on `POST /generate-tools` (FastAPI). `complexity` defaults to `Intermediate` if omitted.",
        "On upstream **2xx**, Node inserts `ai_requests` with full upstream JSON in `response_payload` and materializes quizzes, flashcards, or mind maps per `tool_type`.",
        "Envelope `data` shape on success: `AiTutorGenerateToolsData`.",
      ].join(" "),
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/AiGenerateToolsBody", "", Ex.aiGenerateToolsRequestExample),
      responses: {
        ...std({ 502: R.BadGatewayAi, 503: R.ServiceUnavailable }),
        200: R.AiGenerateTools200Ok,
      },
    },
  },

  "/users": {
    get: {
      tags: ["Users"],
      summary: "List all users (admin only)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Users"],
      summary: "Create user (admin only)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "User fields; optional password hashed server-side"),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/users/{id}": {
    get: {
      tags: ["Users"],
      summary: "Get user by id (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Users"],
      summary: "Update user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/UpdateUserBody", ""),
      responses: std(),
    },
    delete: {
      tags: ["Users"],
      summary: "Delete user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/todo-lists": {
    get: {
      tags: ["Users"],
      summary: "List todo lists for user (self or admin)",
      description:
        "Supports **`q`** (search **listName**), **`listType`**, **`limit`**, **`offset`**. Same filters as **`GET /todo-lists`**.",
      parameters: [...todoListQueryParams, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/tasks": {
    get: {
      tags: ["Users"],
      summary: "List tasks for user (self or admin)",
      description:
        "Same query params as **`GET /tasks`** except **`userId`** (owner comes from path). **`status`** includes **`missed`**. Dates interpreted in **UTC**.",
      parameters: [...taskListQueryParamsScoped, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/chat-sessions": {
    get: {
      tags: ["Users"],
      summary: "List chat sessions for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/flashcard-sets": {
    get: {
      tags: ["Users"],
      summary: "List flashcard sets for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/quizzes": {
    get: {
      tags: ["Users"],
      summary: "List quizzes for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/summaries": {
    get: {
      tags: ["Users"],
      summary: "List summaries for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/history-items": {
    get: {
      tags: ["Users"],
      summary: "List history items for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/streaks": {
    get: {
      tags: ["Users"],
      summary: "List streaks for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/communities": {
    get: {
      tags: ["Users"],
      summary: "List user communities (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Users"],
      summary: "Attach community (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "Requires `communityId`"),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/users/{id}/communities/{communityId}": {
    delete: {
      tags: ["Users"],
      summary: "Detach community (self or admin)",
      parameters: [
        ...lang,
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "communityId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/saved-categories": {
    get: {
      tags: ["Users"],
      summary: "List saved categories for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Users"],
      summary: "Save category (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "Requires `categoryId`"),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/users/{id}/saved-categories/{categoryId}": {
    delete: {
      tags: ["Users"],
      summary: "Unsave category (self or admin)",
      parameters: [
        ...lang,
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "categoryId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/ai-requests": {
    get: {
      tags: ["Users"],
      summary: "List AI requests for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/ai-activity": {
    get: {
      tags: ["Users"],
      summary: "List AI activity for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/preferences": {
    get: {
      tags: ["Users"],
      summary: "Get preferences for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Users"],
      summary: "Upsert preferences for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "language, theme, notificationsEnabled"),
      responses: std(),
    },
  },

  "/password-reset-tokens": {
    get: {
      tags: ["Password reset tokens"],
      summary: "List tokens (admin only)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Password reset tokens"],
      summary: "Create token (admin only)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/password-reset-tokens/by-user/{userId}": {
    get: {
      tags: ["Password reset tokens"],
      summary: "List tokens by user (admin only)",
      parameters: [
        ...lang,
        { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      responses: std(),
    },
  },
  "/password-reset-tokens/{id}": {
    get: {
      tags: ["Password reset tokens"],
      summary: "Get token by id (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdInt" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Password reset tokens"],
      summary: "Update token (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdInt" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Password reset tokens"],
      summary: "Delete token (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdInt" }],
      security: bearer,
      responses: std(),
    },
  },

  "/user-sessions": {
    get: {
      tags: ["User sessions"],
      summary: "List all sessions (admin only)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["User sessions"],
      summary: "Create session (JWT userId forced for non-admins)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/user-sessions/by-user/{userId}": {
    get: {
      tags: ["User sessions"],
      summary: "List sessions by user (self or admin)",
      parameters: [
        ...lang,
        { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      responses: std(),
    },
  },
  "/user-sessions/{id}": {
    get: {
      tags: ["User sessions"],
      summary: "Get session by id",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["User sessions"],
      summary: "Update session",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["User sessions"],
      summary: "Delete session",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/communities/join": {
    post: {
      tags: ["Communities"],
      summary: "Join a community",
      description:
        "Public: body `{ \"communityId\": \"<uuid>\" }` only. Private: body `{ \"inviteToken\": \"<uuid>\" }` or `{ \"inviteCode\": \"…\" }` only (from owner/admin invite).",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "`communityId` XOR `inviteCode` / `inviteToken`."),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/communities": {
    get: {
      tags: ["Communities"],
      summary: "List communities you can see",
      description: "Public communities, ones you belong to, or any if global admin.",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Communities"],
      summary: "Create community (you become owner)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "`name`, `visibility` (`public`|`private`), optional `description`, `imageUrl`, `category`."),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/communities/{id}/leave": {
    post: {
      tags: ["Communities"],
      summary: "Leave community (not owner)",
      description: "Optional `{ \"keepSaved\": true }` bookmarks the community under **user_saved_communities** after leaving.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "Optional `keepSaved` boolean."),
      responses: std(),
    },
  },
  "/communities/{id}/pin": {
    post: {
      tags: ["Communities"],
      summary: "Save / pin community while still a member",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    delete: {
      tags: ["Communities"],
      summary: "Remove pin / saved bookmark",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/communities/{id}/invite": {
    get: {
      tags: ["Communities"],
      summary: "Get private invite code and token",
      description: "Owner or community admin; private communities only.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/communities/{id}/invite/regenerate": {
    post: {
      tags: ["Communities"],
      summary: "Regenerate private invite credentials",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/communities/{id}/members": {
    get: {
      tags: ["Communities"],
      summary: "List members with roles",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Communities"],
      summary: "Add member by email (owner/admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "`{ \"email\": \"…\" }`"),
      responses: std(),
    },
  },
  "/communities/{id}/members/{userId}": {
    patch: {
      tags: ["Communities"],
      summary: "Set member role (admin|member)",
      description: "Owner or admin. Admins cannot change owner or other admins.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }, { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "`{ \"role\": \"admin\" | \"member\" }`"),
      responses: std(),
    },
    delete: {
      tags: ["Communities"],
      summary: "Remove member",
      description: "Owner or admin. Cannot remove owner. Admins cannot remove other admins.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }, { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      security: bearer,
      responses: std(),
    },
  },
  "/communities/{id}/channels": {
    get: {
      tags: ["Communities"],
      summary: "List groups (channels); includes `joined`, `createdAt`, `createdBy`, `createdByDisplay`",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Communities"],
      summary: "Create a group (channel)",
      description: "Owner or community admin.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/CommunityChannelCreateBody", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/communities/{id}/channels/{channelId}": {
    put: {
      tags: ["Communities"],
      summary: "Update group (name, description, image)",
      parameters: [
        ...lang,
        { $ref: "#/components/parameters/IdUuid" },
        { name: "channelId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Communities"],
      summary: "Delete group",
      parameters: [
        ...lang,
        { $ref: "#/components/parameters/IdUuid" },
        { name: "channelId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      responses: std(),
    },
  },
  "/communities/{id}/channels/{channelId}/join": {
    post: {
      tags: ["Communities"],
      summary: "Join this group",
      parameters: [
        ...lang,
        { $ref: "#/components/parameters/IdUuid" },
        { name: "channelId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      responses: std(),
    },
    delete: {
      tags: ["Communities"],
      summary: "Leave this group",
      parameters: [
        ...lang,
        { $ref: "#/components/parameters/IdUuid" },
        { name: "channelId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      responses: std(),
    },
  },
  "/communities/{id}/channels/{channelId}/duplicate": {
    post: {
      tags: ["Communities"],
      summary: "Duplicate group (same details, empty chat)",
      description:
        "Owner or admin. New group copies **title** (optional override in body), **description**, and **imageUrl** from the source. Does **not** copy members, messages, or material shares — add members with **POST …/join** after they join the community.",
      parameters: [
        ...lang,
        { $ref: "#/components/parameters/IdUuid" },
        { name: "channelId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/CommunityChannelDuplicateBody", "Optional `{ \"title\": \"…\" }`; default title matches the source group."),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/communities/{id}/channels/{channelId}/messages": {
    get: {
      tags: ["Communities"],
      summary: "List community group messages",
      description: "Must have joined the group. Text/material-only rules apply on **POST**.",
      parameters: [
        ...lang,
        { $ref: "#/components/parameters/IdUuid" },
        { name: "channelId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Communities"],
      summary: "Post a community group message",
      parameters: [
        ...lang,
        { $ref: "#/components/parameters/IdUuid" },
        { name: "channelId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/CommunityChannelMessageCreateBody", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
    delete: {
      tags: ["Communities"],
      summary: "Clear all messages in this group (community owner only)",
      description:
        "Deletes every **community_channel_messages** row for this channel. Does not remove members or **material_shares**. Global admin bypasses like other owner-only checks.",
      parameters: [
        ...lang,
        { $ref: "#/components/parameters/IdUuid" },
        { name: "channelId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      security: bearer,
      responses: std(),
    },
  },
  "/communities/{id}": {
    get: {
      tags: ["Communities"],
      summary: "Get community",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Communities"],
      summary: "Update community (owner or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Communities"],
      summary: "Delete community (owner or global admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/categories": {
    get: {
      tags: ["Categories"],
      summary: "List categories",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Categories"],
      summary: "Create category (admin only)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/categories/{id}": {
    get: {
      tags: ["Categories"],
      summary: "Get category",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Categories"],
      summary: "Update category (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Categories"],
      summary: "Delete category (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/categories/{id}/saved-by-users": {
    get: {
      tags: ["Categories"],
      summary: "Saved-by-users for category (scoped for non-admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/tips": {
    get: {
      tags: ["Tips"],
      summary: "List tips",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Tips"],
      summary: "Create tip (admin only)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/tips/{id}": {
    get: {
      tags: ["Tips"],
      summary: "Get tip",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Tips"],
      summary: "Update tip (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Tips"],
      summary: "Delete tip (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/icons": {
    get: {
      tags: ["Icons"],
      summary: "List icons",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Icons"],
      summary: "Create icon (admin only)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/icons/{id}": {
    get: {
      tags: ["Icons"],
      summary: "Get icon by numeric id",
      parameters: [...lang, { $ref: "#/components/parameters/IdInt" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Icons"],
      summary: "Update icon (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdInt" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Icons"],
      summary: "Delete icon (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdInt" }],
      security: bearer,
      responses: std(),
    },
  },
  "/icons/{id}/todo-lists": {
    get: {
      tags: ["Icons"],
      summary: "Todo lists using this icon (scoped for non-admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdInt" }],
      security: bearer,
      responses: std(),
    },
  },

  "/ai-tools": {
    get: {
      tags: ["AI tools"],
      summary: "List AI tools",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["AI tools"],
      summary: "Create AI tool (admin only)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/ai-tools/{id}": {
    get: {
      tags: ["AI tools"],
      summary: "Get AI tool",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["AI tools"],
      summary: "Update AI tool (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["AI tools"],
      summary: "Delete AI tool (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/ai-tools/{id}/activity": {
    get: {
      tags: ["AI tools"],
      summary: "Activity for tool (scoped for non-admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/todo-lists": {
    get: {
      tags: ["Todo lists"],
      summary: "List todo lists (scoped to JWT user unless admin)",
      description:
        "**Search:** optional **`q`** on **listName**. **Filter:** **`listType`** (`calendar` | `college` | `work` | `personal`). **Pagination:** **`limit`** (default 50), **`offset`**.",
      parameters: todoListQueryParams,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Todo lists"],
      summary: "Create todo list",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/todo-lists/{id}": {
    get: {
      tags: ["Todo lists"],
      summary: "Get todo list",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Todo lists"],
      summary: "Update todo list",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Todo lists"],
      summary: "Delete todo list",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/todo-lists/{id}/tasks": {
    get: {
      tags: ["Todo lists"],
      summary: "List tasks in list",
      description:
        "Same filters as **`GET /tasks`**; **`listId`** query param is ignored — path **`id`** is always used.",
      parameters: [...taskListQueryParamsScoped, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Todo lists"],
      summary: "Create task in list",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },

  "/tasks": {
    get: {
      tags: ["Tasks"],
      summary: "List tasks (scoped + search + calendar / upcoming filters)",
      description:
        "**`status`:** `pending` \| `completed` \| **`missed`** (comma-separated allowed). **`dueOn`** = single UTC calendar day; **`dueDateFrom`/`dueDateTo`** = inclusive date range — do not mix with **`dueOn`**. **`upcomingOnly=true`** ⇒ pending tasks whose due instant (**date + time**, UTC) is still in the future. **`withinDays`** ⇒ due instant from start of **today UTC** through end of **today+N UTC**. Combine **`upcomingOnly`** + **`withinDays`** + **`limit`** (e.g. **10**) for home-screen deadlines. **`userId`** query: **admins only** to scope another user; omit for all users.",
      parameters: taskListQueryParamsGlobal,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Tasks"],
      summary: "Create task",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/tasks/{id}": {
    get: {
      tags: ["Tasks"],
      summary: "Get task",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Tasks"],
      summary: "Update task",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Tasks"],
      summary: "Delete task",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/flashcard-sets": {
    get: {
      tags: ["Flashcard sets"],
      summary: "List flashcard sets (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Flashcard sets"],
      summary: "Create flashcard set",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/flashcard-sets/{id}": {
    get: {
      tags: ["Flashcard sets"],
      summary: "Get flashcard set with flashcards",
      description:
        "Owner or admin. **Community members** may read the set if it was shared into a channel of a community they belong to.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Flashcard sets"],
      summary: "Update flashcard set",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Flashcard sets"],
      summary: "Delete flashcard set",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/flashcard-sets/{id}/share": {
    post: {
      tags: ["Flashcard sets"],
      summary: "Share this flashcard set to community channels",
      description:
        "Owner only. Same as **POST /material-shares** with `materialType: flashcard_set`; `savedAt` is **not** required.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMaterialShareToChannelsBody", ""),
      responses: std(),
    },
  },
  "/flashcard-sets/{id}/flashcards": {
    get: {
      tags: ["Flashcard sets"],
      summary: "List flashcards in set",
      description: "Same visibility rules as **GET /flashcard-sets/{id}** (owner/admin or community member with a channel share).",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Flashcard sets"],
      summary: "Create flashcard in set",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "Requires `question`, `answer`; `setId` optional"),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },

  "/flashcards": {
    get: {
      tags: ["Flashcards"],
      summary: "List flashcards (scoped via parent set)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Flashcards"],
      summary: "Create flashcard (requires owned `setId`)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/flashcards/{id}": {
    get: {
      tags: ["Flashcards"],
      summary: "Get flashcard",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Flashcards"],
      summary: "Update flashcard",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Flashcards"],
      summary: "Delete flashcard",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/quizzes": {
    get: {
      tags: ["Quizzes"],
      summary: "List quizzes (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Quizzes"],
      summary: "Create quiz",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/quizzes/{id}": {
    get: {
      tags: ["Quizzes"],
      summary: "Get quiz with questions",
      description:
        "Owner or admin. **Community members** may also read the quiz if it was shared into a channel of a community they belong to.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Quizzes"],
      summary: "Update quiz",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Quizzes"],
      summary: "Delete quiz",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/quizzes/{id}/share": {
    post: {
      tags: ["Quizzes"],
      summary: "Share this quiz to community channels",
      description:
        "Owner only. Same as **POST /material-shares** with `materialType: quiz` and `materialId` = `{id}`; `savedAt` is **not** required.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMaterialShareToChannelsBody", ""),
      responses: std(),
    },
  },
  "/quizzes/{id}/questions": {
    get: {
      tags: ["Quizzes"],
      summary: "List questions for quiz",
      description: "Same visibility rules as **GET /quizzes/{id}** (owner/admin or community member with a channel share).",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Quizzes"],
      summary: "Create question in quiz",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/quizzes/{id}/submit": {
    post: {
      tags: ["Quizzes"],
      summary: "Submit quiz answers (graded)",
      description:
        "Same read access as **GET /quizzes/{id}**. Body lists every question once with `selectedOption` A–D. Response includes **`scoreOutOfTen`** (0–10, rounded from correct ratio) for badge tiers, **`percentage`**, persisted **`attempt`**, and **`bestScoreOutOfTen`** for this user on this quiz.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/QuizSubmitBody", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/quizzes/{id}/attempts": {
    get: {
      tags: ["Quizzes"],
      summary: "List my attempts for this quiz",
      description: "Newest first (capped). Includes **`bestScoreOutOfTen`** across attempts.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/quiz-questions": {
    get: {
      tags: ["Quiz questions"],
      summary: "List questions (scoped via parent quiz)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Quiz questions"],
      summary: "Create question (requires owned `quizId`)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/quiz-questions/{id}": {
    get: {
      tags: ["Quiz questions"],
      summary: "Get question",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Quiz questions"],
      summary: "Update question",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Quiz questions"],
      summary: "Delete question",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/chat-sessions": {
    get: {
      tags: ["Chat sessions"],
      summary: "List chat sessions (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Chat sessions"],
      summary: "Create chat session",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/chat-sessions/{id}/timeline": {
    get: {
      tags: ["Chat sessions"],
      summary: "Full tutor session timeline (history replay)",
      description:
        "`data` bundles `session`, ordered `messages`, `aiRequests` (upload/chat/generate-tools payloads), and material linked to this session: `quizzes`, `flashcardSets`, `summaries` (upload model explanation row), and `mindMaps` (generate-tools mind_maps) with nested questions/cards as applicable.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/chat-sessions/{id}": {
    get: {
      tags: ["Chat sessions"],
      summary: "Get chat session with messages",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Chat sessions"],
      summary: "Rename chat session (title only)",
      description: "Body is `{ \"title\": \"…\" }` or `{ \"title\": null }` to clear. Other fields are not accepted here.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/ChatSessionTitleBody", ""),
      responses: std(),
    },
    delete: {
      tags: ["Chat sessions"],
      summary: "Delete chat session",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/chat-sessions/{id}/messages": {
    get: {
      tags: ["Chat sessions"],
      summary: "List messages in session",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Chat sessions"],
      summary: "Create message in AI tutor session",
      description:
        "AI tutor chat: flexible `chat_messages` payload (same as before). For **community group** text/material-only messages use **POST /communities/{id}/channels/{channelId}/messages**.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },

  "/chat-messages": {
    get: {
      tags: ["Chat messages"],
      summary: "List messages (scoped via session)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Chat messages"],
      summary: "Create message (requires owned `sessionId`)",
      description: "AI tutor session messages; flexible body.",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/chat-messages/{id}": {
    get: {
      tags: ["Chat messages"],
      summary: "Get message",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Chat messages"],
      summary: "Update message",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Chat messages"],
      summary: "Delete message",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/ai-requests": {
    get: {
      tags: ["AI requests"],
      summary: "List AI requests (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["AI requests"],
      summary: "Create AI request",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/ai-requests/{id}": {
    get: {
      tags: ["AI requests"],
      summary: "Get AI request",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["AI requests"],
      summary: "Update AI request",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["AI requests"],
      summary: "Delete AI request",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/summaries": {
    get: {
      tags: ["Summaries"],
      summary: "List summaries (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Summaries"],
      summary: "Create summary",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/summaries/{id}": {
    get: {
      tags: ["Summaries"],
      summary: "Get summary",
      description:
        "Owner or admin. **Community members** may read the summary if it was shared into a channel of a community they belong to.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Summaries"],
      summary: "Update summary",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Summaries"],
      summary: "Delete summary",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/summaries/{id}/share": {
    post: {
      tags: ["Summaries"],
      summary: "Share this summary to community channels",
      description: "Owner only. Same as **POST /material-shares** with `materialType: summary`.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMaterialShareToChannelsBody", ""),
      responses: std(),
    },
  },

  "/mind-maps": {
    get: {
      tags: ["Mind maps"],
      summary: "List mind maps (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Mind maps"],
      summary: "Create mind map",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", "Typically `title`, `content` (JSON tree), `sourceType`; `userId` set for non-admins."),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/mind-maps/{id}": {
    get: {
      tags: ["Mind maps"],
      summary: "Get mind map",
      description:
        "Owner or admin. **Community members** may read if the mind map was shared into a channel of a community they belong to.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Mind maps"],
      summary: "Update mind map",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Mind maps"],
      summary: "Delete mind map",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/mind-maps/{id}/share": {
    post: {
      tags: ["Mind maps"],
      summary: "Share this mind map to community channels",
      description: "Owner only. Same as **POST /material-shares** with `materialType: mind_map`.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMaterialShareToChannelsBody", ""),
      responses: std(),
    },
  },

  "/history-items": {
    get: {
      tags: ["History items"],
      summary: "List history items (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["History items"],
      summary: "Create history item",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/history-items/{id}": {
    get: {
      tags: ["History items"],
      summary: "Get history item",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["History items"],
      summary: "Update history item",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["History items"],
      summary: "Delete history item",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/study-with-mishka/catalog": {
    get: {
      tags: ["Study With Mishka"],
      summary: "Catalog: concentration presets, call-with-Mishka UX, check-in kinds, media placeholders",
      description: [
        "**Auth:** JWT required.",
        "**Returns ** `data` = static JSON: **`concentrationModes`** (Pomodoro, Flowtime, …), **`callWithMishka`** (no raw video policy, suggested telemetry), **`checkInKinds`**, customizable ranges, optional **media** URLs when **`STUDY_WITH_MISHKA_MEDIA_BASE`** is set.",
        "**Statuses:** **200** success; **401** missing/invalid token; **500** server error.",
        studyI18n,
        "**Arabic:** كتالوج ثابت لواجهات التركيز والمكالمة — لا يخزّن الفيديو الخام على الـ API.",
      ].join("\n\n"),
      parameters: lang,
      security: bearer,
      responses: { ...std(), 200: R.StudyCatalog200Ok },
    },
  },
  "/study-with-mishka/custom-timers": {
    get: {
      tags: ["Study With Mishka"],
      summary: "List saved custom timer presets (recent first)",
      description: [
        "**Auth:** JWT. **Returns:** `data` = array (max ~30) of your **`study_custom_timer_presets`** rows.",
        "**Statuses:** **200**; **401**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: lang,
      security: bearer,
      responses: { ...std(), 200: R.StudyCustomTimersList200Ok },
    },
    post: {
      tags: ["Study With Mishka"],
      summary: "Create a custom timer preset",
      description: [
        "**Required body:** `focusMinutes`, `shortBreakMinutes`, `longBreakMinutes` (see schema). **Optional:** `name`, `pomodorosBeforeLongBreak` (default 4).",
        "**Statuses:** **201** created; **400** validation; **401**; **500**.",
        studyI18n,
        "**Arabic:** حفظ أطوال الجلسة والاستراحات بالدقائق.",
      ].join("\n\n"),
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/StudyCustomTimerPresetBody", "Strict body; mirrors server Zod validation."),
      responses: { ...std(), 201: R.StudyCustomTimerCreated201Ok },
    },
  },
  "/study-with-mishka/custom-timers/{id}": {
    delete: {
      tags: ["Study With Mishka"],
      summary: "Delete a custom timer preset",
      description: [
        "**Path `id`:** preset UUID you own.",
        "**Returns:** `data` = `{ deleted: true }`.",
        "**Statuses:** **200**; **401**; **403/404** if not found or not yours; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: { ...std(), 200: R.StudyTimerDeleted200Ok },
    },
  },
  "/study-with-mishka/reports": {
    get: {
      tags: ["Study With Mishka"],
      summary: "Paginated merged session reports",
      description: [
        "**Query — optional:** `limit` (default **20**, max **50**), `offset` (default **0**), `topLevelMode` (`concentration` | `call_with_mishka`) to filter.",
        "**Returns:** `data` = `{ total, limit, offset, items[] }`; each **`items`** entry matches **GET …/sessions/{id}/full-report** (large nested object).",
        "**Statuses:** **200**; **401**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [
        ...lang,
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          description: "Page size (max 50). / حجم الصفحة.",
        },
        {
          name: "offset",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 0, default: 0 },
          description: "Skip N sessions (newest-first order).",
        },
        {
          name: "topLevelMode",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["concentration", "call_with_mishka"] },
          description: "Filter by mode; omit for both. / تصفية حسب نوع الجلسة.",
        },
      ],
      security: bearer,
      responses: { ...std(), 200: R.StudyReportsPaginated200Ok },
    },
  },
  "/study-with-mishka/reports/day": {
    get: {
      tags: ["Study With Mishka"],
      summary: "Day rollup (UTC calendar day)",
      description: [
        "**Query — required:** `date` = **`YYYY-MM-DD`** (UTC midnight boundary).",
        "**Query — optional:** `topLevelMode` filter.",
        "**Includes sessions where `startedAt` ∈ [UTC day start, next day).** Returns **`totals`**, **`sessionSummaries`**, **`userContext`** (streak snapshot, baseline avg from recent completed sessions — see README).",
        "**Statuses:** **200**; **400** invalid date; **401**; **500**.",
        studyI18n,
        "**Arabic:** تقرير يوم كامل بتوقيت UTC.",
      ].join("\n\n"),
      parameters: [
        ...lang,
        {
          name: "date",
          in: "query",
          required: true,
          schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", example: "2026-05-05" },
          description: "UTC calendar date. / التاريخ بالتقويم UTC.",
        },
        {
          name: "topLevelMode",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["concentration", "call_with_mishka"] },
          description: "Optional filter.",
        },
      ],
      security: bearer,
      responses: { ...std(), 200: R.StudyPeriodReport200Ok },
    },
  },
  "/study-with-mishka/reports/week": {
    get: {
      tags: ["Study With Mishka"],
      summary: "Week rollup (UTC Monday → Monday)",
      description: [
        "**Query — required:** `date` — any **`YYYY-MM-DD`** falling inside the week; server computes **Monday 00:00 UTC** through **next Monday** (exclusive).",
        "**Optional:** `topLevelMode`. Same aggregate shape as **reports/day**.",
        "**Statuses:** **200**; **400** invalid date; **401**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [
        ...lang,
        {
          name: "date",
          in: "query",
          required: true,
          schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          description: "Any day in the target ISO week (UTC).",
        },
        {
          name: "topLevelMode",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["concentration", "call_with_mishka"] },
        },
      ],
      security: bearer,
      responses: { ...std(), 200: R.StudyPeriodReport200Ok },
    },
  },
  "/study-with-mishka/reports/month": {
    get: {
      tags: ["Study With Mishka"],
      summary: "Month rollup (UTC month)",
      description: [
        "**Query — required:** `year` (2000–2100), `month` (1–12). Bounds are UTC month start/end.",
        "**Optional:** `topLevelMode`. Same aggregate shape as **reports/day**.",
        "**Statuses:** **200**; **400** invalid year/month; **401**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [
        ...lang,
        {
          name: "year",
          in: "query",
          required: true,
          schema: { type: "integer", minimum: 2000, maximum: 2100, example: 2026 },
        },
        {
          name: "month",
          in: "query",
          required: true,
          schema: { type: "integer", minimum: 1, maximum: 12, example: 5 },
        },
        {
          name: "topLevelMode",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["concentration", "call_with_mishka"] },
        },
      ],
      security: bearer,
      responses: { ...std(), 200: R.StudyPeriodReport200Ok },
    },
  },
  "/study-with-mishka/stats/summary": {
    get: {
      tags: ["Study With Mishka"],
      summary: "Quick stats: completed session counts",
      description: [
        "**Returns:** `data` = `{ completedTotal, completedLast30Days }` (UTC rolling window for 30-day field).",
        "**Statuses:** **200**; **401**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: lang,
      security: bearer,
      responses: { ...std(), 200: R.StudyStatsSummary200Ok },
    },
  },
  "/study-with-mishka/sessions": {
    get: {
      tags: ["Study With Mishka"],
      summary: "List recent sessions",
      description: [
        "**Returns:** `data` = array (recent cap ~80) of session rows enriched with **`timerState`** and **`flowtimeBreakSuggestion`** when preset is Flowtime.",
        "**Statuses:** **200**; **401**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: lang,
      security: bearer,
      responses: { ...std(), 200: R.StudySessionsList200Ok },
    },
  },
  "/study-with-mishka/sessions/start": {
    post: {
      tags: ["Study With Mishka"],
      summary: "Start a session (exclusive: one active/paused per user)",
      description: [
        "**Conflict:** **400** if another session is already **active** or **paused**.",
        "**Body:** see **`StudyWithMishkaStartBody`** — `topLevelMode` required; concentration mode needs `concentrationPreset`; optional `tags`, `linkedTaskId` (must be your task), `clientAppVersion`, `platform`.",
        "**Statuses:** **201** session created; **400** validation / business rule; **401**; **403** invalid `customPresetId` / `linkedTaskId`; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/StudyWithMishkaStartBody", ""),
      responses: { ...std(), 201: R.StudySessionCreated201Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/full-report": {
    get: {
      tags: ["Study With Mishka"],
      summary: "Full merged report for one session",
      description: [
        "**Path `id`:** session UUID.",
        "**Returns:** `data` includes **`exportMeta`**, **`session`** (+ **`timerState`**), **`catalogSnapshot`** (preset + optional **`customPreset`**), **`linkedTask`**, **`checkIns`**, **`activityEvents`** (≤800), **`mlReports`** (≤100), **`computed`** analytics.",
        "**Statuses:** **200**; **401**; **404** wrong id / not yours; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: { ...std(), 200: R.StudyFullReport200Ok },
    },
  },
  "/study-with-mishka/sessions/{id}": {
    get: {
      tags: ["Study With Mishka"],
      summary: "Session detail + timer snapshot",
      description: [
        "**Polling:** Use for live UI; **`timerState`** recomputed on each read (server does not push ticks).",
        "**Statuses:** **200**; **401**; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: { ...std(), 200: R.StudySessionDetail200Ok },
    },
    patch: {
      tags: ["Study With Mishka"],
      summary: "Patch metadata (tags, linked task, client info, title)",
      description: [
        "**Body:** **`StudySessionPatchBody`** — at least one field; `null` clears `title`, `linkedTaskId`, `clientAppVersion`, `platform`.",
        "**Statuses:** **200** updated session; **400** empty body; **401**; **403** invalid task; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/StudySessionPatchBody", ""),
      responses: { ...std(), 200: R.StudySessionDetail200Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/pause": {
    post: {
      tags: ["Study With Mishka"],
      summary: "Pause session",
      description: [
        "**Precondition:** session **status** must be **active**; else **400**.",
        "**Returns:** updated session row + **timerState**.",
        "**Statuses:** **200**; **400**; **401**; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: { ...std(), 200: R.StudySessionDetail200Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/resume": {
    post: {
      tags: ["Study With Mishka"],
      summary: "Resume session",
      description: [
        "**Precondition:** **paused**; adds elapsed pause to **`totalPausedSeconds`**.",
        "**Statuses:** **200**; **400**; **401**; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: { ...std(), 200: R.StudySessionDetail200Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/end": {
    post: {
      tags: ["Study With Mishka"],
      summary: "End session (complete or abandon)",
      description: [
        "**Body:** optional `outcome` (`completed` default, or `abandoned`); optional **`outcomeNotes`** (≤2000 chars). Closes active call-break if needed.",
        "**Statuses:** **200**; **400** already ended; **401**; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/StudyWithMishkaEndBody" },
          },
        },
      },
      responses: { ...std(), 200: R.StudySessionDetail200Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/advance-phase": {
    post: {
      tags: ["Study With Mishka"],
      summary: "Advance pomodoro / phase",
      description: [
        "**Precondition:** **active** session.",
        "**Body:** **`nextPhase`** required; optional counters for pomodoro bookkeeping (see schema).",
        "**Statuses:** **200**; **400**; **401**; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/StudyWithMishkaAdvancePhaseBody", ""),
      responses: { ...std(), 200: R.StudySessionDetail200Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/check-ins": {
    post: {
      tags: ["Study With Mishka"],
      summary: "Submit in-session check-in",
      description: [
        "**Body:** `kind` + matching `responseBool` or `responseInt` per catalog rules.",
        "**Statuses:** **201** row created; **400** validation; **401**; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/StudyWithMishkaCheckInBody", ""),
      responses: { ...std(), 201: R.StudyCheckInCreated201Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/telemetry": {
    post: {
      tags: ["Study With Mishka"],
      summary: "Batch telemetry (1–50 events)",
      description: [
        "**No request body property `events` outside the schema** — max **50** events per call. Suggested **`eventType`** values appear on **full-report** under `computed.suggestedTelemetryTypes`.",
        "**Returns:** `{ inserted: <n> }`.",
        "**Statuses:** **200**; **400**; **401**; **404**; **500**.",
        studyI18n,
        "**Arabic:** أحداث تشغيل فقط — بدون فيديو خام.",
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/StudyTelemetryBatchBody", ""),
      responses: { ...std(), 200: R.StudyTelemetry200Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/ml-reports": {
    post: {
      tags: ["Study With Mishka"],
      summary: "Post ML summary JSON",
      description: [
        "**Body:** **`payload`** object (required); optional **`schemaVersion`**. Multiple posts per session allowed.",
        "**Statuses:** **201**; **400** invalid payload type; **401**; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/StudyMlReportBody", ""),
      responses: { ...std(), 201: R.StudyMlReportCreated201Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/call-break/start": {
    post: {
      tags: ["Study With Mishka"],
      summary: "Start parallel call break (call_with_mishka only)",
      description: [
        "**Precondition:** `topLevelMode === call_with_mishka`, session **active**, no break already open — else **400**.",
        "**Statuses:** **200**; **400**; **401**; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: { ...std(), 200: R.StudySessionDetail200Ok },
    },
  },
  "/study-with-mishka/sessions/{id}/call-break/end": {
    post: {
      tags: ["Study With Mishka"],
      summary: "End parallel call break",
      description: [
        "**Optional body:** `durationSeconds`; otherwise wall clock since **call-break/start**.",
        "**Statuses:** **200**; **400** if no active break; **401**; **404**; **500**.",
        studyI18n,
      ].join("\n\n"),
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/StudyCallBreakEndBody" },
          },
        },
      },
      responses: { ...std(), 200: R.StudySessionDetail200Ok },
    },
  },

  "/user-preferences": {
    get: {
      tags: ["User preferences"],
      summary: "List preferences (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["User preferences"],
      summary: "Create preference row",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/user-preferences/{id}": {
    get: {
      tags: ["User preferences"],
      summary: "Get preference by preference id",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["User preferences"],
      summary: "Update preference",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["User preferences"],
      summary: "Delete preference",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/user-streaks": {
    get: {
      tags: ["User streaks"],
      summary: "List streaks (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["User streaks"],
      summary: "Create streak record",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/user-streaks/{id}": {
    get: {
      tags: ["User streaks"],
      summary: "Get streak",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["User streaks"],
      summary: "Update streak",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["User streaks"],
      summary: "Delete streak",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/user-communities": {
    get: {
      tags: ["User communities"],
      summary: "List memberships (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["User communities"],
      summary: "Create membership",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/user-communities/{id}": {
    get: {
      tags: ["User communities"],
      summary: "Get membership",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["User communities"],
      summary: "Update membership",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["User communities"],
      summary: "Delete membership",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/user-saved-categories": {
    get: {
      tags: ["User saved categories"],
      summary: "List saved categories (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["User saved categories"],
      summary: "Save category",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/user-saved-categories/{id}": {
    get: {
      tags: ["User saved categories"],
      summary: "Get saved category row",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["User saved categories"],
      summary: "Update saved category",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["User saved categories"],
      summary: "Delete saved category",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/user-ai-activity": {
    get: {
      tags: ["User AI activity"],
      summary: "List activity (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["User AI activity"],
      summary: "Create activity row",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/user-ai-activity/{id}": {
    get: {
      tags: ["User AI activity"],
      summary: "Get activity",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["User AI activity"],
      summary: "Update activity",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["User AI activity"],
      summary: "Delete activity",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },

  "/daily-streaks": {
    get: {
      tags: ["Daily streaks"],
      summary: "Daily activity streak summary and week view",
      description:
        "`data` includes `currentStreak`, `longestStreak`, `freezesRemaining`, `today`, `weekStart` (UTC Monday), and `week` (7 items with `date`, optional Prisma `status`, and UI `state`: `past_done`, `past_missed`, `today_done`, `today_pending`, `upcoming`). Optional query `weekStart=YYYY-MM-DD` must be a **UTC Monday**.",
      parameters: [
        ...lang,
        {
          name: "weekStart",
          in: "query",
          required: false,
          schema: { type: "string", example: "2026-05-04" },
          description: "UTC Monday of the week to return (YYYY-MM-DD). Omit for the current week.",
        },
      ],
      security: bearer,
      responses: std(),
    },
  },
  "/daily-streaks/ping": {
    post: {
      tags: ["Daily streaks"],
      summary: "Record streak activity for today (e.g. app opened)",
      description:
        "Marks the current **UTC** calendar day as `completed` when no other mutation ran. Body must be `{}` (strict).",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/DailyStreakPingBody", "Empty object `{}`."),
      responses: std(),
    },
  },
  "/daily-streaks/freeze": {
    post: {
      tags: ["Daily streaks"],
      summary: "Spend one streak freeze on a calendar day",
      description:
        "Sets `user_streaks` for `date` to `frozen` (counts like activity for streak math). Decrements `freezesRemaining` (starts at **2** per user). Returns updated counters in `data`.",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/DailyStreakFreezeBody", "`date` is UTC calendar day (YYYY-MM-DD), not in the future."),
      responses: std(),
    },
  },

  "/usage/batch": {
    post: {
      tags: ["Usage tracking"],
      summary: "Ingest usage segments and/or heartbeat deltas",
      description:
        "Up to **100** combined items. Each item needs a unique `clientRequestId` per user (retries safe). Segments use ISO `startedAt`/`endedAt`; rollups bucket by **UTC date of `endedAt`**. Heartbeats use `day` (YYYY-MM-DD UTC) and `seconds` (capped server-side, default max **180** per row). Daily total per user is capped (default **20h** UTC per calendar day); overflow returns `USAGE_DAY_CAP_EXCEEDED`.",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/UsageBatchBody", ""),
      responses: std(),
    },
  },
  "/usage/summary": {
    get: {
      tags: ["Usage tracking"],
      summary: "Daily usage totals by feature (rollup)",
      description:
        "`data` includes `days[]` with `date`, `totalSeconds`, `byFeature` map, plus `rangeTotalSeconds` and `byFeatureRange`. Query `from` and `to` are inclusive UTC dates (YYYY-MM-DD).",
      parameters: [
        ...lang,
        {
          name: "from",
          in: "query",
          required: true,
          schema: { type: "string", example: "2026-05-01" },
          description: "Start date UTC (YYYY-MM-DD), inclusive.",
        },
        {
          name: "to",
          in: "query",
          required: true,
          schema: { type: "string", example: "2026-05-07" },
          description: "End date UTC (YYYY-MM-DD), inclusive.",
        },
      ],
      security: bearer,
      responses: std(),
    },
  },

  "/saved-quizzes": {
    get: {
      tags: ["Saved library"],
      summary: "List saved quizzes",
      description: "Quizzes owned by the user with `savedAt` set, ordered by `savedAt` descending.",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Saved library"],
      summary: "Add quiz to saved library",
      description: "Sets `savedAt` on an owned quiz (body `quizId`).",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedQuizAddBody", ""),
      responses: std(),
    },
  },
  "/saved-quizzes/import-shared": {
    post: {
      tags: ["Saved library"],
      summary: "Copy a shared quiz into my library",
      description:
        "Body `sourceQuizId` must belong to **another** user and appear in a **material_shares** row for a channel in a community you belong to. Creates a new quiz owned by you with `savedAt` set and `sourceType: shared_copy`.",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedQuizImportFromSharedBody", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/saved-quizzes/{id}": {
    delete: {
      tags: ["Saved library"],
      summary: "Remove quiz from saved library",
      description: "Clears `savedAt` on the quiz (owner only).",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/saved-quizzes/{id}/share": {
    post: {
      tags: ["Saved library"],
      summary: "Share a quiz to community channels (saved-library path)",
      description:
        "Owner only. Same batch semantics as **POST /material-shares** for `materialType: quiz`. **Does not** require `savedAt`; use this path from the saved-quizzes client section or **POST /quizzes/{id}/share** from the quiz resource.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMaterialShareToChannelsBody", ""),
      responses: std(),
    },
  },
  "/saved-flashcard-sets": {
    get: {
      tags: ["Saved library"],
      summary: "List saved flashcard sets",
      description: "Sets owned by the user with `savedAt` set, ordered by `savedAt` descending.",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Saved library"],
      summary: "Add flashcard set to saved library",
      description: "Sets `savedAt` on an owned set (body `flashcardSetId`).",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedFlashcardSetAddBody", ""),
      responses: std(),
    },
  },
  "/saved-flashcard-sets/import-shared": {
    post: {
      tags: ["Saved library"],
      summary: "Copy a shared flashcard set into my library",
      description:
        "Body `sourceFlashcardSetId` must belong to **another** user and be shared into a channel of a community you belong to. Creates a new set with `savedAt` and `sourceType: shared_copy`.",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedFlashcardSetImportFromSharedBody", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/saved-flashcard-sets/{id}": {
    delete: {
      tags: ["Saved library"],
      summary: "Remove flashcard set from saved library",
      description: "Clears `savedAt` (owner only).",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/saved-flashcard-sets/{id}/share": {
    post: {
      tags: ["Saved library"],
      summary: "Share a flashcard set to community channels (saved-library path)",
      description:
        "Owner only. Same semantics as **POST /material-shares** for `materialType: flashcard_set`. **Does not** require `savedAt`; or use **POST /flashcard-sets/{id}/share**.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMaterialShareToChannelsBody", ""),
      responses: std(),
    },
  },

  "/saved-summaries": {
    get: {
      tags: ["Saved library"],
      summary: "List saved summaries",
      description: "Summaries owned by the user with `savedAt` set, ordered by `savedAt` descending.",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Saved library"],
      summary: "Add summary to saved library",
      description: "Sets `savedAt` on an owned summary (body `summaryId`).",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedSummaryAddBody", ""),
      responses: std(),
    },
  },
  "/saved-summaries/import-shared": {
    post: {
      tags: ["Saved library"],
      summary: "Copy a shared summary into my library",
      description:
        "Body `sourceSummaryId` must belong to **another** user and be visible via a community channel share. Creates a new summary with `savedAt` and `sourceType: shared_copy`.",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedSummaryImportFromSharedBody", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/saved-summaries/{id}": {
    delete: {
      tags: ["Saved library"],
      summary: "Remove summary from saved library",
      description: "Clears `savedAt` (owner only).",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/saved-summaries/{id}/share": {
    post: {
      tags: ["Saved library"],
      summary: "Share a summary to community channels (saved-library path)",
      description: "Owner only. Same as **POST /material-shares** with `materialType: summary`; or **POST /summaries/{id}/share**.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMaterialShareToChannelsBody", ""),
      responses: std(),
    },
  },
  "/saved-mind-maps": {
    get: {
      tags: ["Saved library"],
      summary: "List saved mind maps",
      description: "Mind maps owned by the user with `savedAt` set, ordered by `savedAt` descending.",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Saved library"],
      summary: "Add mind map to saved library",
      description: "Sets `savedAt` on an owned mind map (body `mindMapId`).",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMindMapAddBody", ""),
      responses: std(),
    },
  },
  "/saved-mind-maps/import-shared": {
    post: {
      tags: ["Saved library"],
      summary: "Copy a shared mind map into my library",
      description:
        "Body `sourceMindMapId` must belong to **another** user and be shared into a channel of a community you belong to. Creates a new row with `savedAt` and `sourceType: shared_copy`.",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMindMapImportFromSharedBody", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/saved-mind-maps/{id}": {
    delete: {
      tags: ["Saved library"],
      summary: "Remove mind map from saved library",
      description: "Clears `savedAt` (owner only).",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/saved-mind-maps/{id}/share": {
    post: {
      tags: ["Saved library"],
      summary: "Share a mind map to community channels (saved-library path)",
      description: "Owner only. Same as **POST /material-shares** with `materialType: mind_map`; or **POST /mind-maps/{id}/share**.",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/SavedMaterialShareToChannelsBody", ""),
      responses: std(),
    },
  },

  "/material-shares": {
    get: {
      tags: ["Communities"],
      summary: "List material shared into community groups you joined",
      description:
        "Returns share rows for **channels (groups) you have joined** via `POST …/channels/{channelId}/join` (within communities you belong to). Newest first, capped. Each item includes `channel`, `community`, sharer `user`, and `materialTitle` / `ownerUserId` when the source row still exists. Optional query `communityId` (UUID) filters to one community.",
      parameters: [
        ...lang,
        {
          name: "communityId",
          in: "query",
          required: false,
          schema: { type: "string", format: "uuid" },
          description: "If set, only shares in channels of this community.",
        },
      ],
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Communities"],
      summary: "Share tutor material to community channels",
      description:
        "Owner posts `channelIds` (must belong to communities the user is in). `materialType` is `quiz` \| `flashcard_set` \| `summary` \| `mind_map`. Idempotent per user/channel/material (`skippedDuplicates` in `data`). `savedAt` is **not** required. Resource-scoped alternatives: **POST /quizzes/{id}/share**, **POST /flashcard-sets/{id}/share**, **POST /summaries/{id}/share**, **POST /mind-maps/{id}/share**, and matching **POST /saved-…/{id}/share** routes.",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/MaterialShareBatchBody", ""),
      responses: std(),
    },
  },
};

module.exports = paths;
