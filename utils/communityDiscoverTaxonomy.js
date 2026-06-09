/** Stable subject slugs for community discovery (Flutter chips + API filters). */
const COMMUNITY_SUBJECTS = [
  { key: "math", labelEn: "Mathematics", labelAr: "الرياضيات" },
  { key: "physics", labelEn: "Physics", labelAr: "الفيزياء" },
  { key: "chemistry", labelEn: "Chemistry", labelAr: "الكيمياء" },
  { key: "biology", labelEn: "Biology", labelAr: "الأحياء" },
  { key: "computer_science", labelEn: "Computer science", labelAr: "علوم الحاسب" },
  { key: "english", labelEn: "English", labelAr: "الإنجليزية" },
  { key: "arabic", labelEn: "Arabic", labelAr: "العربية" },
  { key: "french", labelEn: "French", labelAr: "الفرنسية" },
  { key: "history", labelEn: "History", labelAr: "التاريخ" },
  { key: "geography", labelEn: "Geography", labelAr: "الجغرافيا" },
  { key: "philosophy", labelEn: "Philosophy", labelAr: "الفلسفة" },
  { key: "economics", labelEn: "Economics", labelAr: "الاقتصاد" },
  { key: "medicine", labelEn: "Medicine", labelAr: "الطب" },
  { key: "engineering", labelEn: "Engineering", labelAr: "الهندسة" },
  { key: "exam_prep", labelEn: "Exam prep", labelAr: "تحضير للامتحانات" },
  { key: "thanaweya", labelEn: "Thanaweya Amma", labelAr: "الثانوية العامة" },
  { key: "igcse", labelEn: "IGCSE / A-Level", labelAr: "IGCSE" },
  { key: "programming", labelEn: "Programming", labelAr: "البرمجة" },
  { key: "languages", labelEn: "Languages", labelAr: "اللغات" },
  { key: "general", labelEn: "General study", labelAr: "دراسة عامة" },
];

const COMMUNITY_SUBJECT_KEYS = COMMUNITY_SUBJECTS.map((s) => s.key);

const COMMUNITY_PURPOSES = [
  { key: "study_group", labelEn: "Study group", labelAr: "مجموعة دراسة" },
  { key: "material_sharing", labelEn: "Material sharing", labelAr: "مشاركة مواد" },
  { key: "accountability", labelEn: "Accountability", labelAr: "متابعة يومية" },
  { key: "exam_cohort", labelEn: "Exam cohort", labelAr: "دفعة امتحان" },
  { key: "university_program", labelEn: "University program", labelAr: "برنامج جامعي" },
  { key: "language_practice", labelEn: "Language practice", labelAr: "ممارسة لغة" },
  { key: "general", labelEn: "General", labelAr: "عام" },
];

const COMMUNITY_PURPOSE_KEYS = COMMUNITY_PURPOSES.map((p) => p.key);

function subjectByKey(key) {
  return COMMUNITY_SUBJECTS.find((s) => s.key === key);
}

/** Map legacy free-text category to a subject key when possible. */
function inferSubjectKeyFromCategory(category) {
  if (!category) return "general";
  const norm = String(category).trim().toLowerCase().replace(/\s+/g, "_");
  if (COMMUNITY_SUBJECT_KEYS.includes(norm)) return norm;
  const aliases = {
    cs: "computer_science",
    comp_sci: "computer_science",
    bio: "biology",
    chem: "chemistry",
    phys: "physics",
    maths: "math",
    mathematics: "math",
    thanaweya_amma: "thanaweya",
    high_school: "exam_prep",
  };
  return aliases[norm] || "general";
}

function normalizeSubjectKeys(keys, category) {
  const out = new Set();
  if (Array.isArray(keys)) {
    for (const k of keys) {
      const t = String(k).trim().toLowerCase();
      if (COMMUNITY_SUBJECT_KEYS.includes(t)) out.add(t);
    }
  }
  if (out.size === 0 && category) {
    out.add(inferSubjectKeyFromCategory(category));
  }
  if (out.size === 0) out.add("general");
  return [...out].slice(0, 8);
}

function primaryCategoryLabel(subjectKeys, locale = "en") {
  const key = subjectKeys?.[0] || "general";
  const s = subjectByKey(key);
  if (!s) return "General";
  return locale === "ar" ? s.labelAr : s.labelEn;
}

module.exports = {
  COMMUNITY_SUBJECTS,
  COMMUNITY_SUBJECT_KEYS,
  COMMUNITY_PURPOSES,
  COMMUNITY_PURPOSE_KEYS,
  subjectByKey,
  inferSubjectKeyFromCategory,
  normalizeSubjectKeys,
  primaryCategoryLabel,
};
