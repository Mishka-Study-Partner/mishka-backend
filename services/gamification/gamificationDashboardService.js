const prisma = require("../../utils/prisma");
const { badRequest } = require("../../utils/httpError");
const { getSummary } = require("../dailyStreakService");
const { ensureAutoWeeklyBadges } = require("./gamificationAutoAwardService");
const { countBadgeEvents } = require("./gamificationBadgeService");
const { countChatPointsInRange } = require("./gamificationChatPointsService");
const { AI_HUB_BADGES } = require("./gamificationConstants");
const {
  resolveGamificationWeek,
  formatIsoDateUtc,
  periodMonthFromDate,
} = require("../../utils/gamificationWeek");

async function buildAiToolBadgesWeekly(userId, weekStart, rangeEndExclusive) {
  const counts = await Promise.all(
    AI_HUB_BADGES.map(async ({ code, assetKey }) => {
      const timesEarnedThisWeek = await countBadgeEvents(userId, code, { periodWeek: weekStart });
      const item = { code, assetKey, timesEarnedThisWeek };
      if (code === "chat_points") {
        item.chatPointsThisWeek = await countChatPointsInRange(userId, weekStart, rangeEndExclusive);
      }
      return item;
    })
  );
  return counts;
}

async function buildDashboard(userId, query = {}) {
  const weekStartIso = typeof query.weekStart === "string" ? query.weekStart : undefined;
  const resolved = resolveGamificationWeek(weekStartIso);
  if (!resolved || resolved.error) {
    throw badRequest(resolved?.error || "Invalid weekStart", undefined, "VALIDATION_ERROR");
  }
  if (resolved.weekStart.getUTCDay() !== 6) {
    throw badRequest("weekStart must be a Saturday (UTC) for gamification", undefined, "VALIDATION_ERROR");
  }

  const { weekStart, weekEnd, rangeEndExclusive } = resolved;
  const monthStart = periodMonthFromDate(weekStart);

  const streak = await getSummary(userId, formatIsoDateUtc(weekStart));

  const { tasks, study, community } = await ensureAutoWeeklyBadges(
    userId,
    weekStart,
    rangeEndExclusive,
    monthStart
  );

  const aiToolBadges = await buildAiToolBadgesWeekly(userId, weekStart, rangeEndExclusive);

  return {
    period: "weekly",
    weekStart: formatIsoDateUtc(weekStart),
    weekEnd: formatIsoDateUtc(weekEnd),
    streak,
    tasks,
    study,
    community,
    aiToolBadges,
  };
}

module.exports = { buildDashboard, buildAiToolBadgesWeekly };
