const prisma = require("../utils/prisma");
const { badRequest } = require("../utils/httpError");

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** @returns {Date} UTC midnight for the given calendar components */
function utcDateFromParts(y, m0, d) {
  return new Date(Date.UTC(y, m0, d));
}

function utcTodayDate() {
  const n = new Date();
  return utcDateFromParts(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

/** @param {Date} d */
function addUtcDays(d, delta) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + delta);
  return utcDateFromParts(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

/** @param {Date} a @param {Date} b */
function utcDateCompare(a, b) {
  return a.getTime() - b.getTime();
}

/** @param {string} s YYYY-MM-DD */
function parseIsoDateUtc(s) {
  if (!ISO_DATE.test(s)) return null;
  const [y, mo, d] = s.split("-").map((x) => parseInt(x, 10));
  const dt = utcDateFromParts(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/** @param {Date} d */
function formatIsoDateUtc(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday (UTC) of the ISO week containing `anchor` */
function mondayUtcOfWeekContaining(anchor) {
  const d = utcDateFromParts(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
  const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
  const delta = dow === 0 ? -6 : 1 - dow;
  return addUtcDays(d, delta);
}

/**
 * Count consecutive UTC calendar days ending at `end`, walking backward,
 * where each day is `completed` or `frozen`. Stops at first gap or `missed`.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 */
async function computeCurrentStreakEnding(tx, userId, end) {
  let n = 0;
  let d = new Date(end.getTime());
  for (;;) {
    const row = await tx.userStreak.findUnique({
      where: { userId_date: { userId, date: d } },
    });
    if (row?.status === "completed" || row?.status === "frozen") {
      n += 1;
      d = addUtcDays(d, -1);
      continue;
    }
    if (row?.status === "missed") break;
    if (utcDateCompare(d, end) < 0) break;
    break;
  }
  return n;
}

/**
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 */
async function syncMeta(tx, userId) {
  const today = utcTodayDate();
  const current = await computeCurrentStreakEnding(tx, userId, today);
  const existing = await tx.userDailyStreakMeta.findUnique({ where: { userId } });
  const longest = Math.max(existing?.longestStreak ?? 0, current);
  await tx.userDailyStreakMeta.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: current,
      longestStreak: longest,
      freezesRemaining: 2,
    },
    update: {
      currentStreak: current,
      longestStreak: longest,
    },
  });
  return { currentStreak: current, longestStreak: longest, freezesRemaining: existing?.freezesRemaining ?? 2 };
}

/**
 * Call after any qualifying user action (or explicit ping). Idempotent per UTC day.
 * @param {string} userId
 */
async function recordDailyStreakActivity(userId) {
  if (!userId || typeof userId !== "string") return null;
  const today = utcTodayDate();
  return prisma.$transaction(async (tx) => {
    await tx.userStreak.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, status: "completed" },
      update: { status: "completed" },
    });
    return syncMeta(tx, userId);
  });
}

/**
 * Spend one freeze on a UTC calendar day (typically a missed day). Max 2 lifetime per user in v1.
 * @param {string} userId
 * @param {string} dateIso YYYY-MM-DD
 */
async function useFreeze(userId, dateIso) {
  const target = parseIsoDateUtc(dateIso);
  if (!target) throw badRequest("date must be YYYY-MM-DD", undefined, "VALIDATION_ERROR");
  const today = utcTodayDate();
  if (utcDateCompare(target, today) > 0) {
    throw badRequest("Cannot freeze a future date", undefined, "VALIDATION_ERROR");
  }

  return prisma.$transaction(async (tx) => {
    const metaBefore = await tx.userDailyStreakMeta.findUnique({ where: { userId } });
    const remaining = metaBefore?.freezesRemaining ?? 2;
    if (remaining < 1) {
      throw badRequest("No streak freezes remaining", undefined, "STREAK_FREEZE_EXHAUSTED");
    }

    const existing = await tx.userStreak.findUnique({
      where: { userId_date: { userId, date: target } },
    });
    if (existing?.status === "completed") {
      throw badRequest("That day is already completed", undefined, "VALIDATION_ERROR");
    }
    if (existing?.status === "frozen") {
      throw badRequest("That day is already frozen", undefined, "VALIDATION_ERROR");
    }

    await tx.userStreak.upsert({
      where: { userId_date: { userId, date: target } },
      create: { userId, date: target, status: "frozen" },
      update: { status: "frozen" },
    });

    const nextFreezes = remaining - 1;
    await tx.userDailyStreakMeta.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        freezesRemaining: nextFreezes,
      },
      update: { freezesRemaining: nextFreezes },
    });

    const out = await syncMeta(tx, userId);
    const afterMeta = await tx.userDailyStreakMeta.findUnique({ where: { userId } });
    return { ...out, freezesRemaining: afterMeta?.freezesRemaining ?? nextFreezes };
  });
}

/**
 * @param {string} userId
 * @param {string} [weekStartIso] Monday YYYY-MM-DD (UTC); defaults to current week
 */
async function getSummary(userId, weekStartIso) {
  const today = utcTodayDate();
  let weekStart = weekStartIso ? parseIsoDateUtc(weekStartIso) : mondayUtcOfWeekContaining(today);
  if (!weekStart) throw badRequest("weekStart must be YYYY-MM-DD", undefined, "VALIDATION_ERROR");
  const dow = weekStart.getUTCDay();
  if (dow !== 1) {
    throw badRequest("weekStart must be a Monday (UTC)", undefined, "VALIDATION_ERROR");
  }

  const weekEnd = addUtcDays(weekStart, 6);
  const [rows, meta] = await Promise.all([
    prisma.userStreak.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.userDailyStreakMeta.findUnique({ where: { userId } }),
  ]);

  const byDate = new Map(rows.map((r) => [formatIsoDateUtc(r.date), r]));

  const week = [];
  for (let i = 0; i < 7; i += 1) {
    const d = addUtcDays(weekStart, i);
    const key = formatIsoDateUtc(d);
    const row = byDate.get(key);
    let state;
    if (utcDateCompare(d, today) < 0) {
      if (row?.status === "completed" || row?.status === "frozen") state = "past_done";
      else state = "past_missed";
    } else if (utcDateCompare(d, today) === 0) {
      if (row?.status === "completed" || row?.status === "frozen") state = "today_done";
      else state = "today_pending";
    } else {
      state = "upcoming";
    }
    week.push({
      date: key,
      status: row?.status ?? null,
      state,
    });
  }

  const currentStreak = meta?.currentStreak ?? 0;
  const longestStreak = meta?.longestStreak ?? 0;
  const freezesRemaining = meta?.freezesRemaining ?? 2;

  return {
    today: formatIsoDateUtc(today),
    weekStart: formatIsoDateUtc(weekStart),
    currentStreak,
    longestStreak,
    freezesRemaining,
    week,
  };
}

module.exports = {
  recordDailyStreakActivity,
  useFreeze,
  getSummary,
  utcTodayDate,
  formatIsoDateUtc,
  mondayUtcOfWeekContaining,
};
