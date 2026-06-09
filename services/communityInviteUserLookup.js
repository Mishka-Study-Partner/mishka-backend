const prisma = require("../utils/prisma");

function normalizeInviteEmail(raw) {
  if (raw == null || raw === "") return "";
  return String(raw).trim().toLowerCase();
}

function normalizeInviteUsername(raw) {
  if (raw == null || raw === "") return "";
  let u = String(raw).trim();
  if (u.startsWith("@")) u = u.slice(1).trim();
  return u;
}

/**
 * Resolve a Mishka user for POST /communities/:id/invite (email or username).
 * Email match is case-insensitive; username ignores a leading @.
 *
 * @param {{ email?: string, username?: string }} input
 * @returns {Promise<import("@prisma/client").User | null>}
 */
async function findUserForCommunityInvite(input) {
  const email = normalizeInviteEmail(input.email);
  const username = normalizeInviteUsername(input.username);

  if (email) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (byEmail) return byEmail;
    return null;
  }

  if (username) {
    const byUsername = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });
    if (byUsername) return byUsername;
    return null;
  }

  return null;
}

module.exports = {
  normalizeInviteEmail,
  normalizeInviteUsername,
  findUserForCommunityInvite,
};
