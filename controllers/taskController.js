const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { createCrudHandlers } = require("../utils/prismaCrud");
const { isAdmin } = require("../utils/authz");
const { badRequest } = require("../utils/httpError");
const { listTasksForUser } = require("../services/taskQueryService");
const { buildTaskCompletionsReport } = require("../services/taskCompletionsReportService");
const { mapTaskWriteData } = require("../utils/taskWrite");

const crud = createCrudHandlers("task", {
  ownership: { userIdField: "userId" },
  mapCreate: (body) => mapTaskWriteData(body),
  mapUpdate: (body, existing) => mapTaskWriteData(body, existing),
});

exports.list = asyncHandler(async (req, res) => {
  const { userId: requestedUserId, ...filters } = req.query;

  let scopeUserId = req.auth.sub;
  if (isAdmin(req.auth)) {
    scopeUserId = requestedUserId ?? null;
  }

  const rows = await listTasksForUser(scopeUserId, filters);
  res.apiSuccess(rows, "OK", 200);
});

exports.reportCompletions = asyncHandler(async (req, res) => {
  const { from, to, granularity = "day" } = req.query;
  if (granularity !== "day") {
    throw badRequest("Only granularity=day is supported", undefined, "VALIDATION_ERROR");
  }
  const report = await buildTaskCompletionsReport(req.auth.sub, from, to, granularity);
  if (!report) throw badRequest("Invalid from/to (YYYY-MM-DD, from ≤ to)", undefined, "VALIDATION_ERROR");
  res.apiSuccess(report, "OK", 200);
});

exports.getById = asyncHandler(crud.getById);
exports.create = asyncHandler(crud.create);
exports.update = asyncHandler(crud.update);
exports.remove = asyncHandler(crud.remove);
