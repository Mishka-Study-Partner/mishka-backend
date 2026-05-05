const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { assertOwnedOrAdmin, ownedWhere } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { badRequest } = require("../utils/httpError");

const crud = createCrudHandlers("chatSession", {
  include: { messages: { orderBy: { createdAt: "asc" } } },
  ownership: { userIdField: "userId" },
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.chatSession.findMany({
    where: ownedWhere(req),
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);

exports.update = asyncHandler(async (req, res) => {
  const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, session, "userId");
  const { title } = req.body || {};
  if (title === undefined) {
    throw badRequest("title is required (string or null to clear)", undefined, "VALIDATION_ERROR");
  }
  if (title !== null && typeof title !== "string") {
    throw badRequest("title must be a string or null", undefined, "VALIDATION_ERROR");
  }
  const nextTitle = title === null ? null : String(title).trim().slice(0, 200) || null;
  const row = await prisma.chatSession.update({
    where: { id: req.params.id },
    data: { title: nextTitle },
  });
  void recordDailyStreakActivity(session.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(row, "OK", 200);
});

exports.remove = asyncHandler(crud.remove);

exports.timeline = asyncHandler(async (req, res) => {
  const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, session, "userId");
  const [messages, aiRequests, quizzes, flashcardSets, summaries, mindMaps] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { sessionId: req.params.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aiRequest.findMany({
      where: { chatSessionId: req.params.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.quiz.findMany({
      where: { chatSessionId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: { questions: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.flashcardSet.findMany({
      where: { chatSessionId: req.params.id },
      orderBy: { createdAt: "asc" },
      include: { flashcards: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.summary.findMany({
      where: { chatSessionId: req.params.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.mindMap.findMany({
      where: { chatSessionId: req.params.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  res.apiSuccess(
    {
      session,
      messages,
      aiRequests,
      quizzes,
      flashcardSets,
      summaries,
      mindMaps,
    },
    "OK",
    200
  );
});

exports.listMessages = asyncHandler(async (req, res) => {
  const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, session, "userId");
  const rows = await prisma.chatMessage.findMany({
    where: { sessionId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.createMessage = asyncHandler(async (req, res) => {
  const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, session, "userId");
  const row = await prisma.chatMessage.create({
    data: {
      ...req.body,
      sessionId: req.params.id,
    },
  });
  void recordDailyStreakActivity(session.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(row, "CREATED");
});
