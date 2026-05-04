const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { isAdmin } = require("../utils/authz");
const { forbidden } = require("../utils/httpError");

const crud = createCrudHandlers("community");

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listMembers = asyncHandler(async (req, res) => {
  const communityId = req.params.id;

  if (!isAdmin(req.auth)) {
    const isMember = await prisma.userCommunity.findFirst({
      where: { communityId, userId: req.auth.sub },
    });
    if (!isMember) {
      throw forbidden("You must be a member of this community to view its member list", "FORBIDDEN");
    }
  }

  const rows = await prisma.userCommunity.findMany({
    where: { communityId },
    orderBy: { id: "asc" },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, profileImageUrl: true } } },
  });
  res.apiSuccess(rows, "OK", 200);
});
