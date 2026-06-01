const prisma = require("../utils/prisma");
const { approximateMainStudySecondsAt, wallElapsedSeconds } = require("./studyReportAnalytics");

function parseUtcDateParam(dateStr) {
  if (!dateStr || typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return null;
  }
  const start = new Date(`${dateStr.trim()}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  return start;
}

/** [start, end) UTC day from YYYY-MM-DD */
function utcDayRange(dateStr) {
  const start = parseUtcDateParam(dateStr);
  if (!start) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** Monday 00:00 UTC through next Monday (7 days), for the ISO week containing `date`. */
function utcWeekRangeContaining(dateStr) {
  const anchor = parseUtcDateParam(dateStr);
  if (!anchor) return null;
  const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 12));
  const dow = d.getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + delta));
  monday.setUTCHours(0, 0, 0, 0);
  const end = new Date(monday);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start: monday, end, weekMondayDate: monday.toISOString().slice(0, 10) };
}

function utcMonthRange(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y < 2000 || y > 2100 || !Number.isInteger(m) || m < 1 || m > 12) return null;
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

function sessionWhere(userId, range, topLevelMode) {
  const where = {
    userId,
    startedAt: { gte: range.start, lt: range.end },
  };
  if (topLevelMode === "call_with_mishka" || topLevelMode === "concentration") {
    where.topLevelMode = topLevelMode;
  }
  return where;
}

function refNowForPeriod(rangeEnd) {
  const now = new Date();
  return rangeEnd > now ? now : rangeEnd;
}

/**
 * Aggregate Study With Mishka metrics for a UTC time window (sessions filtered by startedAt in [start,end)).
 */
async function buildStudyPeriodReport(userId, kind, range, options = {}) {
  const { topLevelMode, explicitAll } = options;
  const where = sessionWhere(userId, range, topLevelMode);
  const refDate = refNowForPeriod(range.end);

  const [
    sessions,
    streakMeta,
    eventGroups,
    checkInGroups,
    mlTotal,
    baselineSessions,
    baselineCompletedCount,
  ] = await Promise.all([
    prisma.studyConcentrationSession.findMany({
      where,
      orderBy: { startedAt: "asc" },
      include: {
        _count: { select: { checkIns: true, activityEvents: true, mlReports: true } },
      },
    }),
    prisma.userDailyStreakMeta.findUnique({ where: { userId } }),
    prisma.studySessionActivityEvent.groupBy({
      by: ["eventType"],
      where: { session: where },
      _count: { _all: true },
    }),
    prisma.studyConcentrationCheckIn.groupBy({
      by: ["kind"],
      where: { session: where },
      _count: { _all: true },
    }),
    prisma.studySessionMlReport.count({ where: { session: where } }),
    prisma.studyConcentrationSession.findMany({
      where: {
        userId,
        status: { in: ["completed", "abandoned"] },
        startedAt: { gte: new Date(Date.now() - 90 * 86400000) },
      },
      select: {
        startedAt: true,
        endedAt: true,
        totalPausedSeconds: true,
        totalCallBreakSeconds: true,
      },
      take: 2000,
    }),
    prisma.studyConcentrationSession.count({
      where: { userId, status: "completed" },
    }),
  ]);

  const activityEventCounts = {};
  for (const row of eventGroups) {
    activityEventCounts[row.eventType] = row._count._all;
  }

  const checkInsByKind = {};
  let totalCheckIns = 0;
  for (const row of checkInGroups) {
    checkInsByKind[row.kind] = row._count._all;
    totalCheckIns += row._count._all;
  }

  const byStatus = { active: 0, paused: 0, completed: 0, abandoned: 0 };
  const byTopLevelMode = { concentration: 0, call_with_mishka: 0 };
  let sumWall = 0;
  let sumMain = 0;
  let sumPaused = 0;
  let sumCallBreak = 0;
  let sumCycles = 0;
  let totalActivityEvents = 0;

  const sessionSummaries = sessions.map((s) => {
    byStatus[s.status] += 1;
    byTopLevelMode[s.topLevelMode] += 1;
    const wall = wallElapsedSeconds(s, refDate);
    const main = approximateMainStudySecondsAt(s, refDate);
    sumWall += wall;
    sumMain += main;
    sumPaused += s.totalPausedSeconds;
    sumCallBreak += s.totalCallBreakSeconds;
    sumCycles += s.cyclesCompleted;
    totalActivityEvents += s._count.activityEvents;

    return {
      id: s.id,
      title: s.title,
      topLevelMode: s.topLevelMode,
      status: s.status,
      concentrationPreset: s.concentrationPreset,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      wallClockElapsedSecondsApprox: wall,
      approximateMainStudySeconds: main,
      cyclesCompleted: s.cyclesCompleted,
      tags: s.tags,
      linkedTaskId: s.linkedTaskId,
      counts: {
        checkIns: s._count.checkIns,
        activityEvents: s._count.activityEvents,
        mlReports: s._count.mlReports,
      },
    };
  });

  let baselineAvgMainStudySeconds = null;
  if (baselineSessions.length) {
    let total = 0;
    let n = 0;
    for (const s of baselineSessions) {
      if (!s.endedAt) continue;
      const sec = Math.max(
        0,
        Math.floor((s.endedAt.getTime() - s.startedAt.getTime()) / 1000) - s.totalPausedSeconds - s.totalCallBreakSeconds
      );
      total += sec;
      n += 1;
    }
    if (n) baselineAvgMainStudySeconds = Math.round((total / n) * 100) / 100;
  }

  const periodAvgMain =
    sessions.length > 0 ? Math.round((sumMain / sessions.length) * 100) / 100 : null;
  let vsBaselinePct = null;
  if (baselineAvgMainStudySeconds != null && baselineAvgMainStudySeconds > 0 && periodAvgMain != null) {
    vsBaselinePct = Math.round(((periodAvgMain - baselineAvgMainStudySeconds) / baselineAvgMainStudySeconds) * 1000) / 10;
  }

  const label =
    kind === "day"
      ? range.start.toISOString().slice(0, 10)
      : kind === "week"
        ? options.weekLabel || range.start.toISOString().slice(0, 10)
        : `${range.start.getUTCFullYear()}-${String(range.start.getUTCMonth() + 1).padStart(2, "0")}`;

  return {
    period: {
      kind,
      label,
      startUtc: range.start.toISOString(),
      endUtc: range.end.toISOString(),
      timeZoneNote: "Bounds are UTC; day = calendar date in UTC.",
    },
    generatedAt: new Date().toISOString(),
    filters: topLevelMode
      ? { topLevelMode }
      : explicitAll
        ? { topLevelMode: "all" }
        : {},
    totals: {
      sessionsStarted: sessions.length,
      byStatus,
      byTopLevelMode,
      sumWallClockElapsedSecondsApprox: sumWall,
      sumApproximateMainStudySeconds: sumMain,
      sumTotalPausedSecondsStored: sumPaused,
      sumTotalCallBreakSecondsStored: sumCallBreak,
      sumCyclesCompleted: sumCycles,
      totalCheckIns,
      checkInsByKind,
      totalActivityEvents,
      totalMlReports: mlTotal,
      activityEventCounts,
    },
    sessionSummaries,
    userContext: {
      dailyStreak: streakMeta
        ? {
            currentStreak: streakMeta.currentStreak,
            longestStreak: streakMeta.longestStreak,
            freezesRemaining: streakMeta.freezesRemaining,
          }
        : null,
      completedSessionsAllTime: baselineCompletedCount,
      baselineAvgMainStudySecondsLast90d: baselineAvgMainStudySeconds,
      periodAvgApproximateMainStudySeconds: periodAvgMain,
      periodVsBaselineAvgPercent: vsBaselinePct,
    },
  };
}

async function reportForDay(userId, dateStr, options) {
  const range = utcDayRange(dateStr);
  if (!range) return null;
  return buildStudyPeriodReport(userId, "day", range, options);
}

async function reportForWeek(userId, dateStr, options) {
  const range = utcWeekRangeContaining(dateStr);
  if (!range) return null;
  return buildStudyPeriodReport(userId, "week", { start: range.start, end: range.end }, { ...options, weekLabel: range.weekMondayDate });
}

async function reportForMonth(userId, year, month, options) {
  const range = utcMonthRange(year, month);
  if (!range) return null;
  return buildStudyPeriodReport(userId, "month", range, options);
}

/** Twelve UTC month buckets (Jan–Dec) for a calendar year; no full sessionSummaries (use month endpoint for detail). */
async function reportForYear(userId, year, options = {}) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;

  const monthlyBuckets = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const month = i + 1;
      const range = utcMonthRange(y, month);
      const report = await buildStudyPeriodReport(userId, "month", range, options);
      return {
        label: report.period.label,
        month,
        year: y,
        startUtc: report.period.startUtc,
        endUtc: report.period.endUtc,
        totals: {
          sessionsStarted: report.totals.sessionsStarted,
          sumApproximateMainStudySeconds: report.totals.sumApproximateMainStudySeconds,
          byTopLevelMode: report.totals.byTopLevelMode,
        },
      };
    })
  );

  let sumApproximateMainStudySeconds = 0;
  let sessionsStarted = 0;
  const byTopLevelMode = { concentration: 0, call_with_mishka: 0 };
  for (const b of monthlyBuckets) {
    sumApproximateMainStudySeconds += b.totals.sumApproximateMainStudySeconds;
    sessionsStarted += b.totals.sessionsStarted;
    byTopLevelMode.concentration += b.totals.byTopLevelMode.concentration;
    byTopLevelMode.call_with_mishka += b.totals.byTopLevelMode.call_with_mishka;
  }

  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y + 1, 0, 1));

  return {
    period: {
      kind: "year",
      label: String(y),
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
      timeZoneNote: "Bounds are UTC; monthly buckets are UTC calendar months.",
    },
    generatedAt: new Date().toISOString(),
    filters: options.topLevelMode
      ? { topLevelMode: options.topLevelMode }
      : options.explicitAll
        ? { topLevelMode: "all" }
        : {},
    totals: {
      sessionsStarted,
      sumApproximateMainStudySeconds,
      byTopLevelMode,
    },
    monthlyBuckets,
  };
}

module.exports = {
  parseUtcDateParam,
  utcDayRange,
  utcWeekRangeContaining,
  utcMonthRange,
  buildStudyPeriodReport,
  reportForDay,
  reportForWeek,
  reportForMonth,
  reportForYear,
};
