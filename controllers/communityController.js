const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("community");

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listMembers = asyncHandler(async (req, res) => {
  const rows = await prisma.userCommunity.findMany({
    where: { communityId: req.params.id },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, profileImageUrl: true } } },
  });
  res.apiSuccess(rows, "OK", 200);
});
