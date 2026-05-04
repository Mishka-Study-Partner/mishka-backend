const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("userSession", { ownership: { userIdField: "userId" } });

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listByUser = asyncHandler(async (req, res) => {
  const rows = await prisma.userSession.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});
