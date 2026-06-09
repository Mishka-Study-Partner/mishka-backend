const crypto = require("crypto");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { isAdmin } = require("../utils/authz");
const { forbidden, badRequest, notFound } = require("../utils/httpError");
const {
  loadCommunity,
  getMembership,
  isOwnerOrAdminRole,
  assertOwnerOrAdmin,
  assertMember,
} = require("../services/communityAuthz");
const { buildCommunityActivityReport } = require("../services/communityActivityReportService");
const { communityDiscoveryDataFromBody } = require("../utils/communityDiscoveryFields");
const { mapCommunityCard } = require("../services/communityRecommendationService");
const {
  pinnedAtByCommunityForUser,
  enrichWithPinnedFlags,
  enrichCommunityWithPinned,
} = require("../utils/communitySavedPin");
const { buildCommunityInvitePayload } = require("../utils/communityShareUrl");
const {
  normalizeInviteEmail,
  normalizeInviteUsername,
  findUserForCommunityInvite,
} = require("../services/communityInviteUserLookup");

function randomInviteCode() {
  return crypto.randomBytes(5).toString("hex").slice(0, 10);
}

function privateInviteFields() {
  return {
    inviteToken: crypto.randomUUID(),
    inviteCode: randomInviteCode(),
  };
}

const createdBySelect = { id: true, firstName: true, lastName: true, username: true };

/** Display string for group creator (Flutter badges / subtitles). */
function channelCreatedByDisplay(createdBy) {
  if (!createdBy) return null;
  const full = [createdBy.firstName, createdBy.lastName].filter(Boolean).join(" ").trim();
  if (full) return full.slice(0, 200);
  if (createdBy.username) return createdBy.username;
  return null;
}

function withChannelCreatorFields(row) {
  if (!row) return row;
  const { createdBy, ...rest } = row;
  return {
    ...rest,
    createdBy: createdBy || null,
    createdByDisplay: channelCreatedByDisplay(createdBy),
  };
}

exports.list = asyncHandler(async (req, res) => {
  const uid = req.auth.sub;
  const pinnedMap = await pinnedAtByCommunityForUser(uid);
  const where = isAdmin(req.auth)
    ? {}
    : {
        OR: [{ visibility: "public" }, { members: { some: { userId: uid } } }, { ownerUserId: uid }],
      };
  const rows = await prisma.community.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true, channels: true } },
    },
  });
  const locale = req.query.locale === "ar" ? "ar" : "en";
  res.apiSuccess(
    rows.map((r) => enrichCommunityWithPinned(mapCommunityCard(r, locale), pinnedMap)),
    "OK",
    200
  );
});

exports.getById = asyncHandler(async (req, res) => {
  const row = await prisma.community.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { members: true, channels: true } } },
  });
  if (!row) throw notFound();
  if (row.visibility === "private") {
    if (!isAdmin(req.auth)) {
      const m = await getMembership(req.auth.sub, row.id);
      if (!m) throw forbidden("This community is private", "FORBIDDEN");
    }
  }
  res.apiSuccess(
    enrichCommunityWithPinned(
      mapCommunityCard(row, req.query.locale === "ar" ? "ar" : "en"),
      await pinnedAtByCommunityForUser(req.auth.sub)
    ),
    "OK",
    200
  );
});

exports.create = asyncHandler(async (req, res) => {
  const { name, description, imageUrl, visibility } = req.body;
  const vis = visibility === "private" ? "private" : "public";
  const invites = vis === "private" ? privateInviteFields() : { inviteToken: null, inviteCode: null };
  const discovery = communityDiscoveryDataFromBody(req.body);
  const row = await prisma.$transaction(async (tx) => {
    const c = await tx.community.create({
      data: {
        name: String(name).trim().slice(0, 200),
        description: description != null ? String(description).slice(0, 8000) : null,
        imageUrl: imageUrl != null ? String(imageUrl).slice(0, 500) : null,
        visibility: vis,
        category: discovery.category ?? "general",
        subjectKeys: discovery.subjectKeys ?? ["general"],
        educationStatus: discovery.educationStatus,
        schoolTrack: discovery.schoolTrack,
        schoolGrade: discovery.schoolGrade,
        universityYear: discovery.universityYear,
        purpose: discovery.purpose ?? "general",
        locale: discovery.locale ?? "en",
        ownerUserId: req.auth.sub,
        inviteToken: invites.inviteToken,
        inviteCode: invites.inviteCode,
      },
    });
    await tx.userCommunity.create({
      data: { userId: req.auth.sub, communityId: c.id, role: "owner" },
    });
    return c;
  });
  res.apiCreated(mapCommunityCard({ ...row, _count: { members: 1, channels: 0 } }, req.body.locale === "ar" ? "ar" : "en"), "CREATED");
});

exports.update = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  await assertOwnerOrAdmin(req, communityId);
  const existing = await loadCommunity(communityId);
  const { name, description, imageUrl, visibility } = req.body;
  const data = {};
  if (name !== undefined) data.name = String(name).trim().slice(0, 200);
  if (description !== undefined) data.description = description == null ? null : String(description).slice(0, 8000);
  if (imageUrl !== undefined) data.imageUrl = imageUrl == null ? null : String(imageUrl).slice(0, 500);
  if (visibility !== undefined) {
    const next = visibility === "private" ? "private" : "public";
    data.visibility = next;
    if (next === "private" && existing.visibility === "public") {
      Object.assign(data, privateInviteFields());
    }
    if (next === "public") {
      data.inviteCode = null;
      data.inviteToken = null;
    }
  }
  Object.assign(data, communityDiscoveryDataFromBody(req.body, { partial: true }));
  if (Object.keys(data).length === 0) {
    throw badRequest("No updatable fields provided", undefined, "VALIDATION_ERROR");
  }
  const row = await prisma.community.update({ where: { id: communityId }, data, include: { _count: { select: { members: true, channels: true } } } });
  res.apiSuccess(mapCommunityCard(row, req.body.locale === "ar" ? "ar" : "en"), "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const community = await loadCommunity(communityId);
  if (!community) throw notFound();
  if (!isAdmin(req.auth) && community.ownerUserId !== req.auth.sub) {
    throw forbidden("Only the community owner can delete the community", "FORBIDDEN");
  }
  await prisma.community.delete({ where: { id: communityId } });
  res.apiSuccess(null, "DELETED", 200);
});

/** Join public by id, or private by inviteCode / inviteToken. */
exports.join = asyncHandler(async (req, res) => {
  const { communityId, inviteCode, inviteToken } = req.body;
  let community = null;
  if (inviteToken) {
    community = await prisma.community.findFirst({ where: { inviteToken: String(inviteToken).trim() } });
    if (!community || community.visibility !== "private") throw notFound();
  } else if (inviteCode) {
    community = await prisma.community.findFirst({ where: { inviteCode: String(inviteCode).trim() } });
    if (!community || community.visibility !== "private") throw notFound();
  } else if (communityId) {
    community = await loadCommunity(communityId);
    if (!community) throw notFound();
    if (community.visibility !== "public") {
      throw badRequest("This community is private; use inviteCode or inviteToken", undefined, "VALIDATION_ERROR");
    }
  } else {
    throw badRequest("Provide communityId (public) or inviteCode / inviteToken (private)", undefined, "VALIDATION_ERROR");
  }
  const exists = await getMembership(req.auth.sub, community.id);
  if (exists) {
    return res.apiSuccess(exists, "OK", 200);
  }
  const row = await prisma.userCommunity.create({
    data: { userId: req.auth.sub, communityId: community.id, role: "member" },
  });
  res.apiCreated(row, "CREATED");
});

exports.leave = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const { keepSaved } = req.body || {};
  const community = await loadCommunity(communityId);
  if (!community) throw notFound();
  if (community.ownerUserId === req.auth.sub) {
    throw badRequest("Owner cannot leave; transfer ownership or delete the community", undefined, "VALIDATION_ERROR");
  }
  const m = await getMembership(req.auth.sub, communityId);
  if (!m) throw notFound();
  await prisma.$transaction(async (tx) => {
    await tx.userCommunityChannel.deleteMany({
      where: { userId: req.auth.sub, channel: { communityId } },
    });
    await tx.userCommunity.delete({ where: { id: m.id } });
    if (keepSaved === true) {
      await tx.userSavedCommunity.upsert({
        where: { userId_communityId: { userId: req.auth.sub, communityId } },
        create: { userId: req.auth.sub, communityId },
        update: {},
      });
    }
  });
  res.apiSuccess({ left: true }, "OK", 200);
});

exports.pin = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  await assertMember(req, communityId);
  const saved = await prisma.userSavedCommunity.upsert({
    where: { userId_communityId: { userId: req.auth.sub, communityId } },
    create: { userId: req.auth.sub, communityId },
    update: {},
  });
  const membership = await getMembership(req.auth.sub, communityId);
  const base = membership
    ? enrichWithPinnedFlags(
        { userId: req.auth.sub, communityId, role: membership.role, id: membership.id },
        new Map([[communityId, saved.createdAt]])
      )
    : {
        userId: req.auth.sub,
        communityId,
        isPinned: true,
        saved: true,
        pinnedAt: saved.createdAt.toISOString(),
      };
  res.apiSuccess({ ...saved, ...base, isPinned: true, saved: true }, "OK", 200);
});

exports.unpin = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  try {
    await prisma.userSavedCommunity.delete({
      where: { userId_communityId: { userId: req.auth.sub, communityId } },
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") throw notFound();
    throw e;
  }
  res.apiSuccess({ unpinned: true }, "OK", 200);
});

exports.getInvite = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const { community } = await assertOwnerOrAdmin(req, communityId);
  if (community.visibility !== "private") {
    return res.apiSuccess(
      buildCommunityInvitePayload(req, community, "public", null, null),
      "OK",
      200
    );
  }
  res.apiSuccess(
    buildCommunityInvitePayload(
      req,
      community,
      "private",
      community.inviteCode,
      community.inviteToken
    ),
    "OK",
    200
  );
});

/** Owner/admin: add member by email or username (immediate join). */
exports.inviteMember = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  await assertOwnerOrAdmin(req, communityId);
  const email = normalizeInviteEmail(req.body.email);
  const username = normalizeInviteUsername(req.body.username);

  const user = await findUserForCommunityInvite({ email: email || undefined, username: username || undefined });
  if (!user) {
    throw notFound(
      "No Mishka account found for that email or username",
      "INVITE_USER_NOT_FOUND"
    );
  }

  const community = await loadCommunity(communityId);
  if (user.id === req.auth.sub) {
    throw badRequest(
      "You cannot invite yourself. You are already in this community.",
      undefined,
      "INVITE_SELF_NOT_ALLOWED"
    );
  }

  const existing = await getMembership(user.id, communityId);
  if (existing) {
    return res.apiSuccess(
      {
        status: "already_member",
        joined: true,
        invited: false,
        userId: user.id,
        membership: enrichWithPinnedFlags(existing, await pinnedAtByCommunityForUser(user.id)),
      },
      "OK",
      200
    );
  }

  const row = await prisma.userCommunity.create({
    data: { userId: user.id, communityId, role: "member" },
  });

  res.apiCreated(
    {
      status: "joined",
      joined: true,
      invited: true,
      userId: user.id,
      membership: row,
    },
    "CREATED"
  );
});

exports.regenerateInvite = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  await assertOwnerOrAdmin(req, communityId);
  const community = await loadCommunity(communityId);
  if (community.visibility !== "private") {
    throw badRequest("Private communities only", undefined, "VALIDATION_ERROR");
  }
  const invites = privateInviteFields();
  const row = await prisma.community.update({
    where: { id: communityId },
    data: { inviteCode: invites.inviteCode, inviteToken: invites.inviteToken },
  });
  res.apiSuccess(row, "OK", 200);
});

exports.listMembers = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  await assertMember(req, communityId);
  const rows = await prisma.userCommunity.findMany({
    where: { communityId },
    orderBy: { id: "asc" },
    include: { user: { select: { id: true, email: true, username: true, firstName: true, lastName: true, profileImageUrl: true } } },
  });
  const community = await loadCommunity(communityId);
  const withOwnerFlag = rows.map((r) => ({
    ...r,
    isOwnerRecord: community.ownerUserId === r.userId,
  }));
  res.apiSuccess(withOwnerFlag, "OK", 200);
});

exports.addMemberByEmail = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  await assertOwnerOrAdmin(req, communityId);
  const email = normalizeInviteEmail(req.body?.email);
  if (!email) throw badRequest("email is required", undefined, "VALIDATION_ERROR");
  const user = await findUserForCommunityInvite({ email });
  if (!user) {
    throw notFound(
      "No Mishka account found for that email or username",
      "INVITE_USER_NOT_FOUND"
    );
  }
  if (user.id === req.auth.sub) {
    throw badRequest(
      "You cannot invite yourself. You are already in this community.",
      undefined,
      "INVITE_SELF_NOT_ALLOWED"
    );
  }
  const community = await loadCommunity(communityId);
  if (user.id === community.ownerUserId) {
    // already owner via ownerUserId; membership row may still exist
  }
  const row = await prisma.userCommunity.upsert({
    where: { userId_communityId: { userId: user.id, communityId } },
    create: { userId: user.id, communityId, role: "member" },
    update: {},
  });
  res.apiSuccess(row, "OK", 200);
});

exports.removeMember = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const targetUserId = req.params.userId;
  const community = await loadCommunity(communityId);
  if (!community) throw notFound();
  let actorMembership = null;
  if (!isAdmin(req.auth)) {
    actorMembership = await getMembership(req.auth.sub, communityId);
    if (!actorMembership || !isOwnerOrAdminRole(actorMembership.role)) {
      throw forbidden("Owner or admin only", "FORBIDDEN");
    }
  }
  if (targetUserId === community.ownerUserId) {
    throw forbidden("Cannot remove the community owner", "FORBIDDEN");
  }
  const target = await getMembership(targetUserId, communityId);
  if (!target) throw notFound();
  if (!isAdmin(req.auth) && actorMembership && actorMembership.role === "admin" && isOwnerOrAdminRole(target.role)) {
    throw forbidden("Admins cannot remove the owner or another admin", "FORBIDDEN");
  }
  await prisma.userCommunityChannel.deleteMany({
    where: { userId: targetUserId, channel: { communityId } },
  });
  await prisma.userCommunity.delete({ where: { id: target.id } });
  res.apiSuccess({ removed: true }, "OK", 200);
});

exports.patchMemberRole = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const targetUserId = req.params.userId;
  const { role } = req.body;
  if (role !== "admin" && role !== "member") {
    throw badRequest("role must be admin or member", undefined, "VALIDATION_ERROR");
  }
  const community = await loadCommunity(communityId);
  if (!community) throw notFound();
  let actorMembership = null;
  if (!isAdmin(req.auth)) {
    actorMembership = await getMembership(req.auth.sub, communityId);
    if (!actorMembership || !isOwnerOrAdminRole(actorMembership.role)) {
      throw forbidden("Owner or admin only", "FORBIDDEN");
    }
  }
  if (targetUserId === community.ownerUserId) {
    throw forbidden("Cannot change the owner role here", "FORBIDDEN");
  }
  const target = await getMembership(targetUserId, communityId);
  if (!target) throw notFound();
  if (!isAdmin(req.auth) && actorMembership && actorMembership.role === "admin" && (target.role === "owner" || target.role === "admin")) {
    throw forbidden("Admins cannot change owner or admin roles", "FORBIDDEN");
  }
  const row = await prisma.userCommunity.update({
    where: { id: target.id },
    data: { role },
  });
  res.apiSuccess(row, "OK", 200);
});

exports.listChannels = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  await assertMember(req, communityId);
  const channels = await prisma.communityChannel.findMany({
    where: { communityId },
    orderBy: { createdAt: "asc" },
    include: { createdBy: { select: createdBySelect } },
  });
  const joined = await prisma.userCommunityChannel.findMany({
    where: { userId: req.auth.sub, channel: { communityId } },
    select: { communityChannelId: true },
  });
  const joinedSet = new Set(joined.map((j) => j.communityChannelId));
  const data = channels.map((c) =>
    withChannelCreatorFields({
      ...c,
      joined: joinedSet.has(c.id),
    })
  );
  res.apiSuccess(data, "OK", 200);
});

exports.createChannel = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  await assertOwnerOrAdmin(req, communityId);
  const title = String(req.body?.title || "").trim();
  if (!title) throw badRequest("title is required", undefined, "VALIDATION_ERROR");
  const description = req.body?.description != null ? String(req.body.description).slice(0, 5000) : null;
  const imageUrl = req.body?.imageUrl != null ? String(req.body.imageUrl).slice(0, 500) : null;
  const row = await prisma.communityChannel.create({
    data: {
      communityId,
      title: title.slice(0, 200),
      description,
      imageUrl,
      createdByUserId: req.auth.sub,
    },
    include: { createdBy: { select: createdBySelect } },
  });
  res.apiCreated(withChannelCreatorFields(row), "CREATED");
});

exports.updateChannel = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  await assertOwnerOrAdmin(req, communityId);
  const ch = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId } });
  if (!ch) throw notFound();
  const { title, description, imageUrl } = req.body;
  const data = {};
  if (title !== undefined) data.title = String(title).trim().slice(0, 200);
  if (description !== undefined) data.description = description == null ? null : String(description).slice(0, 5000);
  if (imageUrl !== undefined) data.imageUrl = imageUrl == null ? null : String(imageUrl).slice(0, 500);
  if (Object.keys(data).length === 0) throw badRequest("No fields to update", undefined, "VALIDATION_ERROR");
  const row = await prisma.communityChannel.update({
    where: { id: channelId },
    data,
    include: { createdBy: { select: createdBySelect } },
  });
  res.apiSuccess(withChannelCreatorFields(row), "OK", 200);
});

/** Copy title, description, and image into a new empty group (no members, messages, or shares). */
exports.duplicateChannel = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  await assertOwnerOrAdmin(req, communityId);
  const src = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId } });
  if (!src) throw notFound();
  const titleOverride = req.body?.title != null ? String(req.body.title).trim().slice(0, 200) : null;
  const title = (titleOverride && titleOverride.length > 0 ? titleOverride : src.title).slice(0, 200);
  const row = await prisma.communityChannel.create({
    data: {
      communityId,
      title,
      description: src.description,
      imageUrl: src.imageUrl,
      createdByUserId: req.auth.sub,
    },
    include: { createdBy: { select: createdBySelect } },
  });
  res.apiCreated(withChannelCreatorFields(row), "CREATED");
});

exports.deleteChannel = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  await assertOwnerOrAdmin(req, communityId);
  const ch = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId } });
  if (!ch) throw notFound();
  await prisma.communityChannel.delete({ where: { id: channelId } });
  res.apiSuccess({ deleted: true }, "OK", 200);
});

exports.joinChannel = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  await assertMember(req, communityId);
  const ch = await prisma.communityChannel.findFirst({ where: { id: channelId, communityId } });
  if (!ch) throw notFound();
  const row = await prisma.userCommunityChannel.upsert({
    where: { userId_communityChannelId: { userId: req.auth.sub, communityChannelId: channelId } },
    create: { userId: req.auth.sub, communityChannelId: channelId },
    update: {},
  });
  res.apiSuccess(row, "OK", 200);
});

exports.leaveChannel = asyncHandler(async (req, res) => {
  const communityId = req.params.id;
  const channelId = req.params.channelId;
  await assertMember(req, communityId);
  try {
    await prisma.userCommunityChannel.delete({
      where: { userId_communityChannelId: { userId: req.auth.sub, communityChannelId: channelId } },
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") throw notFound();
    throw e;
  }
  res.apiSuccess({ left: true }, "OK", 200);
});

/** GET /communities/activity/report — Your Report community metrics. */
exports.activityReport = asyncHandler(async (req, res) => {
  const { period, anchorDate, locale } = req.query;
  const data = await buildCommunityActivityReport(
    req.auth.sub,
    period,
    anchorDate,
    locale === "ar" ? "ar" : "en"
  );
  res.apiSuccess(data, "OK", 200);
});
