const prisma = require("../../utils/prisma");
const { sessionSeconds } = require("./yourReportStudyBuckets");
const { labelsFor } = require("./yourReportLabels");

async function loadSessionsWithSubject(userId, rangeStart, rangeEnd) {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  const refDate = end > new Date() ? new Date() : end;
  const { approximateMainStudySecondsAt } = require("../studyReportAnalytics");

  const rows = await prisma.studyConcentrationSession.findMany({
    where: { userId, startedAt: { gte: start, lt: end } },
    select: {
      startedAt: true,
      totalPausedSeconds: true,
      totalCallBreakSeconds: true,
      endedAt: true,
      status: true,
      studentSubjectId: true,
      studentSubject: {
        select: { id: true, name: true, color: true, deletedAt: true },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  return rows.map((s) => ({
    ...s,
    approximateMainStudySeconds: approximateMainStudySecondsAt(s, refDate),
  }));
}

/**
 * Aggregate study minutes by student subject for a report period.
 * Sessions without a subject roll into the Unassigned bucket.
 */
async function buildStudyBySubject(userId, rangeStart, rangeEnd, locale) {
  const labels = labelsFor(locale);
  const unassignedLabel = labels.reportUnassignedSubject;
  const sessions = await loadSessionsWithSubject(userId, rangeStart, rangeEnd);

  /** @type {Map<string, { studentSubjectId: string|null, name: string, color: string|null, studyMinutes: number, sessionCount: number }>} */
  const byKey = new Map();

  for (const s of sessions) {
    const minutes = sessionSeconds(s) / 60;

    const key = s.studentSubjectId ?? "__unassigned__";
    if (!byKey.has(key)) {
      if (s.studentSubjectId && s.studentSubject) {
        byKey.set(key, {
          studentSubjectId: s.studentSubject.id,
          name: s.studentSubject.name,
          color: s.studentSubject.color,
          studyMinutes: 0,
          sessionCount: 0,
        });
      } else {
        byKey.set(key, {
          studentSubjectId: null,
          name: unassignedLabel,
          color: null,
          studyMinutes: 0,
          sessionCount: 0,
        });
      }
    }
    const bucket = byKey.get(key);
    bucket.studyMinutes += minutes;
    bucket.sessionCount += 1;
  }

  const totalMinutes = [...byKey.values()].reduce((sum, b) => sum + b.studyMinutes, 0);

  const items = [...byKey.values()]
    .filter((b) => b.sessionCount > 0)
    .map((b) => ({
      studentSubjectId: b.studentSubjectId,
      name: b.name,
      color: b.color,
      studyMinutes: Math.round(b.studyMinutes * 10) / 10,
      sessionCount: b.sessionCount,
      percentOfTotal: totalMinutes > 0 ? Math.round((b.studyMinutes / totalMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.studyMinutes - a.studyMinutes);

  const unassignedIdx = items.findIndex((i) => i.studentSubjectId == null);
  if (unassignedIdx >= 0 && unassignedIdx < items.length - 1) {
    const [u] = items.splice(unassignedIdx, 1);
    items.push(u);
  }

  return items;
}

module.exports = { buildStudyBySubject };
