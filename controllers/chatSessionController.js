const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");

const crud = createCrudHandlers("chatSession", {
  include: { messages: { orderBy: { createdAt: "asc" } } },
});

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.chatSession.findMany({
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

exports.listMessages = asyncHandler(async (req, res) => {
  const rows = await prisma.chatMessage.findMany({
    where: { sessionId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.createMessage = asyncHandler(async (req, res) => {
  const row = await prisma.chatMessage.create({
    data: {
      ...req.body,
      sessionId: req.params.id,
    },
  });
  res.apiCreated(row, "CREATED");
});
