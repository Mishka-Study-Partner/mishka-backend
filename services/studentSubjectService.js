const prisma = require("../utils/prisma");
const { badRequest, notFound, conflict } = require("../utils/httpError");

const MAX_SUBJECTS = 20;

function normalizeName(raw) {
  return String(raw ?? "").trim().slice(0, 100);
}

function normalizeColor(raw) {
  if (raw == null || raw === "") return null;
  const c = String(raw).trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(c)) {
    throw badRequest("color must be a hex value like #4E7DBA", undefined, "VALIDATION_ERROR");
  }
  return c.toUpperCase();
}

async function countActiveSubjects(userId) {
  return prisma.studentSubject.count({
    where: { userId, deletedAt: null },
  });
}

/** Active, non-deleted subject owned by user. */
async function assertActiveSubjectForUser(userId, subjectId) {
  const row = await prisma.studentSubject.findFirst({
    where: { id: subjectId, userId, deletedAt: null },
  });
  if (!row) throw notFound("Subject not found", "NOT_FOUND");
  return row;
}

async function assertUniqueName(userId, name, excludeId = null) {
  const existing = await prisma.studentSubject.findFirst({
    where: {
      userId,
      deletedAt: null,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (existing) {
    throw conflict("A subject with this name already exists", "SUBJECT_NAME_IN_USE");
  }
}

function mapSubject(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

module.exports = {
  MAX_SUBJECTS,
  normalizeName,
  normalizeColor,
  countActiveSubjects,
  assertActiveSubjectForUser,
  assertUniqueName,
  mapSubject,
};
