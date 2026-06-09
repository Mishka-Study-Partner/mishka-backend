const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { badRequest, notFound } = require("../utils/httpError");
const {
  MAX_SUBJECTS,
  normalizeName,
  normalizeColor,
  countActiveSubjects,
  assertActiveSubjectForUser,
  assertUniqueName,
  mapSubject,
} = require("../services/studentSubjectService");

exports.list = asyncHandler(async (req, res) => {
  const rows = await prisma.studentSubject.findMany({
    where: { userId: req.auth.sub, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  res.apiSuccess(rows.map(mapSubject), "OK", 200);
});

exports.create = asyncHandler(async (req, res) => {
  const name = normalizeName(req.body.name);
  if (!name) throw badRequest("name is required", undefined, "VALIDATION_ERROR");

  const active = await countActiveSubjects(req.auth.sub);
  if (active >= MAX_SUBJECTS) {
    throw badRequest(`Maximum ${MAX_SUBJECTS} subjects allowed`, undefined, "VALIDATION_ERROR");
  }

  await assertUniqueName(req.auth.sub, name);

  const color = req.body.color != null ? normalizeColor(req.body.color) : null;
  const maxSort = await prisma.studentSubject.aggregate({
    where: { userId: req.auth.sub },
    _max: { sortOrder: true },
  });

  const row = await prisma.studentSubject.create({
    data: {
      userId: req.auth.sub,
      name,
      color,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
  res.apiCreated(mapSubject(row), "CREATED");
});

exports.update = asyncHandler(async (req, res) => {
  const row = await assertActiveSubjectForUser(req.auth.sub, req.params.id);
  const data = {};

  if (req.body.name !== undefined) {
    const name = normalizeName(req.body.name);
    if (!name) throw badRequest("name cannot be empty", undefined, "VALIDATION_ERROR");
    await assertUniqueName(req.auth.sub, name, row.id);
    data.name = name;
  }
  if (req.body.color !== undefined) {
    data.color = req.body.color == null || req.body.color === "" ? null : normalizeColor(req.body.color);
  }
  if (req.body.sortOrder !== undefined) {
    data.sortOrder = Math.max(0, Math.min(999, Math.floor(Number(req.body.sortOrder))));
  }

  if (!Object.keys(data).length) {
    throw badRequest("At least one field is required", undefined, "VALIDATION_ERROR");
  }

  const updated = await prisma.studentSubject.update({
    where: { id: row.id },
    data,
  });
  res.apiSuccess(mapSubject(updated), "OK", 200);
});

exports.remove = asyncHandler(async (req, res) => {
  const row = await prisma.studentSubject.findFirst({
    where: { id: req.params.id, userId: req.auth.sub, deletedAt: null },
  });
  if (!row) throw notFound();

  await prisma.studentSubject.update({
    where: { id: row.id },
    data: { deletedAt: new Date() },
  });
  res.apiSuccess({ deleted: true }, "OK", 200);
});
