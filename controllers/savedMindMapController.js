const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { assertOwnedOrAdmin, ownedWhere } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { HttpError, notFound, badRequest } = require("../utils/httpError");
const { viewerHasSharedAccess } = require("../services/sharedMaterialAccess");
const { createMaterialSharesBatch } = require("../services/materialShareService");

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.mindMap.findMany({
    where: { ...ownedWhere(req), savedAt: { not: null } },
    orderBy: { savedAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

/** `id` is the mind map id (same as list items). */
exports.get = asyncHandler(async (req, res) => {
  const mindMap = await prisma.mindMap.findUnique({ where: { id: req.params.id } });
  if (!mindMap) throw notFound("Mind map not found", "MIND_MAP_NOT_FOUND");
  assertOwnedOrAdmin(req, mindMap, "userId");
  if (mindMap.savedAt == null) {
    throw new HttpError(
      404,
      "Mind map is not in your saved library",
      { mindMapId: mindMap.id },
      "SAVED_LIBRARY_NOT_SAVED"
    );
  }
  res.apiSuccess(mindMap, "OK", 200);
});

exports.add = asyncHandler(async (req, res) => {
  const { mindMapId } = req.body;
  const row = await prisma.mindMap.findUnique({ where: { id: mindMapId } });
  assertOwnedOrAdmin(req, row, "userId");
  const updated = await prisma.mindMap.update({
    where: { id: mindMapId },
    data: { savedAt: new Date() },
  });
  void recordDailyStreakActivity(row.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(updated, "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await prisma.mindMap.findUnique({ where: { id: req.params.id } });
  if (!row) throw notFound();
  assertOwnedOrAdmin(req, row, "userId");
  const updated = await prisma.mindMap.update({
    where: { id: req.params.id },
    data: { savedAt: null },
  });
  void recordDailyStreakActivity(row.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiSuccess(updated, "OK", 200);
});

exports.share = asyncHandler(async (req, res) => {
  const row = await prisma.mindMap.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, row, "userId");
  const { channelIds, note } = req.body;
  const result = await createMaterialSharesBatch(req, {
    channelIds,
    materialType: "mind_map",
    materialId: req.params.id,
    note,
  });
  res.apiSuccess(result, "OK", 200);
});

exports.importFromShared = asyncHandler(async (req, res) => {
  const { sourceMindMapId } = req.body;
  const viewerId = req.auth.sub;

  const source = await prisma.mindMap.findUnique({ where: { id: sourceMindMapId } });
  if (!source) throw notFound();

  if (source.userId === viewerId) {
    throw badRequest("Use POST /saved-mind-maps with mindMapId to save your own mind map.", undefined, "INVALID_SOURCE");
  }

  const ok = await viewerHasSharedAccess(viewerId, "mind_map", sourceMindMapId);
  if (!ok) throw notFound();

  const created = await prisma.mindMap.create({
    data: {
      userId: viewerId,
      title: source.title,
      content: cloneJson(source.content),
      sourceType: "shared_copy",
      sourceReference: source.id,
      chatSessionId: null,
      savedAt: new Date(),
    },
  });

  void recordDailyStreakActivity(viewerId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(created, "CREATED");
});
