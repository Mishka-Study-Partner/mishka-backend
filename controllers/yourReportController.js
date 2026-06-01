const fs = require("fs");
const asyncHandler = require("../utils/asyncHandler");
const { notFound } = require("../utils/httpError");
const { buildYourReportPayload } = require("../services/yourReport/yourReportPayloadService");
const { buildYourReportBundle } = require("../services/yourReport/yourReportBundleService");
const {
  createYourReportExport,
  resolveYourReportExportAccess,
  pdfPath,
} = require("../services/yourReport/yourReportExportService");

/** GET /reports/your-report — `format=bundle` (default) or `format=payload` (PDF renderer). */
exports.getReport = asyncHandler(async (req, res) => {
  const { period, anchorDate, locale, format = "bundle" } = req.query;
  const loc = locale === "ar" ? "ar" : "en";
  if (format === "payload") {
    const data = await buildYourReportPayload(req.auth.sub, { period, anchorDate, locale: loc });
    return res.apiSuccess(data, "OK", 200);
  }
  const data = await buildYourReportBundle(req.auth.sub, {
    period,
    anchorDate,
    locale: loc,
    includeCommunity: req.query.includeCommunity !== "false",
  });
  res.apiSuccess(data, "OK", 200);
});

exports.exportReport = asyncHandler(async (req, res) => {
  const data = await createYourReportExport(req);
  res.apiSuccess(data, "OK", 200);
});

exports.downloadReport = asyncHandler(async (req, res) => {
  const { userId, reportId, meta } = await resolveYourReportExportAccess(req);
  const file = pdfPath(userId, reportId);
  if (!fs.existsSync(file)) throw notFound("Report file missing", "NOT_FOUND");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="mishka-report-${meta.period || "export"}.pdf"`
  );
  fs.createReadStream(file).pipe(res);
});
