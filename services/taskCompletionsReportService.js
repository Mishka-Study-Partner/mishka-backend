const prisma = require("../utils/prisma");
const { parseUtcDateParam } = require("./studyPeriodReportService");

/**
 * @param {string} fromStr YYYY-MM-DD inclusive (UTC)
 * @param {string} toStr YYYY-MM-DD inclusive (UTC)
 * @param {"day" | "week" | "month"} granularity
 */
async function buildTaskCompletionsReport(userId, fromStr, toStr, granularity = "day") {
  const from = parseUtcDateParam(fromStr);
  const toAnchor = parseUtcDateParam(toStr);
  if (!from || !toAnchor) return null;
  if (toAnchor < from) return null;

  const rangeEnd = new Date(toAnchor);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: "completed",
      completedAt: { gte: from, lt: rangeEnd },
    },
    select: { completedAt: true },
  });

  if (granularity !== "day") {
    return { unsupportedGranularity: granularity };
  }

  const buckets = [];
  const counts = new Map();
  for (let d = new Date(from); d < rangeEnd; ) {
    const label = d.toISOString().slice(0, 10);
    counts.set(label, 0);
    const next = new Date(d);
    next.setUTCDate(next.getUTCDate() + 1);
    d = next;
  }

  for (const t of tasks) {
    if (!t.completedAt) continue;
    const label = t.completedAt.toISOString().slice(0, 10);
    if (counts.has(label)) counts.set(label, (counts.get(label) || 0) + 1);
  }

  for (const [label] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    buckets.push({ label, completedCount: counts.get(label) || 0 });
  }

  const totalCompleted = tasks.length;

  return {
    periodStart: from.toISOString(),
    periodEnd: rangeEnd.toISOString(),
    granularity: "day",
    buckets,
    totalCompleted,
  };
}

module.exports = { buildTaskCompletionsReport };
