const { badRequest } = require("./httpError");

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) {
    throw badRequest(`Missing required fields: ${missing.join(", ")}`);
  }
}

function optionalString(v) {
  if (v === undefined || v === null) return undefined;
  return String(v);
}

function parseBool(v, defaultVal = false) {
  if (v === undefined || v === null) return defaultVal;
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return defaultVal;
}

module.exports = {
  requireFields,
  optionalString,
  parseBool,
};
