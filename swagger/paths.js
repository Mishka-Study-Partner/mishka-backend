const R = require("./responses");

const lang = [{ $ref: "#/components/parameters/AcceptLanguage" }];
const bearer = [{ bearerAuth: [] }];

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

const jsonBody = (schemaRef, desc) => ({
  required: true,
  content: {
    "application/json": {
      schema: { $ref: schemaRef },
      description: desc,
    },
  },
});

/** @type {Record<string, unknown>} */
const paths = {
  "/": {
    get: {
      tags: ["Public"],
      summary: "API info",
      parameters: lang,
      responses: std(),
    },
  },

  "/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/RegisterBody", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/LoginBody", ""),
      responses: std(),
    },
  },
  "/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Current user (JWT)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Request password reset",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/ForgotPasswordBody", ""),
      responses: std(),
    },
  },
  "/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password with code",
      parameters: lang,
      requestBody: jsonBody("#/components/schemas/ResetPasswordBody", ""),
      responses: std(),
    },
  },

  "/upload": {
    post: {
      tags: ["AI proxy"],
      summary: "Proxy file upload to AI service",
      description: "Multipart `file`; optional `summary_level`. Requires `AI_SERVICE_URL`.",
      parameters: lang,
      security: bearer,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: {
                file: { type: "string", format: "binary" },
                summary_level: { type: "string" },
              },
            },
          },
        },
      },
      responses: std({ 502: R.defaultError, 503: R.ServiceUnavailable }),
    },
  },
  "/chat": {
    post: {
      tags: ["AI proxy"],
      summary: "Proxy chat to AI service",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/AiChatBody", ""),
      responses: std({ 502: R.defaultError, 503: R.ServiceUnavailable }),
    },
  },
  "/generate-tools": {
    post: {
      tags: ["AI proxy"],
      summary: "Proxy generate-tools to AI service",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/AiGenerateToolsBody", ""),
      responses: std({ 502: R.defaultError, 503: R.ServiceUnavailable }),
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
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/users/{id}/tasks": {
    get: {
      tags: ["Users"],
      summary: "List tasks for user (self or admin)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
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
  "/users/{id}/study-sessions": {
    get: {
      tags: ["Users"],
      summary: "List study sessions for user (self or admin)",
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

  "/communities": {
    get: {
      tags: ["Communities"],
      summary: "List communities",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Communities"],
      summary: "Create community (admin only)",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
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
      summary: "Update community (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Communities"],
      summary: "Delete community (admin only)",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
  },
  "/communities/{id}/members": {
    get: {
      tags: ["Communities"],
      summary: "List members (must be community member or admin)",
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
      parameters: lang,
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
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
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
      summary: "List tasks (scoped)",
      parameters: lang,
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
  "/flashcard-sets/{id}/flashcards": {
    get: {
      tags: ["Flashcard sets"],
      summary: "List flashcards in set",
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
  "/quizzes/{id}/questions": {
    get: {
      tags: ["Quizzes"],
      summary: "List questions for quiz",
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
      summary: "Update chat session",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
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
      summary: "Create message in session",
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

  "/study-sessions": {
    get: {
      tags: ["Study sessions"],
      summary: "List study sessions (scoped)",
      parameters: lang,
      security: bearer,
      responses: std(),
    },
    post: {
      tags: ["Study sessions"],
      summary: "Create study session",
      parameters: lang,
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std({ 201: R.CreatedEnvelope }),
    },
  },
  "/study-sessions/{id}": {
    get: {
      tags: ["Study sessions"],
      summary: "Get study session",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
    },
    put: {
      tags: ["Study sessions"],
      summary: "Update study session",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      requestBody: jsonBody("#/components/schemas/JsonRecord", ""),
      responses: std(),
    },
    delete: {
      tags: ["Study sessions"],
      summary: "Delete study session",
      parameters: [...lang, { $ref: "#/components/parameters/IdUuid" }],
      security: bearer,
      responses: std(),
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
};

module.exports = paths;
