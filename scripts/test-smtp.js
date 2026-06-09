require("dotenv").config();
const nodemailer = require("nodemailer");
const { smtpConfigured } = require("../utils/reportEmail");

async function main() {
  if (!smtpConfigured()) {
    console.error("SMTP not configured: set SMTP_HOST and SMTP_FROM in .env");
    process.exit(1);
  }
  if (!process.env.SMTP_PASS) {
    console.error("SMTP_PASS is empty.");
    console.error("Gmail: Google Account → Security → 2-Step Verification → App passwords → create one for Mail.");
    console.error('Then set SMTP_PASS="xxxx xxxx xxxx xxxx" in .env and restart the server.');
    process.exit(1);
  }

  const to = process.argv[2] || process.env.SMTP_USER;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transport.verify();
  console.log("SMTP connection OK");

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Mishka SMTP test (ngrok dev)",
    text: "If you received this, SMTP is working for Your Report email export.",
  });
  console.log("Test email sent to:", to);
}

main().catch((e) => {
  console.error("SMTP test failed:", e.message);
  process.exit(1);
});
