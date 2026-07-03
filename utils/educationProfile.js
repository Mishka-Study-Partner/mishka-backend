const { z } = require("zod");

const SCHOOL_TRACK_VALUES = ["primary_school", "middle_school", "high_school"];

const EDUCATION_SELECT = {
  educationStatus: true,
  educationOtherDetail: true,
  schoolTrack: true,
  schoolGrade: true,
  universityYear: true,
};

function touchesEducation(body) {
  return (
    body.educationStatus !== undefined ||
    body.educationOtherDetail !== undefined ||
    body.schoolTrack !== undefined ||
    body.schoolGrade !== undefined ||
    body.universityYear !== undefined
  );
}

/** @param {string | null | undefined} track */
function schoolGradeRangeForTrack(track) {
  if (track === "primary_school") return { min: 1, max: 6 };
  if (track === "middle_school" || track === "high_school") return { min: 1, max: 3 };
  return null;
}

/**
 * @param {Record<string, unknown>} data
 * @param {import("zod").RefinementCtx} ctx
 * @param {{ profileGradeLimits?: boolean }} [options]
 *   When `profileGradeLimits` is true (user education profile), enforce
 *   primary_school → 1–6 and middle/high → 1–3. Communities keep broader grades.
 */
function refineEducationFields(data, ctx, options = {}) {
  const { profileGradeLimits = false } = options;
  if (!data.educationStatus) return;
  if (data.educationStatus === "other") {
    const t = String(data.educationOtherDetail || "").trim();
    if (!t) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "educationOtherDetail is required when educationStatus is other",
        path: ["educationOtherDetail"],
      });
    }
  }
  if (data.educationStatus === "school") {
    if (!data.schoolTrack) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "schoolTrack is required when educationStatus is school",
        path: ["schoolTrack"],
      });
    }
    if (data.schoolGrade == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "schoolGrade is required when educationStatus is school",
        path: ["schoolGrade"],
      });
    } else if (profileGradeLimits && data.schoolTrack) {
      const range = schoolGradeRangeForTrack(data.schoolTrack);
      if (range && (data.schoolGrade < range.min || data.schoolGrade > range.max)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            data.schoolTrack === "primary_school"
              ? "schoolGrade must be an integer 1–6 when schoolTrack is primary_school"
              : "schoolGrade must be an integer 1–3 when schoolTrack is middle_school or high_school",
          path: ["schoolGrade"],
        });
      }
    }
  }
  if (data.educationStatus === "university") {
    if (data.universityYear == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "universityYear (1–5) is required when educationStatus is university",
        path: ["universityYear"],
      });
    }
  }
  if (data.educationStatus !== "school" && (data.schoolTrack != null || data.schoolGrade != null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "schoolTrack and schoolGrade are only allowed when educationStatus is school",
      path: ["schoolTrack"],
    });
  }
  if (data.educationStatus !== "university" && data.universityYear != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "universityYear is only allowed when educationStatus is university",
      path: ["universityYear"],
    });
  }
  if (
    data.educationStatus !== "other" &&
    data.educationOtherDetail != null &&
    String(data.educationOtherDetail).trim() !== ""
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "educationOtherDetail is only used when educationStatus is other",
      path: ["educationOtherDetail"],
    });
  }
}

const educationProfileSchema = z
  .object({
    educationStatus: z.enum(["school", "university", "other"]),
    educationOtherDetail: z.string().max(500).optional().nullable(),
    schoolTrack: z.enum(["primary_school", "middle_school", "high_school"]).optional().nullable(),
    schoolGrade: z.coerce.number().int().min(1).max(6).optional().nullable(),
    universityYear: z.coerce.number().int().min(1).max(5).optional().nullable(),
  })
  .superRefine((data, ctx) => refineEducationFields(data, ctx, { profileGradeLimits: true }));

/**
 * Merge PATCH body with stored user row for validation.
 * @param {Record<string, unknown>} body
 * @param {Record<string, unknown> | null} current
 */
function mergeEducationState(body, current) {
  return {
    educationStatus: body.educationStatus ?? current?.educationStatus ?? null,
    educationOtherDetail:
      body.educationOtherDetail !== undefined ? body.educationOtherDetail : current?.educationOtherDetail ?? null,
    schoolTrack: body.schoolTrack !== undefined ? body.schoolTrack : current?.schoolTrack ?? null,
    schoolGrade: body.schoolGrade !== undefined ? body.schoolGrade : current?.schoolGrade ?? null,
    universityYear: body.universityYear !== undefined ? body.universityYear : current?.universityYear ?? null,
  };
}

/** Prisma user update payload for education columns (clears fields not used by status). */
function educationToPrismaData(merged) {
  const status = merged.educationStatus;
  return {
    educationStatus: status,
    educationOtherDetail: status === "other" ? String(merged.educationOtherDetail || "").trim() || null : null,
    schoolTrack: status === "school" ? merged.schoolTrack : null,
    schoolGrade: status === "school" ? merged.schoolGrade : null,
    universityYear: status === "university" ? merged.universityYear : null,
  };
}

module.exports = {
  SCHOOL_TRACK_VALUES,
  EDUCATION_SELECT,
  touchesEducation,
  schoolGradeRangeForTrack,
  refineEducationFields,
  educationProfileSchema,
  mergeEducationState,
  educationToPrismaData,
};
