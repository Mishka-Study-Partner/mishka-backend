const prisma = require("../utils/prisma");
const { badRequest } = require("../utils/httpError");

const MAX_COMBINED_BATCH =
  Number.parseInt(process.env.USAGE_MAX_BATCH_ITEMS || "100", 10) || 100;
const MAX_SEGMENT_SECONDS =
  Number.parseInt(process.env.USAGE_MAX_SEGMENT_SECONDS || String(8 * 3600), 10) || 8 * 3600;
const MAX_HEARTBEAT_SECONDS =
  Number.parseInt(process.env.USAGE_MAX_HEARTBEAT_SECONDS || "180", 10) || 180;
const MAX_DAY_SECONDS =
  Number.parseInt(process.env.USAGE_MAX_DAY_SECONDS_PER_USER || String(20 * 3600), 10) || 20 * 3600;
const MAX_SUMMARY_RANGE_DAYS =
  Number.parseInt(process.env.USAGE_MAX_SUMMARY_RANGE_DAYS || "366", 10) || 366;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function utcDateFromParts(y, m0, d) {
  return new Date(Date.UTC(y, m0, d));
}

function parseIsoDateUtc(s) {
  if (!ISO_DATE.test(s)) return null;
  const [y, mo, d] = s.split("-").map((x) => parseInt(x, 10));
  const dt = utcDateFromParts(y, mo - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatIsoDateUtc(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** UTC calendar date containing this instant (for heartbeat `day`). */
function utcDayContainingInstant(dt) {
  return utcDateFromParts(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

/** Rollup bucket for a closed segment: UTC date of `endedAt`. */
function utcDayForSegmentEnd(endedAt) {
  return utcDayContainingInstant(endedAt);
}

function parseInstant(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 */
async function bumpRollup(tx, userId, date, featureKey, seconds) {
  await tx.userUsageDailyRollup.upsert({
    where: {
      userId_date_featureKey: {
        userId,
        date,
        featureKey,
      },
    },
    create: {
      userId,
      date,
      featureKey,
      totalSeconds: seconds,
    },
    update: {
      totalSeconds: { increment: seconds },
    },
  });
}

/**
 * Sum rollups per UTC day for user in range; returns map dateStr -> total.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 */
async function rollupTotalsByDay(tx, userId, fromDate, toDate) {
  const rows = await tx.userUsageDailyRollup.findMany({
    where: {
      userId,
      date: { gte: fromDate, lte: toDate },
    },
    select: { date: true, totalSeconds: true },
  });
  /** @type {Map<string, number>} */
  const byDay = new Map();
  for (const r of rows) {
    const k = formatIsoDateUtc(r.date);
    byDay.set(k, (byDay.get(k) || 0) + r.totalSeconds);
  }
  return byDay;
}

/**
 * @param {string} userId
 * @param {{ segments?: Array<Record<string, unknown>>, heartbeats?: Array<Record<string, unknown>> }} body
 */
async function ingestBatch(userId, body) {
  const segments = Array.isArray(body.segments) ? body.segments : [];
  const heartbeats = Array.isArray(body.heartbeats) ? body.heartbeats : [];
  const combined = segments.length + heartbeats.length;
  if (combined === 0) {
    throw badRequest("Provide at least one segment or heartbeat", undefined, "VALIDATION_ERROR");
  }
  if (combined > MAX_COMBINED_BATCH) {
    throw badRequest(`At most ${MAX_COMBINED_BATCH} items per request`, undefined, "VALIDATION_ERROR");
  }

  /** @type {Map<string, number>} */
  const pendingDayDeltas = new Map();

  const normalizedSegments = [];
  for (const s of segments) {
    const startedAt = parseInstant(String(s.startedAt));
    const endedAt = parseInstant(String(s.endedAt));
    if (!startedAt || !endedAt || endedAt <= startedAt) {
      throw badRequest("Each segment needs valid startedAt and endedAt (ended after start)", undefined, "VALIDATION_ERROR");
    }
    let sec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    if (sec < 1) sec = 1;
    if (sec > MAX_SEGMENT_SECONDS) {
      throw badRequest(`Segment duration exceeds ${MAX_SEGMENT_SECONDS}s`, undefined, "VALIDATION_ERROR");
    }
    const dayUtc = utcDayForSegmentEnd(endedAt);
    const key = formatIsoDateUtc(dayUtc);
    pendingDayDeltas.set(key, (pendingDayDeltas.get(key) || 0) + sec);
    normalizedSegments.push({
      featureKey: String(s.featureKey),
      dayUtc,
      startedAt,
      endedAt,
      seconds: sec,
      chatSessionId: s.chatSessionId ? String(s.chatSessionId) : null,
      clientRequestId: String(s.clientRequestId),
    });
  }

  const normalizedHeartbeats = [];
  for (const h of heartbeats) {
    const sec = Number(h.seconds);
    if (!Number.isInteger(sec) || sec < 1 || sec > MAX_HEARTBEAT_SECONDS) {
      throw badRequest(`Heartbeat seconds must be 1–${MAX_HEARTBEAT_SECONDS}`, undefined, "VALIDATION_ERROR");
    }
    const day = parseIsoDateUtc(String(h.day));
    if (!day) {
      throw badRequest("Heartbeat day must be YYYY-MM-DD", undefined, "VALIDATION_ERROR");
    }
    const key = formatIsoDateUtc(day);
    pendingDayDeltas.set(key, (pendingDayDeltas.get(key) || 0) + sec);
    normalizedHeartbeats.push({
      featureKey: String(h.featureKey),
      dayUtc: day,
      seconds: sec,
      clientRequestId: String(h.clientRequestId),
    });
  }

  return prisma.$transaction(async (tx) => {
    for (const [dayStr, incoming] of pendingDayDeltas) {
      const dayDate = parseIsoDateUtc(dayStr);
      if (!dayDate) continue;
      const existingMap = await rollupTotalsByDay(tx, userId, dayDate, dayDate);
      const already = existingMap.get(dayStr) || 0;
      if (already + incoming > MAX_DAY_SECONDS) {
        throw badRequest(
          `Daily usage cap exceeded for ${dayStr} (max ${MAX_DAY_SECONDS}s per UTC day)`,
          undefined,
          "USAGE_DAY_CAP_EXCEEDED"
        );
      }
    }

    let accepted = 0;
    let skippedDuplicates = 0;

    for (const s of normalizedSegments) {
      const dup = await tx.userUsageLedger.findUnique({
        where: { userId_clientRequestId: { userId, clientRequestId: s.clientRequestId } },
      });
      if (dup) {
        skippedDuplicates += 1;
        continue;
      }
      await tx.userUsageLedger.create({
        data: {
          userId,
          kind: "segment",
          featureKey: s.featureKey,
          dayUtc: s.dayUtc,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          seconds: s.seconds,
          chatSessionId: s.chatSessionId,
          clientRequestId: s.clientRequestId,
        },
      });
      await bumpRollup(tx, userId, s.dayUtc, s.featureKey, s.seconds);
      accepted += 1;
    }

    for (const h of normalizedHeartbeats) {
      const dup = await tx.userUsageLedger.findUnique({
        where: { userId_clientRequestId: { userId, clientRequestId: h.clientRequestId } },
      });
      if (dup) {
        skippedDuplicates += 1;
        continue;
      }
      await tx.userUsageLedger.create({
        data: {
          userId,
          kind: "heartbeat",
          featureKey: h.featureKey,
          dayUtc: h.dayUtc,
          startedAt: null,
          endedAt: null,
          seconds: h.seconds,
          chatSessionId: null,
          clientRequestId: h.clientRequestId,
        },
      });
      await bumpRollup(tx, userId, h.dayUtc, h.featureKey, h.seconds);
      accepted += 1;
    }

    return { accepted, skippedDuplicates };
  });
}

/**
 * @param {string} userId
 * @param {string} fromIso
 * @param {string} toIso
 */
async function getSummary(userId, fromIso, toIso) {
  const fromDate = parseIsoDateUtc(fromIso);
  const toDate = parseIsoDateUtc(toIso);
  if (!fromDate || !toDate) {
    throw badRequest("from and to must be YYYY-MM-DD (UTC)", undefined, "VALIDATION_ERROR");
  }
  if (fromDate > toDate) {
    throw badRequest("from must be on or before to", undefined, "VALIDATION_ERROR");
  }
  const spanMs = toDate.getTime() - fromDate.getTime();
  const spanDays = spanMs / (86400 * 1000) + 1;
  if (spanDays > MAX_SUMMARY_RANGE_DAYS) {
    throw badRequest(`Date range must be at most ${MAX_SUMMARY_RANGE_DAYS} days`, undefined, "VALIDATION_ERROR");
  }

  const rows = await prisma.userUsageDailyRollup.findMany({
    where: {
      userId,
      date: { gte: fromDate, lte: toDate },
    },
    orderBy: [{ date: "asc" }, { featureKey: "asc" }],
  });

  /** @type {Map<string, { totalSeconds: number, byFeature: Record<string, number> }>} */
  const dayMap = new Map();
  /** @type {Record<string, number>} */
  const byFeatureRange = {};
  let rangeTotalSeconds = 0;

  for (const r of rows) {
    const dayKey = formatIsoDateUtc(r.date);
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { totalSeconds: 0, byFeature: {} });
    }
    const entry = dayMap.get(dayKey);
    entry.totalSeconds += r.totalSeconds;
    entry.byFeature[r.featureKey] = (entry.byFeature[r.featureKey] || 0) + r.totalSeconds;
    rangeTotalSeconds += r.totalSeconds;
    byFeatureRange[r.featureKey] = (byFeatureRange[r.featureKey] || 0) + r.totalSeconds;
  }

  const days = [];
  for (let d = new Date(fromDate.getTime()); d.getTime() <= toDate.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    const key = formatIsoDateUtc(d);
    const built = dayMap.get(key);
    days.push({
      date: key,
      totalSeconds: built?.totalSeconds ?? 0,
      byFeature: built?.byFeature ?? {},
    });
  }

  return {
    from: fromIso,
    to: toIso,
    days,
    rangeTotalSeconds,
    byFeatureRange,
  };
}

module.exports = {
  ingestBatch,
  getSummary,
  MAX_COMBINED_BATCH,
  MAX_SEGMENT_SECONDS,
  MAX_HEARTBEAT_SECONDS,
  MAX_DAY_SECONDS,
};
