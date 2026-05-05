const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { notFound, badRequest } = require("../utils/httpError");
const { requireFields } = require("../utils/validate");
const { isAdmin } = require("../utils/authz");
const { allocateUsername } = require("../utils/generateUsername");
const { listTasksForUser } = require("../services/taskQueryService");

const SALT_ROUNDS = 10;

function stripPassword(user) {
  if (!user) return user;
  const { password, ...rest } = user;
  return rest;
}

exports.list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.apiSuccess(users.map(stripPassword), "OK", 200);
});

exports.getById = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw notFound("User not found", "USER_NOT_FOUND");
  res.apiSuccess(stripPassword(user), "OK", 200);
});

exports.create = asyncHandler(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ["firstName", "lastName", "email", "agreeTerms"]);

  const fn = body.firstName;
  const ln = body.lastName;
  const fullNameStr = (body.fullName || `${fn} ${ln}`).trim().slice(0, 150);
  const username = await allocateUsername(prisma, {
    firstName: fn,
    lastName: ln,
    fullName: fullNameStr,
  });

  const data = {
    firstName: fn,
    lastName: ln,
    fullName: body.fullName ?? fullNameStr,
    username,
    email: body.email,
    phoneNumber: body.phoneNumber,
    countryCode: body.countryCode,
    rememberMe: Boolean(body.rememberMe),
    agreeTerms: Boolean(body.agreeTerms),
    provider: body.provider,
    providerId: body.providerId,
    role: body.role,
    isVerified: body.isVerified,
    profileImageUrl: body.profileImageUrl,
    ...(body.gender !== undefined && body.gender !== null ? { gender: body.gender } : {}),
  };

  if (body.password) {
    data.password = await bcrypt.hash(body.password, SALT_ROUNDS);
  }

  const user = await prisma.user.create({ data });
  res.apiCreated(stripPassword(user), "CREATED");
});

exports.update = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const id = req.params.id;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound("User not found", "USER_NOT_FOUND");

  const data = {};

  const fields = [
    "firstName",
    "lastName",
    "fullName",
    "email",
    "phoneNumber",
    "countryCode",
    "rememberMe",
    "agreeTerms",
    "provider",
    "providerId",
    "role",
    "isVerified",
    "profileImageUrl",
    "gender",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f];
  }

  if (body.password !== undefined) {
    if (body.password === null || body.password === "") {
      data.password = null;
    } else {
      data.password = await bcrypt.hash(body.password, SALT_ROUNDS);
    }
  }

  if (!isAdmin(req.auth)) {
    delete data.role;
    delete data.isVerified;
  }

  const nameTouched =
    data.firstName !== undefined || data.lastName !== undefined || data.fullName !== undefined;
  if (nameTouched) {
    const fn = data.firstName ?? existing.firstName;
    const ln = data.lastName ?? existing.lastName;
    const fnFull = (data.fullName ?? existing.fullName ?? `${fn} ${ln}`).trim().slice(0, 150);
    data.username = await allocateUsername(prisma, {
      firstName: fn,
      lastName: ln,
      fullName: fnFull,
      excludeUserId: id,
    });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });
  res.apiSuccess(stripPassword(user), "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.apiSuccess(null, "DELETED", 200);
});

exports.listTodoLists = asyncHandler(async (req, res) => {
  const { q, listType, limit, offset } = req.query;
  const where = { userId: req.params.id };
  if (listType) where.listType = listType;
  if (q && String(q).length) {
    where.listName = { contains: String(q), mode: "insensitive" };
  }
  const lists = await prisma.todoList.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { icon: true },
    skip: offset,
    take: limit,
  });
  res.apiSuccess(lists, "OK", 200);
});

exports.listTasks = asyncHandler(async (req, res) => {
  const { userId: _ignore, ...filters } = req.query;
  const tasks = await listTasksForUser(req.params.id, filters);
  res.apiSuccess(tasks, "OK", 200);
});

exports.listChatSessions = asyncHandler(async (req, res) => {
  const rows = await prisma.chatSession.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.listFlashcardSets = asyncHandler(async (req, res) => {
  const rows = await prisma.flashcardSet.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.listQuizzes = asyncHandler(async (req, res) => {
  const rows = await prisma.quiz.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.listSummaries = asyncHandler(async (req, res) => {
  const rows = await prisma.summary.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.listHistoryItems = asyncHandler(async (req, res) => {
  const rows = await prisma.historyItem.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.listUserStreaks = asyncHandler(async (req, res) => {
  const rows = await prisma.userStreak.findMany({
    where: { userId: req.params.id },
    orderBy: { date: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.listUserCommunities = asyncHandler(async (req, res) => {
  const rows = await prisma.userCommunity.findMany({
    where: { userId: req.params.id },
    include: { community: true },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.listSavedCategories = asyncHandler(async (req, res) => {
  const rows = await prisma.userSavedCategory.findMany({
    where: { userId: req.params.id },
    include: { category: true },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.listAiRequests = asyncHandler(async (req, res) => {
  const rows = await prisma.aiRequest.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.listUserAiActivity = asyncHandler(async (req, res) => {
  const rows = await prisma.userAiActivity.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { tool: true },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getPreference = asyncHandler(async (req, res) => {
  const pref = await prisma.userPreference.findUnique({
    where: { userId: req.params.id },
  });
  if (!pref) throw notFound("Preferences not found for user", "PREFERENCES_NOT_FOUND");
  res.apiSuccess(pref, "OK", 200);
});

exports.upsertPreference = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const body = req.body || {};
  const pref = await prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      language: body.language ?? "English",
      theme: body.theme ?? "light",
      notificationsEnabled: body.notificationsEnabled ?? true,
    },
    update: {
      ...(body.language !== undefined && { language: body.language }),
      ...(body.theme !== undefined && { theme: body.theme }),
      ...(body.notificationsEnabled !== undefined && {
        notificationsEnabled: body.notificationsEnabled,
      }),
    },
  });
  res.apiSuccess(pref, "OK", 200);
});

exports.attachCommunity = asyncHandler(async (req, res) => {
  const { communityId } = req.body || {};
  if (!communityId) {
    throw badRequest("communityId is required", [{ path: "communityId", message: "Required" }], "VALIDATION_ERROR");
  }
  const row = await prisma.userCommunity.create({
    data: { userId: req.params.id, communityId },
    include: { community: true },
  });
  res.apiCreated(row, "CREATED");
});

exports.detachCommunity = asyncHandler(async (req, res) => {
  await prisma.userCommunity.deleteMany({
    where: {
      userId: req.params.id,
      communityId: req.params.communityId,
    },
  });
  res.apiSuccess(null, "DELETED", 200);
});

exports.saveCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.body || {};
  if (!categoryId) {
    throw badRequest("categoryId is required", [{ path: "categoryId", message: "Required" }], "VALIDATION_ERROR");
  }
  const row = await prisma.userSavedCategory.create({
    data: { userId: req.params.id, categoryId },
    include: { category: true },
  });
  res.apiCreated(row, "CREATED");
});

exports.unsaveCategory = asyncHandler(async (req, res) => {
  await prisma.userSavedCategory.deleteMany({
    where: {
      userId: req.params.id,
      categoryId: req.params.categoryId,
    },
  });
  res.apiSuccess(null, "DELETED", 200);
});
