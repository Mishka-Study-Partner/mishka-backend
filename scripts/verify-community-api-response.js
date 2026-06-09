/**
 * Verification for docs/FLUTTER_COMMUNITY_API_RESPONSE.md
 * Usage: node scripts/verify-community-api-response.js
 * Optional: SMOKE_BASE_URL=http://localhost:3000
 */
require("dotenv").config();
const base = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

function fail(step, detail) {
  throw new Error(`[${step}] ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

async function main() {
  const uniq = Date.now();
  console.log("BASE:", base);

  const reg = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Comm",
      lastName: "Verify",
      email: `comm_api_${uniq}@example.com`,
      password: "Verify1!Pass9",
      agreeTerms: true,
      phoneNumber: `556${String(uniq).slice(-7)}`,
      countryCode: "+1",
      educationStatus: "university",
      universityYear: 2,
    }),
  }).then((r) => r.json());
  if (!reg.success) fail("register", reg);
  const token = reg.data.accessToken;
  const auth = { Authorization: `Bearer ${token}`, "content-type": "application/json" };
  console.log("register OK");

  const mixedCaseEmail = `Comm_Invite_${uniq}@Example.COM`;
  const reg2 = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Invite",
      lastName: "Target",
      email: mixedCaseEmail,
      password: "Verify1!Pass9",
      agreeTerms: true,
      phoneNumber: `557${String(uniq).slice(-7)}`,
      countryCode: "+1",
      educationStatus: "university",
      universityYear: 2,
    }),
  }).then((r) => r.json());
  if (!reg2.success) fail("register2", reg2);
  const inviteEmail = reg2.data.user.email;
  const inviteUsername = reg2.data.user.username;
  console.log("register invite target OK", inviteEmail, inviteUsername);

  const created = await fetch(`${base}/communities`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: `Verify Public ${uniq}`,
      visibility: "public",
      subjectKeys: ["physics"],
      educationStatus: "university",
      universityYear: 2,
      purpose: "study_group",
    }),
  }).then((r) => r.json());
  if (!created.success) fail("create community", created);
  const cid = created.data.id;
  console.log("community OK", cid);

  const ch = await fetch(`${base}/communities/${cid}/channels`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ title: "General" }),
  }).then((r) => r.json());
  if (!ch.success) fail("create channel", ch);
  const chid = ch.data.id;
  console.log("channel OK", chid);

  const joinCh = await fetch(`${base}/communities/${cid}/channels/${chid}/join`, {
    method: "POST",
    headers: auth,
  }).then((r) => r.json());
  if (!joinCh.success) fail("join channel", joinCh);

  const postMsg = await fetch(`${base}/communities/${cid}/channels/${chid}/messages`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ messageContent: "verify hello", inputType: "text" }),
  }).then((r) => r.json());
  if (!postMsg.success) fail("POST message", postMsg);

  // 1) Pin + list memberships
  const pin = await fetch(`${base}/communities/${cid}/pin`, { method: "POST", headers: auth }).then((r) =>
    r.json()
  );
  if (!pin.success) fail("POST pin", pin);
  if (!pin.data?.isPinned && !pin.data?.saved) fail("POST pin flags", pin.data);

  const memberships = await fetch(`${base}/user-communities`, { headers: auth }).then((r) => r.json());
  if (!memberships.success) fail("GET user-communities", memberships);
  const row = (memberships.data || []).find((m) => m.communityId === cid);
  if (!row) fail("membership row", "community not in list");
  if (!row.isPinned && !row.saved) fail("isPinned on membership", row);
  console.log("1) pin + user-communities OK", {
    communityId: row.communityId,
    isPinned: row.isPinned,
    saved: row.saved,
    pinnedAt: row.pinnedAt,
    role: row.role,
  });

  const list = await fetch(`${base}/communities`, { headers: auth }).then((r) => r.json());
  const card = (list.data || []).find((c) => c.id === cid);
  if (!card?.isPinned && !card?.saved) fail("isPinned on GET /communities", card);
  console.log("   GET /communities isPinned OK");

  // 2) Public invite (must be 200, not 400)
  const inviteGet = await fetch(`${base}/communities/${cid}/invite`, { headers: auth });
  const inviteJson = await inviteGet.json();
  if (inviteGet.status !== 200 || !inviteJson.success) fail("GET invite public", inviteJson);
  if (!inviteJson.data?.supported && !inviteJson.data?.shareUrl) fail("GET invite payload", inviteJson.data);
  console.log("2) GET invite (public) OK", {
    status: inviteGet.status,
    supported: inviteJson.data.supported,
    visibility: inviteJson.data.visibility,
    shareUrl: inviteJson.data.shareUrl?.slice(0, 60) + "...",
  });

  // 3) Messages sender fields
  const msgs = await fetch(`${base}/communities/${cid}/channels/${chid}/messages`, { headers: auth }).then((r) =>
    r.json()
  );
  if (!msgs.success) fail("GET messages", msgs);
  const m0 = (msgs.data || [])[0];
  if (!m0) fail("messages empty", msgs);
  if (!m0.senderDisplay && !m0.senderName) fail("senderDisplay", m0);
  if (!m0.senderRole) fail("senderRole", m0);
  if (!m0.senderUserId) fail("senderUserId", m0);
  console.log("3) messages OK", {
    senderUserId: m0.senderUserId,
    senderDisplay: m0.senderDisplay,
    senderRole: m0.senderRole,
    messageContent: m0.messageContent,
  });

  const selfInvite = await fetch(`${base}/communities/${cid}/invite`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ email: reg.data.user.email }),
  }).then((r) => r.json());
  if (selfInvite.success || selfInvite.error !== "INVITE_SELF_NOT_ALLOWED") {
    fail("POST self-invite", selfInvite);
  }
  console.log("   POST self-invite error OK", selfInvite.error, selfInvite.message_en?.slice(0, 50));

  // 4) Invite by email (lowercase body vs mixed-case stored email)
  const invitePost = await fetch(`${base}/communities/${cid}/invite`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ email: mixedCaseEmail.toLowerCase() }),
  });
  const invitePostJson = await invitePost.json();
  if (!invitePostJson.success) fail("POST invite email", invitePostJson);
  if (invitePost.status !== 201 && invitePost.status !== 200) fail("POST invite status", invitePost.status);
  console.log("4) POST invite by email OK", {
    status: invitePost.status,
    dataStatus: invitePostJson.data?.status,
    joined: invitePostJson.data?.joined,
  });

  const reg3 = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "By",
      lastName: "User",
      email: `comm_u_${uniq}@example.com`,
      password: "Verify1!Pass9",
      agreeTerms: true,
      phoneNumber: `559${String(uniq).slice(-7)}`,
      countryCode: "+1",
      educationStatus: "university",
      universityYear: 2,
    }),
  }).then((r) => r.json());
  if (!reg3.success) fail("register3", reg3);
  const u3 = reg3.data.user.username;
  if (u3) {
    const byUser = await fetch(`${base}/communities/${cid}/invite`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ username: `@${u3}` }),
    }).then((r) => r.json());
    if (!byUser.success) fail("POST invite by @username", byUser);
    console.log("   POST invite by @username OK");
  }

  // Unpin cleanup
  await fetch(`${base}/communities/${cid}/pin`, { method: "DELETE", headers: auth });
  const afterUnpin = await fetch(`${base}/user-communities`, { headers: auth }).then((r) => r.json());
  const row2 = (afterUnpin.data || []).find((m) => m.communityId === cid);
  if (row2?.isPinned || row2?.saved) fail("unpin", row2);

  console.log("\nCOMMUNITY API RESPONSE VERIFICATION OK");
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
