const prisma = require("./prisma");
const { notFound, badRequest } = require("./httpError");

/**
 * @param {string} delegate - prisma model delegate key (e.g. 'tip', 'user')
 * @param {{ idField?: string, idType?: 'string'|'int' }} options
 */
function parseId(raw, idType) {
  if (idType === "int") {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) throw notFound("Invalid id", "NOT_FOUND");
    return n;
  }
  return raw;
}

function createCrudHandlers(delegate, options = {}) {
  const idField = options.idField || "id";
  const idType = options.idType || "string";

  return {
    async list(req, res) {
      const q = { include: options.include };
      if (options.orderBy) q.orderBy = options.orderBy;
      const rows = await prisma[delegate].findMany(q);
      res.apiSuccess(rows, "OK", 200);
    },

    async getById(req, res) {
      const id = parseId(req.params.id, idType);
      const row = await prisma[delegate].findUnique({
        where: { [idField]: id },
        include: options.include,
      });
      if (!row) throw notFound();
      res.apiSuccess(row, "OK", 200);
    },

    async create(req, res) {
      const data = options.mapCreate ? options.mapCreate(req.body) : req.body;
      const row = await prisma[delegate].create({
        data,
        include: options.include,
      });
      res.apiCreated(row, "CREATED");
    },

    async update(req, res) {
      const id = parseId(req.params.id, idType);
      const data = options.mapUpdate ? options.mapUpdate(req.body) : { ...req.body };
      if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
        throw badRequest("No fields to update", undefined, "VALIDATION_ERROR");
      }
      const row = await prisma[delegate].update({
        where: { [idField]: id },
        data,
        include: options.include,
      });
      res.apiSuccess(row, "OK", 200);
    },

    async remove(req, res) {
      const id = parseId(req.params.id, idType);
      await prisma[delegate].delete({ where: { [idField]: id } });
      res.apiSuccess(null, "DELETED", 200);
    },
  };
}

module.exports = { createCrudHandlers, parseId };
