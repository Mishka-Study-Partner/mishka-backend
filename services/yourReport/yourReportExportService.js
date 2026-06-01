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
const { smtpConfigured, sendYourReportEmail } = require("../../utils/reportEmail");

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
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET required for report export tokens");
  return jwt.sign(
    { sub: userId, exportId: reportId, purpose: "your_report_export" },
    secret,
    { expiresIn: Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) }
  );
}

function verifyDownloadToken(token) {
  const secret = process.env.JWT_SECRET;
  const payload = jwt.verify(token, secret);
  if (payload.purpose !== "your_report_export" || !payload.sub || !payload.exportId) {
    throw forbidden("Invalid export token", "FORBIDDEN");
  }
  return { userId: payload.sub, exportId: payload.exportId };
}

/**
 * @param {string} userId
 * @param {{ period: string; anchorDate: string; locale?: string; delivery?: string; baseUrl?: string; periodKey?: string }} opts
 */
async function runYourReportExportForUser(userId, opts) {
  const {
    period,
    anchorDate,
    locale = "en",
    delivery = "download",
    baseUrl: baseUrlOverride,
    periodKey,
  } = opts;

  assertExportPeriod(period);

  if (!["email", "download", "both"].includes(delivery)) {
    throw badRequest("delivery must be email, download, or both", undefined, "VALIDATION_ERROR");
  }

  const payload = await buildYourReportPayload(userId, {
    period,
    anchorDate,
    locale: locale === "ar" ? "ar" : "en",
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) throw notFound();

  const reportId = newExportId();
  const expiresAt = new Date(Date.now() + exportTtlMs());
  const outPath = pdfPath(userId, reportId);
  ensureDir(path.dirname(outPath));

  const pdfBuffer = await renderYourReportPdf(payload);
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
    if (!smtpConfigured()) {
      throw new HttpError(
        503,
        "Email delivery is not configured (set SMTP_HOST and SMTP_FROM)",
        undefined,
        "REPORT_EXPORT_EMAIL_NOT_CONFIGURED"
      );
    }
    const filename = `mishka-report-${period}-${anchorDate}.pdf`;
    await sendYourReportEmail({
      to: user.email,
      subject,
      periodLabel: payload.periodLabel,
      downloadUrl: pdfUrl,
      locale: payload.locale,
      pdfPath: outPath,
      filename,
    });
    emailedTo = user.email;
    emailSentAt = new Date().toISOString();
  }

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
