const asyncHandler = require("../utils/asyncHandler");
const { runScheduledReportEmails } = require("../services/scheduledReportEmailJob");

exports.scheduledReportEmails = asyncHandler(async (req, res) => {
  const force = req.body?.force;
  const dryRun = Boolean(req.body?.dryRun);
  const data = await runScheduledReportEmails({
    force: force === "weekly" || force === "monthly" ? force : undefined,
    dryRun,
  });
  res.apiSuccess(data, "OK", 200);
});
