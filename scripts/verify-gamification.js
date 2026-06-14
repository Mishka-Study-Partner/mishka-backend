/**
 * Smoke test gamification endpoints (requires running server + auth token).
 * Usage: node scripts/verify-gamification.js [baseUrl] [bearerToken]
 */
require("dotenv").config();

const base = process.argv[2] || process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const token = process.argv[3] || process.env.SMOKE_TOKEN;

async function req(method, path, body) {
  const headers = { "Content-Type": "application/json", "Accept-Language": "en" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log("Gamification verify against", base);

  const dash = await req("GET", "/gamification/dashboard?period=weekly");
  console.log("GET /gamification/dashboard", dash.status, dash.json.success ? "OK" : dash.json.error);
  if (dash.json.success) {
    const d = dash.json.data;
    console.log("  week:", d.weekStart, "–", d.weekEnd);
    console.log("  aiToolBadges:", d.aiToolBadges?.length, "tasks goal:", d.tasks?.goal);
  }

  const month = new Date().toISOString().slice(0, 7);
  for (const section of ["streak", "tasks", "study", "community", "ai-tools"]) {
    const r = await req("GET", `/gamification/sections/${section}/monthly?month=${month}`);
    console.log(`GET /gamification/sections/${section}/monthly`, r.status, r.json.success ? "OK" : r.json.error);
  }

  if (!token) {
    console.log("\nPass bearer token as 2nd arg to test collect.");
    return;
  }

  console.log("\nCollect requires real quiz attempt id — skip unless provided in env TEST_QUIZ_ATTEMPT_ID");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
