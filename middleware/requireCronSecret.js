const { HttpError } = require("../utils/httpError");

/** Protects internal cron routes — set `CRON_SECRET` and send header `X-Cron-Secret`. */
function requireCronSecret(req, _res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret || typeof secret !== "string" || secret.length < 8) {
    return next(
      new HttpError(503, "Cron is not configured (CRON_SECRET)", undefined, "CRON_NOT_CONFIGURED")
    );
  }
  const provided = req.get("X-Cron-Secret") || req.get("x-cron-secret");
  if (provided !== secret) {
    return next(new HttpError(401, "Invalid cron secret", undefined, "UNAUTHORIZED"));
  }
  return next();
}

module.exports = requireCronSecret;
