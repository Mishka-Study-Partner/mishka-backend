const { forbidden } = require("../utils/httpError");
const { isAdmin } = require("../utils/authz");

function requireAdmin(req, _res, next) {
  if (isAdmin(req.auth)) return next();
  return next(forbidden("Admin privileges required", "FORBIDDEN"));
}

/**
 * @param {string} paramName Express route param holding a User id (default `id`)
 */
function requireSelfOrAdmin(paramName = "id") {
  return (req, _res, next) => {
    const targetId = req.params[paramName];
    if (!targetId) {
      return next(forbidden("Missing resource identifier", "FORBIDDEN"));
    }
    if (req.auth.sub === targetId) return next();
    if (isAdmin(req.auth)) return next();
    return next(forbidden("You can only access your own account data", "FORBIDDEN"));
  };
}

module.exports = { requireAdmin, requireSelfOrAdmin };
