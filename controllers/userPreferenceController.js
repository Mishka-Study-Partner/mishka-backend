const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const {
  mapReportEmailSettings,
  ensureUserPreference,
  buildReportEmailPreferenceUpdate,
} = require("../utils/userPreferenceReportEmail");

const crud = createCrudHandlers("userPreference", { ownership: { userIdField: "userId" } });

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);

/** GET /user-preferences/me — includes automatic report email settings. */
exports.getMe = asyncHandler(async (req, res) => {
  const [pref, user] = await Promise.all([
    ensureUserPreference(req.auth.sub),
    prisma.user.findUnique({ where: { id: req.auth.sub }, select: { email: true } }),
  ]);
  res.apiSuccess(
    {
      ...pref,
      reportEmail: mapReportEmailSettings(pref, user?.email),
    },
    "OK",
    200
  );
});

/** PATCH /user-preferences/me — enable/disable scheduled Your Report emails. */
exports.patchMe = asyncHandler(async (req, res) => {
  await ensureUserPreference(req.auth.sub);
  const data = buildReportEmailPreferenceUpdate(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.auth.sub }, select: { email: true } });
  if (!Object.keys(data).length) {
    const pref = await prisma.userPreference.findUnique({ where: { userId: req.auth.sub } });
    return res.apiSuccess({ ...pref, reportEmail: mapReportEmailSettings(pref, user?.email) }, "OK", 200);
  }
  const pref = await prisma.userPreference.update({
    where: { userId: req.auth.sub },
    data,
  });
  res.apiSuccess(
    {
      ...pref,
      reportEmail: mapReportEmailSettings(pref, user?.email),
    },
    "OK",
    200
  );
});
