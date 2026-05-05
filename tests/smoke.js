const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function readEnvelope(res) {
  const json = await res.json();
  return json;
}

async function main() {
  const uniq = Date.now();
  const email = `smoke_${uniq}@example.com`;
  const password = "Smoke1!Pass9";

  const registerRes = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Smoke",
      lastName: "Tester",
      email,
      password,
      agreeTerms: true,
      rememberMe: false,
      phoneNumber: `555${String(uniq).slice(-7)}`,
      countryCode: "+1",
      educationStatus: "school",
      schoolTrack: "middle_school",
      schoolGrade: 1,
    }),
  });
  const registerJson = await readEnvelope(registerRes);
  assert(registerRes.status === 201 && registerJson.success, `register failed: ${registerRes.status}`);
  assert(registerJson.data?.accessToken, "register accessToken missing");
  const userId = registerJson.data.user.id;

  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await readEnvelope(loginRes);
  assert(loginRes.status === 200 && loginJson.success, `login failed: ${loginRes.status}`);
  assert(loginJson.data?.accessToken, "login accessToken missing");

  const meRes = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${loginJson.data.accessToken}` },
  });
  const meJson = await readEnvelope(meRes);
  assert(meRes.status === 200 && meJson.success, `auth/me failed: ${meRes.status}`);

  const adminListRes = await fetch(`${baseUrl}/users`, {
    headers: { Authorization: `Bearer ${loginJson.data.accessToken}` },
  });
  const adminListJson = await readEnvelope(adminListRes);
  assert(
    adminListRes.status === 403 && adminListJson.success === false && adminListJson.error === "FORBIDDEN",
    `GET /users should be forbidden for non-admin: got ${adminListRes.status}`
  );

  const selfUserRes = await fetch(`${baseUrl}/users/${userId}`, {
    headers: { Authorization: `Bearer ${loginJson.data.accessToken}` },
  });
  const selfUserJson = await readEnvelope(selfUserRes);
  assert(selfUserRes.status === 200 && selfUserJson.success, `GET /users/:id (self) failed: ${selfUserRes.status}`);

  const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const forgotJson = await readEnvelope(forgotRes);
  assert(forgotRes.status === 200 && forgotJson.success, `forgot-password failed: ${forgotRes.status}`);
  assert(forgotJson.data?.sent === true, "forgot-password envelope invalid");

  const prisma = new PrismaClient();
  const tokenRow = await prisma.passwordResetToken.findFirst({
    where: { userId, isUsed: false },
    orderBy: { createdAt: "desc" },
  });
  assert(tokenRow, "reset token not found in DB (forgot-password did not persist)");
  await prisma.$disconnect();

  const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId,
      resetCode: tokenRow.resetCode,
      newPassword: "Smoke1!Pass8",
    }),
  });
  const resetJson = await readEnvelope(resetRes);
  assert(resetRes.status === 200 && resetJson.success, `reset-password failed: ${resetRes.status}`);

  console.log("SMOKE TEST PASSED");
}

main().catch((e) => {
  console.error("SMOKE TEST FAILED:", e.message);
  process.exit(1);
});
