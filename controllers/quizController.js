const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("quiz", {
  include: { questions: true },
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.quiz.findMany({
    orderBy: { createdAt: "desc" },
    include: { questions: true },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listQuestions = asyncHandler(async (req, res) => {
  const rows = await prisma.quizQuestion.findMany({
    where: { quizId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.createQuestion = asyncHandler(async (req, res) => {
  const row = await prisma.quizQuestion.create({
    data: {
      ...req.body,
      quizId: req.params.id,
    },
  });
  res.apiCreated(row, "CREATED");
});
