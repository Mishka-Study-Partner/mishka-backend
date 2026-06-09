const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { notFound, badRequest } = require("../utils/httpError");
const { assertOwnedOrAdmin, isAdmin } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { mapQuizQuestionBody } = require("../utils/quizQuestionMapper");

async function loadQuestionWithQuiz(id) {
  return prisma.quizQuestion.findUnique({
    where: { id },
    include: { quiz: true },
  });
}

exports.list = asyncHandler(async (req, res) => {
  const where = isAdmin(req.auth) ? {} : { quiz: { userId: req.auth.sub } };
  const rows = await prisma.quizQuestion.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(async (req, res) => {
  const row = await loadQuestionWithQuiz(req.params.id);
  if (!row?.quiz) throw notFound();
  assertOwnedOrAdmin(req, row.quiz, "userId");
  res.apiSuccess(row, "OK", 200);
});

exports.create = asyncHandler(async (req, res) => {
  const quizId = req.body?.quizId;
  if (!quizId) {
    throw badRequest("quizId is required", [{ path: "quizId", message: "Required" }], "VALIDATION_ERROR");
  }
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  assertOwnedOrAdmin(req, quiz, "userId");
  const data = mapQuizQuestionBody(req.body);
  const row = await prisma.$transaction(async (tx) => {
    const q = await tx.quizQuestion.create({ data });
    await tx.quiz.update({
      where: { id: quizId },
      data: { totalQuestions: { increment: 1 } },
    });
    return q;
  });
  void recordDailyStreakActivity(quiz.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(row, "CREATED");
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await loadQuestionWithQuiz(req.params.id);
  if (!existing?.quiz) throw notFound();
  assertOwnedOrAdmin(req, existing.quiz, "userId");
  const data = mapQuizQuestionBody({ ...req.body, quizId: existing.quizId });
  delete data.quizId;
  const row = await prisma.quizQuestion.update({
    where: { id: req.params.id },
    data,
  });
  void recordDailyStreakActivity(existing.quiz.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(row, "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await loadQuestionWithQuiz(req.params.id);
  if (!existing?.quiz) throw notFound();
  assertOwnedOrAdmin(req, existing.quiz, "userId");
  await prisma.$transaction(async (tx) => {
    await tx.quizQuestion.delete({ where: { id: req.params.id } });
    await tx.quiz.update({
      where: { id: existing.quizId },
      data: { totalQuestions: { decrement: 1 } },
    });
  });
  res.apiSuccess(null, "DELETED", 200);
});
