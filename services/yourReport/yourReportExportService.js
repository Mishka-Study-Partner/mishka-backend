const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const prisma = require("../../utils/prisma");
const { badRequest, forbidden, notFound, HttpError } = require("../../utils/httpError");
const { buildYourReportPayload } = require("./yourReportPayloadService");
const { assertExportPeriod } = require("./yourReportPeriod");
const { renderYourReportPdf } = require("./yourReportPdfRenderer");
const { labelsFor } = require("./yourReportLabels");
const {
  newExportId,
  pdfPath,
  writeMeta,
  readMeta,
  ensureDir,
} = require("../../utils/reportExportStorage");
const { jwtSecret } = require("../../utils/jwtSecret");
const { emailConfigured, sendYourReportEmail } = require("../../utils/reportEmail");

const DEFAULT_TTL_HOURS = 168;

function exportTtlMs() {
  const h = parseInt(String(process.env.REPORT_EXPORT_TTL_HOURS || DEFAULT_TTL_HOURS), 10);
  return (Number.isFinite(h) && h > 0 ? h : DEFAULT_TTL_HOURS) * 3600000;
}

function resolvePublicBaseUrl(req) {
  if (process.env.REPORT_EXPORT_BASE_URL) return process.env.REPORT_EXPORT_BASE_URL.replace(/\/$/, "");
  if (req) {
    const host = req.get("host");
    if (host) return `${req.protocol}://${host}`;
  }
  return "http://127.0.0.1:3000";
}

function signDownloadToken(userId, reportId, expiresAt) {
  return jwt.sign(
    { sub: userId, exportId: reportId, purpose: "your_report_export" },
    jwtSecret(),
    { expiresIn: Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) }
  );
}

function verifyDownloadToken(token) {
  const payload = jwt.verify(token, jwtSecret());
  if (payload.purpose !== "your_report_export" || !payload.sub || !payload.exportId) {
    throw forbidden("Invalid export token", "FORBIDDEN");
  }
  return { userId: payload.sub, exportId: payload.exportId };
}

/**
 * Resolve export recipient: explicit account/custom choice, emailTo override, saved preference, then account email.
 * @param {string} userId
 * @param {{ email: string }} user
 * @param {{ emailRecipient?: "account"|"custom"; emailTo?: string }} opts
 */
async function resolveExportRecipientEmail(userId, user, opts = {}) {
  const { emailRecipient, emailTo } = opts;
  if (emailRecipient === "account") return user.email;
  if (emailRecipient === "custom") {
    const to = emailTo?.trim();
    if (!to) {
      throw badRequest("emailTo is required when emailRecipient is custom", undefined, "VALIDATION_ERROR");
    }
    return to;
  }
  if (emailTo?.trim()) return emailTo.trim();
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { reportEmailRecipient: true },
  });
  return pref?.reportEmailRecipient?.trim() || user.email;
}

/**
 * @param {string} userId
 * @param {{ period: string; anchorDate: string; locale?: string; delivery?: string; emailRecipient?: "account"|"custom"; emailTo?: string; baseUrl?: string; periodKey?: string }} opts
 */
async function runYourReportExportForUser(userId, opts) {
  const {
    period,
    anchorDate,
    locale = "en",
    delivery = "download",
    emailRecipient,
    emailTo,
    baseUrl: baseUrlOverride,
    periodKey,
  } = opts;

  assertExportPeriod(period);

  if (!["email", "download", "both"].includes(delivery)) {
    throw badRequest("delivery must be email, download, or both", undefined, "VALIDATION_ERROR");
  }

  const startedAt = Date.now();
  const logStep = (step) => console.log(`[yourReport.export] ${step} +${Date.now() - startedAt}ms`);

  const payload = await buildYourReportPayload(userId, {
    period,
    anchorDate,
    locale: locale === "ar" ? "ar" : "en",
  });

  logStep("payload ready");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) throw notFound();

  const recipientEmail = await resolveExportRecipientEmail(userId, user, { emailRecipient, emailTo });

  const reportId = newExportId();
  const expiresAt = new Date(Date.now() + exportTtlMs());
  const outPath = pdfPath(userId, reportId);
  ensureDir(path.dirname(outPath));

  let pdfBuffer;
  try {
    pdfBuffer = await renderYourReportPdf(payload);
    logStep("pdf rendered");
  } catch (err) {
    console.error("[yourReport.export] PDF render failed", err?.message || err);
    throw new HttpError(
      503,
      "Could not generate report PDF on the server",
      process.env.NODE_ENV === "development" || process.env.SHOW_ERROR_DETAILS === "true"
        ? { developerMessage: err?.message, hint: "Install Chromium on deploy (see Dockerfile) or set PUPPETEER_EXECUTABLE_PATH" }
        : undefined,
      "REPORT_EXPORT_PDF_FAILED"
    );
  }
  fs.writeFileSync(outPath, pdfBuffer);

  writeMeta(userId, reportId, {
    expiresAt: expiresAt.toISOString(),
    periodLabel: payload.periodLabel,
    period,
    kind: "your_report",
    periodKey: periodKey ?? null,
  });

  const token = signDownloadToken(userId, reportId, expiresAt);
  const base = baseUrlOverride || resolvePublicBaseUrl(null);
  const pdfUrl = `${base}/reports/your-report/export/${reportId}?token=${encodeURIComponent(token)}`;

  const loc = labelsFor(payload.locale);
  const subject = loc.emailSubject.replace("{periodLabel}", payload.periodLabel);

  let emailedTo = null;
  let emailSentAt = null;

  if (delivery === "email" || delivery === "both") {
    if (!emailConfigured()) {
      throw new HttpError(
        503,
        "Email delivery is not configured (set RESEND_API_KEY or SMTP_HOST + SMTP_FROM)",
        undefined,
        "REPORT_EXPORT_EMAIL_NOT_CONFIGURED"
      );
    }
    const filename = `mishka-report-${period}-${anchorDate}.pdf`;
    try {
      await sendYourReportEmail({
        to: recipientEmail,
        subject,
        periodLabel: payload.periodLabel,
        downloadUrl: pdfUrl,
        locale: payload.locale,
        pdfPath: outPath,
        filename,
      });
    } catch (err) {
      console.error("[yourReport.export] email failed", err?.message || err);
      if (delivery === "both") {
        logStep("email failed (pdf still available)");
        return {
          reportId,
          periodLabel: payload.periodLabel,
          pdfUrl,
          expiresAt: expiresAt.toISOString(),
          emailedTo: null,
          emailSentAt: null,
          emailFailed: true,
          delivery,
        };
      }
      throw new HttpError(
        502,
        "Report PDF was created but email could not be sent",
        process.env.NODE_ENV === "development" || process.env.SHOW_ERROR_DETAILS === "true"
          ? { developerMessage: err?.message, recipient: recipientEmail }
          : { recipient: recipientEmail },
        "REPORT_EXPORT_EMAIL_FAILED"
      );
    }
    emailedTo = recipientEmail;
    emailSentAt = new Date().toISOString();
    logStep("email sent");
  }

  logStep("done");

  return {
    reportId,
    periodLabel: payload.periodLabel,
    pdfUrl,
    expiresAt: expiresAt.toISOString(),
    emailedTo,
    emailSentAt,
    delivery,
  };
}

/**
 * @param {import("express").Request} req
 */
async function createYourReportExport(req) {
  return runYourReportExportForUser(req.auth.sub, {
    period: req.body.period,
    anchorDate: req.body.anchorDate,
    locale: req.body.locale ?? "en",
    delivery: req.body.delivery ?? "download",
    emailRecipient: req.body.emailRecipient,
    emailTo: req.body.emailTo,
    baseUrl: resolvePublicBaseUrl(req),
  });
}

async function resolveYourReportExportAccess(req) {
  const reportId = req.params.reportId || req.params.exportId;
  let userId = req.auth?.sub;

  const token = typeof req.query.token === "string" ? req.query.token : null;
  if (token) {
    const decoded = verifyDownloadToken(token);
    userId = decoded.userId;
    if (decoded.exportId !== reportId) throw forbidden("Token does not match export", "FORBIDDEN");
  }

  if (!userId) throw forbidden("Authentication required", "FORBIDDEN");

  const meta = readMeta(userId, reportId);
  if (!meta) throw notFound("Report not found or expired", "NOT_FOUND");
  if (new Date(meta.expiresAt).getTime() < Date.now()) {
    throw notFound("Report not found or expired", "NOT_FOUND");
  }
  if (req.auth?.sub && req.auth.sub !== userId) {
    throw forbidden("Not your report", "FORBIDDEN");
  }

  return { userId, reportId, meta };
}

module.exports = {
  createYourReportExport,
  runYourReportExportForUser,
  resolveYourReportExportAccess,
  resolvePublicBaseUrl,
  pdfPath,
  buildYourReportPayload,
};
