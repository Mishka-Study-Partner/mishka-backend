const { notFound } = require("./httpError");

function isAdmin(auth) {
  return Boolean(auth && auth.role === "admin");
}

/**
 * @param {import("express").Request} req
 * @param {Record<string, unknown> | null} row
 * @param {string} [userIdField]
 */
function assertOwnedOrAdmin(req, row, userIdField = "userId") {
  if (!row) throw notFound();
  if (isAdmin(req.auth)) return;
  if (row[userIdField] !== req.auth.sub) throw notFound();
}

/**
 * Prisma `where` fragment: admins see all rows; others only rows they own.
 * @param {import("express").Request} req
 * @param {string} [userIdField]
 */
function ownedWhere(req, userIdField = "userId") {
  if (isAdmin(req.auth)) return {};
  return { [userIdField]: req.auth.sub };
}

module.exports = { isAdmin, assertOwnedOrAdmin, ownedWhere };
