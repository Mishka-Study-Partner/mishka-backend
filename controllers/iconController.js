const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { isAdmin } = require("../utils/authz");

const crud = createCrudHandlers("icon", { idType: "int" });

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listTodoLists = asyncHandler(async (req, res) => {
  const rows = await prisma.todoList.findMany({
    where: {
      iconId: parseInt(req.params.id, 10),
      ...(isAdmin(req.auth) ? {} : { userId: req.auth.sub }),
    },
  });
  res.apiSuccess(rows, "OK", 200);
});
