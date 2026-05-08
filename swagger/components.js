const Ex = require("./examples");

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
      description:
        "Prefer Arabic in **`message`** when set to `ar`, `ar-SA`, `ar-EG`, etc. **`message_en`** and **`message_ar`** are always returned — use them for fixed UI strings in Flutter. **العربية:** الهيدر يؤثر على `message` فقط؛ استخدم `message_ar` للواجهة الثابتة.",
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
      description: "Every successful JSON response uses this wrapper. Prefer `message_en` / `message_ar` for fixed copy in Flutter.",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", description: "Localized short summary (see `Accept-Language`)." },
        message_en: { type: "string" },
        message_ar: { type: "string" },
        data: { description: "Route payload: entity, array, `{ user }`, `{ accessToken, user, … }`, or `null` on delete." },
        error: { nullable: true, description: "Always null on success." },
        details: { nullable: true, description: "Always null on success." },
      },
      example: Ex.envelopeSuccess(Ex.listExample),
    },
    ApiErrorEnvelope: {
      type: "object",
      required: ["success", "message", "message_en", "message_ar", "data", "error", "details"],
      description: "Every error JSON response uses this wrapper. Clients should branch on `error` (stable code).",
      properties: {
        success: { type: "boolean", example: false },
        message: { type: "string" },
        message_en: { type: "string" },
        message_ar: { type: "string" },
        data: { nullable: true, description: "Usually null; AI proxy errors may echo upstream JSON here." },
        error: {
          type: "string",
          description:
            "Stable machine code: `VALIDATION_ERROR`, `AUTH_MISSING_TOKEN`, `AUTH_INVALID_TOKEN`, `AUTH_INVALID_CREDENTIALS`, `FORBIDDEN`, `NOT_FOUND`, `SAVED_LIBRARY_NOT_SAVED`, `QUIZ_NOT_FOUND`, `FLASHCARD_SET_NOT_FOUND`, `SUMMARY_NOT_FOUND`, `MIND_MAP_NOT_FOUND`, `UNIQUE_VIOLATION`, `AI_SERVICE_ERROR`, `SERVICE_UNAVAILABLE`, `OAUTH_TOKEN_INVALID`, etc.",
        },
        details: {
          nullable: true,
          description: "Validation: array of `{ path, message }`. Other routes: objects or strings.",
        },
      },
      example: Ex.envelopeError("VALIDATION_ERROR", Ex.validationDetails),
    },
    SendSignupOtpBody: {
      type: "object",
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email", maxLength: 150, description: "Send OTP to this email (exclusive with phone)." },
        phoneNumber: { type: "string", minLength: 5, maxLength: 20, description: "Send OTP via SMS pipeline (exclusive with email)." },
        countryCode: { type: "string", maxLength: 5, description: "Optional; include when numbers are not in E.164." },
      },
      description: "Exactly one of `email` or `phoneNumber` must be present.",
      example: { email: "norhankandil160@gmail.com" },
    },
    RegisterBody: {
      type: "object",
      required: ["firstName", "lastName", "email", "agreeTerms", "phoneNumber"],
      additionalProperties: false,
      properties: {
        firstName: { type: "string", minLength: 1, maxLength: 50 },
        lastName: { type: "string", minLength: 1, maxLength: 50 },
        email: { type: "string", format: "email", maxLength: 150 },
        password: {
          type: "string",
          minLength: 8,
          maxLength: 20,
          description: "Required unless using `provider` + `providerId`. Must include upper, lower, and special character.",
        },
        agreeTerms: { type: "boolean", description: "Must be `true` (terms accepted)." },
        rememberMe: { type: "boolean", default: false },
        phoneNumber: { type: "string", minLength: 5, maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
        provider: { type: "string", maxLength: 20, description: "Reserved for OAuth (e.g. apple, google, facebook)." },
        providerId: { type: "string", maxLength: 100 },
        signupOtp: {
          type: "string",
          minLength: 4,
          maxLength: 10,
          description:
            "Required when env `SIGNUP_OTP_REQUIRED=true`. Until real OTP delivery, the bypass code (default `111111`, overridable via `SIGNUP_OTP_BYPASS_CODE`) is accepted without calling send-signup-otp.",
        },
        educationStatus: {
          type: "string",
          enum: ["school", "university", "other"],
          description: "Optional. If provided, conditional education fields apply.",
        },
        educationOtherDetail: {
          type: "string",
          maxLength: 500,
          description: "Required when `educationStatus` is `other` (free text).",
        },
        schoolTrack: {
          type: "string",
          enum: ["middle_school", "high_school"],
          description: "Required when `educationStatus` is `school`.",
        },
        schoolGrade: {
          type: "integer",
          minimum: 1,
          maximum: 3,
          description: "Year within middle or high school (1st–3rd). Required when `educationStatus` is `school`.",
        },
        universityYear: {
          type: "integer",
          minimum: 1,
          maximum: 5,
          description: "Required when `educationStatus` is `university`.",
        },
        gender: {
          type: "string",
          enum: ["male", "female", "prefer_not_to_say"],
          description: "Optional. UI label for `prefer_not_to_say` can be “Rather not say”.",
        },
      },
      example: Ex.registerRequestExample,
    },
    VerifySignupOtpBody: {
      type: "object",
      additionalProperties: false,
      required: ["signupOtp"],
      properties: {
        email: { type: "string", format: "email", maxLength: 150 },
        phoneNumber: { type: "string", minLength: 5, maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
        signupOtp: { type: "string", minLength: 4, maxLength: 10, description: "OTP code key (only accepted key)." },
      },
      description:
        "Verify signup OTP before registration. Provide `signupOtp` and exactly one identity (`email` or `phoneNumber`). Bypass code (`SIGNUP_OTP_BYPASS_CODE`, default `111111`) is accepted unless disabled.",
      example: { email: "norhankandil160@gmail.com", signupOtp: "111111" },
    },
    LoginBody: {
      type: "object",
      required: ["password"],
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email", maxLength: 150 },
        phoneNumber: { type: "string", maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
        password: { type: "string", minLength: 1, maxLength: 255 },
        rememberMe: { type: "boolean", description: "If set, updates stored preference and affects JWT lifetime." },
      },
      description: "Provide `email` **or** `phoneNumber` (with optional `countryCode`).",
      example: Ex.loginRequestExample,
    },
    ForgotPasswordBody: {
      type: "object",
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email", maxLength: 150 },
        phoneNumber: { type: "string", maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
      },
      description: "Provide `email` **or** `phoneNumber` (with optional `countryCode` when using phone).",
      example: { email: "norhankandil160@gmail.com" },
    },
    ResetPasswordBody: {
      type: "object",
      required: ["resetCode", "newPassword"],
      additionalProperties: false,
      properties: {
        userId: { type: "string", format: "uuid", description: "Optional if using email or phoneNumber." },
        email: { type: "string", format: "email", maxLength: 150, description: "Optional alternative to userId." },
        phoneNumber: { type: "string", maxLength: 20, description: "Optional alternative to userId." },
        countryCode: { type: "string", maxLength: 5, description: "Optional with phoneNumber." },
        resetCode: { type: "string", minLength: 4, maxLength: 10 },
        newPassword: { type: "string", minLength: 8, maxLength: 20, description: "Upper, lower, special character required." },
      },
      description: "Provide `resetCode` + `newPassword` and one identity: `userId` or `email` or `phoneNumber`.",
      example: { email: "norhankandil160@gmail.com", resetCode: "12345", newPassword: "N3w!Strong1" },
    },
    OauthGoogleBody: {
      type: "object",
      required: ["idToken", "agreeTerms"],
      additionalProperties: false,
      properties: {
        idToken: { type: "string", minLength: 20, description: "ID token from Google Sign-In on the device." },
        agreeTerms: { type: "boolean", description: "Must be `true`." },
        rememberMe: { type: "boolean" },
        firstName: { type: "string", maxLength: 50, description: "Override when the token has no given name." },
        lastName: { type: "string", maxLength: 50 },
        phoneNumber: { type: "string", minLength: 5, maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
        educationStatus: { type: "string", enum: ["school", "university", "other"] },
        educationOtherDetail: { type: "string", maxLength: 500 },
        schoolTrack: { type: "string", enum: ["middle_school", "high_school"] },
        schoolGrade: { type: "integer", minimum: 1, maximum: 3 },
        universityYear: { type: "integer", minimum: 1, maximum: 5 },
      },
    },
    OauthAppleBody: {
      type: "object",
      required: ["identityToken", "agreeTerms"],
      additionalProperties: false,
      properties: {
        identityToken: { type: "string", minLength: 20, description: "JWT from Sign in with Apple." },
        agreeTerms: { type: "boolean", description: "Must be `true`." },
        rememberMe: { type: "boolean" },
        firstName: { type: "string", maxLength: 50 },
        lastName: { type: "string", maxLength: 50 },
        phoneNumber: { type: "string", minLength: 5, maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
        educationStatus: { type: "string", enum: ["school", "university", "other"] },
        educationOtherDetail: { type: "string", maxLength: 500 },
        schoolTrack: { type: "string", enum: ["middle_school", "high_school"] },
        schoolGrade: { type: "integer", minimum: 1, maximum: 3 },
        universityYear: { type: "integer", minimum: 1, maximum: 5 },
      },
    },
    OauthFacebookBody: {
      type: "object",
      required: ["accessToken", "agreeTerms"],
      additionalProperties: false,
      properties: {
        accessToken: { type: "string", minLength: 10, description: "User access token from Facebook Login SDK." },
        agreeTerms: { type: "boolean", description: "Must be `true`." },
        rememberMe: { type: "boolean" },
        firstName: { type: "string", maxLength: 50 },
        lastName: { type: "string", maxLength: 50 },
        phoneNumber: { type: "string", minLength: 5, maxLength: 20 },
        countryCode: { type: "string", maxLength: 5 },
        educationStatus: { type: "string", enum: ["school", "university", "other"] },
        educationOtherDetail: { type: "string", maxLength: 500 },
        schoolTrack: { type: "string", enum: ["middle_school", "high_school"] },
        schoolGrade: { type: "integer", minimum: 1, maximum: 3 },
        universityYear: { type: "integer", minimum: 1, maximum: 5 },
      },
    },
    UpdateUserBody: {
      type: "object",
      additionalProperties: false,
      properties: {
        firstName: { type: "string", minLength: 1, maxLength: 50 },
        lastName: { type: "string", minLength: 1, maxLength: 50 },
        fullName: { type: "string", maxLength: 150 },
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
        gender: { type: "string", enum: ["male", "female", "prefer_not_to_say"] },
        password: { type: "string", nullable: true, minLength: 8, maxLength: 20, description: "If set, same rules as registration (upper, lower, special)." },
      },
      description:
        "`username` is **not** accepted here; it is regenerated when `firstName`, `lastName`, or `fullName` change. Non-admins cannot change `role` or `isVerified` (ignored server-side).",
    },
    AppPublicSettingsData: {
      type: "object",
      description: "Singleton row (`settings_id` = `default`).",
      properties: {
        id: { type: "string", example: "default" },
        privacyPolicyText: { type: "string", description: "Markdown or HTML as stored by admin." },
        supportEmail: { type: "string", format: "email", nullable: true },
        supportPhone: { type: "string", nullable: true },
        supportFacebookUrl: { type: "string", nullable: true },
        supportInstagramUrl: { type: "string", nullable: true },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    UpdateAppPublicSettingsBody: {
      type: "object",
      additionalProperties: false,
      properties: {
        privacyPolicyText: { type: "string", description: "Full policy text (large string allowed)." },
        supportEmail: { type: "string", format: "email", nullable: true },
        supportPhone: { type: "string", nullable: true },
        supportFacebookUrl: { type: "string", nullable: true },
        supportInstagramUrl: { type: "string", nullable: true },
      },
      description: "At least one property required on **PUT**.",
    },
    AiChatBody: {
      type: "object",
      required: ["session_id", "message"],
      additionalProperties: false,
      properties: {
        session_id: { type: "string", minLength: 1 },
        message: { type: "string", minLength: 1 },
      },
      example: Ex.aiChatRequestExample,
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
      example: Ex.aiGenerateToolsRequestExample,
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
      example: Ex.aiTutorUploadData,
    },
    /** Typical `data` in the success envelope for `POST /chat` after upstream 2xx. */
    AiTutorChatData: {
      type: "object",
      description: "Returned inside the API envelope as `data`; same fields as FastAPI.",
      required: ["response"],
      properties: {
        response: { type: "string", description: "Model reply text." },
      },
      example: Ex.aiTutorChatData,
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
      example: Ex.aiTutorGenerateToolsData,
    },
    JsonRecord: {
      type: "object",
      additionalProperties: true,
      description:
        "JSON object; fields follow Prisma models (`prisma/schema.prisma`). For **POST** creates, send only writable columns; server sets ids and timestamps unless documented otherwise.",
      example: {
        title: "Drink water",
        description: "Track 8 glasses per day",
        iconId: 1,
        userId: Ex.UUID,
      },
    },
    DailyStreakPingBody: {
      type: "object",
      additionalProperties: false,
      description: "Strict empty object for `POST /daily-streaks/ping`.",
      properties: {},
      example: {},
    },
    DailyStreakFreezeBody: {
      type: "object",
      additionalProperties: false,
      required: ["date"],
      properties: {
        date: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "UTC calendar date to freeze (not after today).",
          example: "2026-05-03",
        },
      },
    },
    UsageSegmentItem: {
      type: "object",
      additionalProperties: false,
      required: ["featureKey", "startedAt", "endedAt", "clientRequestId"],
      properties: {
        featureKey: {
          type: "string",
          pattern: "^[a-z][a-z0-9_]*$",
          maxLength: 64,
          description: "Stable feature id from the app (e.g. `chat`, `todos`, `study`).",
          example: "chat",
        },
        startedAt: { type: "string", format: "date-time", description: "Foreground segment start (ISO 8601)." },
        endedAt: { type: "string", format: "date-time", description: "Segment end; rollup day = UTC date of this instant." },
        clientRequestId: { type: "string", minLength: 8, maxLength: 80, description: "Idempotency key (e.g. UUID) unique per user." },
        chatSessionId: { type: "string", format: "uuid", description: "Optional link to `chat_sessions.id` for analytics." },
      },
    },
    UsageHeartbeatItem: {
      type: "object",
      additionalProperties: false,
      required: ["featureKey", "day", "seconds", "clientRequestId"],
      properties: {
        featureKey: { type: "string", pattern: "^[a-z][a-z0-9_]*$", maxLength: 64, example: "chat" },
        day: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "UTC calendar day for this delta." },
        seconds: { type: "integer", minimum: 1, maximum: 600, description: "Server enforces a stricter max per row (see README / env)." },
        clientRequestId: { type: "string", minLength: 8, maxLength: 80 },
      },
    },
    UsageBatchBody: {
      type: "object",
      additionalProperties: false,
      properties: {
        segments: { type: "array", maxItems: 100, items: { $ref: "#/components/schemas/UsageSegmentItem" } },
        heartbeats: { type: "array", maxItems: 100, items: { $ref: "#/components/schemas/UsageHeartbeatItem" } },
      },
      description: "At least one of `segments` or `heartbeats` must be non-empty; combined length ≤ 100.",
      example: {
        segments: [
          {
            featureKey: "chat",
            startedAt: "2026-05-05T10:00:00.000Z",
            endedAt: "2026-05-05T10:05:00.000Z",
            clientRequestId: "11111111-1111-1111-1111-111111111111",
            chatSessionId: Ex.UUID,
          },
        ],
        heartbeats: [{ featureKey: "chat", day: "2026-05-05", seconds: 45, clientRequestId: "22222222-2222-2222-2222-222222222222" }],
      },
    },
    ChatSessionTitleBody: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: {
          oneOf: [{ type: "string", maxLength: 200 }, { type: "null" }],
          description: "Display name for the chat, or `null` to clear.",
        },
      },
      example: { title: "Biology midterm notes" },
    },
    CommunityChannelCreateBody: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200 },
        description: { type: "string", maxLength: 5000 },
        imageUrl: { type: "string", maxLength: 500 },
      },
      example: { title: "Year 2 study group", description: "Exam prep", imageUrl: "https://example.com/g.png" },
    },
    CommunityChannelDuplicateBody: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200 },
      },
      description: "Optional new title for the duplicate; omit to reuse the source group title.",
    },
    CommunityChannelMessageCreateBody: {
      type: "object",
      additionalProperties: false,
      required: ["messageContent"],
      properties: {
        messageContent: { type: "string", maxLength: 102000 },
        inputType: { type: "string", enum: ["text", "material"] },
      },
      description:
        "Community group chat: plain `text` (default) or `material` with JSON `{\"materialType\",\"materialId\"}` for in-app tutor items you may reference.",
      example: { messageContent: "Hi everyone", inputType: "text" },
    },
    MaterialShareBatchBody: {
      type: "object",
      additionalProperties: false,
      required: ["channelIds", "materialType", "materialId"],
      properties: {
        channelIds: {
          type: "array",
          maxItems: 50,
          items: { type: "string", format: "uuid" },
        },
        materialType: { type: "string", enum: ["quiz", "flashcard_set", "summary", "mind_map"] },
        materialId: { type: "string", format: "uuid" },
        note: { type: "string", maxLength: 500 },
      },
      example: {
        channelIds: [Ex.UUID],
        materialType: "quiz",
        materialId: Ex.UUID2,
        note: "From Mishka tutor",
      },
    },
    SavedQuizAddBody: {
      type: "object",
      additionalProperties: false,
      required: ["quizId"],
      properties: {
        quizId: { type: "string", format: "uuid" },
      },
      example: { quizId: Ex.UUID },
    },
    SavedFlashcardSetAddBody: {
      type: "object",
      additionalProperties: false,
      required: ["flashcardSetId"],
      properties: {
        flashcardSetId: { type: "string", format: "uuid" },
      },
      example: { flashcardSetId: Ex.UUID },
    },
    SavedMaterialShareToChannelsBody: {
      type: "object",
      additionalProperties: false,
      required: ["channelIds"],
      properties: {
        channelIds: {
          type: "array",
          maxItems: 50,
          items: { type: "string", format: "uuid" },
        },
        note: { type: "string", maxLength: 500 },
      },
      example: { channelIds: [Ex.UUID], note: "From Mishka tutor" },
    },
    QuizSubmitBody: {
      type: "object",
      additionalProperties: false,
      required: ["answers"],
      properties: {
        answers: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["questionId", "selectedOption"],
            properties: {
              questionId: { type: "string", format: "uuid" },
              selectedOption: { type: "string", pattern: "^[ABCDabcd]$" },
            },
          },
        },
      },
      description:
        "One entry per question. `scoreOutOfTen` in the response is `round((correct/total)*10)` in **0–10** (for badges), even when the quiz has fewer or more than 10 questions.",
    },
    SavedQuizImportFromSharedBody: {
      type: "object",
      additionalProperties: false,
      required: ["sourceQuizId"],
      properties: {
        sourceQuizId: { type: "string", format: "uuid" },
      },
      example: { sourceQuizId: Ex.UUID },
    },
    SavedFlashcardSetImportFromSharedBody: {
      type: "object",
      additionalProperties: false,
      required: ["sourceFlashcardSetId"],
      properties: {
        sourceFlashcardSetId: { type: "string", format: "uuid" },
      },
      example: { sourceFlashcardSetId: Ex.UUID },
    },
    SavedSummaryAddBody: {
      type: "object",
      additionalProperties: false,
      required: ["summaryId"],
      properties: {
        summaryId: { type: "string", format: "uuid" },
      },
      example: { summaryId: Ex.UUID },
    },
    SavedSummaryImportFromSharedBody: {
      type: "object",
      additionalProperties: false,
      required: ["sourceSummaryId"],
      properties: {
        sourceSummaryId: { type: "string", format: "uuid" },
      },
      example: { sourceSummaryId: Ex.UUID },
    },
    SavedMindMapAddBody: {
      type: "object",
      additionalProperties: false,
      required: ["mindMapId"],
      properties: {
        mindMapId: { type: "string", format: "uuid" },
      },
      example: { mindMapId: Ex.UUID },
    },
    SavedMindMapImportFromSharedBody: {
      type: "object",
      additionalProperties: false,
      required: ["sourceMindMapId"],
      properties: {
        sourceMindMapId: { type: "string", format: "uuid" },
      },
      example: { sourceMindMapId: Ex.UUID },
    },

    StudyWithMishkaCustomOverrides: {
      type: "object",
      additionalProperties: false,
      properties: {
        focusMinutes: { type: "integer", minimum: 1, maximum: 180 },
        shortBreakMinutes: { type: "integer", minimum: 1, maximum: 60 },
        longBreakMinutes: { type: "integer", minimum: 1, maximum: 120 },
        cyclesTarget: { type: "integer", minimum: 1, maximum: 99 },
        pomodorosBeforeLongBreak: { type: "integer", minimum: 2, maximum: 10 },
      },
      description: "Overrides catalog defaults when starting **concentration** (optional). / تعديل القيم الافتراضية لوضع التركيز.",
    },

    StudyWithMishkaStartBody: {
      type: "object",
      required: ["topLevelMode"],
      additionalProperties: false,
      description:
        "**EN — Required:** `topLevelMode`. If `concentration`, **`concentrationPreset`** is required. If `call_with_mishka`, omit `concentrationPreset`. **Custom preset:** use `customPresetId` **or** supply minute triple via `customOverrides` when `concentrationPreset` is `custom`. **`task_based`** requires non-empty **`title`**.\n\n**AR — مطلوب:** `topLevelMode`. وضع `concentration` يحتاج `concentrationPreset`. وضع المكالمة `call_with_mishka` بدون preset. الوضع `custom` إما `customPresetId` أو دقائق في `customOverrides`. `task_based` يحتاج عنوانًا `title`.",
      properties: {
        topLevelMode: {
          type: "string",
          enum: ["call_with_mishka", "concentration"],
          description: "Product mode for this timed block.",
        },
        concentrationPreset: {
          type: "string",
          enum: ["classic_pomodoro", "flowtime", "ultradian", "quick_sprint", "task_based", "custom"],
          description: "Required when `topLevelMode` is `concentration`; forbidden for `call_with_mishka`.",
        },
        title: { type: "string", maxLength: 200, description: "Required for `task_based`; optional otherwise." },
        taskEstimatedMinutes: { type: "integer", minimum: 1, maximum: 720 },
        customOverrides: { $ref: "#/components/schemas/StudyWithMishkaCustomOverrides" },
        customPresetId: {
          type: "string",
          format: "uuid",
          description: "Saved row from **GET /study-with-mishka/custom-timers**; only with `concentrationPreset: custom`.",
        },
        tags: {
          type: "array",
          maxItems: 20,
          items: { type: "string", maxLength: 80 },
          description: "Optional labels (normalized/deduped server-side). / وسوم اختيارية.",
        },
        linkedTaskId: {
          type: "string",
          format: "uuid",
          description: "Optional link to one of **your** `tasks` rows.",
        },
        clientAppVersion: { type: "string", maxLength: 40 },
        platform: { type: "string", maxLength: 40, description: "e.g. `ios`, `android`, `web`." },
      },
      example: {
        topLevelMode: "concentration",
        concentrationPreset: "classic_pomodoro",
        title: "Biology flashcards",
        tags: ["exam"],
        clientAppVersion: "1.4.2",
        platform: "android",
      },
    },

    StudySessionPatchBody: {
      type: "object",
      additionalProperties: false,
      description:
        "**At least one** field required. Set **`linkedTaskId`: null** or **`title`: null** to clear.\n\n**AR:** تحديث جزئي — حقل واحد على الأقل؛ استخدم `null` لمسح الربط أو العنوان.",
      properties: {
        title: { oneOf: [{ type: "string", maxLength: 200 }, { type: "null" }] },
        tags: { type: "array", maxItems: 20, items: { type: "string", maxLength: 80 } },
        linkedTaskId: { oneOf: [{ type: "string", format: "uuid" }, { type: "null" }] },
        clientAppVersion: { oneOf: [{ type: "string", maxLength: 40 }, { type: "null" }] },
        platform: { oneOf: [{ type: "string", maxLength: 40 }, { type: "null" }] },
      },
      example: { tags: ["review"], platform: "ios" },
    },

    StudyWithMishkaEndBody: {
      type: "object",
      additionalProperties: false,
      description: "All optional; default outcome is **`completed`**. **`outcomeNotes`** stored on the session row (max 2000 chars).",
      properties: {
        outcome: { type: "string", enum: ["completed", "abandoned"] },
        outcomeNotes: { type: "string", maxLength: 2000, description: "Short reflection after session. / ملاحظاتك بعد الجلسة." },
      },
      example: { outcome: "completed", outcomeNotes: "Finished 2 pomodoros, need more practice on chapter 6." },
    },

    StudyWithMishkaAdvancePhaseBody: {
      type: "object",
      required: ["nextPhase"],
      additionalProperties: false,
      properties: {
        nextPhase: { type: "string", enum: ["none", "focus", "short_break", "long_break"] },
        actualFocusMinutes: { type: "integer", minimum: 0, maximum: 600 },
        completedFocusCycle: { type: "boolean" },
        resetAfterLongBreak: { type: "boolean" },
      },
      example: { nextPhase: "short_break", actualFocusMinutes: 25, completedFocusCycle: true },
    },

    StudyWithMishkaCheckInBody: {
      type: "object",
      required: ["kind"],
      additionalProperties: false,
      description:
        "**`still_there_yes_no`** & **`progress_yes_no`** → `responseBool`. **`mood_scale_5`** → `responseInt` 1–5. **`mood_scale_10`** → `responseInt` 1–10. Server validates combinations.\n\n**AR:** نوع الإجابة يجب أن يطابق `kind` (منطقي أو درجة مزاج).",
      properties: {
        kind: {
          type: "string",
          enum: ["still_there_yes_no", "mood_scale_5", "mood_scale_10", "progress_yes_no"],
        },
        responseBool: { type: "boolean" },
        responseInt: { type: "integer" },
      },
      example: { kind: "mood_scale_10", responseInt: 7 },
    },

    StudyTelemetryEventItem: {
      type: "object",
      required: ["eventType"],
      additionalProperties: false,
      properties: {
        eventType: { type: "string", minLength: 1, maxLength: 80 },
        payload: { type: "object", additionalProperties: true },
        clientTs: {
          oneOf: [{ type: "string", format: "date-time" }, { type: "integer", description: "Unix timestamp in milliseconds" }],
        },
      },
      example: { eventType: "camera_enabled", payload: { source: "user" }, clientTs: "2026-05-05T12:01:30.000Z" },
    },

    StudyTelemetryBatchBody: {
      type: "object",
      required: ["events"],
      additionalProperties: false,
      properties: {
        events: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          items: { $ref: "#/components/schemas/StudyTelemetryEventItem" },
        },
      },
      example: {
        events: [
          { eventType: "camera_enabled", clientTs: "2026-05-05T12:01:00.000Z" },
          { eventType: "phase_change", payload: { phase: "short_break" } },
        ],
      },
    },

    StudyMlReportBody: {
      type: "object",
      required: ["payload"],
      additionalProperties: false,
      description:
        "**`payload`** is a JSON object (no raw video). Optional **`schemaVersion`** when your ML contract is versioned.\n\n**AR:** الجسم `payload` ملخصات رقمية فقط — لا يُرفع فيديو خام.",
      properties: {
        payload: { type: "object", additionalProperties: true },
        schemaVersion: { type: "integer", minimum: 1 },
      },
      example: { payload: { windowSeconds: 60, avgAttentionScore: 0.81, note: "heuristic metrics" }, schemaVersion: 1 },
    },

    StudyCallBreakEndBody: {
      type: "object",
      additionalProperties: false,
      properties: {
        durationSeconds: {
          type: "integer",
          minimum: 0,
          maximum: 86400,
          description: "If omitted, server uses wall clock since **call-break/start**.",
        },
      },
      example: { durationSeconds: 300 },
    },

    StudyCustomTimerPresetBody: {
      type: "object",
      required: ["focusMinutes", "shortBreakMinutes", "longBreakMinutes"],
      additionalProperties: false,
      properties: {
        name: { oneOf: [{ type: "string", maxLength: 120 }, { type: "null" }] },
        focusMinutes: { type: "integer", minimum: 1, maximum: 180 },
        shortBreakMinutes: { type: "integer", minimum: 1, maximum: 60 },
        longBreakMinutes: { type: "integer", minimum: 1, maximum: 120 },
        pomodorosBeforeLongBreak: { type: "integer", minimum: 2, maximum: 10, default: 4 },
      },
      example: { name: "Deep work", focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 30, pomodorosBeforeLongBreak: 4 },
    },
  },
};
