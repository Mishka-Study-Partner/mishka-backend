const prisma = require("../utils/prisma");
const { parseUtcDateParam } = require("./studyPeriodReportService");

function parseInclusiveRange(fromStr, toStr) {
  const from = parseUtcDateParam(fromStr);
  const toAnchor = parseUtcDateParam(toStr);
  if (!from || !toAnchor) return null;
  if (toAnchor < from) return null;
  const end = new Date(toAnchor);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: from, end };
}

/**
 * Count AI tutor material created in [from, to] (UTC calendar days, inclusive `to`).
 */
async function buildAiUsageReport(userId, fromStr, toStr) {
  const range = parseInclusiveRange(fromStr, toStr);
  if (!range) return null;

  const created = { gte: range.start, lt: range.end };

  const [quizzes, flashcards, summaries, mindMaps] = await Promise.all([
    prisma.quiz.count({ where: { userId, createdAt: created } }),
    prisma.flashcardSet.count({ where: { userId, createdAt: created } }),
    prisma.summary.count({ where: { userId, createdAt: created } }),
    prisma.mindMap.count({ where: { userId, createdAt: created } }),
  ]);

  return {
    quizzes,
    flashcards,
    summaries,
    mindMaps,
    periodStart: range.start.toISOString(),
    periodEnd: range.end.toISOString(),
  };
}

module.exports = { buildAiUsageReport };
