const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("category");

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listSavedByUsers = asyncHandler(async (req, res) => {
  const rows = await prisma.userSavedCategory.findMany({
    where: { categoryId: req.params.id },
    include: { user: { select: { id: true, email: true, username: true } } },
  });
  res.apiSuccess(rows, "OK", 200);
});
