const { z } = require("zod");
const { badRequest } = require("../utils/httpError");

function validate(schema, part = "body") {
  return (req, _res, next) => {
    const input = req[part] || {};
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return next(
        badRequest(
          "Validation failed",
          parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          "VALIDATION_ERROR"
        )
      );
    }
    req[part] = parsed.data;
    return next();
  };
}

module.exports = { validate, z };
