const prisma = require("./prisma");
const { notFound, badRequest } = require("./httpError");
const { assertOwnedOrAdmin, isAdmin, ownedWhere } = require("./authz");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");

/** Delegates that must not trigger daily streak updates (recursion, auth noise, prefs). */
const DAILY_STREAK_EXCLUDE = new Set(["userStreak", "userSession", "userPreference", "passwordResetToken"]);

/**
 * @param {string} delegate
 * @param {Record<string, unknown> | null | undefined} row
 */
function scheduleDailyStreak(delegate, row) {
  if (DAILY_STREAK_EXCLUDE.has(delegate)) return;
  const uid = row && typeof row.userId === "string" ? row.userId : null;
  if (!uid) return;
  void recordDailyStreakActivity(uid).catch((err) => {
    console.error("[dailyStreak]", delegate, err?.message || err);
  });
}

function parseId(raw, idType) {
  if (idType === "int") {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) throw notFound("Invalid id", "NOT_FOUND");
    return n;
  }
  return raw;
}

/**
 * @param {string} delegate Prisma client delegate key (e.g. `task`, `todoList`)
 * @param {{
 *   idField?: string,
 *   idType?: 'string'|'int',
 *   include?: object,
 *   orderBy?: object,
 *   mapCreate?: (body: object) => object,
 *   mapUpdate?: (body: object) => object,
 *   ownership?: { userIdField?: string },
 * }} [options]
 */
function createCrudHandlers(delegate, options = {}) {
  const idField = options.idField || "id";
  const idType = options.idType || "string";
  const ownership = options.ownership;
  const userIdField = ownership?.userIdField || "userId";

  return {
    async list(req, res) {
      const q = { include: options.include };
      if (options.orderBy) q.orderBy = options.orderBy;
      if (ownership) {
        q.where = ownedWhere(req, userIdField);
      }
      const rows = await prisma[delegate].findMany(q);
      res.apiSuccess(rows, "OK", 200);
    },

    async getById(req, res) {
      const id = parseId(req.params.id, idType);
      const row = await prisma[delegate].findUnique({
        where: { [idField]: id },
        include: options.include,
      });
      if (ownership) assertOwnedOrAdmin(req, row, userIdField);
      else if (!row) throw notFound();
      res.apiSuccess(row, "OK", 200);
    },

    async create(req, res) {
      let data = options.mapCreate ? options.mapCreate(req.body) : { ...req.body };
      if (ownership && !isAdmin(req.auth)) {
        data = { ...data, [userIdField]: req.auth.sub };
      }
      const row = await prisma[delegate].create({
        data,
        include: options.include,
      });
      scheduleDailyStreak(delegate, row);
      res.apiCreated(row, "CREATED");
    },

    async update(req, res) {
      const id = parseId(req.params.id, idType);
      const existing = await prisma[delegate].findUnique({
        where: { [idField]: id },
        include: options.include,
      });
      if (ownership) assertOwnedOrAdmin(req, existing, userIdField);
      else if (!existing) throw notFound();

      const data = options.mapUpdate ? options.mapUpdate(req.body, existing) : { ...req.body };
      if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
        throw badRequest("No fields to update", undefined, "VALIDATION_ERROR");
      }
      const row = await prisma[delegate].update({
        where: { [idField]: id },
        data,
        include: options.include,
      });
      scheduleDailyStreak(delegate, row);
      res.apiSuccess(row, "OK", 200);
    },

    async remove(req, res) {
      const id = parseId(req.params.id, idType);
      const existing = await prisma[delegate].findUnique({
        where: { [idField]: id },
      });
      if (ownership) assertOwnedOrAdmin(req, existing, userIdField);
      else if (!existing) throw notFound();

      await prisma[delegate].delete({ where: { [idField]: id } });
      res.apiSuccess(null, "DELETED", 200);
    },
  };
}

module.exports = { createCrudHandlers, parseId };
