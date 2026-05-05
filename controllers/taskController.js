const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { isAdmin } = require("../utils/authz");
const { listTasksForUser } = require("../services/taskQueryService");

const crud = createCrudHandlers("task", { ownership: { userIdField: "userId" } });

exports.list = asyncHandler(async (req, res) => {
  const { userId: requestedUserId, ...filters } = req.query;

  let scopeUserId = req.auth.sub;
  if (isAdmin(req.auth)) {
    scopeUserId = requestedUserId ?? null;
  }

  const rows = await listTasksForUser(scopeUserId, filters);
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);
