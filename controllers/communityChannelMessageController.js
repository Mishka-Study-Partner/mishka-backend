const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { notFound, forbidden } = require("../utils/httpError");
const { isAdmin } = require("../utils/authz");
const { assertMember, assertCommunityOwner } = require("../services/communityAuthz");
const { assertChatMessageAllowedForUser } = require("../services/chatMessagePolicy");
const { userDisplayName, messageAuthorSelect } = require("../utils/userDisplayName");

/** Community-level role for chat badge: owner | admin | member */
function resolveSenderRole(community, userId, roleByUserId) {
  if (community?.ownerUserId === userId) return "owner";
  const role = roleByUserId.get(userId);
  if (role === "owner" || role === "admin" || role === "member") return role;
  return "member";
}

async function loadMemberRolesForCommunity(communityId, userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const rows = await prisma.userCommunity.findMany({
    where: { communityId, userId: { in: ids } },
    select: { userId: true, role: true },
  });
  return new Map(rows.map((m) => [m.userId, m.role]));
}

function mapCommunityChannelMessage(row, senderRole) {
  const { user, ...rest } = row;
  const display = userDisplayName(user);
  return {
    ...rest,
    senderUserId: rest.userId,
    senderName: display,
    senderDisplay: display,
    senderRole,
  };
}

exports.list = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  const { community } = await assertMember(req, communityId);
  const ch = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId } });
  if (!ch) throw notFound();
  const inGroup = await prisma.userCommunityChannel.findFirst({
    where: { userId: req.auth.sub, communityChannelId: channelId },
  });
  if (!isAdmin(req.auth) && !inGroup) throw forbidden("Join this group to read messages", "FORBIDDEN");
  const rows = await prisma.communityChannelMessage.findMany({
    where: { communityChannelId: channelId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: messageAuthorSelect } },
  });
  const roleByUserId = await loadMemberRolesForCommunity(
    communityId,
    rows.map((r) => r.userId)
  );
  res.apiSuccess(
    rows.map((r) => mapCommunityChannelMessage(r, resolveSenderRole(community, r.userId, roleByUserId))),
    "OK",
    200
  );
});

exports.create = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  const { community, membership } = await assertMember(req, communityId);
  const ch = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId } });
  if (!ch) throw notFound();
  const inGroup = await prisma.userCommunityChannel.findFirst({
    where: { userId: req.auth.sub, communityChannelId: channelId },
  });
  if (!isAdmin(req.auth) && !inGroup) throw forbidden("Join this group to post messages", "FORBIDDEN");
  const { messageContent, inputType } = req.body;
  const normalized = await assertChatMessageAllowedForUser(req.auth.sub, inputType, messageContent);
  const row = await prisma.communityChannelMessage.create({
    data: {
      communityChannelId: channelId,
      userId: req.auth.sub,
      messageContent: normalized.messageContent,
      inputType: normalized.inputType,
    },
    include: { user: { select: messageAuthorSelect } },
  });
  const roleByUserId = new Map();
  if (membership) roleByUserId.set(req.auth.sub, membership.role);
  const senderRole = resolveSenderRole(community, req.auth.sub, roleByUserId);
  res.apiCreated(mapCommunityChannelMessage(row, senderRole), "CREATED");
});

/** Community owner only: remove all messages in this group (members and shares unchanged). */
exports.clearAll = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  await assertCommunityOwner(req, communityId);
  const ch = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId } });
  if (!ch) throw notFound();
  const result = await prisma.communityChannelMessage.deleteMany({
    where: { communityChannelId: channelId },
  });
  res.apiSuccess({ deletedCount: result.count }, "OK", 200);
});
