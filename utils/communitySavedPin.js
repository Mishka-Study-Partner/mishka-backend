const prisma = require("./prisma");

/** @returns {Promise<Map<string, Date>>} communityId → pinnedAt */
async function pinnedAtByCommunityForUser(userId) {
  const rows = await prisma.userSavedCommunity.findMany({
    where: { userId },
    select: { communityId: true, createdAt: true },
  });
  return new Map(rows.map((r) => [r.communityId, r.createdAt]));
}

/**
 * @param {object} row user_communities row (optional nested community)
 * @param {Map<string, Date>} pinnedMap
 */
function enrichWithPinnedFlags(row, pinnedMap) {
  if (!row) return row;
  const pinnedAt = pinnedMap.get(row.communityId);
  const isPinned = pinnedAt != null;
  return {
    ...row,
    isPinned,
    saved: isPinned,
    pinnedAt: isPinned ? pinnedAt.toISOString() : null,
  };
}

/**
 * @param {object} community community row
 * @param {Map<string, Date>} pinnedMap
 */
function enrichCommunityWithPinned(community, pinnedMap) {
  if (!community) return community;
  const pinnedAt = pinnedMap.get(community.id);
  const isPinned = pinnedAt != null;
  return {
    ...community,
    isPinned,
    saved: isPinned,
    pinnedAt: isPinned ? pinnedAt.toISOString() : null,
  };
}

module.exports = {
  pinnedAtByCommunityForUser,
  enrichWithPinnedFlags,
  enrichCommunityWithPinned,
};
