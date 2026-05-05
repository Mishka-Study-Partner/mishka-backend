const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { assertOwnedOrAdmin, ownedWhere } = require("../utils/authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { listTasksForUser } = require("../services/taskQueryService");

const crud = createCrudHandlers("todoList", {
  include: { icon: true },
  ownership: { userIdField: "userId" },
});

exports.list = asyncHandler(async (req, res) => {
  const { q, listType, limit, offset } = req.query;
  const where = ownedWhere(req);
  if (listType) where.listType = listType;
  if (q && String(q).length) {
    where.listName = { contains: String(q), mode: "insensitive" };
  }
  const rows = await prisma.todoList.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { icon: true },
    skip: offset,
    take: limit,
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listTasks = asyncHandler(async (req, res) => {
  const list = await prisma.todoList.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, list, "userId");
  const { listId: _ignore, ...filters } = req.query;
  const rows = await listTasksForUser(list.userId, { ...filters, listId: req.params.id });
  res.apiSuccess(rows, "OK", 200);
});

exports.createTask = asyncHandler(async (req, res) => {
  const list = await prisma.todoList.findUnique({ where: { id: req.params.id } });
  assertOwnedOrAdmin(req, list, "userId");
  const row = await prisma.task.create({
    data: {
      ...req.body,
      listId: req.params.id,
      userId: list.userId,
    },
  });
  void recordDailyStreakActivity(list.userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(row, "CREATED");
});
