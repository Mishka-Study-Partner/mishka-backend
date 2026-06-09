const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { notFound } = require("../utils/httpError");
const { assertOwnedOrAdmin } = require("../utils/authz");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { pinnedAtByCommunityForUser, enrichWithPinnedFlags } = require("../utils/communitySavedPin");

const crud = createCrudHandlers("userCommunity", { ownership: { userIdField: "userId" } });

exports.list = asyncHandler(async (req, res) => {
  const pinnedMap = await pinnedAtByCommunityForUser(req.auth.sub);
  const rows = await prisma.userCommunity.findMany({
    where: { userId: req.auth.sub },
    orderBy: { id: "asc" },
    include: {
      community: {
        include: { _count: { select: { members: true, channels: true } } },
      },
    },
  });
  res.apiSuccess(rows.map((r) => enrichWithPinnedFlags(r, pinnedMap)), "OK", 200);
});

exports.getById = asyncHandler(async (req, res) => {
  const pinnedMap = await pinnedAtByCommunityForUser(req.auth.sub);
  const row = await prisma.userCommunity.findUnique({
    where: { id: req.params.id },
    include: { community: true },
  });
  if (!row) throw notFound();
  assertOwnedOrAdmin(req, row, "userId");
  res.apiSuccess(enrichWithPinnedFlags(row, pinnedMap), "OK", 200);
});

exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);
