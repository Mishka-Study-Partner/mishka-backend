require("dotenv").config();
const base = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const isNgrok = /ngrok/i.test(base);
const defaultHeaders = isNgrok ? { "ngrok-skip-browser-warning": "true" } : {};

function jsonHeaders(extra = {}) {
  return { ...defaultHeaders, "content-type": "application/json", ...extra };
}

async function main() {
  console.log("Base URL:", base);  const uniq = Date.now();
  const email = `verify_${uniq}@example.com`;
  const password = "Verify1!Pass9";

  // 1. OpenAPI schemas
  const spec = await fetch(`${base}/openapi.json`).then((r) => r.json());
  const exportSchema = spec.components?.schemas?.YourReportExportBody;
  const prefSchema = spec.components?.schemas?.UserPreferenceReportEmailSettings;
  if (!exportSchema?.properties?.emailRecipient || !exportSchema?.properties?.emailTo) {
    throw new Error("OpenAPI missing YourReportExportBody.emailRecipient/emailTo");
  }
  if (!prefSchema?.properties?.accountEmail || !prefSchema?.properties?.reportEmailRecipient) {
    throw new Error("OpenAPI missing UserPreferenceReportEmailSettings fields");
  }
  console.log("1. OpenAPI schemas OK");

  // 2. Register + login
  const reg = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      firstName: "Verify",
      lastName: "User",
      email,
      password,
      agreeTerms: true,
      phoneNumber: `555${String(uniq).slice(-7)}`,
      countryCode: "+1",
      educationStatus: "school",
      schoolTrack: "middle_school",
      schoolGrade: 1,
    }),
  }).then((r) => r.json());
  if (!reg.success) throw new Error("register failed: " + JSON.stringify(reg));
  const token = reg.data.accessToken;
  const auth = jsonHeaders({ Authorization: `Bearer ${token}` });
  console.log("2. Auth OK");

  // 3. GET /auth/me (was 500 before migrations)
  const me = await fetch(`${base}/auth/me`, { headers: auth }).then((r) => r.json());
  if (!me.success) throw new Error("GET /auth/me failed: " + JSON.stringify(me));
  console.log("3. GET /auth/me OK");

  // 4. PATCH + GET user-preferences/me (reportEmailRecipient)
  const patch = await fetch(`${base}/user-preferences/me`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ reportEmailRecipient: "norhan.moh@gmail.com" }),
  }).then((r) => r.json());
  if (!patch.success) throw new Error("PATCH user-preferences failed: " + JSON.stringify(patch));
  const re = patch.data?.reportEmail;
  if (!re?.accountEmail || re.reportEmailRecipient !== "norhan.moh@gmail.com" || !re.usingCustomRecipient) {
    throw new Error("reportEmail shape wrong: " + JSON.stringify(re));
  }
  console.log("4. PATCH/GET user-preferences/me OK", { accountEmail: re.accountEmail, recipient: re.reportEmailRecipient });

  // 5. GET bundle (utcWeekRangeContaining)
  const bundle = await fetch(
    `${base}/reports/your-report?format=bundle&period=weekly&anchorDate=2026-06-01`,
    { headers: auth }
  ).then((r) => r.json());
  if (!bundle.success) throw new Error("GET bundle failed: " + JSON.stringify(bundle));
  console.log("5. GET /reports/your-report?format=bundle OK", { periodLabel: bundle.data?.periodLabel });

  // 6. POST export (download only — no SMTP needed; 422 OK if test user has no study data)
  const expRes = await fetch(`${base}/reports/your-report/export`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      period: "weekly",
      anchorDate: "2026-06-01",
      locale: "en",
      delivery: "download",
      emailRecipient: "custom",
      emailTo: "norhan.moh@gmail.com",
    }),
  });
  const exp = await expRes.json();
  if (exp.success && exp.data?.pdfUrl) {
    console.log("6. POST /reports/your-report/export OK", { reportId: exp.data.reportId });
  } else if (exp.error === "REPORT_NO_DATA") {
    console.log("6. POST /reports/your-report/export OK (422 REPORT_NO_DATA — empty test user, fields accepted)");
  } else if (exp.error === "VALIDATION_ERROR" && /Unrecognized key|emailTo|emailRecipient/i.test(JSON.stringify(exp))) {
    throw new Error("POST export validation failed: " + JSON.stringify(exp));
  } else {
    throw new Error("POST export failed: " + JSON.stringify(exp));
  }

  // 7. DB migration status
  const { execSync } = require("child_process");
  const status = execSync("npx prisma migrate status", { encoding: "utf8", cwd: __dirname + "/.." });
  if (!status.includes("Database schema is up to date")) {
    throw new Error("migrations not up to date:\n" + status);
  }
  console.log("7. Prisma migrations OK");

  console.log("\nALL CHECKS PASSED");
}

main().catch((e) => {
  console.error("\nVERIFY FAILED:", e.message);
  process.exit(1);
});
