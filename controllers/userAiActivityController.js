const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { buildAiUsageReport } = require("../services/aiUsageReportService");
const { badRequest } = require("../utils/httpError");

const crud = createCrudHandlers("userAiActivity", {
  ownership: { userIdField: "userId" },
  include: { tool: true, user: { select: { id: true, email: true } } },
});

exports.report = asyncHandler(async (req, res) => {
  const report = await buildAiUsageReport(req.auth.sub, req.query.from, req.query.to);
  if (!report) throw badRequest("Invalid from/to (YYYY-MM-DD, from ≤ to)", undefined, "VALIDATION_ERROR");
  res.apiSuccess(report, "OK", 200);
});

exports.list = asyncHandler(crud.list);
exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);
