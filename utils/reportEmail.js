const fs = require("fs");
const axios = require("axios");
const nodemailer = require("nodemailer");

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/** True when either Resend (HTTPS) or SMTP is configured. Prefer Resend on Railway. */
function emailConfigured() {
  return resendConfigured() || smtpConfigured();
}

function createTransport() {
  const port = parseInt(String(process.env.SMTP_PORT || "587"), 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.isFinite(port) ? port : 587,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    connectionTimeout: parseInt(String(process.env.SMTP_CONNECTION_TIMEOUT_MS || "15000"), 10),
    greetingTimeout: parseInt(String(process.env.SMTP_GREETING_TIMEOUT_MS || "15000"), 10),
    socketTimeout: parseInt(String(process.env.SMTP_SOCKET_TIMEOUT_MS || "30000"), 10),
    family: 4,
    requireTLS: !secure && port === 587,
    tls: { minVersion: "TLSv1.2" },
  });
}

function resolveFromAddress() {
  return process.env.RESEND_FROM || process.env.SMTP_FROM;
}

function buildYourReportBodies(opts) {
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

  return { text, html };
}

async function sendViaResend(opts) {
  const from = resolveFromAddress();
  if (!from) throw new Error("Set RESEND_FROM or SMTP_FROM for email delivery");

  const pdfContent = fs.readFileSync(opts.pdfPath).toString("base64");
  const { text, html } = buildYourReportBodies(opts);

  await axios.post(
    "https://api.resend.com/emails",
    {
      from,
      to: [opts.to],
      subject: opts.subject,
      text,
      html,
      attachments: [{ filename: opts.filename, content: pdfContent }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: parseInt(String(process.env.RESEND_TIMEOUT_MS || "30000"), 10),
    }
  );
  return true;
}

async function sendViaSmtp(opts) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM;
  const { text, html } = buildYourReportBodies(opts);

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

/**
 * @param {{ to: string; periodLabel: string; downloadUrl: string; expiresAt: string }} opts
 */
async function sendReportExportEmail(opts) {
  if (!emailConfigured()) return false;
  if (resendConfigured()) {
    const from = resolveFromAddress();
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
    await axios.post(
      "https://api.resend.com/emails",
      { from, to: [opts.to], subject, text },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: parseInt(String(process.env.RESEND_TIMEOUT_MS || "30000"), 10),
      }
    );
    return true;
  }

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

  await transport.sendMail({ from, to: opts.to, subject, text });
  return true;
}

/**
 * Your Report PDF email with attachment.
 * Uses Resend HTTPS API when RESEND_API_KEY is set (recommended on Railway).
 * @param {{ to: string; subject: string; periodLabel: string; downloadUrl: string; locale: string; pdfPath: string; filename: string }} opts
 */
async function sendYourReportEmail(opts) {
  if (!emailConfigured()) return false;
  if (resendConfigured()) {
    console.log("[reportEmail] sending via Resend to", opts.to);
    return sendViaResend(opts);
  }
  console.log("[reportEmail] sending via SMTP to", opts.to);
  return sendViaSmtp(opts);
}

module.exports = {
  smtpConfigured,
  resendConfigured,
  emailConfigured,
  sendReportExportEmail,
  sendYourReportEmail,
};
