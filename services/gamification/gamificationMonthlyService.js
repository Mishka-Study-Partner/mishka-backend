const prisma = require("../../utils/prisma");
const { badRequest, notFound } = require("../../utils/httpError");
const { getHistory } = require("../dailyStreakService");
const { ensureAutoWeeklyBadges } = require("./gamificationAutoAwardService");
const { countBadgeEvents } = require("./gamificationBadgeService");
const {
  countCompletedTasks,
  sumStudyMinutes,
  computeCommunityScore,
} = require("./gamificationProgressService");
const { getGoal } = require("./gamificationGoalsService");
const { GOAL_CODES, AI_HUB_BADGES } = require("./gamificationConstants");
const {
  parseMonthParam,
  saturdayWeeksOverlappingMonth,
  calendarGridForMonth,
  formatIsoDateUtc,
  weekRangeFromStart,
} = require("../../utils/gamificationWeek");

const SECTIONS = new Set(["streak", "tasks", "ai-tools", "study", "community"]);

const AI_GROUP_TITLES = {
  quiz_perfect: "Get 10 / 10 in Quizzes",
  quiz_score_80: "Get 8 / 10 or more in Quizzes",
  quiz_keep_learning: "Keep learning in Quizzes",
  flashcards_complete: "Flashcards reviewed",
  summary_complete: "Summary reviewed",
  mindmap_complete: "Mind map complete",
  chat_points: "Chat with Mishka",
};

async function buildStreakMonthly(userId, monthStart, monthEnd) {
  const from = formatIsoDateUtc(monthStart);
  const to = formatIsoDateUtc(monthEnd);
  const history = await getHistory(userId, from, to);

  const gridDays = calendarGridForMonth(monthStart, monthEnd);
  const streakByDate = new Map(
    history.days.map((d) => {
      let status = "missed";
      if (d.state === "past_done" || d.state === "today_done") status = "opened";
      else if (d.state === "past_missed") status = "missed";
      else if (d.state === "today_pending" || d.state === "upcoming") status = "missed";
      return [d.date, status];
    })
  );

  let streakDaysInMonth = 0;
  const days = gridDays.map(({ date, status: gridStatus }) => {
    if (gridStatus === "outside_month") {
      return { date, status: "outside_month" };
    }
    const status = streakByDate.get(date) === "opened" ? "opened" : "missed";
    if (status === "opened") streakDaysInMonth += 1;
    return { date, status };
  });

  return {
    section: "streak",
    month: formatIsoDateUtc(monthStart),
    streakDaysInMonth,
    days,
  };
}

async function buildProgressMonthly(userId, section, monthStart, monthEnd) {
  const weeks = saturdayWeeksOverlappingMonth(monthStart, monthEnd);
  const monthStartDate = monthStart;

  const heroBadgeCode =
    section === "tasks"
      ? "tasks_weekly_complete"
      : section === "study"
        ? "study_weekly_goal"
        : "community_weekly_active";

  const goalSubtitle =
    section === "tasks"
      ? "Finishing all tasks/week == 1 Badge"
      : section === "study"
        ? "3 hrs/Day == 21 hr/week"
        : "1 Badge == >500%/week";

  const badgesEarnedInMonth = await prisma.userBadgeEvent.count({
    where: { userId, badgeCode: heroBadgeCode, periodMonth: monthStartDate },
  });

  const weekRows = [];
  for (const w of weeks) {
    const { rangeStart, rangeEnd, rangeEndIso } = w;
    const { rangeEndExclusive } = weekRangeFromStart(rangeStart);
    await ensureAutoWeeklyBadges(userId, rangeStart, rangeEndExclusive, monthStartDate);

    if (section === "tasks") {
      const goal = await getGoal(GOAL_CODES.tasksWeeklyGoal, 30);
      const current = await countCompletedTasks(userId, rangeStart, rangeEndExclusive);
      const remaining = Math.max(0, goal - current);
      const progress = goal > 0 ? Math.min(1, current / goal) : 0;
      const goalMet = current >= goal;
      weekRows.push({
        weekIndex: w.weekIndex,
        rangeStart: w.rangeStartIso,
        rangeEnd: rangeEndIso,
        goalMet,
        current,
        goal,
        remaining,
        progress,
        detailLine: `${goal} Tasks/ this week`,
      });
    } else if (section === "study") {
      const goal = await getGoal(GOAL_CODES.studyWeeklyMinutes, 1260);
      const current = await sumStudyMinutes(userId, rangeStart, rangeEndExclusive);
      const remaining = Math.max(0, goal - current);
      const progress = goal > 0 ? Math.min(1, current / goal) : 0;
      weekRows.push({
        weekIndex: w.weekIndex,
        rangeStart: w.rangeStartIso,
        rangeEnd: rangeEndIso,
        goalMet: current >= goal,
        current,
        goal,
        remaining,
        progress,
        detailLine: `${Math.floor(goal / 60)} hours / week`,
      });
    } else {
      const goal = await getGoal(GOAL_CODES.communityDisplayGoal, 700);
      const threshold = await getGoal(GOAL_CODES.communityBadgeThreshold, 500);
      const { currentScore, breakdown } = await computeCommunityScore(
        userId,
        rangeStart,
        rangeEndExclusive
      );
      weekRows.push({
        weekIndex: w.weekIndex,
        rangeStart: w.rangeStartIso,
        rangeEnd: rangeEndIso,
        goalMet: currentScore >= threshold,
        current: currentScore,
        goal,
        remaining: Math.max(0, goal - currentScore),
        progress: goal > 0 ? Math.min(1, currentScore / goal) : 0,
        detailLine: `${goal}% / week`,
        breakdown,
      });
    }
  }

  return {
    section,
    month: formatIsoDateUtc(monthStart),
    goalSubtitle,
    heroBadgeCode,
    badgesEarnedInMonth,
    weeks: weekRows,
  };
}

async function buildAiToolsMonthly(userId, monthStart, monthEnd) {
  const weeks = saturdayWeeksOverlappingMonth(monthStart, monthEnd);
  const groups = [];

  for (const { code, assetKey } of AI_HUB_BADGES) {
    const timesEarnedInMonth = await countBadgeEvents(userId, code, { periodMonth: monthStart });
    const weekRows = [];

    for (const w of weeks) {
      const badgesEarned = await countBadgeEvents(userId, code, { periodWeek: w.rangeStart });
      let detailSubtitle = `${badgesEarned} badge${badgesEarned === 1 ? "" : "s"} this week`;
      if (code === "quiz_perfect" && badgesEarned > 0) {
        detailSubtitle = `you got 10/10 in ${badgesEarned} quiz${badgesEarned === 1 ? "" : "zes"}`;
      } else if (code === "chat_points" && badgesEarned > 0) {
        detailSubtitle = `${badgesEarned} chat badge${badgesEarned === 1 ? "" : "s"} earned`;
      }

      weekRows.push({
        weekIndex: w.weekIndex,
        rangeStart: w.rangeStartIso,
        rangeEnd: w.rangeEndIso,
        badgesEarned,
        goalMet: badgesEarned > 0,
        detailSubtitle,
      });
    }

    groups.push({
      badgeCode: code,
      assetKey,
      title: AI_GROUP_TITLES[code] || code,
      timesEarnedInMonth,
      weeks: weekRows,
    });
  }

  return {
    section: "ai-tools",
    month: formatIsoDateUtc(monthStart),
    groups,
  };
}

async function buildSectionMonthly(userId, section, monthParam) {
  if (!SECTIONS.has(section)) {
    throw notFound("Unknown gamification section", "NOT_FOUND");
  }

  const parsed = parseMonthParam(monthParam);
  if (!parsed) {
    throw badRequest("month must be YYYY-MM", undefined, "VALIDATION_ERROR");
  }

  const { monthStart, monthEnd } = parsed;

  if (section === "streak") {
    return buildStreakMonthly(userId, monthStart, monthEnd);
  }
  if (section === "ai-tools") {
    return buildAiToolsMonthly(userId, monthStart, monthEnd);
  }
  return buildProgressMonthly(userId, section, monthStart, monthEnd);
}

module.exports = { buildSectionMonthly, SECTIONS };
