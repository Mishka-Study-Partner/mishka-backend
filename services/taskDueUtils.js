/**
 * Combine `dueDate` (@db.Date) + `dueTime` (@db.Time) into one UTC instant for comparisons.
 * If `dueTime` is null, uses 00:00:00 UTC on that calendar day.
 */
function getTaskDueInstantUtc(task) {
  if (!task.dueDate) return null;
  const y = task.dueDate.getUTCFullYear();
  const mo = task.dueDate.getUTCMonth();
  const d = task.dueDate.getUTCDate();
  let hh = 0;
  let mm = 0;
  let ss = 0;
  if (task.dueTime) {
    hh = task.dueTime.getUTCHours();
    mm = task.dueTime.getUTCMinutes();
    ss = task.dueTime.getUTCSeconds();
  }
  return new Date(Date.UTC(y, mo, d, hh, mm, ss));
}

function utcDayStartFromYmd(dateStr) {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0));
}

function utcDayEndFromYmd(dateStr) {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 23, 59, 59, 999));
}

/** Start of today 00:00:00 UTC (using `now` reference). */
function utcStartOfToday(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/** End of today 23:59:59.999 UTC. */
function utcEndOfToday(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
}

/** End of calendar day `today + addDays` UTC. */
function utcEndOfDayPlusDays(now, addDays) {
  const base = utcStartOfToday(now);
  base.setUTCDate(base.getUTCDate() + addDays);
  const y = base.getUTCFullYear();
  const mo = base.getUTCMonth();
  const d = base.getUTCDate();
  return new Date(Date.UTC(y, mo, d, 23, 59, 59, 999));
}

module.exports = {
  getTaskDueInstantUtc,
  utcDayStartFromYmd,
  utcDayEndFromYmd,
  utcStartOfToday,
  utcEndOfToday,
  utcEndOfDayPlusDays,
};
