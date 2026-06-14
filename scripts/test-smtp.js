require("dotenv").config();
const { emailConfigured, resendConfigured, smtpConfigured } = require("../utils/reportEmail");

async function main() {
  if (!emailConfigured()) {
    console.error("Email not configured.");
    console.error("Railway (recommended): set RESEND_API_KEY + RESEND_FROM");
    console.error("Alternative: set SMTP_HOST + SMTP_FROM (+ SMTP_USER, SMTP_PASS)");
    process.exit(1);
  }

  const to = process.argv[2];
  if (!to) {
    console.error("Usage: node scripts/test-smtp.js <recipient@email.com>");
    process.exit(1);
  }

  if (resendConfigured()) {
    const axios = require("axios");
    const from = process.env.RESEND_FROM || process.env.SMTP_FROM;
    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: [to],
        subject: "Mishka email test (Resend)",
        text: "If you received this, Resend is working for Your Report email export.",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
    console.log("Resend test email sent to:", to);
    return;
  }

  if (!process.env.SMTP_PASS) {
    console.error("SMTP_PASS is empty.");
    console.error("Gmail: Google Account → Security → 2-Step Verification → App passwords.");
    process.exit(1);
  }

  const nodemailer = require("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
    family: 4,
  });

  await transport.verify();
  console.log("SMTP connection OK");

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Mishka SMTP test",
    text: "If you received this, SMTP is working for Your Report email export.",
  });
  console.log("SMTP test email sent to:", to);
}

main().catch((e) => {
  console.error("Email test failed:", e.message);
  if (smtpConfigured() && !resendConfigured()) {
    console.error("");
    console.error("Gmail SMTP often times out on Railway. Use Resend instead:");
    console.error("  1. Sign up at https://resend.com");
    console.error("  2. Add RESEND_API_KEY and RESEND_FROM to Railway variables");
    console.error("  3. Redeploy and run: node scripts/test-smtp.js <your-email>");
  }
  process.exit(1);
});
