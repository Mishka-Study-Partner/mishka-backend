const asyncHandler = require("../utils/asyncHandler");
const { getSummary, getHistory, recordDailyStreakActivity, useFreeze } = require("../services/dailyStreakService");

exports.getSummary = asyncHandler(async (req, res) => {
  const weekStart = typeof req.query.weekStart === "string" ? req.query.weekStart : undefined;
  const data = await getSummary(req.auth.sub, weekStart);
  res.apiSuccess(data, "OK", 200);
});

exports.getHistory = asyncHandler(async (req, res) => {
  const data = await getHistory(req.auth.sub, req.query.from, req.query.to);
  res.apiSuccess(data, "OK", 200);
});

exports.ping = asyncHandler(async (req, res) => {
  const meta = await recordDailyStreakActivity(req.auth.sub);
  res.apiSuccess(meta, "OK", 200);
});

exports.freeze = asyncHandler(async (req, res) => {
  const { date } = req.body;
  const data = await useFreeze(req.auth.sub, date);
  res.apiSuccess(data, "OK", 200);
});
