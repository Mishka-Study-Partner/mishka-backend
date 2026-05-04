module.exports = {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "JWT from `POST /auth/login` or `POST /auth/register` (`data.accessToken`).",
    },
  },
  parameters: {
    AcceptLanguage: {
      name: "Accept-Language",
      in: "header",
      required: false,
      schema: { type: "string", example: "ar" },
      description: "Prefer Arabic in `message` when set to `ar`, `ar-EG`, etc. `message_en` / `message_ar` are always returned.",
    },
    IdUuid: {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
    },
    IdString: {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
    IdInt: {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "integer" },
    },
  },
  schemas: {
    ApiSuccessEnvelope: {
      type: "object",
      required: ["success", "message", "message_en", "message_ar", "data", "error", "details"],
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string" },
        message_en: { type: "string" },
        message_ar: { type: "string" },
        data: { description: "Payload; shape depends on route." },
        error: { nullable: true, description: "Always null on success." },
        details: { nullable: true, description: "Always null on success." },
      },
    },
    ApiErrorEnvelope: {
      type: "object",
      required: ["success", "message", "message_en", "message_ar", "data", "error", "details"],
      properties: {
        success: { type: "boolean", example: false },
        message: { type: "string" },
        message_en: { type: "string" },
        message_ar: { type: "string" },
        data: { nullable: true, description: "Always null on error." },
        error: {
          type: "string",
          description: "Stable machine code, e.g. VALIDATION_ERROR, AUTH_INVALID_TOKEN, FORBIDDEN, NOT_FOUND.",
        },
        details: {
          nullable: true,
          description: "Validation issues, Prisma hints, or extra context.",
        },
      },
    },
    RegisterBody: {
      type: "object",
      required: ["firstName", "lastName", "email", "agreeTerms"],
      additionalProperties: false,
      properties: {
        firstName: { type: "string", minLength: 1, maxLength: 50 },
        lastName: { type: "string", minLength: 1, maxLength: 50 },
        email: { type: "string", format: "email", maxLength: 150 },
        password: { type: "string", minLength: 6, maxLength: 255 },
        agreeTerms: { type: "boolean" },
        phoneNumber: { type: "string", maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
        provider: { type: "string", maxLength: 20 },
        providerId: { type: "string", maxLength: 100 },
      },
    },
    LoginBody: {
      type: "object",
      required: ["password"],
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email", maxLength: 150 },
        phoneNumber: { type: "string", maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
        password: { type: "string", minLength: 6, maxLength: 255 },
      },
      description: "Provide `email` **or** `phoneNumber` (with optional `countryCode`).",
    },
    ForgotPasswordBody: {
      type: "object",
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email", maxLength: 150 },
        phoneNumber: { type: "string", maxLength: 20 },
      },
      description: "Provide `email` or `phoneNumber`.",
    },
    ResetPasswordBody: {
      type: "object",
      required: ["userId", "resetCode", "newPassword"],
      additionalProperties: false,
      properties: {
        userId: { type: "string", format: "uuid" },
        resetCode: { type: "string", minLength: 4, maxLength: 10 },
        newPassword: { type: "string", minLength: 6, maxLength: 255 },
      },
    },
    UpdateUserBody: {
      type: "object",
      additionalProperties: false,
      properties: {
        firstName: { type: "string", minLength: 1, maxLength: 50 },
        lastName: { type: "string", minLength: 1, maxLength: 50 },
        fullName: { type: "string", maxLength: 150 },
        username: { type: "string", maxLength: 50 },
        email: { type: "string", format: "email", maxLength: 150 },
        phoneNumber: { type: "string", maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
        rememberMe: { type: "boolean" },
        agreeTerms: { type: "boolean" },
        provider: { type: "string", maxLength: 20 },
        providerId: { type: "string", maxLength: 100 },
        role: { type: "string", enum: ["student", "teacher", "admin"] },
        isVerified: { type: "boolean" },
        profileImageUrl: { type: "string", maxLength: 2048 },
        gender: { type: "string", maxLength: 20 },
        password: { type: "string", nullable: true, minLength: 6, maxLength: 255 },
      },
      description:
        "Non-admins cannot change `role` or `isVerified` (ignored server-side). Admins may set any allowed field.",
    },
    AiChatBody: {
      type: "object",
      required: ["session_id", "message"],
      additionalProperties: false,
      properties: {
        session_id: { type: "string", minLength: 1 },
        message: { type: "string", minLength: 1 },
      },
    },
    AiGenerateToolsBody: {
      type: "object",
      required: ["session_id", "tool_type"],
      additionalProperties: false,
      properties: {
        session_id: { type: "string", minLength: 1 },
        tool_type: {
          type: "string",
          enum: ["quizzes", "flashcards", "mind_maps"],
        },
        complexity: {
          type: "string",
          description: "Forwarded to FastAPI (default `Intermediate` if omitted).",
        },
      },
    },
    /** Typical `data` in the success envelope for `POST /upload` after upstream 2xx. */
    AiTutorUploadData: {
      type: "object",
      description: "Returned inside the API envelope as `data`; same fields as FastAPI.",
      required: ["session_id", "explanation"],
      properties: {
        session_id: { type: "string", description: "Tutor session id; also `chat_sessions.id` in Postgres." },
        explanation: { type: "string", description: "First model explanation for the uploaded material." },
      },
    },
    /** Typical `data` in the success envelope for `POST /chat` after upstream 2xx. */
    AiTutorChatData: {
      type: "object",
      description: "Returned inside the API envelope as `data`; same fields as FastAPI.",
      required: ["response"],
      properties: {
        response: { type: "string", description: "Model reply text." },
      },
    },
    /** Typical `data` in the success envelope for `POST /generate-tools` after upstream 2xx. */
    AiTutorGenerateToolsData: {
      type: "object",
      description: "Returned inside the API envelope as `data`; `content` shape depends on `tool_type` (see README).",
      required: ["status", "tool_type", "content"],
      properties: {
        status: { type: "string", example: "success" },
        tool_type: { type: "string", enum: ["quizzes", "flashcards", "mind_maps"] },
        content: { description: "Array or tree structure per tool type." },
      },
    },
    JsonRecord: {
      type: "object",
      additionalProperties: true,
      description: "JSON object; fields follow Prisma models (see `prisma/schema.prisma`).",
    },
  },
};
