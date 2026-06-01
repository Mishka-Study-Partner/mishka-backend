const prisma = require("../utils/prisma");
const { resolvePeriodWindow, formatPeriodLabel } = require("./yourReport/yourReportPeriod");
const { labelsFor, weekdayLabels, MONTHS_EN, MONTHS_AR } = require("./yourReport/yourReportLabels");

function rangeBounds(window) {
  const start = new Date(window.rangeStart);
  const end = new Date(window.rangeEnd);
  return { start, end };
}

function bucketLabelsForPeriod(period, window, locale) {
  const labels = labelsFor(locale);
  if (period === "weekly") return weekdayLabels(labels);
  if (period === "monthly") {
    const end = new Date(window.rangeEnd);
    const daysInMonth = new Date(end.getTime());
    daysInMonth.setUTCDate(daysInMonth.getUTCDate() - 1);
    const lastDay = daysInMonth.getUTCDate();
    return Array.from({ length: lastDay }, (_, i) => String(i + 1));
  }
  if (period === "yearly") {
    return locale === "ar" ? MONTHS_AR : MONTHS_EN;
  }
  return ["Today"];
}

function initActivityBuckets(labels) {
  return labels.map((label) => ({
    label,
    messagesPosted: 0,
    materialShares: 0,
  }));
}

function bucketIndexForDate(period, date, labels, window) {
  const d = new Date(date);
  if (period === "weekly") {
    const loc = labelsFor("en");
    const dayNames = weekdayLabels(loc);
    const dow = d.getUTCDay();
    const dayLabel = [loc.sun, loc.mon, loc.tue, loc.wed, loc.thu, loc.fri, loc.sat][dow];
    return labels.indexOf(dayLabel);
  }
  if (period === "monthly") {
    return d.getUTCDate() - 1;
  }
  if (period === "yearly") {
    return d.getUTCMonth();
  }
  return 0;
}

/**
 * @param {string} userId
 * @param {"daily"|"weekly"|"monthly"|"yearly"} period
 * @param {string} anchorDate YYYY-MM-DD
 * @param {string} [locale]
 */
async function buildCommunityActivityReport(userId, period, anchorDate, locale = "en") {
  const loc = locale === "ar" ? "ar" : "en";
  const window = resolvePeriodWindow(period, anchorDate);
  const { start, end } = rangeBounds(window);
  const labels = bucketLabelsForPeriod(period, window, loc);
  const buckets = initActivityBuckets(labels);

  const created = { gte: start, lt: end };

  const [messages, shares, channelJoins, sharesByType] = await Promise.all([
    prisma.communityChannelMessage.findMany({
      where: { userId, createdAt: created },
      select: { createdAt: true, inputType: true },
    }),
    prisma.materialShare.findMany({
      where: { userId, createdAt: created },
      select: { createdAt: true, materialType: true },
    }),
    prisma.userCommunityChannel.count({
      where: { userId, createdAt: created },
    }),
    prisma.materialShare.groupBy({
      by: ["materialType"],
      where: { userId, createdAt: created },
      _count: { _all: true },
    }),
  ]);

  const sharesByMaterialType = {
    quiz: 0,
    flashcard_set: 0,
    summary: 0,
    mind_map: 0,
  };
  for (const row of sharesByType) {
    if (row.materialType in sharesByMaterialType) {
      sharesByMaterialType[row.materialType] = row._count._all;
    }
  }

  let textMessages = 0;
  let materialMessages = 0;

  for (const m of messages) {
    if (m.inputType === "material") materialMessages += 1;
    else textMessages += 1;
    const idx = bucketIndexForDate(period, m.createdAt, labels, window);
    if (idx >= 0 && buckets[idx]) buckets[idx].messagesPosted += 1;
  }

  for (const s of shares) {
    const idx = bucketIndexForDate(period, s.createdAt, labels, window);
    if (idx >= 0 && buckets[idx]) buckets[idx].materialShares += 1;
  }

  const messagesPosted = messages.length;
  const materialShares = shares.length;

  return {
    period,
    periodLabel: formatPeriodLabel(period, window, loc),
    rangeStart: window.rangeStart,
    rangeEnd: window.rangeEnd,
    locale: loc,
    totals: {
      messagesPosted,
      textMessages,
      materialMessages,
      materialShares,
      channelJoins,
      sharesByMaterialType,
    },
    buckets,
  };
}

module.exports = { buildCommunityActivityReport };
