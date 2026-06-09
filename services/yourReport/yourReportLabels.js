/** UI strings mirroring Flutter l10n (en / ar). */

const EN = {
  yourReport: "Your Report",
  reportStudyWithMishka: "Study with Mishka",
  reportDuringConcentrationMode: "Total study time (Concentration + Camera modes):",
  reportAiTools: "Using Mishka's AI tools",
  reportDailyStreak: "Daily Streak",
  reportStreakCurrent: "Current",
  reportStreakLongest: "Longest",
  reportStreakFreezes: "Freezes left",
  reportTasksDue: "Tasks completed",
  reportCommunityActivity: "Activity in Community",
  reportTotalQuizzes: "Total Quizzes",
  reportTotalFlashcards: "Total Flashcards",
  reportTotalSummaries: "Total Summaries",
  reportNoTasksInPeriod: "No tasks completed in this period yet.",
  reportStudyBySubject: "Study by subject",
  reportUnassignedSubject: "Unassigned",
  reportNoStudyBySubject: "No study time recorded for subjects in this period.",
  completed: "Completed",
  today: "Today",
  upcoming: "Upcoming",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
  suffixDay: "/day",
  suffixWeek: "/week",
  suffixMonth: "/month",
  suffixYear: "/year",
  emailSubject: "Your Mishka Report — {periodLabel}",
};

const AR = {
  yourReport: "تقريرك",
  reportStudyWithMishka: "الدراسة مع ميشكا",
  reportDuringConcentrationMode: "إجمالي وقت الدراسة (وضع التركيز + الكاميرا):",
  reportAiTools: "استخدام أدوات ميشكا الذكية",
  reportDailyStreak: "سلسلة الأيام",
  reportStreakCurrent: "الحالية",
  reportStreakLongest: "الأطول",
  reportStreakFreezes: "تجميد متبقي",
  reportTasksDue: "المهام المكتملة",
  reportCommunityActivity: "النشاط في المجتمع",
  reportTotalQuizzes: "إجمالي الاختبارات",
  reportTotalFlashcards: "إجمالي البطاقات",
  reportTotalSummaries: "إجمالي الملخصات",
  reportNoTasksInPeriod: "لا مهام مكتملة في هذه الفترة بعد.",
  reportStudyBySubject: "الدراسة حسب المادة",
  reportUnassignedSubject: "غير محدد",
  reportNoStudyBySubject: "لا وقت دراسة مسجل للمواد في هذه الفترة.",
  completed: "مكتمل",
  today: "اليوم",
  upcoming: "قادم",
  mon: "الإثنين",
  tue: "الثلاثاء",
  wed: "الأربعاء",
  thu: "الخميس",
  fri: "الجمعة",
  sat: "السبت",
  sun: "الأحد",
  suffixDay: "/يوم",
  suffixWeek: "/أسبوع",
  suffixMonth: "/شهر",
  suffixYear: "/سنة",
  emailSubject: "تقرير ميشكا — {periodLabel}",
};

function labelsFor(locale) {
  return locale === "ar" ? AR : EN;
}

function sectionSuffix(period, labels) {
  if (period === "daily") return labels.suffixDay;
  if (period === "weekly") return labels.suffixWeek;
  if (period === "monthly") return labels.suffixMonth;
  return labels.suffixYear;
}

function weekdayLabels(labels) {
  return [labels.mon, labels.tue, labels.wed, labels.thu, labels.fri, labels.sat, labels.sun];
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

module.exports = {
  labelsFor,
  sectionSuffix,
  weekdayLabels,
  MONTHS_EN,
  MONTHS_AR,
};
