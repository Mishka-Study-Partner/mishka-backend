const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { notFound, badRequest } = require("../utils/httpError");
const { assertOwnedOrAdmin, isAdmin } = require("../utils/authz");

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
  const row = await prisma.quizQuestion.create({
    data: {
      ...req.body,
      quizId,
    },
  });
  res.apiCreated(row, "CREATED");
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await loadQuestionWithQuiz(req.params.id);
  if (!existing?.quiz) throw notFound();
  assertOwnedOrAdmin(req, existing.quiz, "userId");
  const data = { ...req.body };
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    throw badRequest("No fields to update", undefined, "VALIDATION_ERROR");
  }
  const row = await prisma.quizQuestion.update({
    where: { id: req.params.id },
    data,
  });
  res.apiSuccess(row, "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await loadQuestionWithQuiz(req.params.id);
  if (!existing?.quiz) throw notFound();
  assertOwnedOrAdmin(req, existing.quiz, "userId");
  await prisma.quizQuestion.delete({ where: { id: req.params.id } });
  res.apiSuccess(null, "DELETED", 200);
});
