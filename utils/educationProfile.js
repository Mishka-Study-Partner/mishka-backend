const { z } = require("zod");

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

/** @param {import("zod").RefinementCtx} ctx */
function refineEducationFields(data, ctx) {
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
        message: "schoolGrade (1–3) is required when educationStatus is school",
        path: ["schoolGrade"],
      });
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
    schoolTrack: z.enum(["middle_school", "high_school"]).optional().nullable(),
    schoolGrade: z.coerce.number().int().min(1).max(3).optional().nullable(),
    universityYear: z.coerce.number().int().min(1).max(5).optional().nullable(),
  })
  .superRefine(refineEducationFields);

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
  EDUCATION_SELECT,
  touchesEducation,
  refineEducationFields,
  educationProfileSchema,
  mergeEducationState,
  educationToPrismaData,
};
