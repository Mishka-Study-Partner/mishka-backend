const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { notFound, badRequest } = require("../utils/httpError");
const { assertOwnedOrAdmin, isAdmin } = require("../utils/authz");

async function loadMessageWithSession(id) {
  return prisma.chatMessage.findUnique({
    where: { id },
    include: { session: true },
  });
}

exports.list = asyncHandler(async (req, res) => {
  const where = isAdmin(req.auth) ? {} : { session: { userId: req.auth.sub } };
  const rows = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.getById = asyncHandler(async (req, res) => {
  const row = await loadMessageWithSession(req.params.id);
  if (!row?.session) throw notFound();
  assertOwnedOrAdmin(req, row.session, "userId");
  res.apiSuccess(row, "OK", 200);
});

exports.create = asyncHandler(async (req, res) => {
  const sessionId = req.body?.sessionId;
  if (!sessionId) {
    throw badRequest("sessionId is required", [{ path: "sessionId", message: "Required" }], "VALIDATION_ERROR");
  }
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  assertOwnedOrAdmin(req, session, "userId");
  const row = await prisma.chatMessage.create({
    data: {
      ...req.body,
      sessionId,
    },
  });
  res.apiCreated(row, "CREATED");
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await loadMessageWithSession(req.params.id);
  if (!existing?.session) throw notFound();
  assertOwnedOrAdmin(req, existing.session, "userId");
  const data = { ...req.body };
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    throw badRequest("No fields to update", undefined, "VALIDATION_ERROR");
  }
  const row = await prisma.chatMessage.update({
    where: { id: req.params.id },
    data,
  });
  res.apiSuccess(row, "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await loadMessageWithSession(req.params.id);
  if (!existing?.session) throw notFound();
  assertOwnedOrAdmin(req, existing.session, "userId");
  await prisma.chatMessage.delete({ where: { id: req.params.id } });
  res.apiSuccess(null, "DELETED", 200);
});
