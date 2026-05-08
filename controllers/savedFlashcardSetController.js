const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { assertOwnedOrAdmin, ownedWhere } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { HttpError, notFound, badRequest } = require("../utils/httpError");
const { viewerHasSharedAccess } = require("../services/sharedMaterialAccess");
const { createMaterialSharesBatch } = require("../services/materialShareService");

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.flashcardSet.findMany({
    where: { ...ownedWhere(req), savedAt: { not: null } },
    orderBy: { savedAt: "desc" },
    include: { flashcards: true },
  });
  res.apiSuccess(rows, "OK", 200);
});

/** `id` is the flashcard set id (same as list items). */
exports.get = asyncHandler(async (req, res) => {
  const set = await prisma.flashcardSet.findUnique({
    where: { id: req.params.id },
    include: { flashcards: true },
  });
  if (!set) throw notFound("Flashcard set not found", "FLASHCARD_SET_NOT_FOUND");
  assertOwnedOrAdmin(req, set, "userId");
  if (set.savedAt == null) {
    throw new HttpError(
      404,
      "Flashcard set is not in your saved library",
      { flashcardSetId: set.id },
      "SAVED_LIBRARY_NOT_SAVED"
    );
  }
  res.apiSuccess(set, "OK", 200);
});

exports.add = asyncHandler(async (req, res) => {
  const { flashcardSetId } = req.body;
  const set = await prisma.flashcardSet.findUnique({ where: { id: flashcardSetId } });
  assertOwnedOrAdmin(req, set, "userId");
  const row = await prisma.flashcardSet.update({
    where: { id: flashcardSetId },
    data: { savedAt: new Date() },
    include: { flashcards: true },
  });
  void recordDailyStreakActivity(set.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(row, "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const set = await prisma.flashcardSet.findUnique({ where: { id: req.params.id } });
  if (!set) throw notFound();
  assertOwnedOrAdmin(req, set, "userId");
  const row = await prisma.flashcardSet.update({
    where: { id: req.params.id },
    data: { savedAt: null },
    include: { flashcards: true },
  });
  void recordDailyStreakActivity(set.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(row, "OK", 200);
});

exports.share = asyncHandler(async (req, res) => {
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

/** Clone someone else's shared flashcard set into the viewer's account (saved). */
exports.importFromShared = asyncHandler(async (req, res) => {
  const { sourceFlashcardSetId } = req.body;
  const viewerId = req.auth.sub;

  const source = await prisma.flashcardSet.findUnique({
    where: { id: sourceFlashcardSetId },
    include: { flashcards: true },
  });
  if (!source) throw notFound();

  if (source.userId === viewerId) {
    throw badRequest("Use POST /saved-flashcard-sets with flashcardSetId to save your own set.", undefined, "INVALID_SOURCE");
  }

  const ok = await viewerHasSharedAccess(viewerId, "flashcard_set", sourceFlashcardSetId);
  if (!ok) throw notFound();

  const row = await prisma.flashcardSet.create({
    data: {
      userId: viewerId,
      title: source.title,
      sourceType: "shared_copy",
      sourceReference: source.id,
      chatSessionId: null,
      savedAt: new Date(),
      flashcards: {
        create: source.flashcards.map((f) => ({
          question: f.question,
          answer: f.answer,
        })),
      },
    },
    include: { flashcards: true },
  });

  void recordDailyStreakActivity(viewerId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(row, "CREATED");
});
