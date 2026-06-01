const { HttpError } = require("../../utils/httpError");
const { buildYourReportPayload } = require("./yourReportPayloadService");
const { resolvePeriodWindow, formatPeriodLabel } = require("./yourReportPeriod");
const { labelsFor, sectionSuffix } = require("./yourReportLabels");
const { buildCommunityActivityReport } = require("../communityActivityReportService");
const {
  reportForDay,
  reportForWeek,
  reportForMonth,
  reportForYear,
} = require("../studyPeriodReportService");

const STUDY_OPTS = { explicitAll: true };

async function studyTotalsForPeriod(userId, period, window, anchorDate) {
  let report = null;
  if (period === "daily") {
    report = await reportForDay(userId, anchorDate, STUDY_OPTS);
  } else if (period === "weekly") {
    report = await reportForWeek(userId, anchorDate, STUDY_OPTS);
  } else if (period === "monthly") {
    report = await reportForMonth(userId, window.year, window.month, STUDY_OPTS);
  } else if (period === "yearly") {
    report = await reportForYear(userId, window.year, STUDY_OPTS);
  }
  if (!report) {
    return {
      sumApproximateMainStudySeconds: 0,
      sumStudyMinutes: 0,
      sessionsStarted: 0,
      byTopLevelMode: { concentration: 0, call_with_mishka: 0 },
    };
  }
  const sec = report.totals?.sumApproximateMainStudySeconds ?? 0;
  return {
    sumApproximateMainStudySeconds: sec,
    sumStudyMinutes: Math.round(sec / 60),
    sessionsStarted: report.totals?.sessionsStarted ?? 0,
    byTopLevelMode: report.totals?.byTopLevelMode ?? { concentration: 0, call_with_mishka: 0 },
  };
}

function emptyReportSections(period, window, locale) {
  const labels = labelsFor(locale);
  const suffix = sectionSuffix(period, labels);
  return {
    period,
    periodLabel: formatPeriodLabel(period, window, locale),
    rangeStart: window.rangeStart,
    rangeEnd: window.rangeEnd,
    locale,
    streak: {
      currentStreak: 0,
      longestStreak: 0,
      freezesRemaining: 2,
      week: [],
    },
    study: {
      subtitle: labels.reportDuringConcentrationMode,
      buckets: [],
      totals: {
        sumApproximateMainStudySeconds: 0,
        sumStudyMinutes: 0,
        sessionsStarted: 0,
        byTopLevelMode: { concentration: 0, call_with_mishka: 0 },
      },
    },
    aiTools: {
      quizzes: 0,
      flashcards: 0,
      summaries: 0,
      mindMaps: 0,
      rings: [],
    },
    tasksCompleted: {
      buckets: [],
      totalCompleted: 0,
    },
    community: {
      totals: {
        messagesPosted: 0,
        textMessages: 0,
        materialMessages: 0,
        materialShares: 0,
        channelJoins: 0,
        sharesByMaterialType: { quiz: 0, flashcard_set: 0, summary: 0, mind_map: 0 },
      },
      buckets: [],
    },
    labels: {
      sectionSuffix: suffix,
      studyTitle: `${labels.reportStudyWithMishka} (${suffix})`,
      aiTitle: `${labels.reportAiTools} (${suffix})`,
      streakTitle: `${labels.reportDailyStreak} (${suffix})`,
      tasksTitle: `${labels.reportTasksDue} (${suffix})`,
      communityTitle: `${labels.reportCommunityActivity} (${suffix})`,
    },
  };
}

/**
 * Single response for Your Report screen (all sections, zeros allowed).
 * @param {string} userId
 * @param {{ period: string; anchorDate: string; locale?: string; includeCommunity?: boolean }} opts
 */
async function buildYourReportBundle(userId, opts) {
  const locale = opts.locale === "ar" ? "ar" : "en";
  const period = opts.period;
  const window = resolvePeriodWindow(period, opts.anchorDate);
  const includeCommunity = opts.includeCommunity !== false;

  let payload;
  try {
    payload = await buildYourReportPayload(userId, { period, anchorDate: opts.anchorDate, locale });
  } catch (e) {
    if (!(e instanceof HttpError) || e.code !== "REPORT_NO_DATA") throw e;
    payload = emptyReportSections(period, window, locale);
  }

  const studyTotals = await studyTotalsForPeriod(userId, period, window, opts.anchorDate);

  let community = emptyReportSections(period, window, locale).community;
  if (includeCommunity) {
    try {
      community = await buildCommunityActivityReport(userId, period, opts.anchorDate, locale);
    } catch {
      /* keep zeros */
    }
  }

  const taskBuckets = (payload.tasksCompleted?.buckets ?? []).map((b) => ({
    label: b.label,
    completedCount: Math.round(b.value ?? 0),
  }));

  const totalCompleted = taskBuckets.reduce((s, b) => s + b.completedCount, 0);

  return {
    periodLabel: payload.periodLabel,
    period: payload.period,
    rangeStart: payload.rangeStart,
    rangeEnd: payload.rangeEnd,
    locale: payload.locale,
    study: {
      buckets: payload.study.buckets.map((b) => ({
        label: b.label,
        value: b.value,
        studyMinutes: b.value,
      })),
      totals: studyTotals,
    },
    aiTools: {
      quizzes: payload.aiTools.quizzes,
      flashcards: payload.aiTools.flashcards,
      summaries: payload.aiTools.summaries,
      mindMaps: payload.aiTools.mindMaps,
      rings: payload.aiTools.rings,
    },
    streak: payload.streak,
    tasksCompleted: {
      buckets: taskBuckets,
      totalCompleted,
    },
    community: {
      periodLabel: community.periodLabel,
      totals: community.totals,
      buckets: community.buckets,
    },
  };
}

module.exports = { buildYourReportBundle, emptyReportSections };
