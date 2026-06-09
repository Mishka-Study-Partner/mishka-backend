const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { assertOwnedOrAdmin, ownedWhere } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { HttpError, notFound, badRequest } = require("../utils/httpError");
const { viewerHasSharedAccess } = require("../services/sharedMaterialAccess");
const { createMaterialSharesBatch } = require("../services/materialShareService");
const { enrichQuizRow } = require("../services/materialResponse");

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.quiz.findMany({
    where: { ...ownedWhere(req), savedAt: { not: null } },
    orderBy: { savedAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  res.apiSuccess(rows.map((r) => enrichQuizRow(r, { includeQuestions: false })), "OK", 200);
});

/** `id` is the quiz id (same as list items). Full quiz + questions when still saved. */
exports.get = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: req.params.id },
    include: { questions: { orderBy: { createdAt: "asc" } } },
  });
  if (!quiz) throw notFound("Quiz not found", "QUIZ_NOT_FOUND");
  assertOwnedOrAdmin(req, quiz, "userId");
  if (quiz.savedAt == null) {
    throw new HttpError(
      404,
      "Quiz is not in your saved library",
      { quizId: quiz.id },
      "SAVED_LIBRARY_NOT_SAVED"
    );
  }
  res.apiSuccess(enrichQuizRow(quiz), "OK", 200);
});

exports.add = asyncHandler(async (req, res) => {
  const { quizId } = req.body;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  assertOwnedOrAdmin(req, quiz, "userId");
  const row = await prisma.quiz.update({
    where: { id: quizId },
    data: { savedAt: new Date() },
    include: { questions: { orderBy: { createdAt: "asc" } } },
  });
  void recordDailyStreakActivity(quiz.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(enrichQuizRow(row), "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) throw notFound();
  assertOwnedOrAdmin(req, quiz, "userId");
  const row = await prisma.quiz.update({
    where: { id: req.params.id },
    data: { savedAt: null },
    include: { questions: { orderBy: { createdAt: "asc" } } },
  });
  void recordDailyStreakActivity(quiz.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(enrichQuizRow(row), "OK", 200);
});

exports.share = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, quiz, "userId");
  const { channelIds, note } = req.body;
  const result = await createMaterialSharesBatch(req, {
    channelIds,
    materialType: "quiz",
    materialId: req.params.id,
    note,
  });
  res.apiSuccess(result, "OK", 200);
});

/** Clone someone else's shared quiz into the viewer's account (saved). */
exports.importFromShared = asyncHandler(async (req, res) => {
  const { sourceQuizId } = req.body;
  const viewerId = req.auth.sub;

  const source = await prisma.quiz.findUnique({
    where: { id: sourceQuizId },
    include: { questions: true },
  });
  if (!source) throw notFound();

  if (source.userId === viewerId) {
    throw badRequest("Use POST /saved-quizzes with quizId to save your own quiz.", undefined, "INVALID_SOURCE");
  }

  const ok = await viewerHasSharedAccess(viewerId, "quiz", sourceQuizId);
  if (!ok) throw notFound();

  const row = await prisma.quiz.create({
    data: {
      userId: viewerId,
      title: source.title,
      sourceType: "shared_copy",
      sourceReference: source.id,
      chatSessionId: null,
      savedAt: new Date(),
      totalQuestions: source.questions.length,
      questions: {
        create: source.questions.map((q) => ({
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
        })),
      },
    },
    include: { questions: { orderBy: { createdAt: "asc" } } },
  });

  void recordDailyStreakActivity(viewerId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(enrichQuizRow(row), "CREATED");
});
