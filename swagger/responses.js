const Ex = require("./examples");

/**
 * @param {string} title
 * @param {string} detail
 * @param {unknown} [dataExample]
 */
function successEnvelope(title, detail, dataExample) {
  const data = dataExample !== undefined ? dataExample : { note: "Shape depends on the route; see operation description." };
  return {
    description: [
      `**${title}**`,
      detail,
      "Body matches `#/components/schemas/ApiSuccessEnvelope`: `success`, localized `message` / `message_en` / `message_ar`, route-specific `data`, `error` and `details` are null.",
    ].join(" "),
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiSuccessEnvelope" },
        examples: {
          success: {
            summary: "Success envelope",
            value: Ex.envelopeSuccess(data),
          },
        },
      },
    },
  };
}

/**
 * @param {string} httpLabel e.g. "400"
 * @param {string} title
 * @param {string} detail
 * @param {string} errorCode
 * @param {unknown} [detailsExample]
 */
function errorEnvelope(httpLabel, title, detail, errorCode, detailsExample) {
  return {
    description: [
      `**${httpLabel} ${title}**`,
      detail,
      `\`error\` is a stable code for clients (example: \`${errorCode}\`).`,
    ].join(" "),
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
        examples: {
          [errorCode.toLowerCase().replace(/_/g, "-")]: {
            summary: errorCode,
            value: Ex.envelopeError(errorCode, detailsExample === undefined ? Ex.validationDetails : detailsExample),
          },
        },
      },
    },
  };
}

/** Standard success for GET/PUT/PATCH/DELETE and some POSTs returning 200. */
const OkEnvelope = successEnvelope("200 OK", "Request succeeded; `data` may be an object, array, or primitive depending on the route.", Ex.listExample);

/** Same envelope shape as 200; used when a resource is created (e.g. register, OAuth first sign-in, POST create). */
const CreatedEnvelope = successEnvelope(
  "201 Created",
  "Resource created or first-time sign-in completed; inspect `data` for ids and nested objects.",
  Ex.authDataExample
);

const BadRequest = errorEnvelope(
  "400",
  "Bad request",
  "Validation failed (`validate` middleware / Zod) or malformed input.",
  "VALIDATION_ERROR",
  Ex.validationDetails
);

const Unauthorized = errorEnvelope(
  "401",
  "Unauthorized",
  "Missing `Authorization: Bearer <token>` on a protected route, invalid JWT, or wrong password (auth routes).",
  "AUTH_INVALID_TOKEN"
);

const Forbidden = errorEnvelope(
  "403",
  "Forbidden",
  "Authenticated but not allowed (e.g. non-admin calling admin-only route, or accessing another user's data).",
  "FORBIDDEN"
);

const NotFound = errorEnvelope(
  "404",
  "Not found",
  "Unknown path after `/` (Express 404) or missing row / wrong id.",
  "NOT_FOUND"
);

const Conflict = errorEnvelope(
  "409",
  "Conflict",
  "Unique constraint violation or business conflict (e.g. duplicate email, OAuth email clash).",
  "UNIQUE_VIOLATION"
);

const ServiceUnavailable = errorEnvelope(
  "503",
  "Service unavailable",
  "Server misconfiguration (e.g. `AI_SERVICE_URL` unset) or OAuth provider env missing.",
  "SERVICE_UNAVAILABLE"
);

const InternalError = errorEnvelope(
  "500",
  "Internal server error",
  "Unhandled exception; in `NODE_ENV=development`, `details.developerMessage` may be present.",
  "INTERNAL_ERROR",
  { developerMessage: "Optional stack hint in development only." }
);

/** Generic conflict / client error example (override per-route when documenting 409). */
const defaultError = errorEnvelope(
  "409",
  "Conflict",
  "Duplicate key, OAuth email clash, or other business rule failure.",
  "UNIQUE_VIOLATION",
  { target: ["email"] }
);

/** Upstream AI proxy returned non-2xx; body mirrors `legacyAiController` error envelope with upstream payload in `data`. */
const BadGatewayAi = {
  description:
    "**502 Bad Gateway** — Upstream FastAI service returned an error status. Response still uses the Mishka envelope: `success: false`, `error: AI_SERVICE_ERROR`, `details.upstreamStatus`, and upstream JSON in `data`.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiErrorEnvelope" },
      examples: {
        aiUpstream: {
          summary: "AI_SERVICE_ERROR",
          value: {
            success: false,
            message: "Upstream AI service error",
            message_en: "Upstream AI service error",
            message_ar: "خطأ في خدمة الذكاء الاصطناعي",
            data: { detail: "Example upstream body" },
            error: "AI_SERVICE_ERROR",
            details: { upstreamStatus: 502 },
          },
        },
      },
    },
  },
};

const AiUpload200Ok = successEnvelope(
  "200 OK",
  "Upstream `/upload` returned success; Node may persist file + `chat_sessions` + `ai_requests`.",
  Ex.aiTutorUploadData
);

const AiChat200Ok = successEnvelope("200 OK", "Upstream `/chat` returned `{ response }`.", Ex.aiTutorChatData);

const AiGenerateTools200Ok = successEnvelope(
  "200 OK",
  "Upstream `/generate-tools` returned tool payload; Node may materialize quizzes / flashcards / mind maps.",
  Ex.aiTutorGenerateToolsData
);

const SendSignupOtp200Ok = successEnvelope(
  "200 OK",
  "Code stored for verification. With `RETURN_SIGNUP_OTP_IN_RESPONSE=true`, `data` may include `signupOtp` and `expiresAt` (dev only).",
  { sent: true, channel: "email" }
);

const VerifySignupOtp200Ok = successEnvelope(
  "200 OK",
  "Signup OTP is valid and not consumed/expired.",
  { verified: true, channel: "email", expiresAt: "2026-05-09T10:00:00.000Z" }
);

const ForgotPassword200Ok = successEnvelope(
  "200 OK",
  "Always returns `{ sent: true }` even if the email/phone is unknown (no account enumeration).",
  { sent: true }
);

const ResetPassword200Ok = successEnvelope("200 OK", "Password hash updated.", { reset: true });

const AuthMe200Ok = successEnvelope(
  "200 OK",
  "Current user (`username` is server-generated from the name and unique), optional `preference` row (`language`, `notificationsEnabled`, `theme`), password never returned.",
  {
    user: Ex.exampleUser,
    preference: Ex.preferenceExample,
  }
);

const OAuthReturn200Ok = successEnvelope(
  "200 OK",
  "Existing OAuth-linked account; same `data` shape as `POST /auth/login` (tokens + user).",
  Ex.authDataExample
);

const Login200Ok = successEnvelope("200 OK", "Valid credentials; returns JWT and user.", Ex.authDataExample);

const MishkaI18nTail =
  "`message_en` / `message_ar` always present; **`Accept-Language`** tweaks **`message`** only. **العربية:** استخدم `message_ar` للواجهة الثابتة.";

const StudyCatalog200Ok = successEnvelope(
  "200 OK",
  `Static catalog (presets, call UX copy, check-in kinds). ${MishkaI18nTail}`,
  Ex.studyCatalogDataMinimal
);

const StudyCustomTimersList200Ok = successEnvelope(
  "200 OK",
  `Array of saved presets (recent **lastUsedAt** first). ${MishkaI18nTail}`,
  [Ex.studyTimerPresetRow]
);

const StudyCustomTimerCreated201Ok = successEnvelope(
  "201 Created",
  `Created preset row returned in **data**. ${MishkaI18nTail}`,
  Ex.studyTimerPresetRow
);

const StudyTimerDeleted200Ok = successEnvelope(
  "200 OK",
  `{ deleted: true }. ${MishkaI18nTail}`,
  { deleted: true }
);

const StudyStatsSummary200Ok = successEnvelope(
  "200 OK",
  `Completed session counters (all-time + rolling 30 UTC days). ${MishkaI18nTail}`,
  Ex.studyStatsSummaryData
);

const StudySessionsList200Ok = successEnvelope(
  "200 OK",
  `Array of sessions with **timerState** + Flowtime suggestion when applicable. ${MishkaI18nTail}`,
  [Ex.studySessionRowExample]
);

const StudySessionCreated201Ok = successEnvelope(
  "201 Created",
  `Active session row (cannot start another until pause/end). ${MishkaI18nTail}`,
  Ex.studySessionRowExample
);

const StudySessionDetail200Ok = successEnvelope(
  "200 OK",
  `Single session + timer snapshot for polling. ${MishkaI18nTail}`,
  Ex.studySessionRowExample
);

const StudyFullReport200Ok = successEnvelope(
  "200 OK",
  `Merged dashboard/export payload (**exportMeta**, catalog snapshots, telemetry lists — possibly truncated). ${MishkaI18nTail}`,
  Ex.studyFullReportDataMinimal
);

const StudyReportsPaginated200Ok = successEnvelope(
  "200 OK",
  `{ total, limit, offset, items[] } — each **items** element matches **full-report**. ${MishkaI18nTail}`,
  Ex.studyReportsListDataMinimal
);

const StudyPeriodReport200Ok = successEnvelope(
  "200 OK",
  `UTC rollup for day/week/month (**totals**, **sessionSummaries**, **userContext**). ${MishkaI18nTail}`,
  Ex.studyPeriodReportDataMinimal
);

const StudyTelemetry200Ok = successEnvelope(
  "200 OK",
  `{ inserted: <number of rows accepted> }. ${MishkaI18nTail}`,
  Ex.studyTelemetryInsertedData
);

const StudyMlReportCreated201Ok = successEnvelope(
  "201 Created",
  `Persisted ML summary row (**payload** JSON). ${MishkaI18nTail}`,
  Ex.studyMlReportRowExample
);

const StudyCheckInCreated201Ok = successEnvelope(
  "201 Created",
  `Stored check-in answer row. ${MishkaI18nTail}`,
  { id: Ex.UUID, sessionId: Ex.UUID, kind: "mood_scale_10", responseInt: 7, createdAt: "2026-05-05T12:06:00.000Z" }
);

const SavedLibraryQuiz200Ok = successEnvelope(
  "200 OK",
  "Full quiz with `questions`; `savedAt` is set. Path `id` is the quiz id (same as list item `id`).",
  Ex.savedQuizDetailExample
);

const SavedLibraryFlashcardSet200Ok = successEnvelope(
  "200 OK",
  "Full flashcard set with `flashcards`; `savedAt` is set. Path `id` is the set id.",
  Ex.savedFlashcardSetDetailExample
);

const SavedLibrarySummary200Ok = successEnvelope(
  "200 OK",
  "Full summary row; `savedAt` is set. Path `id` is the summary id.",
  Ex.savedSummaryDetailExample
);

const SavedLibraryMindMap200Ok = successEnvelope(
  "200 OK",
  "Full mind map row (`content` JSON); `savedAt` is set. Path `id` is the mind map id.",
  Ex.savedMindMapDetailExample
);

module.exports = {
  OkEnvelope,
  CreatedEnvelope,
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  Conflict,
  ServiceUnavailable,
  InternalError,
  defaultError,
  BadGatewayAi,
  AiUpload200Ok,
  AiChat200Ok,
  AiGenerateTools200Ok,
  SendSignupOtp200Ok,
  VerifySignupOtp200Ok,
  ForgotPassword200Ok,
  ResetPassword200Ok,
  AuthMe200Ok,
  OAuthReturn200Ok,
  Login200Ok,

  StudyCatalog200Ok,
  StudyCustomTimersList200Ok,
  StudyCustomTimerCreated201Ok,
  StudyTimerDeleted200Ok,
  StudyStatsSummary200Ok,
  StudySessionsList200Ok,
  StudySessionCreated201Ok,
  StudySessionDetail200Ok,
  StudyFullReport200Ok,
  StudyReportsPaginated200Ok,
  StudyPeriodReport200Ok,
  StudyTelemetry200Ok,
  StudyMlReportCreated201Ok,
  StudyCheckInCreated201Ok,

  SavedLibraryQuiz200Ok,
  SavedLibraryFlashcardSet200Ok,
  SavedLibrarySummary200Ok,
  SavedLibraryMindMap200Ok,
};
