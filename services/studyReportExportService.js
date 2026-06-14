const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const PDFDocument = require("pdfkit");
const prisma = require("../utils/prisma");
const { badRequest, forbidden, notFound, HttpError } = require("../utils/httpError");
const { jwtSecret } = require("../utils/jwtSecret");
const { parseReportTopLevelMode } = require("../utils/studyReportMode");
const {
  reportForDay,
  reportForWeek,
  reportForMonth,
  reportForYear,
  utcDayRange,
  utcWeekRangeContaining,
  utcMonthRange,
} = require("./studyPeriodReportService");
const { buildAiUsageReport } = require("./aiUsageReportService");
const { buildTaskCompletionsReport } = require("./taskCompletionsReportService");
const { getHistory, formatIsoDateUtc } = require("./dailyStreakService");
const {
  newExportId,
  pdfPath,
  writeMeta,
  readMeta,
  ensureDir,
} = require("../utils/reportExportStorage");
const { emailConfigured, sendReportExportEmail } = require("../utils/reportEmail");

const DEFAULT_TTL_HOURS = 168;

function exportTtlMs() {
  const h = parseInt(String(process.env.REPORT_EXPORT_TTL_HOURS || DEFAULT_TTL_HOURS), 10);
  return (Number.isFinite(h) && h > 0 ? h : DEFAULT_TTL_HOURS) * 3600000;
}

function publicBaseUrl(req) {
  if (process.env.REPORT_EXPORT_BASE_URL) return process.env.REPORT_EXPORT_BASE_URL.replace(/\/$/, "");
  const host = req.get("host");
  return host ? `${req.protocol}://${host}` : "";
}

function studyOptionsFromBody(body) {
  const { mode, explicitAll } = parseReportTopLevelMode(body.topLevelMode);
  return { topLevelMode: mode, explicitAll };
}

/**
 * @returns {{ from: string; to: string; periodLabel: string; studyKind: "day"|"week"|"month"|"year"; studyArgs: unknown[] }}
 */
function resolveExportWindow(body) {
  const { period, date, year, month } = body;
  if (period === "daily") {
    const range = utcDayRange(date);
    if (!range) throw badRequest("Invalid date", undefined, "VALIDATION_ERROR");
    return {
      from: date,
      to: date,
      periodLabel: `Day ${date} (UTC)`,
      studyKind: "day",
      studyArgs: [date],
    };
  }
  if (period === "weekly") {
    const range = utcWeekRangeContaining(date);
    if (!range) throw badRequest("Invalid date", undefined, "VALIDATION_ERROR");
    const to = new Date(range.end);
    to.setUTCDate(to.getUTCDate() - 1);
    return {
      from: range.weekMondayDate,
      to: formatIsoDateUtc(to),
      periodLabel: `Week of ${range.weekMondayDate} (UTC)`,
      studyKind: "week",
      studyArgs: [date],
    };
  }
  if (period === "monthly") {
    const range = utcMonthRange(year, month);
    if (!range) throw badRequest("Invalid year/month", undefined, "VALIDATION_ERROR");
    const to = new Date(range.end);
    to.setUTCDate(to.getUTCDate() - 1);
    const from = formatIsoDateUtc(range.start);
    const label = `${year}-${String(month).padStart(2, "0")}`;
    return {
      from,
      to: formatIsoDateUtc(to),
      periodLabel: `Month ${label} (UTC)`,
      studyKind: "month",
      studyArgs: [year, month],
    };
  }
  const y = Number(year);
  return {
    from: `${y}-01-01`,
    to: `${y}-12-31`,
    periodLabel: `Year ${y} (UTC)`,
    studyKind: "year",
    studyArgs: [y],
  };
}

async function loadReportBundle(userId, body) {
  const window = resolveExportWindow(body);
  const opts = studyOptionsFromBody(body);

  let study;
  if (window.studyKind === "day") {
    study = await reportForDay(userId, window.studyArgs[0], opts);
  } else if (window.studyKind === "week") {
    study = await reportForWeek(userId, window.studyArgs[0], opts);
  } else if (window.studyKind === "month") {
    study = await reportForMonth(userId, window.studyArgs[0], window.studyArgs[1], opts);
  } else {
    study = await reportForYear(userId, window.studyArgs[0], opts);
  }

  const [aiTools, tasksCompleted, streakHistory] = await Promise.all([
    buildAiUsageReport(userId, window.from, window.to),
    buildTaskCompletionsReport(userId, window.from, window.to, "day"),
    getHistory(userId, window.from, window.to),
  ]);

  const studyMinutes = Math.round((study?.totals?.sumApproximateMainStudySeconds ?? 0) / 60);
  const streakSummary = study?.userContext?.dailyStreak ?? {
    currentStreak: streakHistory.currentStreak,
    longestStreak: streakHistory.longestStreak,
    freezesRemaining: streakHistory.freezesRemaining,
  };

  return {
    window,
    study,
    studyMinutes,
    aiTools,
    tasksCompleted,
    streakSummary,
    streakHistory,
  };
}

function writePdf(filePath, bundle, user) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(filePath));
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    doc.fontSize(22).text("Mishka — Your Report", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#333333");
    doc.text(`User: ${name}`);
    doc.text(`Period: ${bundle.window.periodLabel}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();

    doc.fontSize(16).fillColor("#000000").text("Study with Mishka");
    doc.fontSize(12).fillColor("#333333");
    doc.text(`Total study time: ${bundle.studyMinutes} minutes`);
    if (bundle.study?.totals?.sessionsStarted != null) {
      doc.text(`Sessions started: ${bundle.study.totals.sessionsStarted}`);
    }
    doc.moveDown();

    doc.fontSize(16).fillColor("#000000").text("Daily streak");
    doc.fontSize(12).fillColor("#333333");
    doc.text(`Current streak: ${bundle.streakSummary.currentStreak ?? 0} days`);
    doc.text(`Longest streak: ${bundle.streakSummary.longestStreak ?? 0} days`);
    doc.text(`Freezes remaining: ${bundle.streakSummary.freezesRemaining ?? 0}`);
    const doneDays = bundle.streakHistory.days.filter((d) => d.state === "past_done" || d.state === "today_done").length;
    doc.text(`Active days in period: ${doneDays} / ${bundle.streakHistory.days.length}`);
    doc.moveDown();

    doc.fontSize(16).fillColor("#000000").text("AI tools");
    doc.fontSize(12).fillColor("#333333");
    if (bundle.aiTools) {
      doc.text(`Quizzes: ${bundle.aiTools.quizzes}`);
      doc.text(`Flashcards: ${bundle.aiTools.flashcards}`);
      doc.text(`Summaries: ${bundle.aiTools.summaries}`);
      doc.text(`Mind maps: ${bundle.aiTools.mindMaps}`);
    }
    doc.moveDown();

    doc.fontSize(16).fillColor("#000000").text("Tasks completed");
    doc.fontSize(12).fillColor("#333333");
    doc.text(`Total completed in period: ${bundle.tasksCompleted?.totalCompleted ?? 0}`);
    const buckets = bundle.tasksCompleted?.buckets ?? [];
    if (buckets.length && buckets.length <= 31) {
      doc.moveDown(0.25);
      for (const b of buckets) {
        if (b.completedCount > 0) doc.text(`${b.label}: ${b.completedCount}`);
      }
    }

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.on("error", reject);
  });
}

function signDownloadToken(userId, exportId, expiresAt) {
  return jwt.sign(
    { sub: userId, exportId, purpose: "report_export" },
    jwtSecret(),
    { expiresIn: Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) }
  );
}

function verifyDownloadToken(token) {
  const payload = jwt.verify(token, jwtSecret());
  if (payload.purpose !== "report_export" || !payload.sub || !payload.exportId) {
    throw forbidden("Invalid export token", "FORBIDDEN");
  }
  return { userId: payload.sub, exportId: payload.exportId };
}

/**
 * @param {import("express").Request} req
 */
async function createExport(req) {
  const userId = req.auth.sub;
  const body = req.body;
  const bundle = await loadReportBundle(userId, body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) throw notFound();

  const exportId = newExportId();
  const expiresAt = new Date(Date.now() + exportTtlMs());
  const outPath = pdfPath(userId, exportId);
  await writePdf(outPath, bundle, user);

  writeMeta(userId, exportId, {
    expiresAt: expiresAt.toISOString(),
    periodLabel: bundle.window.periodLabel,
    period: body.period,
  });

  const token = signDownloadToken(userId, exportId, expiresAt);
  const base = publicBaseUrl(req);
  const pdfUrl = `${base}/study-with-mishka/reports/export/${exportId}?token=${encodeURIComponent(token)}`;

  let emailedTo = null;
  if (body.delivery === "email") {
    if (!emailConfigured()) {
      throw new HttpError(
        503,
        "Email delivery is not configured (set RESEND_API_KEY or SMTP_HOST and SMTP_FROM)",
        undefined,
        "REPORT_EXPORT_EMAIL_NOT_CONFIGURED"
      );
    }
    await sendReportExportEmail({
      to: user.email,
      periodLabel: bundle.window.periodLabel,
      downloadUrl: pdfUrl,
      expiresAt: expiresAt.toISOString(),
    });
    emailedTo = user.email;
  }

  return {
    exportId,
    pdfUrl,
    expiresAt: expiresAt.toISOString(),
    periodLabel: bundle.window.periodLabel,
    delivery: body.delivery || "download",
    emailedTo,
  };
}

/**
 * @param {import("express").Request} req
 */
async function resolveExportAccess(req) {
  const exportId = req.params.exportId;
  let userId = req.auth?.sub;

  const token = typeof req.query.token === "string" ? req.query.token : null;
  if (token) {
    const decoded = verifyDownloadToken(token);
    userId = decoded.userId;
    if (decoded.exportId !== exportId) throw forbidden("Token does not match export", "FORBIDDEN");
  }

  if (!userId) throw forbidden("Authentication required", "FORBIDDEN");

  const meta = readMeta(userId, exportId);
  if (!meta) throw notFound("Export not found or expired", "NOT_FOUND");

  if (new Date(meta.expiresAt).getTime() < Date.now()) {
    throw notFound("Export not found or expired", "NOT_FOUND");
  }

  if (req.auth?.sub && req.auth.sub !== userId) {
    throw forbidden("Not your export", "FORBIDDEN");
  }

  return { userId, exportId, meta };
}

module.exports = {
  createExport,
  resolveExportAccess,
  pdfPath,
};
