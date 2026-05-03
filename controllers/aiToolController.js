const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("aiTool");

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listActivity = asyncHandler(async (req, res) => {
  const rows = await prisma.userAiActivity.findMany({
    where: { toolId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });
  res.apiSuccess(rows, "OK", 200);
});
