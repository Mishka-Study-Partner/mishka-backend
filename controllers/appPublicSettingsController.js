const asyncHandler = require("../utils/asyncHandler");
const { badRequest } = require("../utils/httpError");
const { getOrCreate, updateSettings } = require("../services/appPublicSettingsService");

function blankToNull(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

exports.get = asyncHandler(async (_req, res) => {
  const row = await getOrCreate();
  res.apiSuccess(row, "OK", 200);
});

exports.put = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const payload = {};
  if (b.privacyPolicyText !== undefined) payload.privacyPolicyText = b.privacyPolicyText;
  if (b.supportEmail !== undefined) payload.supportEmail = blankToNull(b.supportEmail);
  if (b.supportPhone !== undefined) payload.supportPhone = blankToNull(b.supportPhone);
  if (b.supportFacebookUrl !== undefined) payload.supportFacebookUrl = blankToNull(b.supportFacebookUrl);
  if (b.supportInstagramUrl !== undefined) payload.supportInstagramUrl = blankToNull(b.supportInstagramUrl);
  if (Object.keys(payload).length === 0) {
    throw badRequest("Provide at least one field to update", undefined, "VALIDATION_ERROR");
  }
  const row = await updateSettings(payload);
  res.apiSuccess(row, "OK", 200);
});
