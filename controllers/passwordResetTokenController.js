const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("passwordResetToken", { idType: "int" });

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(async (req, res) => {
  const row = await prisma.passwordResetToken.create({ data: req.body });
  res.apiCreated(row, "CREATED");
});
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listByUser = asyncHandler(async (req, res) => {
  const rows = await prisma.passwordResetToken.findMany({
    where: { userId: req.params.userId },
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});
