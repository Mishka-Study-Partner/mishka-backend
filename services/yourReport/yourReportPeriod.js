const { badRequest } = require("../../utils/httpError");
const {
  parseUtcDateParam,
  utcDayRange,
  utcWeekRangeContaining,
  utcMonthRange,
  formatIsoDateUtc,
} = require("../dailyStreakService");
const { labelsFor, MONTHS_EN, MONTHS_AR } = require("./yourReportLabels");

const EXPORT_PERIODS = new Set(["weekly", "monthly", "yearly"]);

function parseAnchorDate(anchorDate) {
  const d = parseUtcDateParam(anchorDate);
  if (!d) throw badRequest("anchorDate must be YYYY-MM-DD", undefined, "VALIDATION_ERROR");
  return d;
}

/**
 * @param {"weekly"|"monthly"|"yearly"|"daily"} period
 * @param {string} anchorDate YYYY-MM-DD
 */
function resolvePeriodWindow(period, anchorDate) {
  if (period === "weekly") {
    const range = utcWeekRangeContaining(anchorDate);
    if (!range) throw badRequest("Invalid anchorDate", undefined, "VALIDATION_ERROR");
    const last = new Date(range.end);
    last.setUTCDate(last.getUTCDate() - 1);
    return {
      period,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      from: range.weekMondayDate,
      to: formatIsoDateUtc(last),
      weekStart: range.weekMondayDate,
      year: range.start.getUTCFullYear(),
      month: range.start.getUTCMonth() + 1,
    };
  }
  if (period === "monthly") {
    const anchor = parseAnchorDate(anchorDate);
    const y = anchor.getUTCFullYear();
    const m = anchor.getUTCMonth() + 1;
    const range = utcMonthRange(y, m);
    if (!range) throw badRequest("Invalid anchorDate", undefined, "VALIDATION_ERROR");
    const last = new Date(range.end);
    last.setUTCDate(last.getUTCDate() - 1);
    return {
      period,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      from: formatIsoDateUtc(range.start),
      to: formatIsoDateUtc(last),
      weekStart: null,
      year: y,
      month: m,
    };
  }
  if (period === "yearly") {
    const anchor = parseAnchorDate(anchorDate);
    const y = anchor.getUTCFullYear();
    const start = new Date(Date.UTC(y, 0, 1));
    const end = new Date(Date.UTC(y + 1, 0, 1));
    return {
      period,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      from: `${y}-01-01`,
      to: `${y}-12-31`,
      weekStart: null,
      year: y,
      month: null,
    };
  }
  const range = utcDayRange(anchorDate);
  if (!range) throw badRequest("Invalid anchorDate", undefined, "VALIDATION_ERROR");
  return {
    period: "daily",
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
    from: anchorDate,
    to: anchorDate,
    weekStart: null,
    year: range.start.getUTCFullYear(),
    month: range.start.getUTCMonth() + 1,
  };
}

function formatPeriodLabel(period, window, locale) {
  const months = locale === "ar" ? MONTHS_AR : MONTHS_EN;
  const fmt = (d) => {
    const dt = parseUtcDateParam(d);
    if (!dt) return d;
    if (locale === "ar") {
      return `${dt.getUTCDate()} ${months[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
    }
    const m = months[dt.getUTCMonth()];
    return `${m} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
  };
  if (period === "weekly") {
    return `${fmt(window.from)} – ${fmt(window.to)}`;
  }
  if (period === "monthly") {
    return locale === "ar"
      ? `${months[window.month - 1]} ${window.year}`
      : `${months[window.month - 1]} ${window.year}`;
  }
  if (period === "yearly") {
    return String(window.year);
  }
  return fmt(window.from);
}

function assertExportPeriod(period) {
  if (period === "daily") {
    throw badRequest("Daily report export is not available", undefined, "VALIDATION_ERROR");
  }
  if (!EXPORT_PERIODS.has(period)) {
    throw badRequest("period must be weekly, monthly, or yearly", undefined, "VALIDATION_ERROR");
  }
}

module.exports = {
  EXPORT_PERIODS,
  resolvePeriodWindow,
  formatPeriodLabel,
  assertExportPeriod,
  parseAnchorDate,
};
