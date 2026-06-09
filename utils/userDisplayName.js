/**
 * Display label for a user in feeds, chat, badges, etc.
 * @param {{ firstName?: string; lastName?: string; fullName?: string | null; username?: string | null } | null | undefined} user
 */
function userDisplayName(user) {
  if (!user) return null;
  const fromFull = String(user.fullName || "").trim();
  if (fromFull) return fromFull.slice(0, 200);
  const combined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (combined) return combined.slice(0, 200);
  if (user.username) return user.username;
  return null;
}

const messageAuthorSelect = {
  firstName: true,
  lastName: true,
  fullName: true,
  username: true,
};

module.exports = { userDisplayName, messageAuthorSelect };
