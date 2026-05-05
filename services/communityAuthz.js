const prisma = require("../utils/prisma");
const { forbidden, notFound } = require("../utils/httpError");
const { isAdmin } = require("../utils/authz");

async function loadCommunity(communityId) {
  return prisma.community.findUnique({ where: { id: communityId } });
}

async function getMembership(userId, communityId) {
  return prisma.userCommunity.findFirst({
    where: { userId, communityId },
  });
}

function isCommunityOwner(community, userId) {
  return community.ownerUserId === userId;
}

function isOwnerOrAdminRole(role) {
  return role === "owner" || role === "admin";
}

/** Global admin or community owner/admin member. */
async function assertOwnerOrAdmin(req, communityId) {
  const community = await loadCommunity(communityId);
  if (!community) throw notFound();
  if (isAdmin(req.auth)) return { community };
  const m = await getMembership(req.auth.sub, communityId);
  if (!m || !isOwnerOrAdminRole(m.role)) {
    throw forbidden("Owner or admin only", "FORBIDDEN");
  }
  return { community, membership: m };
}

/** Any member of the community (or global admin). */
async function assertMember(req, communityId) {
  const community = await loadCommunity(communityId);
  if (!community) throw notFound();
  if (isAdmin(req.auth)) return { community, membership: null };
  const m = await getMembership(req.auth.sub, communityId);
  if (!m) throw forbidden("You must be a member of this community", "FORBIDDEN");
  return { community, membership: m };
}

/** Owner of record on community (ownerUserId) or global admin. */
async function assertCommunityOwner(req, communityId) {
  const community = await loadCommunity(communityId);
  if (!community) throw notFound();
  if (isAdmin(req.auth)) return { community };
  if (community.ownerUserId !== req.auth.sub) {
    throw forbidden("Community owner only", "FORBIDDEN");
  }
  return { community };
}

async function assertGroupMember(userId, channelId) {
  const row = await prisma.userCommunityChannel.findFirst({
    where: { userId, communityChannelId: channelId },
  });
  if (!row) throw forbidden("Join this group first", "FORBIDDEN");
}

/** Can post material into a channel: community owner/admin, or joined group member. */
async function assertCanPostToChannel(userId, channelId) {
  const ch = await prisma.communityChannel.findUnique({
    where: { id: channelId },
    include: { community: true },
  });
  if (!ch) throw notFound();
  const m = await getMembership(userId, ch.communityId);
  if (!m) throw forbidden("You must be a member of this community", "FORBIDDEN");
  if (isOwnerOrAdminRole(m.role)) return ch;
  const g = await prisma.userCommunityChannel.findFirst({
    where: { userId, communityChannelId: channelId },
  });
  if (!g) throw forbidden("Join this group to post here", "FORBIDDEN");
  return ch;
}

module.exports = {
  loadCommunity,
  getMembership,
  isCommunityOwner,
  isOwnerOrAdminRole,
  assertOwnerOrAdmin,
  assertMember,
  assertCommunityOwner,
  assertGroupMember,
  assertCanPostToChannel,
};
