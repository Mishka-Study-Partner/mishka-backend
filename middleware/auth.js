const jwt = require("jsonwebtoken");
const { HttpError } = require("../utils/httpError");
const { jwtSecret } = require("../utils/jwtSecret");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(new HttpError(401, "Missing Bearer token", undefined, "AUTH_MISSING_TOKEN"));
  }

  try {
    const payload = jwt.verify(token, jwtSecret());
    req.auth = payload;
    return next();
  } catch (e) {
    return next(new HttpError(401, "Invalid or expired token", undefined, "AUTH_INVALID_TOKEN"));
  }
}

module.exports = { requireAuth };
