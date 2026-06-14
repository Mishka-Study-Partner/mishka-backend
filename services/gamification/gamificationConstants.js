/** Hub + monthly AI badge codes (order matches Flutter grid). */
const AI_HUB_BADGES = [
  { code: "quiz_perfect", assetKey: "perfectScore" },
  { code: "quiz_score_80", assetKey: "score80" },
  { code: "quiz_keep_learning", assetKey: "keep-learning" },
  { code: "flashcards_complete", assetKey: "flashcards-reviewed" },
  { code: "summary_complete", assetKey: "summary-reviewed" },
  { code: "mindmap_complete", assetKey: "summary-reviewed" },
  { code: "chat_points", assetKey: "chat_with_mishka_badge" },
];

const COLLECT_BADGE_CODES = new Set([
  "quiz_perfect",
  "quiz_score_80",
  "quiz_keep_learning",
  "flashcards_complete",
  "summary_complete",
  "mindmap_complete",
]);

const AUTO_BADGE_CODES = {
  tasks: "tasks_weekly_complete",
  study: "study_weekly_goal",
  community: "community_weekly_active",
};

const GOAL_CODES = {
  tasksWeeklyGoal: "tasks_weekly_goal",
  studyWeeklyMinutes: "study_weekly_minutes",
  communityDisplayGoal: "community_weekly_display_goal",
  communityBadgeThreshold: "community_badge_threshold",
  communityPointsPerMessage: "community_points_per_message",
  communityPointsPerShare: "community_points_per_share",
  communityPointsPerChannelJoin: "community_points_per_channel_join",
};

const DEFAULT_GOALS = {
  tasks_weekly_goal: 30,
  study_weekly_minutes: 1260,
  community_weekly_display_goal: 700,
  community_badge_threshold: 500,
  community_points_per_message: 10,
  community_points_per_share: 25,
  community_points_per_channel_join: 15,
};

function quizBadgeCodeFromScore(correctCount, totalCount) {
  const c = Math.max(0, Math.floor(Number(correctCount)) || 0);
  const t = Math.floor(Number(totalCount)) || 0;
  if (t < 1) return null;
  if (c >= t) return "quiz_perfect";
  if (c * 10 >= t * 8) return "quiz_score_80";
  return "quiz_keep_learning";
}

module.exports = {
  AI_HUB_BADGES,
  COLLECT_BADGE_CODES,
  AUTO_BADGE_CODES,
  GOAL_CODES,
  DEFAULT_GOALS,
  quizBadgeCodeFromScore,
};
