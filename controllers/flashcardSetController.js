const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { assertOwnedOrAdmin, ownedWhere, isAdmin } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { notFound } = require("../utils/httpError");
const { viewerHasSharedAccess } = require("../services/sharedMaterialAccess");
const { enrichFlashcardSetRow } = require("../services/materialResponse");

const crud = createCrudHandlers("flashcardSet", {
  include: { flashcards: true },
  ownership: { userIdField: "userId" },
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.flashcardSet.findMany({
    where: ownedWhere(req),
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { flashcards: true } } },
  });
  res.apiSuccess(rows.map((r) => enrichFlashcardSetRow(r, { includeCards: false })), "OK", 200);
});

async function assertFlashcardSetReadable(req, set) {
  if (!set) throw notFound();
  if (isAdmin(req.auth) || set.userId === req.auth.sub) return;
  const ok = await viewerHasSharedAccess(req.auth.sub, "flashcard_set", set.id);
  if (!ok) throw notFound();
}

exports.getById = asyncHandler(async (req, res) => {
  const row = await prisma.flashcardSet.findUnique({
    where: { id: req.params.id },
    include: { flashcards: { orderBy: { createdAt: "asc" } } },
  });
  await assertFlashcardSetReadable(req, row);
  res.apiSuccess(enrichFlashcardSetRow(row), "OK", 200);
});
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listFlashcards = asyncHandler(async (req, res) => {
  const set = await prisma.flashcardSet.findUnique({ where: { id: req.params.id } });
  await assertFlashcardSetReadable(req, set);
  const rows = await prisma.flashcard.findMany({
    where: { setId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.shareToChannels = asyncHandler(async (req, res) => {
  const set = await prisma.flashcardSet.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, set, "userId");
  const { channelIds, note } = req.body;
  const result = await createMaterialSharesBatch(req, {
    channelIds,
    materialType: "flashcard_set",
    materialId: req.params.id,
    note,
  });
  res.apiSuccess(result, "OK", 200);
});

exports.createFlashcard = asyncHandler(async (req, res) => {
  const set = await prisma.flashcardSet.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, set, "userId");
  const row = await prisma.flashcard.create({
    data: {
      question: req.body.question,
      answer: req.body.answer,
      setId: req.params.id,
    },
  });
  void recordDailyStreakActivity(set.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(row, "CREATED");
});
