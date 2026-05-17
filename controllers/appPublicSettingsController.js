const { Prisma } = require("@prisma/client");
const asyncHandler = require("../utils/asyncHandler");
const { badRequest, HttpError } = require("../utils/httpError");
const { getOrCreate, updateSettings } = require("../services/appPublicSettingsService");

function blankToNull(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function mapSettingsDbError(e, step) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const hint =
      e.code === "P2021" || /does not exist/i.test(String(e.message))
        ? "Run `npx prisma migrate deploy` — table `app_public_settings` may be missing."
        : undefined;
    const showDetails = String(process.env.SHOW_ERROR_DETAILS || "").toLowerCase() === "true";
    throw new HttpError(
      500,
      "Failed to load app settings",
      showDetails
        ? { step, prismaCode: e.code, failureHint: hint, developerMessage: e.message }
        : hint
          ? { failureHint: hint }
          : undefined,
      "APP_PUBLIC_SETTINGS_FAILED"
    );
  }
  throw e;
}

exports.get = asyncHandler(async (_req, res) => {
  try {
    const row = await getOrCreate();
    res.apiSuccess(row, "OK", 200);
  } catch (e) {
    mapSettingsDbError(e, "appPublicSettings.getOrCreate");
  }
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
  try {
    const row = await updateSettings(payload);
    res.apiSuccess(row, "OK", 200);
  } catch (e) {
    mapSettingsDbError(e, "appPublicSettings.update");
  }
});
