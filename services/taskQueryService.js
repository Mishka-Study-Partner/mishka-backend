const prisma = require("../utils/prisma");
const {
  getTaskDueInstantUtc,
  utcDayStartFromYmd,
  utcDayEndFromYmd,
  utcStartOfToday,
  utcEndOfDayPlusDays,
} = require("./taskDueUtils");

const ALLOWED_STATUS = new Set(["pending", "completed", "missed"]);
const JS_FILTER_FETCH_CAP = 2500;

function parseStatusCsv(raw) {
  if (!raw || typeof raw !== "string") return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (ALLOWED_STATUS.has(p)) out.push(p);
  }
  return out.length ? out : null;
}

function compareTasksByDue(a, b) {
  const ta = getTaskDueInstantUtc(a);
  const tb = getTaskDueInstantUtc(b);
  if (ta && tb) return ta.getTime() - tb.getTime();
  if (ta) return -1;
  if (tb) return 1;
  const da = a.dueDate ? a.dueDate.getTime() : Infinity;
  const db = b.dueDate ? b.dueDate.getTime() : Infinity;
  if (da !== db) return da - db;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

/**
 * List tasks for a single user with search + filters.
 * Dates are interpreted in **UTC** (calendar + time on `dueDate`/`dueTime` columns).
 *
 * Query semantics:
 * - `q` — case-insensitive substring on `title` or `description`
 * - `status` — comma list: `pending`, `completed`, `missed`
 * - `dueOn=YYYY-MM-DD` — calendar day (UTC)
 * - `dueDateFrom` / `dueDateTo` — inclusive bounds on **date** column
 * - `upcomingOnly=true` — **pending** only and due instant ≥ now (requires in-memory refine on time)
 * - `withinDays=N` — due instant between start of today UTC and end of (today+N) UTC
 * - `limit` / `offset` — pagination after filters
 *
 * @param {string | null} userId Owner filter; **`null`** = all users (admin **`GET /tasks`** only).
 * @param {Record<string, unknown>} filters validated `taskListQuerySchema` output
 */
async function listTasksForUser(userId, filters) {
  const {
    q,
    status: statusRaw,
    listId,
    dueDateFrom,
    dueDateTo,
    dueOn,
    upcomingOnly,
    withinDays,
    limit,
    offset,
  } = filters;

  const requestedStatuses = parseStatusCsv(statusRaw);
  const now = new Date();

  /** @type {import("@prisma/client").Prisma.TaskWhereInput} */
  const where = {};
  if (userId != null && userId !== "") where.userId = userId;

  if (listId) where.listId = listId;

  if (q && String(q).length) {
    where.AND = [
      {
        OR: [
          { title: { contains: String(q), mode: "insensitive" } },
          { description: { contains: String(q), mode: "insensitive" } },
        ],
      },
    ];
  }

  if (dueOn) {
    where.dueDate = {
      gte: utcDayStartFromYmd(dueOn),
      lte: utcDayEndFromYmd(dueOn),
    };
  } else if (dueDateFrom || dueDateTo) {
    where.dueDate = {};
    if (dueDateFrom) where.dueDate.gte = utcDayStartFromYmd(dueDateFrom);
    if (dueDateTo) where.dueDate.lte = utcDayEndFromYmd(dueDateTo);
  }

  let effectiveStatuses = requestedStatuses;
  if (upcomingOnly) {
    if (requestedStatuses?.length) {
      effectiveStatuses = requestedStatuses.includes("pending") ? ["pending"] : [];
    } else {
      effectiveStatuses = ["pending"];
    }
  }

  if (upcomingOnly && effectiveStatuses?.length === 0) {
    return [];
  }

  if (effectiveStatuses?.length) {
    where.status = { in: effectiveStatuses };
  }

  const needsInstantFilter = Boolean(upcomingOnly) || withinDays != null;

  if (!needsInstantFilter) {
    return prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { dueTime: "asc" }],
      skip: offset,
      take: limit,
    });
  }

  const coarseWhere = { ...where };
  const horizonDays = withinDays != null ? withinDays : 366;
  const horizonEnd = utcEndOfDayPlusDays(now, horizonDays);

  const earliest = new Date(now);
  earliest.setUTCDate(earliest.getUTCDate() - 1);
  earliest.setUTCHours(0, 0, 0, 0);

  let dueMerge = {};
  if (coarseWhere.dueDate && typeof coarseWhere.dueDate === "object") {
    Object.assign(dueMerge, coarseWhere.dueDate);
  }
  const gteBound = dueMerge.gte != null && dueMerge.gte > earliest ? dueMerge.gte : earliest;
  const lteBound = dueMerge.lte != null && dueMerge.lte < horizonEnd ? dueMerge.lte : horizonEnd;
  coarseWhere.dueDate = { gte: gteBound, lte: lteBound };

  let rows = await prisma.task.findMany({
    where: coarseWhere,
    orderBy: [{ dueDate: "asc" }, { dueTime: "asc" }],
    take: JS_FILTER_FETCH_CAP,
  });

  const startToday = utcStartOfToday(now);

  rows = rows.filter((task) => {
    const due = getTaskDueInstantUtc(task);
    if (!due) return false;

    if (upcomingOnly && due.getTime() < now.getTime()) return false;

    if (withinDays != null) {
      const endBound = utcEndOfDayPlusDays(now, withinDays);
      if (due.getTime() < startToday.getTime() || due.getTime() > endBound.getTime()) return false;
    }

    return true;
  });

  rows.sort(compareTasksByDue);
  return rows.slice(offset, offset + limit);
}

module.exports = {
  listTasksForUser,
  parseStatusCsv,
  ALLOWED_STATUS,
};
