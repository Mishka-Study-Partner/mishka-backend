const prisma = require("../../utils/prisma");
const { reportForYear } = require("../studyPeriodReportService");
const { labelsFor, weekdayLabels, MONTHS_EN, MONTHS_AR } = require("./yourReportLabels");

function sessionSeconds(s) {
  return (
    s.approximateMainStudySeconds ??
    s.studySeconds ??
    s.mainStudySeconds ??
    0
  );
}

function sessionStartedAt(s) {
  const raw = s.startedAt ?? s.startUtc ?? s.createdAt;
  return raw instanceof Date ? raw : new Date(raw);
}

function initBuckets(labels, values = 0) {
  return labels.map((label) => ({ label, value: values }));
}

function addToBucket(buckets, label, minutes) {
  const b = buckets.find((x) => x.label === label);
  if (b) b.value += minutes;
}

async function loadSessions(userId, rangeStart, rangeEnd) {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  const rows = await prisma.studyConcentrationSession.findMany({
    where: { userId, startedAt: { gte: start, lt: end } },
    select: {
      startedAt: true,
      approximateMainStudySeconds: true,
      totalPausedSeconds: true,
      totalCallBreakSeconds: true,
      endedAt: true,
      status: true,
    },
    orderBy: { startedAt: "asc" },
  });
  const refDate = end > new Date() ? new Date() : end;
  const { approximateMainStudySecondsAt } = require("../studyReportAnalytics");
  return rows.map((s) => ({
    ...s,
    approximateMainStudySeconds: approximateMainStudySecondsAt(s, refDate),
  }));
}

/**
 * @param {"weekly"|"monthly"|"yearly"|"daily"} period
 */
async function buildStudyBuckets(userId, period, window, locale) {
  const labels = labelsFor(locale);
  const sessions = await loadSessions(userId, window.rangeStart, window.rangeEnd);

  if (period === "weekly") {
    const days = weekdayLabels(labels);
    const buckets = initBuckets(days, 0);
    for (const s of sessions) {
      const d = sessionStartedAt(s);
      const dayLabel = [labels.sun, labels.mon, labels.tue, labels.wed, labels.thu, labels.fri, labels.sat][
        d.getUTCDay()
      ];
      addToBucket(buckets, dayLabel, sessionSeconds(s) / 60);
    }
    return buckets;
  }

  if (period === "monthly") {
    const buckets = initBuckets(["W1", "W2", "W3", "W4", "W5"], 0);
    for (const s of sessions) {
      const d = sessionStartedAt(s);
      const w = Math.min(5, Math.ceil(d.getUTCDate() / 7));
      addToBucket(buckets, `W${w}`, sessionSeconds(s) / 60);
    }
    return buckets;
  }

  if (period === "yearly") {
    const months = locale === "ar" ? MONTHS_AR : MONTHS_EN;
    const yearReport = await reportForYear(userId, window.year, { explicitAll: true });
    return (yearReport?.monthlyBuckets ?? []).map((mb, i) => ({
      label: months[i] ?? mb.label,
      value: Math.round((mb.totals?.sumApproximateMainStudySeconds ?? 0) / 60),
    }));
  }

  const hourBuckets = initBuckets(["6-10", "10-14", "14-18", "18-22", "22-6"], 0);
  for (const s of sessions) {
    const h = sessionStartedAt(s).getUTCHours();
    let label = "22-6";
    if (h >= 6 && h < 10) label = "6-10";
    else if (h >= 10 && h < 14) label = "10-14";
    else if (h >= 14 && h < 18) label = "14-18";
    else if (h >= 18 && h < 22) label = "18-22";
    addToBucket(hourBuckets, label, sessionSeconds(s) / 60);
  }
  return hourBuckets;
}

module.exports = { buildStudyBuckets, sessionSeconds };
