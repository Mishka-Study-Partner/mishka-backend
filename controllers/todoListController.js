const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("todoList", {
  include: { icon: true },
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.todoList.findMany({
    orderBy: { updatedAt: "desc" },
    include: { icon: true },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listTasks = asyncHandler(async (req, res) => {
  const rows = await prisma.task.findMany({
    where: { listId: req.params.id },
    orderBy: { dueDate: "asc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.createTask = asyncHandler(async (req, res) => {
  const list = await prisma.todoList.findUnique({ where: { id: req.params.id } });
  if (!list) {
    const { notFound } = require("../utils/httpError");
    throw notFound("Todo list not found", "NOT_FOUND");
  }
  const row = await prisma.task.create({
    data: {
      ...req.body,
      listId: req.params.id,
      userId: list.userId,
    },
  });
  res.apiCreated(row, "CREATED");
});
