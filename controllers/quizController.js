const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { assertOwnedOrAdmin, ownedWhere, isAdmin } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { notFound, badRequest } = require("../utils/httpError");
const { viewerHasSharedAccess } = require("../services/sharedMaterialAccess");
const { createMaterialSharesBatch } = require("../services/materialShareService");
const { enrichQuizRow } = require("../services/materialResponse");
const { gradeQuizAnswers } = require("../services/quizScoreService");
const { mapQuizQuestionBody } = require("../utils/quizQuestionMapper");

const crud = createCrudHandlers("quiz", {
  include: { questions: true },
  ownership: { userIdField: "userId" },
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.quiz.findMany({
    where: ownedWhere(req),
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  res.apiSuccess(rows.map((r) => enrichQuizRow(r, { includeQuestions: false })), "OK", 200);
});

async function assertQuizReadable(req, quiz) {
  if (!quiz) throw notFound();
  if (isAdmin(req.auth) || quiz.userId === req.auth.sub) return;
  const ok = await viewerHasSharedAccess(req.auth.sub, "quiz", quiz.id);
  if (!ok) throw notFound();
}

exports.getById = asyncHandler(async (req, res) => {
  const row = await prisma.quiz.findUnique({
    where: { id: req.params.id },
    include: { questions: { orderBy: { createdAt: "asc" } } },
  });
  await assertQuizReadable(req, row);
  res.apiSuccess(enrichQuizRow(row), "OK", 200);
});
exports.create = asyncHandler(async (req, res) => {
  const row = await prisma.quiz.create({
    data: { ...req.body, userId: req.auth.sub },
    include: { questions: true },
  });
  void recordDailyStreakActivity(req.auth.sub).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(enrichQuizRow(row), "CREATED");
});
exports.update = asyncHandler(async (req, res) => {
  const existing = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, existing, "userId");
  const row = await prisma.quiz.update({
    where: { id: req.params.id },
    data: req.body,
    include: { questions: true },
  });
  void recordDailyStreakActivity(existing.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(row, "OK", 200);
});
exports.remove = asyncHandler(crud.remove);

exports.listQuestions = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  await assertQuizReadable(req, quiz);
  const rows = await prisma.quizQuestion.findMany({
    where: { quizId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.shareToChannels = asyncHandler(async (req, res) => {
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

exports.createQuestion = asyncHandler(async (req, res) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, quiz, "userId");
  const data = mapQuizQuestionBody({ ...req.body, quizId: req.params.id });
  const row = await prisma.$transaction(async (tx) => {
    const q = await tx.quizQuestion.create({ data });
    await tx.quiz.update({
      where: { id: req.params.id },
      data: { totalQuestions: { increment: 1 } },
    });
    return q;
  });
  void recordDailyStreakActivity(quiz.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(row, "CREATED");
});

/** Submit answers for the whole quiz; persists attempt and returns score on 0–10 scale for badges. */
exports.submit = asyncHandler(async (req, res) => {
  const quizId = req.params.id;
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { select: { id: true, correctOption: true } } },
  });
  await assertQuizReadable(req, quiz);
  const questions = quiz.questions;
  if (questions.length === 0) {
    throw badRequest("This quiz has no questions yet", undefined, "VALIDATION_ERROR");
  }
  const answers = req.body.answers;
  const expectedIds = new Set(questions.map((q) => q.id));
  const seen = new Set();
  for (const a of answers) {
    if (seen.has(a.questionId)) {
      throw badRequest("Duplicate questionId in answers", [{ path: "answers", message: "Each question once" }], "VALIDATION_ERROR");
    }
    seen.add(a.questionId);
    if (!expectedIds.has(a.questionId)) {
      throw badRequest("Unknown questionId for this quiz", [{ path: "answers", message: a.questionId }], "VALIDATION_ERROR");
    }
  }
  if (seen.size !== expectedIds.size) {
    throw badRequest("Provide exactly one answer per question", [{ path: "answers", message: `Expected ${expectedIds.size} answers` }], "VALIDATION_ERROR");
  }

  const { correctCount, totalQuestions, scoreOutOfTen, percentage } = gradeQuizAnswers(questions, answers);
  const attempt = await prisma.$transaction(async (tx) => {
    const row = await tx.quizAttempt.create({
      data: {
        userId: req.auth.sub,
        quizId,
        correctCount,
        totalQuestions,
        scoreOutOfTen,
      },
    });
    const agg = await tx.quizAttempt.aggregate({
      where: { userId: req.auth.sub, quizId },
      _max: { scoreOutOfTen: true },
    });
    return { row, bestScoreOutOfTen: agg._max.scoreOutOfTen ?? scoreOutOfTen };
  });

  void recordDailyStreakActivity(req.auth.sub).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(
    {
      attempt: attempt.row,
      correctCount,
      totalQuestions,
      scoreOutOfTen,
      percentage,
      bestScoreOutOfTen: attempt.bestScoreOutOfTen,
    },
    "CREATED"
  );
});

/** Current user's past attempts for this quiz (newest first). */
exports.listMyAttempts = asyncHandler(async (req, res) => {
  const quizId = req.params.id;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  await assertQuizReadable(req, quiz);
  const rows = await prisma.quizAttempt.findMany({
    where: { quizId, userId: req.auth.sub },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const agg = await prisma.quizAttempt.aggregate({
    where: { quizId, userId: req.auth.sub },
    _max: { scoreOutOfTen: true },
  });
  res.apiSuccess({ attempts: rows, bestScoreOutOfTen: agg._max.scoreOutOfTen ?? null }, "OK", 200);
});
