const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { assertOwnedOrAdmin, ownedWhere } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { notFound, badRequest } = require("../utils/httpError");
const { viewerHasSharedAccess } = require("../services/sharedMaterialAccess");
const { createMaterialSharesBatch } = require("../services/materialShareService");

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.summary.findMany({
    where: { ...ownedWhere(req), savedAt: { not: null } },
    orderBy: { savedAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.add = asyncHandler(async (req, res) => {
  const { summaryId } = req.body;
  const row = await prisma.summary.findUnique({ where: { id: summaryId } });
  assertOwnedOrAdmin(req, row, "userId");
  const updated = await prisma.summary.update({
    where: { id: summaryId },
    data: { savedAt: new Date() },
  });
  void recordDailyStreakActivity(row.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(updated, "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await prisma.summary.findUnique({ where: { id: req.params.id } });
  if (!row) throw notFound();
  assertOwnedOrAdmin(req, row, "userId");
  const updated = await prisma.summary.update({
    where: { id: req.params.id },
    data: { savedAt: null },
  });
  void recordDailyStreakActivity(row.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(updated, "OK", 200);
});

exports.share = asyncHandler(async (req, res) => {
  const row = await prisma.summary.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, row, "userId");
  const { channelIds, note } = req.body;
  const result = await createMaterialSharesBatch(req, {
    channelIds,
    materialType: "summary",
    materialId: req.params.id,
    note,
  });
  res.apiSuccess(result, "OK", 200);
});

exports.importFromShared = asyncHandler(async (req, res) => {
  const { sourceSummaryId } = req.body;
  const viewerId = req.auth.sub;

  const source = await prisma.summary.findUnique({ where: { id: sourceSummaryId } });
  if (!source) throw notFound();

  if (source.userId === viewerId) {
    throw badRequest("Use POST /saved-summaries with summaryId to save your own summary.", undefined, "INVALID_SOURCE");
  }

  const ok = await viewerHasSharedAccess(viewerId, "summary", sourceSummaryId);
  if (!ok) throw notFound();

  const created = await prisma.summary.create({
    data: {
      userId: viewerId,
      summaryText: source.summaryText,
      sourceType: "shared_copy",
      sourceReference: source.id,
      chatSessionId: null,
      savedAt: new Date(),
    },
  });

  void recordDailyStreakActivity(viewerId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(created, "CREATED");
});
