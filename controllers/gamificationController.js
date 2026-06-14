const asyncHandler = require("../utils/asyncHandler");
const { buildDashboard } = require("../services/gamification/gamificationDashboardService");
const { collectBadge } = require("../services/gamification/gamificationBadgeService");
const { buildSectionMonthly } = require("../services/gamification/gamificationMonthlyService");

exports.getDashboard = asyncHandler(async (req, res) => {
  const data = await buildDashboard(req.auth.sub, req.query);
  res.apiSuccess(data, "OK", 200);
});

exports.collectBadge = asyncHandler(async (req, res) => {
  const data = await collectBadge(req.auth.sub, req.body);
  res.apiSuccess(data, "OK", 200);
});

exports.getSectionMonthly = asyncHandler(async (req, res) => {
  const data = await buildSectionMonthly(req.auth.sub, req.params.section, req.query.month);
  res.apiSuccess(data, "OK", 200);
});
