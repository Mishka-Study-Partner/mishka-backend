const asyncHandler = require("../utils/asyncHandler");
const { ingestBatch, getSummary } = require("../services/usageIngestService");

exports.batch = asyncHandler(async (req, res) => {
  const data = await ingestBatch(req.auth.sub, req.body);
  res.apiSuccess(data, "OK", 200);
});

exports.summary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await getSummary(req.auth.sub, String(from), String(to));
  res.apiSuccess(data, "OK", 200);
});
