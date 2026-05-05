const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { notFound, forbidden } = require("../utils/httpError");
const { isAdmin } = require("../utils/authz");
const { assertMember, assertCommunityOwner } = require("../services/communityAuthz");
const { assertChatMessageAllowedForUser } = require("../services/chatMessagePolicy");

exports.list = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  await assertMember(req, communityId);
  const ch = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId } });
  if (!ch) throw notFound();
  const inGroup = await prisma.userCommunityChannel.findFirst({
    where: { userId: req.auth.sub, communityChannelId: channelId },
  });
  if (!isAdmin(req.auth) && !inGroup) throw forbidden("Join this group to read messages", "FORBIDDEN");
  const rows = await prisma.communityChannelMessage.findMany({
    where: { communityChannelId: channelId },
    orderBy: { createdAt: "asc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.create = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  await assertMember(req, communityId);
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
  });
  res.apiCreated(row, "CREATED");
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
