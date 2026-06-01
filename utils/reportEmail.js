const nodemailer = require("nodemailer");

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function createTransport() {
  const port = parseInt(String(process.env.SMTP_PORT || "587"), 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.isFinite(port) ? port : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

/**
 * @param {{ to: string; periodLabel: string; downloadUrl: string; expiresAt: string }} opts
 */
async function sendReportExportEmail(opts) {
  if (!smtpConfigured()) return false;
  const transport = createTransport();
  const from = process.env.SMTP_FROM;
  const subject = process.env.REPORT_EXPORT_EMAIL_SUBJECT || "Your Mishka report";
  const text = [
    "Your Mishka report is ready.",
    "",
    `Period: ${opts.periodLabel}`,
    `Download (expires ${opts.expiresAt}):`,
    opts.downloadUrl,
    "",
    "If the link expires, generate a new report from the app.",
  ].join("\n");

  await transport.sendMail({
    from,
    to: opts.to,
    subject,
    text,
  });
  return true;
}

/**
 * Your Report PDF email with attachment.
 * @param {{ to: string; subject: string; periodLabel: string; downloadUrl: string; locale: string; pdfPath: string; filename: string }} opts
 */
async function sendYourReportEmail(opts) {
  if (!smtpConfigured()) return false;
  const transport = createTransport();
  const from = process.env.SMTP_FROM;
  const isAr = opts.locale === "ar";
  const text = isAr
    ? [
        "تقرير ميشكا جاهز.",
        "",
        `الفترة: ${opts.periodLabel}`,
        `تحميل: ${opts.downloadUrl}`,
      ].join("\n")
    : [
        "Your Mishka report is ready.",
        "",
        `Period: ${opts.periodLabel}`,
        `Download: ${opts.downloadUrl}`,
      ].join("\n");

  const html = isAr
    ? `<p>تقرير ميشكا جاهز.</p><p><strong>${opts.periodLabel}</strong></p><p><a href="${opts.downloadUrl}">تحميل PDF</a></p>`
    : `<p>Your Mishka report is ready.</p><p><strong>${opts.periodLabel}</strong></p><p><a href="${opts.downloadUrl}">Download PDF</a></p>`;

  await transport.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text,
    html,
    attachments: [
      {
        filename: opts.filename,
        path: opts.pdfPath,
        contentType: "application/pdf",
      },
    ],
  });
  return true;
}

module.exports = { smtpConfigured, sendReportExportEmail, sendYourReportEmail };
