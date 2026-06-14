const { insertBadgeEvent } = require("./gamificationBadgeService");
const {
  buildTasksProgress,
  buildStudyProgress,
  buildCommunityProgress,
  countCompletedTasks,
  sumStudyMinutes,
  computeCommunityScore,
} = require("./gamificationProgressService");
const { getGoal } = require("./gamificationGoalsService");
const { AUTO_BADGE_CODES, GOAL_CODES } = require("./gamificationConstants");
const { formatIsoDateUtc } = require("../../utils/gamificationWeek");

async function tryAutoWeeklyBadges(userId, weekStart, rangeEndExclusive, monthStart) {
  const [taskGoal, studyGoalMinutes, communityThreshold] = await Promise.all([
    getGoal(GOAL_CODES.tasksWeeklyGoal, 30),
    getGoal(GOAL_CODES.studyWeeklyMinutes, 1260),
    getGoal(GOAL_CODES.communityBadgeThreshold, 500),
  ]);

  const weekIso = formatIsoDateUtc(weekStart);

  const [taskCount, studyMinutes, community] = await Promise.all([
    countCompletedTasks(userId, weekStart, rangeEndExclusive),
    sumStudyMinutes(userId, weekStart, rangeEndExclusive),
    computeCommunityScore(userId, weekStart, rangeEndExclusive),
  ]);

  const awards = [];

  if (taskCount >= taskGoal) {
    const r = await insertBadgeEvent({
      userId,
      badgeCode: AUTO_BADGE_CODES.tasks,
      sourceType: "tasks_auto",
      sourceId: weekIso,
      metadata: { current: taskCount, goal: taskGoal },
      periodWeek: weekStart,
      periodMonth: monthStart,
      idempotencyKey: `tasks:${userId}:${weekIso}:weekly`,
    });
    if (r.created) awards.push(AUTO_BADGE_CODES.tasks);
  }

  if (studyMinutes >= studyGoalMinutes) {
    const r = await insertBadgeEvent({
      userId,
      badgeCode: AUTO_BADGE_CODES.study,
      sourceType: "study_auto",
      sourceId: weekIso,
      metadata: { currentMinutes: studyMinutes, goalMinutes: studyGoalMinutes },
      periodWeek: weekStart,
      periodMonth: monthStart,
      idempotencyKey: `study:${userId}:${weekIso}:weekly`,
    });
    if (r.created) awards.push(AUTO_BADGE_CODES.study);
  }

  if (community.currentScore >= communityThreshold) {
    const r = await insertBadgeEvent({
      userId,
      badgeCode: AUTO_BADGE_CODES.community,
      sourceType: "community_auto",
      sourceId: weekIso,
      metadata: { currentScore: community.currentScore, threshold: communityThreshold },
      periodWeek: weekStart,
      periodMonth: monthStart,
      idempotencyKey: `community:${userId}:${weekIso}:weekly`,
    });
    if (r.created) awards.push(AUTO_BADGE_CODES.community);
  }

  return awards;
}

async function ensureAutoWeeklyBadges(userId, weekStart, rangeEndExclusive, monthStart) {
  await tryAutoWeeklyBadges(userId, weekStart, rangeEndExclusive, monthStart);
  return {
    tasks: await buildTasksProgress(userId, weekStart, rangeEndExclusive, monthStart),
    study: await buildStudyProgress(userId, weekStart, rangeEndExclusive, monthStart),
    community: await buildCommunityProgress(userId, weekStart, rangeEndExclusive, monthStart),
  };
}

module.exports = { tryAutoWeeklyBadges, ensureAutoWeeklyBadges };
