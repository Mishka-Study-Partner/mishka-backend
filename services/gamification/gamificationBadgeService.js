const prisma = require("../../utils/prisma");
const { badRequest, notFound, forbidden } = require("../../utils/httpError");
const {
  COLLECT_BADGE_CODES,
  quizBadgeCodeFromScore,
} = require("./gamificationConstants");
const { formatIsoDateUtc, periodMonthFromDate } = require("../../utils/gamificationWeek");

async function countBadgeEvents(userId, badgeCode, { periodWeek, periodMonth } = {}) {
  const where = { userId, badgeCode };
  if (periodWeek) where.periodWeek = periodWeek;
  if (periodMonth) where.periodMonth = periodMonth;
  return prisma.userBadgeEvent.count({ where });
}

async function countBadgesEarnedInMonth(userId, badgeCode, monthStartDate) {
  return countBadgeEvents(userId, badgeCode, { periodMonth: monthStartDate });
}

async function getCollectTotals(userId, badgeCode, weekStartDate, monthStartDate) {
  const [timesEarnedThisWeek, timesEarnedThisMonth] = await Promise.all([
    countBadgeEvents(userId, badgeCode, { periodWeek: weekStartDate }),
    countBadgeEvents(userId, badgeCode, { periodMonth: monthStartDate }),
  ]);
  return { timesEarnedThisWeek, timesEarnedThisMonth };
}

async function verifyCollectSource(userId, sourceType, sourceId, badgeCode, metadata) {
  if (sourceType === "quiz") {
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: sourceId, userId },
    });
    if (!attempt) throw notFound("Quiz attempt not found", "NOT_FOUND");
    const expected = quizBadgeCodeFromScore(attempt.correctCount, attempt.totalQuestions);
    if (expected !== badgeCode) {
      throw badRequest(
        `badgeCode ${badgeCode} does not match attempt score (expected ${expected})`,
        undefined,
        "VALIDATION_ERROR"
      );
    }
    return {
      metadata: {
        correctCount: attempt.correctCount,
        totalCount: attempt.totalQuestions,
        scoreOutOfTen: attempt.scoreOutOfTen,
      },
    };
  }

  if (sourceType === "flashcards") {
    const set = await prisma.flashcardSet.findFirst({ where: { id: sourceId, userId } });
    if (!set) throw notFound("Flashcard set not found", "NOT_FOUND");
    if (badgeCode !== "flashcards_complete") {
      throw badRequest("Invalid badge for flashcards", undefined, "VALIDATION_ERROR");
    }
    return { metadata: metadata ?? {} };
  }

  if (sourceType === "summary") {
    const row = await prisma.summary.findFirst({ where: { id: sourceId, userId } });
    if (!row) throw notFound("Summary not found", "NOT_FOUND");
    if (badgeCode !== "summary_complete") {
      throw badRequest("Invalid badge for summary", undefined, "VALIDATION_ERROR");
    }
    return { metadata: metadata ?? {} };
  }

  if (sourceType === "mindmap") {
    const row = await prisma.mindMap.findFirst({ where: { id: sourceId, userId } });
    if (!row) throw notFound("Mind map not found", "NOT_FOUND");
    if (badgeCode !== "mindmap_complete") {
      throw badRequest("Invalid badge for mind map", undefined, "VALIDATION_ERROR");
    }
    return { metadata: metadata ?? {} };
  }

  throw badRequest("Unsupported sourceType for collect", undefined, "VALIDATION_ERROR");
}

/**
 * Insert badge event; returns { created, event }.
 */
async function insertBadgeEvent(opts) {
  const {
    userId,
    badgeCode,
    sourceType,
    sourceId,
    metadata,
    periodWeek,
    periodMonth,
    idempotencyKey,
  } = opts;

  try {
    const event = await prisma.userBadgeEvent.create({
      data: {
        userId,
        badgeCode,
        sourceType,
        sourceId: sourceId ?? null,
        metadata: metadata ?? undefined,
        periodWeek,
        periodMonth,
        idempotencyKey,
      },
    });
    return { created: true, event };
  } catch (err) {
    if (err?.code === "P2002") {
      const existing = await prisma.userBadgeEvent.findUnique({
        where: { idempotencyKey },
      });
      if (existing && existing.userId !== userId) throw forbidden("Idempotency key conflict", "FORBIDDEN");
      return { created: false, event: existing };
    }
    throw err;
  }
}

async function collectBadge(userId, body) {
  const { badgeCode, sourceType, sourceId, idempotencyKey, metadata } = body;

  if (!COLLECT_BADGE_CODES.has(badgeCode)) {
    throw badRequest("Unknown or non-collectible badgeCode", undefined, "VALIDATION_ERROR");
  }

  if (badgeCode.startsWith("quiz_") && sourceType === "quiz") {
    const meta = metadata ?? {};
    if (meta.correctCount != null && meta.totalCount != null) {
      const expected = quizBadgeCodeFromScore(meta.correctCount, meta.totalCount);
      if (expected !== badgeCode) {
        throw badRequest(
          `badgeCode ${badgeCode} does not match metadata score (expected ${expected})`,
          undefined,
          "VALIDATION_ERROR"
        );
      }
    }
  }

  const verified = await verifyCollectSource(userId, sourceType, sourceId, badgeCode, metadata);
  const now = new Date();
  const { saturdayUtcOfWeekContaining } = require("../../utils/gamificationWeek");
  const weekStart = saturdayUtcOfWeekContaining(now);
  const monthStart = periodMonthFromDate(now);

  const { created, event } = await insertBadgeEvent({
    userId,
    badgeCode,
    sourceType,
    sourceId,
    metadata: verified.metadata,
    periodWeek: weekStart,
    periodMonth: monthStart,
    idempotencyKey,
  });

  const totals = await getCollectTotals(userId, badgeCode, weekStart, monthStart);

  return {
    success: true,
    created,
    badgeCode,
    eventId: event.id,
    ...totals,
  };
}

module.exports = {
  collectBadge,
  insertBadgeEvent,
  countBadgeEvents,
  countBadgesEarnedInMonth,
  getCollectTotals,
  quizBadgeCodeFromScore,
};
