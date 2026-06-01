const prisma = require("../utils/prisma");
const { formatIsoDateUtc, utcWeekRangeContaining } = require("./dailyStreakService");
const { runYourReportExportForUser } = require("./yourReport/yourReportExportService");
const { smtpConfigured } = require("../utils/reportEmail");

/**
 * Previous ISO week (Mon–Sun) ending before the current week.
 * @param {Date} now
 */
function previousWeekAnchor(now) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  d.setUTCDate(d.getUTCDate() - 7);
  const range = utcWeekRangeContaining(formatIsoDateUtc(d));
  const last = new Date(range.end);
  last.setUTCDate(last.getUTCDate() - 1);
  return {
    anchorDate: formatIsoDateUtc(last),
    periodKey: `week:${range.weekMondayDate}`,
  };
}

/**
 * Previous calendar month.
 * @param {Date} now
 */
function previousMonthAnchor(now) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const prev = m === 0 ? { year: y - 1, month: 12 } : { year: y, month: m };
  const lastDay = new Date(Date.UTC(prev.year, prev.month, 0));
  const anchor = formatIsoDateUtc(lastDay);
  const periodKey = `month:${prev.year}-${String(prev.month).padStart(2, "0")}`;
  return { anchorDate: anchor, periodKey };
}

function isMondayUtc(now) {
  return now.getUTCDay() === 1;
}

function isFirstOfMonthUtc(now) {
  return now.getUTCDate() === 1;
}

/**
 * @param {{ force?: "weekly"|"monthly"; dryRun?: boolean }} [opts]
 */
async function runScheduledReportEmails(opts = {}) {
  const now = new Date();
  const runWeekly = opts.force === "weekly" || (!opts.force && isMondayUtc(now));
  const runMonthly = opts.force === "monthly" || (!opts.force && isFirstOfMonthUtc(now));

  if (!runWeekly && !runMonthly) {
    return {
      skipped: true,
      reason: "Not a scheduled day (weekly=Monday UTC, monthly=1st UTC)",
      sent: 0,
      failed: 0,
    };
  }

  if (!smtpConfigured()) {
    return { skipped: true, reason: "SMTP not configured", sent: 0, failed: 0 };
  }

  const weeklyAnchor = runWeekly ? previousWeekAnchor(now) : null;
  const monthlyAnchor = runMonthly ? previousMonthAnchor(now) : null;

  const prefs = await prisma.userPreference.findMany({
    where: {
      reportEmailAutoEnabled: true,
      reportEmailFrequency: { not: null },
    },
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  const results = [];
  let sent = 0;
  let failed = 0;

  for (const pref of prefs) {
    const freq = pref.reportEmailFrequency;
    if (freq === "weekly" && !runWeekly) continue;
    if (freq === "monthly" && !runMonthly) continue;

    const anchor = freq === "weekly" ? weeklyAnchor : monthlyAnchor;
    if (!anchor) continue;

    if (pref.reportEmailLastPeriodKey === anchor.periodKey) {
      results.push({ userId: pref.userId, status: "skipped", reason: "already_sent", periodKey: anchor.periodKey });
      continue;
    }

    if (!pref.user?.email || pref.user.email.includes("@internal.mishka")) {
      results.push({ userId: pref.userId, status: "skipped", reason: "no_mailable_email" });
      continue;
    }

    if (opts.dryRun) {
      results.push({
        userId: pref.userId,
        status: "dry_run",
        period: freq,
        anchorDate: anchor.anchorDate,
        periodKey: anchor.periodKey,
      });
      continue;
    }

    try {
      const out = await runYourReportExportForUser(pref.userId, {
        period: freq,
        anchorDate: anchor.anchorDate,
        locale: pref.reportEmailLocale === "ar" ? "ar" : "en",
        delivery: "email",
        periodKey: anchor.periodKey,
      });
      await prisma.userPreference.update({
        where: { userId: pref.userId },
        data: {
          reportEmailLastSentAt: new Date(),
          reportEmailLastPeriodKey: anchor.periodKey,
        },
      });
      sent += 1;
      results.push({
        userId: pref.userId,
        status: "sent",
        periodKey: anchor.periodKey,
        emailedTo: out.emailedTo,
        reportId: out.reportId,
      });
    } catch (err) {
      failed += 1;
      results.push({
        userId: pref.userId,
        status: "failed",
        error: err?.message || String(err),
        code: err?.code,
      });
      console.error("[scheduledReportEmail]", pref.userId, err?.message || err);
    }
  }

  return {
    skipped: false,
    runWeekly,
    runMonthly,
    weeklyPeriodKey: weeklyAnchor?.periodKey ?? null,
    monthlyPeriodKey: monthlyAnchor?.periodKey ?? null,
    candidates: prefs.length,
    sent,
    failed,
    dryRun: Boolean(opts.dryRun),
    results,
  };
}

module.exports = { runScheduledReportEmails, previousWeekAnchor, previousMonthAnchor };
