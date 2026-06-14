const prisma = require("../../utils/prisma");
const { approximateMainStudySecondsAt } = require("../studyReportAnalytics");
const { getGoal } = require("./gamificationGoalsService");
const { GOAL_CODES } = require("./gamificationConstants");

async function countCompletedTasks(userId, rangeStart, rangeEndExclusive) {
  return prisma.task.count({
    where: {
      userId,
      status: "completed",
      completedAt: { gte: rangeStart, lt: rangeEndExclusive },
    },
  });
}

async function sumStudyMinutes(userId, rangeStart, rangeEndExclusive) {
  const refDate = rangeEndExclusive > new Date() ? new Date() : rangeEndExclusive;
  const sessions = await prisma.studyConcentrationSession.findMany({
    where: {
      userId,
      status: "completed",
      startedAt: { gte: rangeStart, lt: rangeEndExclusive },
    },
    select: {
      startedAt: true,
      endedAt: true,
      status: true,
      totalPausedSeconds: true,
      totalCallBreakSeconds: true,
      callBreakActive: true,
      callBreakStartedAt: true,
    },
  });
  let totalSec = 0;
  for (const s of sessions) {
    totalSec += approximateMainStudySecondsAt(s, refDate);
  }
  return Math.round(totalSec / 60);
}

async function computeCommunityScore(userId, rangeStart, rangeEndExclusive) {
  const [msgPts, sharePts, joinPts] = await Promise.all([
    getGoal(GOAL_CODES.communityPointsPerMessage, 10),
    getGoal(GOAL_CODES.communityPointsPerShare, 25),
    getGoal(GOAL_CODES.communityPointsPerChannelJoin, 15),
  ]);

  const created = { gte: rangeStart, lt: rangeEndExclusive };

  const [messagesPosted, materialShares, channelJoins] = await Promise.all([
    prisma.communityChannelMessage.count({ where: { userId, createdAt: created } }),
    prisma.materialShare.count({ where: { userId, createdAt: created } }),
    prisma.userCommunityChannel.count({ where: { userId, createdAt: created } }),
  ]);

  const currentScore =
    messagesPosted * msgPts + materialShares * sharePts + channelJoins * joinPts;

  return {
    currentScore,
    breakdown: { messagesPosted, materialShares, channelJoins },
  };
}

function progressBlock(current, goal) {
  const remaining = Math.max(0, goal - current);
  const progress = goal > 0 ? Math.min(1, current / goal) : 0;
  return { current, goal, remaining, progress };
}

async function buildTasksProgress(userId, rangeStart, rangeEndExclusive, monthStart) {
  const goal = await getGoal(GOAL_CODES.tasksWeeklyGoal, 30);
  const current = await countCompletedTasks(userId, rangeStart, rangeEndExclusive);
  const { remaining, progress } = progressBlock(current, goal);
  const badgesEarnedThisMonth = await prisma.userBadgeEvent.count({
    where: {
      userId,
      badgeCode: "tasks_weekly_complete",
      periodMonth: monthStart,
    },
  });
  const weeklyBadgeEarned = await prisma.userBadgeEvent.findFirst({
    where: {
      userId,
      badgeCode: "tasks_weekly_complete",
      periodWeek: rangeStart,
    },
  });
  return {
    current,
    goal,
    remaining,
    progress,
    badgesEarnedThisMonth,
    weeklyBadgeEarned: Boolean(weeklyBadgeEarned),
  };
}

async function buildStudyProgress(userId, rangeStart, rangeEndExclusive, monthStart) {
  const goalMinutes = await getGoal(GOAL_CODES.studyWeeklyMinutes, 1260);
  const currentMinutes = await sumStudyMinutes(userId, rangeStart, rangeEndExclusive);
  const remainingMinutes = Math.max(0, goalMinutes - currentMinutes);
  const progress = goalMinutes > 0 ? Math.min(1, currentMinutes / goalMinutes) : 0;
  const badgesEarnedThisMonth = await prisma.userBadgeEvent.count({
    where: { userId, badgeCode: "study_weekly_goal", periodMonth: monthStart },
  });
  const weeklyBadgeEarned = await prisma.userBadgeEvent.findFirst({
    where: { userId, badgeCode: "study_weekly_goal", periodWeek: rangeStart },
  });
  return {
    currentMinutes,
    goalMinutes,
    currentHours: Math.floor(currentMinutes / 60),
    goalHours: Math.floor(goalMinutes / 60),
    remainingHours: Math.ceil(remainingMinutes / 60),
    remainingMinutes,
    progress,
    badgesEarnedThisMonth,
    weeklyBadgeEarned: Boolean(weeklyBadgeEarned),
  };
}

async function buildCommunityProgress(userId, rangeStart, rangeEndExclusive, monthStart) {
  const goalScore = await getGoal(GOAL_CODES.communityDisplayGoal, 700);
  const threshold = await getGoal(GOAL_CODES.communityBadgeThreshold, 500);
  const { currentScore, breakdown } = await computeCommunityScore(userId, rangeStart, rangeEndExclusive);
  const remainingScore = Math.max(0, goalScore - currentScore);
  const progress = goalScore > 0 ? Math.min(1, currentScore / goalScore) : 0;
  const badgesEarnedThisMonth = await prisma.userBadgeEvent.count({
    where: { userId, badgeCode: "community_weekly_active", periodMonth: monthStart },
  });
  const weeklyBadgeEarned = await prisma.userBadgeEvent.findFirst({
    where: { userId, badgeCode: "community_weekly_active", periodWeek: rangeStart },
  });
  return {
    currentScore,
    goalScore,
    badgeThreshold: threshold,
    remainingScore,
    progress,
    breakdown,
    badgesEarnedThisMonth,
    weeklyBadgeEarned: Boolean(weeklyBadgeEarned),
    goalMet: currentScore >= threshold,
  };
}

module.exports = {
  countCompletedTasks,
  sumStudyMinutes,
  computeCommunityScore,
  buildTasksProgress,
  buildStudyProgress,
  buildCommunityProgress,
};
