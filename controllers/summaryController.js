const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { assertOwnedOrAdmin, isAdmin } = require("../utils/authz");
const { notFound } = require("../utils/httpError");
const { viewerHasSharedAccess } = require("../services/sharedMaterialAccess");
const { createMaterialSharesBatch } = require("../services/materialShareService");

const crud = createCrudHandlers("summary", { ownership: { userIdField: "userId" } });

exports.list = asyncHandler(crud.list);

async function assertSummaryReadable(req, row) {
  if (!row) throw notFound();
  if (isAdmin(req.auth) || row.userId === req.auth.sub) return;
  const ok = await viewerHasSharedAccess(req.auth.sub, "summary", row.id);
  if (!ok) throw notFound();
}

exports.getById = asyncHandler(async (req, res) => {
  const row = await prisma.summary.findUnique({ where: { id: req.params.id } });
  await assertSummaryReadable(req, row);
  res.apiSuccess(row, "OK", 200);
});

exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.shareToChannels = asyncHandler(async (req, res) => {
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
