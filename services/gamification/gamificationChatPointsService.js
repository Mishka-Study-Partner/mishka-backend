const prisma = require("../../utils/prisma");
const { insertBadgeEvent } = require("./gamificationBadgeService");
const { saturdayUtcOfWeekContaining, periodMonthFromDate } = require("../../utils/gamificationWeek");

/**
 * Award +1 chat point for a user tutor message; auto badge every 10 points.
 * @param {string} userId
 * @param {string} messageId
 * @param {Date} [at]
 */
async function recordChatPointForMessage(userId, messageId, at = new Date()) {
  let total;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.userChatPointEvent.create({
        data: { userId, messageId, points: 1 },
      });
      const row = await tx.userChatPoints.upsert({
        where: { userId },
        create: { userId, totalPoints: 1 },
        update: { totalPoints: { increment: 1 } },
      });
      total = row.totalPoints;
    });
  } catch (err) {
    if (err?.code === "P2002") return null;
    throw err;
  }

  const badgeIndex = Math.floor(total / 10);
  if (total > 0 && total % 10 === 0) {
    const weekStart = saturdayUtcOfWeekContaining(at);
    const monthStart = periodMonthFromDate(at);
    await insertBadgeEvent({
      userId,
      badgeCode: "chat_points",
      sourceType: "chat",
      sourceId: String(badgeIndex),
      metadata: { chatPointsTotal: total, badgeIndex },
      periodWeek: weekStart,
      periodMonth: monthStart,
      idempotencyKey: `chat:${userId}:badge:${badgeIndex}`,
    });
  }

  return { totalPoints: total };
}

async function countChatPointsInRange(userId, rangeStart, rangeEndExclusive) {
  const agg = await prisma.userChatPointEvent.aggregate({
    where: {
      userId,
      createdAt: { gte: rangeStart, lt: rangeEndExclusive },
    },
    _sum: { points: true },
  });
  return agg._sum.points ?? 0;
}

module.exports = { recordChatPointForMessage, countChatPointsInRange };
