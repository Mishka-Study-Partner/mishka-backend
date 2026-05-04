const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { isAdmin } = require("../utils/authz");

const crud = createCrudHandlers("aiTool");

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listActivity = asyncHandler(async (req, res) => {
  const where = {
    toolId: req.params.id,
    ...(isAdmin(req.auth) ? {} : { userId: req.auth.sub }),
  };
  const rows = await prisma.userAiActivity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });
  res.apiSuccess(rows, "OK", 200);
});
