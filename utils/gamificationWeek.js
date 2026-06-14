const {
  parseIsoDateUtc,
  formatIsoDateUtc,
  addUtcDays,
  utcTodayDate,
  utcDateCompare,
} = require("../services/dailyStreakService");

/** Saturday (UTC) of the week containing `anchor` (Sat–Fri gamification week). */
function saturdayUtcOfWeekContaining(anchor) {
  const d = parseIsoDateUtc(formatIsoDateUtc(anchor)) || anchor;
  const dow = d.getUTCDay();
  const delta = dow === 6 ? 0 : -(dow + 1);
  return addUtcDays(d, delta);
}

function firstDayOfMonthUtc(year, monthIndex0) {
  return new Date(Date.UTC(year, monthIndex0, 1));
}

function lastDayOfMonthUtc(year, monthIndex0) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0));
}

/** Parse YYYY-MM or YYYY-MM-DD (uses first of month when MM only). */
function parseMonthParam(monthStr) {
  if (!monthStr || typeof monthStr !== "string") return null;
  const m = monthStr.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  if (mo < 0 || mo > 11) return null;
  return { year: y, monthIndex: mo, monthStart: firstDayOfMonthUtc(y, mo), monthEnd: lastDayOfMonthUtc(y, mo) };
}

function weekRangeFromStart(weekStartDate) {
  const weekEnd = addUtcDays(weekStartDate, 6);
  const rangeEndExclusive = addUtcDays(weekEnd, 1);
  return { weekStart: weekStartDate, weekEnd, rangeEndExclusive };
}

function resolveGamificationWeek(weekStartIso) {
  const today = utcTodayDate();
  let weekStart = weekStartIso ? parseIsoDateUtc(weekStartIso) : saturdayUtcOfWeekContaining(today);
  if (!weekStart) return null;
  const dow = weekStart.getUTCDay();
  if (dow !== 6) return { error: "weekStart must be a Saturday (UTC)" };
  return weekRangeFromStart(weekStart);
}

/** Sat–Fri week rows overlapping a calendar month. */
function saturdayWeeksOverlappingMonth(monthStart, monthEnd) {
  let weekStart = saturdayUtcOfWeekContaining(monthStart);
  if (utcDateCompare(weekStart, monthStart) < 0) {
    weekStart = addUtcDays(weekStart, 7);
  }
  const weeks = [];
  let index = 1;
  while (utcDateCompare(weekStart, monthEnd) <= 0) {
    const weekEnd = addUtcDays(weekStart, 6);
    weeks.push({
      weekIndex: index,
      rangeStart: new Date(weekStart.getTime()),
      rangeEnd: weekEnd,
      rangeStartIso: formatIsoDateUtc(weekStart),
      rangeEndIso: formatIsoDateUtc(weekEnd),
    });
    weekStart = addUtcDays(weekStart, 7);
    index += 1;
  }
  return weeks;
}

/** Calendar grid Sat–Fri weeks that cover a month (includes outside_month padding days). */
function calendarGridForMonth(monthStart, monthEnd) {
  let gridStart = saturdayUtcOfWeekContaining(monthStart);
  const lastWeekSaturday = saturdayUtcOfWeekContaining(monthEnd);
  const gridEnd = addUtcDays(lastWeekSaturday, 6);
  const days = [];
  for (let d = new Date(gridStart.getTime()); utcDateCompare(d, gridEnd) <= 0; d = addUtcDays(d, 1)) {
    const iso = formatIsoDateUtc(d);
    let status = "opened";
    if (utcDateCompare(d, monthStart) < 0 || utcDateCompare(d, monthEnd) > 0) {
      status = "outside_month";
    }
    days.push({ date: iso, status });
  }
  return days;
}

function periodMonthFromDate(date) {
  return firstDayOfMonthUtc(date.getUTCFullYear(), date.getUTCMonth());
}

module.exports = {
  saturdayUtcOfWeekContaining,
  parseMonthParam,
  resolveGamificationWeek,
  weekRangeFromStart,
  saturdayWeeksOverlappingMonth,
  calendarGridForMonth,
  periodMonthFromDate,
  formatIsoDateUtc,
  addUtcDays,
  parseIsoDateUtc,
};
