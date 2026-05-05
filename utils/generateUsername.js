const crypto = require("crypto");

const MAX_LEN = 50;

/**
 * Build a URL-safe slug base from display names (lowercase, [a-z0-9_]).
 * @param {string} firstName
 * @param {string} lastName
 * @param {string | null | undefined} fullName
 */
function slugBaseFromNames(firstName, lastName, fullName) {
  const raw = String(fullName || `${firstName || ""} ${lastName || ""}`).trim().toLowerCase();
  let s = raw.normalize("NFKD").replace(/\p{M}/gu, "");
  s = s.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!s) s = "user";
  if (s.length > 28) s = s.slice(0, 28).replace(/_+$/g, "");
  return s;
}

function randomSuffix() {
  return crypto.randomBytes(3).toString("hex");
}

/**
 * @param {Pick<import("@prisma/client").PrismaClient, "user">} client prisma or transaction client
 * @param {{ firstName: string; lastName: string; fullName?: string | null; excludeUserId?: string }} opts
 * @returns {Promise<string>}
 */
async function allocateUsername(client, opts) {
  const base = slugBaseFromNames(opts.firstName, opts.lastName, opts.fullName);
  for (let i = 0; i < 80; i += 1) {
    const piece = i === 0 ? base : `${base}_${randomSuffix()}`;
    const candidate = piece.slice(0, MAX_LEN);
    const taken = await client.user.findFirst({
      where: {
        username: candidate,
        ...(opts.excludeUserId ? { NOT: { id: opts.excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error("Could not allocate a unique username");
}

/**
 * Assign username when missing (legacy users).
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {string} userId
 */
async function ensureUsernameAssigned(prisma, userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.username) return user;
  const username = await allocateUsername(prisma, {
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    excludeUserId: user.id,
  });
  return prisma.user.update({
    where: { id: userId },
    data: { username },
  });
}

module.exports = { allocateUsername, ensureUsernameAssigned, slugBaseFromNames };
