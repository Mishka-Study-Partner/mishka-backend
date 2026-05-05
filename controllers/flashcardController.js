const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { notFound, badRequest } = require("../utils/httpError");
const { assertOwnedOrAdmin, isAdmin } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");

async function loadFlashcardWithSet(id) {
  return prisma.flashcard.findUnique({
    where: { id },
    include: { set: true },
  });
}

exports.list = asyncHandler(async (req, res) => {
  const where = isAdmin(req.auth) ? {} : { set: { userId: req.auth.sub } };
  const rows = await prisma.flashcard.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(async (req, res) => {
  const row = await loadFlashcardWithSet(req.params.id);
  if (!row?.set) throw notFound();
  assertOwnedOrAdmin(req, row.set, "userId");
  res.apiSuccess(row, "OK", 200);
});

exports.create = asyncHandler(async (req, res) => {
  const setId = req.body?.setId;
  if (!setId) {
    throw badRequest("setId is required", [{ path: "setId", message: "Required" }], "VALIDATION_ERROR");
  }
  const set = await prisma.flashcardSet.findUnique({ where: { id: setId } });
  assertOwnedOrAdmin(req, set, "userId");
  const row = await prisma.flashcard.create({
    data: {
      ...req.body,
      setId,
    },
  });
  void recordDailyStreakActivity(set.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(row, "CREATED");
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await loadFlashcardWithSet(req.params.id);
  if (!existing?.set) throw notFound();
  assertOwnedOrAdmin(req, existing.set, "userId");
  const data = { ...req.body };
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    throw badRequest("No fields to update", undefined, "VALIDATION_ERROR");
  }
  const row = await prisma.flashcard.update({
    where: { id: req.params.id },
    data,
  });
  void recordDailyStreakActivity(existing.set.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(row, "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await loadFlashcardWithSet(req.params.id);
  if (!existing?.set) throw notFound();
  assertOwnedOrAdmin(req, existing.set, "userId");
  await prisma.flashcard.delete({ where: { id: req.params.id } });
  res.apiSuccess(null, "DELETED", 200);
});
