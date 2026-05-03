const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("flashcardSet", {
  include: { flashcards: true },
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.flashcardSet.findMany({
    orderBy: { createdAt: "desc" },
    include: { flashcards: true },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listFlashcards = asyncHandler(async (req, res) => {
  const rows = await prisma.flashcard.findMany({
    where: { setId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.createFlashcard = asyncHandler(async (req, res) => {
  const row = await prisma.flashcard.create({
    data: {
      ...req.body,
      setId: req.params.id,
    },
  });
  res.apiCreated(row, "CREATED");
});
