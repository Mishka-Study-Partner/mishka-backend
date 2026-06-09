const prisma = require("../../utils/prisma");
const { HttpError } = require("../../utils/httpError");
const { getSummary, getHistory } = require("../dailyStreakService");
const { buildAiUsageReport } = require("../aiUsageReportService");
const { buildTaskCompletionsReport } = require("../taskCompletionsReportService");
const { labelsFor, sectionSuffix, weekdayLabels, MONTHS_EN, MONTHS_AR } = require("./yourReportLabels");
const { resolvePeriodWindow, formatPeriodLabel } = require("./yourReportPeriod");
const { buildStudyBuckets } = require("./yourReportStudyBuckets");
const { buildStudyBySubject } = require("./yourReportStudyBySubject");

const AI_GOALS = { daily: 1, weekly: 7, monthly: 28, yearly: 365 };

function aiPercent(count, period) {
  const goal = AI_GOALS[period] ?? 7;
  return Math.round(Math.min(100, Math.max(0, (count / goal) * 100)));
}

function mapStreakDay(d) {
  const frozen = d.status === "frozen" || d.state === "frozen";
  const done = d.state === "past_done" || d.state === "today_done" || frozen;
  return {
    date: d.date,
    state: d.state,
    status: d.status ?? undefined,
    isCompleted: done,
    isToday: d.state === "today_done" || d.state === "today_pending",
    isMissed: d.state === "past_missed",
    isFrozen: frozen,
  };
}

function buildTaskBuckets(period, taskReport, locale) {
  const labels = labelsFor(locale);
  if (!taskReport?.buckets?.length) return [];
  if (period === "weekly") {
    const order = weekdayLabels(labels);
    return order.map((label) => {
      const hit = taskReport.buckets.find((b) => b.label.endsWith(label) || b.label === label);
      const byDow = taskReport.buckets.find((b) => {
        const d = new Date(`${b.label}T12:00:00.000Z`);
        const dow = [labels.sun, labels.mon, labels.tue, labels.wed, labels.thu, labels.fri, labels.sat][
          d.getUTCDay()
        ];
        return dow === label;
      });
      return { label, value: (byDow || hit)?.completedCount ?? 0 };
    });
  }
  if (period === "monthly") {
    return taskReport.buckets.map((b) => ({
      label: String(new Date(`${b.label}T12:00:00.000Z`).getUTCDate()),
      value: b.completedCount,
    }));
  }
  if (period === "yearly") {
    const months = locale === "ar" ? MONTHS_AR : MONTHS_EN;
    const out = months.map((label) => ({ label, value: 0 }));
    for (const b of taskReport.buckets) {
      const d = new Date(`${b.label}T12:00:00.000Z`);
      const idx = d.getUTCMonth();
      if (out[idx]) out[idx].value += b.completedCount;
    }
    return out;
  }
  return taskReport.buckets.map((b) => ({ label: b.label, value: b.completedCount }));
}

function hasAnyData(payload) {
  const studySum = payload.study.buckets.reduce((a, b) => a + b.value, 0);
  const taskSum = payload.tasksCompleted.buckets.reduce((a, b) => a + b.value, 0);
  const aiSum = payload.aiTools.quizzes + payload.aiTools.flashcards + payload.aiTools.summaries;
  const streakActive = payload.streak.currentStreak > 0 || payload.streak.week.some((d) => d.isCompleted);
  return studySum > 0 || taskSum > 0 || aiSum > 0 || streakActive;
}

/**
 * @param {string} userId
 * @param {{ period: string; anchorDate: string; locale?: string }} opts
 */
async function buildYourReportPayload(userId, opts) {
  const locale = opts.locale === "ar" ? "ar" : "en";
  const period = opts.period;
  const window = resolvePeriodWindow(period, opts.anchorDate);
  const labels = labelsFor(locale);
  const suffix = sectionSuffix(period, labels);

  const streakHistoryPromise = getHistory(userId, window.from, window.to);
  const streakSummaryPromise =
    period === "weekly" && window.weekStart
      ? getSummary(userId, window.weekStart)
      : Promise.resolve(null);

  const [studyBuckets, studyBySubject, aiRaw, taskReport, streakSummary, streakHistory] = await Promise.all([
    buildStudyBuckets(userId, period, window, locale),
    buildStudyBySubject(userId, window.rangeStart, window.rangeEnd, locale),
    buildAiUsageReport(userId, window.from, window.to),
    buildTaskCompletionsReport(userId, window.from, window.to, "day"),
    streakSummaryPromise,
    streakHistoryPromise,
  ]);

  const streak = {
    currentStreak: streakHistory?.currentStreak ?? streakSummary?.currentStreak ?? 0,
    longestStreak: streakHistory?.longestStreak ?? streakSummary?.longestStreak ?? 0,
    freezesRemaining: streakHistory?.freezesRemaining ?? streakSummary?.freezesRemaining ?? 2,
    week:
      period === "weekly" && streakSummary?.week?.length === 7
        ? streakSummary.week.map(mapStreakDay)
        : [],
  };

  const quizzes = aiRaw?.quizzes ?? 0;
  const flashcards = aiRaw?.flashcards ?? 0;
  const summaries = aiRaw?.summaries ?? 0;
  const mindMaps = aiRaw?.mindMaps ?? 0;

  const payload = {
    period,
    periodLabel: formatPeriodLabel(period, window, locale),
    rangeStart: window.rangeStart,
    rangeEnd: window.rangeEnd,
    locale,
    labels: {
      ...labels,
      sectionSuffix: suffix,
      studyTitle: `${labels.reportStudyWithMishka} (${suffix})`,
      studyBySubjectTitle: `${labels.reportStudyBySubject} (${suffix})`,
      aiTitle: `${labels.reportAiTools} (${suffix})`,
      streakTitle: `${labels.reportDailyStreak} (${suffix})`,
      tasksTitle: `${labels.reportTasksDue} (${suffix})`,
    },
    streak,
    study: {
      subtitle: labels.reportDuringConcentrationMode,
      buckets: studyBuckets.map((b) => ({ label: b.label, value: Math.round(b.value * 10) / 10 })),
      bySubject: studyBySubject,
    },
    aiTools: {
      quizzes,
      flashcards,
      summaries,
      mindMaps,
      rings: [
        {
          key: "quizzes",
          count: quizzes,
          percent: aiPercent(quizzes, period),
          label: labels.reportTotalQuizzes,
        },
        {
          key: "flashcards",
          count: flashcards,
          percent: aiPercent(flashcards, period),
          label: labels.reportTotalFlashcards,
        },
        {
          key: "summaries",
          count: summaries,
          percent: aiPercent(summaries, period),
          label: labels.reportTotalSummaries,
        },
      ],
    },
    tasksCompleted: {
      buckets: buildTaskBuckets(period, taskReport, locale),
    },
  };

  if (!hasAnyData(payload)) {
    throw new HttpError(422, "No report data for this period", undefined, "REPORT_NO_DATA");
  }

  return payload;
}

module.exports = { buildYourReportPayload, hasAnyData };
