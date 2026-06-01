const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { HttpError } = require("./utils/httpError");
const errorHandler = require("./middleware/errorHandler");
const { apiEnvelope } = require("./middleware/apiEnvelope");
const { requireAuth } = require("./middleware/auth");
const upload = require("./middleware/upload");
const { validate } = require("./middleware/validateRequest");
const { requireAdmin } = require("./middleware/authorize");
const legacyAi = require("./controllers/legacyAiController");
const appPublicSettings = require("./controllers/appPublicSettingsController");
const {
  aiChatSchema,
  aiGenerateToolsSchema,
  updateAppPublicSettingsSchema,
  cronScheduledReportsSchema,
} = require("./validation/schemas");

const app = express();
app.set("trust proxy", 1);

const rawOrigins = process.env.CORS_ORIGIN || "*";
const allowAnyOrigin = rawOrigins.trim() === "*";
const allowedOrigins = rawOrigins
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (allowAnyOrigin || !origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new HttpError(403, "Origin not allowed by CORS", undefined, "CORS_FORBIDDEN"));
    },
    credentials: true,
    exposedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(require("path").join(__dirname, "uploads")));
app.use(apiEnvelope);

app.get("/", (req, res) => {
  const host = req.get("host");
  const base = host ? `${req.protocol}://${host}` : "";
  res.apiSuccess(
    {
      name: "Mishka API",
      status: "ok",
      docs: "The root URL returns this JSON. Open Swagger UI at /api-docs (not here).",
      ...(base && {
        swaggerUi: `${base}/api-docs`,
        openApiJson: `${base}/openapi.json`,
      }),
    },
    "OK",
    200
  );
});

app.use("/auth", require("./routes/auth"));

app.get("/public/app-settings", appPublicSettings.get);

if (process.env.DISABLE_SWAGGER !== "true") {
  const { setupSwagger } = require("./swagger");
  setupSwagger(app);
}

app.post("/upload", requireAuth, upload.single("file"), legacyAi.upload);
app.post("/chat", requireAuth, validate(aiChatSchema), legacyAi.chat);
app.post("/generate-tools", requireAuth, validate(aiGenerateToolsSchema), legacyAi.generateTools);

const studyWithMishka = require("./controllers/studyWithMishkaController");
const yourReport = require("./controllers/yourReportController");
const internalCron = require("./controllers/internalCronController");
const requireCronSecret = require("./middleware/requireCronSecret");

app.get("/study-with-mishka/reports/export/:exportId", studyWithMishka.downloadReport);
app.get("/reports/your-report/export/:reportId", yourReport.downloadReport);
app.post(
  "/internal/cron/scheduled-report-emails",
  requireCronSecret,
  validate(cronScheduledReportsSchema),
  internalCron.scheduledReportEmails
);

app.use(requireAuth);
app.put("/public/app-settings", requireAdmin, validate(updateAppPublicSettingsSchema), appPublicSettings.put);
app.use("/users", require("./routes/users"));
app.use("/password-reset-tokens", require("./routes/passwordResetTokens"));
app.use("/user-preferences", require("./routes/userPreferences"));
app.use("/user-sessions", require("./routes/userSessions"));
app.use("/tips", require("./routes/tips"));
app.use("/user-streaks", require("./routes/userStreaks"));
app.use("/ai-tools", require("./routes/aiTools"));
app.use("/study-with-mishka", require("./routes/studyWithMishka"));
app.use("/reports", require("./routes/reports"));
app.use("/communities", require("./routes/communities"));
app.use("/user-communities", require("./routes/userCommunities"));
app.use("/categories", require("./routes/categories"));
app.use("/user-saved-categories", require("./routes/userSavedCategories"));
app.use("/user-ai-activity", require("./routes/userAiActivity"));
app.use("/chat-sessions", require("./routes/chatSessions"));
app.use("/chat-messages", require("./routes/chatMessages"));
app.use("/ai-requests", require("./routes/aiRequests"));
app.use("/flashcard-sets", require("./routes/flashcardSets"));
app.use("/saved-flashcard-sets", require("./routes/savedFlashcardSets"));
app.use("/flashcards", require("./routes/flashcards"));
app.use("/quizzes", require("./routes/quizzes"));
app.use("/saved-quizzes", require("./routes/savedQuizzes"));
app.use("/quiz-questions", require("./routes/quizQuestions"));
app.use("/summaries", require("./routes/summaries"));
app.use("/saved-summaries", require("./routes/savedSummaries"));
app.use("/mind-maps", require("./routes/mindMaps"));
app.use("/saved-mind-maps", require("./routes/savedMindMaps"));
app.use("/history-items", require("./routes/historyItems"));
app.use("/todo-lists", require("./routes/todoLists"));
app.use("/icons", require("./routes/icons"));
app.use("/tasks", require("./routes/tasks"));
app.use("/daily-streaks", require("./routes/dailyStreaks"));
app.use("/usage", require("./routes/usage"));
app.use("/material-shares", require("./routes/materialShares"));

app.use((_req, _res, next) => {
  next(new HttpError(404, "Route not found", undefined, "NOT_FOUND"));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mishka backend listening on http://localhost:${PORT}`);

  if (process.env.ENABLE_IN_PROCESS_REPORT_CRON === "true") {
    try {
      const cron = require("node-cron");
      const { runScheduledReportEmails } = require("./services/scheduledReportEmailJob");
      cron.schedule(
        "0 8 * * *",
        () => {
          runScheduledReportEmails().catch((err) => {
            console.error("[cron] scheduled-report-emails", err?.message || err);
          });
        },
        { timezone: "UTC" }
      );
      console.log("[cron] In-process report email job scheduled (08:00 UTC daily)");
    } catch (err) {
      console.error("[cron] Failed to start in-process scheduler", err?.message || err);
    }
  }
});
