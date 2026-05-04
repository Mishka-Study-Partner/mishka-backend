const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("userAiActivity", {
  ownership: { userIdField: "userId" },
  include: { tool: true, user: { select: { id: true, email: true } } },
});

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);
