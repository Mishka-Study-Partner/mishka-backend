const { z } = require("zod");

/** Password: 8–20 chars, at least one upper, one lower, one special (non-alphanumeric). */
const passwordPolicy = z
  .string()
  .min(8, { message: "Password must be between 8 and 20 characters" })
  .max(20, { message: "Password must be between 8 and 20 characters" })
  .regex(/[A-Z]/, { message: "Password must include at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must include at least one lowercase letter" })
  .regex(/[^A-Za-z0-9]/, { message: "Password must include at least one special character" });

const registerSchema = z
  .object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email().max(150),
    password: z.string().max(255).optional(),
    agreeTerms: z.literal(true, { message: "You must agree to the terms and conditions" }),
    rememberMe: z.boolean().optional().default(false),
    phoneNumber: z.string().min(5).max(20),
    countryCode: z.string().max(5).optional(),
    provider: z.string().max(20).optional(),
    providerId: z.string().max(100).optional(),
    signupOtp: z.string().min(4).max(10).optional(),
    educationStatus: z.enum(["school", "university", "other"]).optional(),
    educationOtherDetail: z.string().max(500).optional(),
    schoolTrack: z.enum(["middle_school", "high_school"]).optional(),
    schoolGrade: z.coerce.number().int().min(1).max(3).optional(),
    universityYear: z.coerce.number().int().min(1).max(5).optional(),
    gender: z.enum(["male", "female", "prefer_not_to_say"]).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const oauth = Boolean(data.provider && data.providerId);
    if (!oauth) {
      if (!data.password) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Password is required", path: ["password"] });
      } else {
        const r = passwordPolicy.safeParse(data.password);
        if (!r.success) {
          for (const issue of r.error.issues) {
            ctx.addIssue({ ...issue, path: ["password"] });
          }
        }
      }
    } else if (data.password) {
      const r = passwordPolicy.safeParse(data.password);
      if (!r.success) {
        for (const issue of r.error.issues) {
          ctx.addIssue({ ...issue, path: ["password"] });
        }
      }
    }

    if (data.educationStatus === "other") {
      const t = (data.educationOtherDetail || "").trim();
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
    if (data.educationStatus !== "other" && data.educationOtherDetail != null && data.educationOtherDetail.trim() !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "educationOtherDetail is only used when educationStatus is other",
        path: ["educationOtherDetail"],
      });
    }

    if (process.env.SIGNUP_OTP_REQUIRED === "true") {
      if (!data.signupOtp || data.signupOtp.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "signupOtp is required when SIGNUP_OTP_REQUIRED=true",
          path: ["signupOtp"],
        });
      }
    }
  });

const loginSchema = z
  .object({
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().max(20).optional(),
    countryCode: z.string().max(5).optional(),
    password: z.string().min(1).max(255),
    rememberMe: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.email || v.phoneNumber), {
    message: "Either email or phoneNumber is required",
    path: ["email"],
  });

const forgotPasswordSchema = z
  .object({
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().max(20).optional(),
    countryCode: z.string().max(5).optional(),
  })
  .strict()
  .refine((v) => Boolean(v.email || v.phoneNumber), {
    message: "Either email or phoneNumber is required",
    path: ["email"],
  });

const resetPasswordSchema = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().max(20).optional(),
    countryCode: z.string().max(5).optional(),
    resetCode: z.string().min(4).max(10),
    newPassword: passwordPolicy,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!v.userId && !v.email && !v.phoneNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide userId or (email/phoneNumber) with resetCode",
        path: ["userId"],
      });
    }
    if (v.email && v.phoneNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Send only email or phoneNumber, not both",
        path: ["email"],
      });
    }
  });

const sendSignupOtpSchema = z
  .object({
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().min(5).max(20).optional(),
    countryCode: z.string().max(5).optional(),
  })
  .strict()
  .refine((v) => Boolean(v.email || v.phoneNumber), {
    message: "Either email or phoneNumber is required",
    path: ["email"],
  })
  .refine((v) => !(v.email && v.phoneNumber), {
    message: "Send only email or phoneNumber, not both",
    path: ["email"],
  });

const verifySignupOtpSchema = z
  .object({
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().min(5).max(20).optional(),
    countryCode: z.string().max(5).optional(),
    signupOtp: z.string().min(4).max(10),
  })
  .strict()
  .refine((v) => Boolean(v.email || v.phoneNumber), {
    message: "Either email or phoneNumber is required",
    path: ["email"],
  })
  .refine((v) => !(v.email && v.phoneNumber), {
    message: "Send only email or phoneNumber, not both",
    path: ["email"],
  });

const updateUserSchema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    fullName: z.string().max(150).optional(),
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().max(20).optional(),
    countryCode: z.string().max(5).optional(),
    rememberMe: z.boolean().optional(),
    agreeTerms: z.boolean().optional(),
    provider: z.string().max(20).optional(),
    providerId: z.string().max(100).optional(),
    role: z.enum(["student", "teacher", "admin"]).optional(),
    isVerified: z.boolean().optional(),
    profileImageUrl: z.string().max(2048).optional(),
    gender: z.enum(["male", "female", "prefer_not_to_say"]).optional(),
    password: z.string().max(255).nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.password != null && data.password !== "") {
      const r = passwordPolicy.safeParse(data.password);
      if (!r.success) {
        for (const issue of r.error.issues) {
          ctx.addIssue({ ...issue, path: ["password"] });
        }
      }
    }
  });

/** Self-service profile update — no admin-only fields (role, isVerified, provider, providerId). */
const updateMeSchema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    fullName: z.string().max(150).optional(),
    email: z.string().email().max(150).optional(),
    phoneNumber: z.string().max(20).optional(),
    countryCode: z.string().max(5).optional(),
    gender: z.enum(["male", "female", "prefer_not_to_say"]).optional().nullable(),
    profileImageUrl: z.string().max(2048).optional().nullable(),
    password: z.string().max(255).nullable().optional(),
    rememberMe: z.boolean().optional(),
    educationStatus: z.enum(["school", "university", "other"]).optional(),
    educationOtherDetail: z.string().max(500).optional().nullable(),
    schoolTrack: z.enum(["middle_school", "high_school"]).optional().nullable(),
    schoolGrade: z.coerce.number().int().min(1).max(3).optional().nullable(),
    universityYear: z.coerce.number().int().min(1).max(5).optional().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (Object.keys(data).filter((k) => data[k] !== undefined).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required",
        path: ["firstName"],
      });
    }
    if (data.password != null && data.password !== "") {
      const r = passwordPolicy.safeParse(data.password);
      if (!r.success) {
        for (const issue of r.error.issues) {
          ctx.addIssue({ ...issue, path: ["password"] });
        }
      }
    }
  });

/** @param {Record<string, unknown>} data @param {import("zod").RefinementCtx} ctx */
function refineOAuthEducation(data, ctx) {
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
  if (data.educationStatus !== "other" && data.educationOtherDetail != null && String(data.educationOtherDetail).trim() !== "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "educationOtherDetail is only used when educationStatus is other",
      path: ["educationOtherDetail"],
    });
  }
}

const oauthCommonShape = {
  rememberMe: z.boolean().optional(),
  agreeTerms: z.literal(true, { message: "You must agree to the terms and conditions" }),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().min(5).max(20).optional(),
  countryCode: z.string().max(5).optional(),
  educationStatus: z.enum(["school", "university", "other"]).optional(),
  educationOtherDetail: z.string().max(500).optional(),
  schoolTrack: z.enum(["middle_school", "high_school"]).optional(),
  schoolGrade: z.coerce.number().int().min(1).max(3).optional(),
  universityYear: z.coerce.number().int().min(1).max(5).optional(),
};

const oauthGoogleSchema = z
  .object({
    idToken: z.string().min(20),
    ...oauthCommonShape,
  })
  .strict()
  .superRefine(refineOAuthEducation);

const oauthAppleSchema = z
  .object({
    identityToken: z.string().min(20),
    ...oauthCommonShape,
  })
  .strict()
  .superRefine(refineOAuthEducation);

const oauthFacebookSchema = z
  .object({
    accessToken: z.string().min(10),
    ...oauthCommonShape,
  })
  .strict()
  .superRefine(refineOAuthEducation);

const aiChatSchema = z
  .object({
    session_id: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

const usageFeatureKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, { message: "featureKey: lowercase snake_case, max 64 chars" });

const usageSegmentItemSchema = z
  .object({
    featureKey: usageFeatureKeySchema,
    startedAt: z.string().min(10).max(40),
    endedAt: z.string().min(10).max(40),
    clientRequestId: z.string().min(8).max(80),
    chatSessionId: z.string().uuid().optional(),
  })
  .strict();

const usageHeartbeatItemSchema = z
  .object({
    featureKey: usageFeatureKeySchema,
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "day must be YYYY-MM-DD (UTC)" }),
    seconds: z.number().int().min(1).max(600),
    clientRequestId: z.string().min(8).max(80),
  })
  .strict();

const usageBatchSchema = z
  .object({
    segments: z.array(usageSegmentItemSchema).max(100).optional().default([]),
    heartbeats: z.array(usageHeartbeatItemSchema).max(100).optional().default([]),
  })
  .strict()
  .superRefine((data, ctx) => {
    const n = data.segments.length + data.heartbeats.length;
    if (n === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one segment or heartbeat",
        path: ["segments"],
      });
    }
    if (n > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At most 100 items combined per request",
        path: ["segments"],
      });
    }
  });

const usageSummaryQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const dailyStreakFreezeSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" }),
  })
  .strict();

const dailyStreakPingSchema = z.object({}).strict();

const chatSessionTitleUpdateSchema = z
  .object({
    title: z.union([z.string().max(200), z.null()]),
  })
  .strict();

const communityChannelCreateSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().nullable(),
    imageUrl: z.string().max(500).optional().nullable(),
  })
  .strict();

const communityChannelUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    imageUrl: z.string().max(500).optional().nullable(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.title === undefined && d.description === undefined && d.imageUrl === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide at least one field", path: ["title"] });
    }
  });

/** Optional `title` when duplicating a group; default is the source group title. */
const communityChannelDuplicateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
  })
  .strict();

const studyWithMishkaCustomOverridesSchema = z
  .object({
    focusMinutes: z.number().int().min(1).max(180).optional(),
    shortBreakMinutes: z.number().int().min(1).max(60).optional(),
    longBreakMinutes: z.number().int().min(1).max(120).optional(),
    cyclesTarget: z.number().int().min(1).max(99).optional(),
    pomodorosBeforeLongBreak: z.number().int().min(2).max(10).optional(),
  })
  .strict();

const studySessionPatchSchema = z
  .object({
    title: z.string().max(200).optional().nullable(),
    tags: z.array(z.string().max(80)).max(20).optional(),
    linkedTaskId: z.union([z.string().uuid(), z.null()]).optional(),
    clientAppVersion: z.string().max(40).optional().nullable(),
    platform: z.string().max(40).optional().nullable(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: "At least one field is required" });

const studyWithMishkaStartSchema = z
  .object({
    topLevelMode: z.enum(["call_with_mishka", "concentration"]),
    concentrationPreset: z
      .enum(["classic_pomodoro", "flowtime", "ultradian", "quick_sprint", "task_based", "custom"])
      .optional(),
    title: z.string().max(200).optional(),
    taskEstimatedMinutes: z.number().int().min(1).max(720).optional(),
    customOverrides: studyWithMishkaCustomOverridesSchema.optional(),
    customPresetId: z.string().uuid().optional(),
    tags: z.array(z.string().max(80)).max(20).optional(),
    linkedTaskId: z.string().uuid().optional(),
    clientAppVersion: z.string().max(40).optional(),
    platform: z.string().max(40).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.topLevelMode === "concentration" && !d.concentrationPreset) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "concentrationPreset required", path: ["concentrationPreset"] });
    }
    if (d.topLevelMode === "call_with_mishka" && d.concentrationPreset != null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "omit concentrationPreset for call_with_mishka", path: ["concentrationPreset"] });
    }
    if (d.concentrationPreset === "custom" && !d.customPresetId) {
      const o = d.customOverrides || {};
      if (o.focusMinutes == null || o.shortBreakMinutes == null || o.longBreakMinutes == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "custom mode requires customPresetId or focus/short/long minutes in customOverrides",
          path: ["customOverrides"],
        });
      }
    }
    if (d.customPresetId && d.concentrationPreset !== "custom") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "customPresetId only with concentrationPreset custom",
        path: ["customPresetId"],
      });
    }
  });

const studyWithMishkaAdvancePhaseSchema = z
  .object({
    nextPhase: z.enum(["none", "focus", "short_break", "long_break"]),
    actualFocusMinutes: z.number().int().min(0).max(600).optional(),
    completedFocusCycle: z.boolean().optional(),
    resetAfterLongBreak: z.boolean().optional(),
  })
  .strict();

const studyWithMishkaEndSchema = z
  .object({
    outcome: z.enum(["completed", "abandoned"]).optional(),
    outcomeNotes: z.string().max(2000).optional(),
  })
  .strict();

const studyWithMishkaCheckInSchema = z
  .object({
    kind: z.enum(["still_there_yes_no", "mood_scale_5", "mood_scale_10", "progress_yes_no"]),
    responseBool: z.boolean().optional(),
    responseInt: z.number().int().optional(),
  })
  .strict();

const studyCustomTimerPresetCreateSchema = z
  .object({
    name: z.string().max(120).optional().nullable(),
    focusMinutes: z.number().int().min(1).max(180),
    shortBreakMinutes: z.number().int().min(1).max(60),
    longBreakMinutes: z.number().int().min(1).max(120),
    pomodorosBeforeLongBreak: z.number().int().min(2).max(10).optional(),
  })
  .strict();

const studyTelemetryEventSchema = z
  .object({
    eventType: z.string().min(1).max(80),
    payload: z.any().optional(),
    clientTs: z.union([z.string(), z.number()]).optional(),
  })
  .strict();

const studyTelemetryBatchSchema = z
  .object({
    events: z.array(studyTelemetryEventSchema).min(1).max(50),
  })
  .strict();

const studyMlReportSchema = z
  .object({
    payload: z.object({}).passthrough(),
    schemaVersion: z.number().int().min(1).optional(),
  })
  .strict();

const studyCallBreakEndSchema = z
  .object({
    durationSeconds: z.number().int().min(0).max(86400).optional(),
  })
  .strict();

const communityCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(8000).optional().nullable(),
    imageUrl: z.string().max(500).optional().nullable(),
    visibility: z.enum(["public", "private"]),
    category: z.string().max(100).optional(),
  })
  .strict();

const communityJoinSchema = z
  .object({
    communityId: z.string().uuid().optional(),
    inviteCode: z.string().min(4).max(32).optional(),
    inviteToken: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const pub = Boolean(d.communityId);
    const priv = Boolean(d.inviteCode || d.inviteToken);
    if (pub === priv) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use communityId alone for public join, or inviteCode / inviteToken alone for private",
        path: ["communityId"],
      });
    }
  });

const communityLeaveSchema = z
  .object({
    keepSaved: z.boolean().optional(),
  })
  .strict();

const communityUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(8000).optional().nullable(),
    imageUrl: z.string().max(500).optional().nullable(),
    visibility: z.enum(["public", "private"]).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    const keys = ["name", "description", "imageUrl", "visibility"].filter((k) => d[k] !== undefined);
    if (keys.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide at least one field", path: ["name"] });
    }
  });

const communityAddMemberSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

const communityMemberRoleSchema = z
  .object({
    role: z.enum(["admin", "member"]),
  })
  .strict();

function refineUniqueChannelIds(data, ctx) {
  const uniq = new Set(data.channelIds);
  if (uniq.size !== data.channelIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "channelIds must be unique",
      path: ["channelIds"],
    });
  }
}

const savedMaterialShareToChannelsSchema = z
  .object({
    channelIds: z.array(z.string().uuid()).min(1).max(50),
    note: z.string().max(500).optional(),
  })
  .strict()
  .superRefine(refineUniqueChannelIds);

const savedQuizAddSchema = z.object({ quizId: z.string().uuid() }).strict();

const savedQuizImportFromSharedSchema = z.object({ sourceQuizId: z.string().uuid() }).strict();

const savedFlashcardSetAddSchema = z.object({ flashcardSetId: z.string().uuid() }).strict();

const savedFlashcardSetImportFromSharedSchema = z
  .object({ sourceFlashcardSetId: z.string().uuid() })
  .strict();

const savedSummaryAddSchema = z.object({ summaryId: z.string().uuid() }).strict();

const savedSummaryImportFromSharedSchema = z.object({ sourceSummaryId: z.string().uuid() }).strict();

const savedMindMapAddSchema = z.object({ mindMapId: z.string().uuid() }).strict();

const savedMindMapImportFromSharedSchema = z.object({ sourceMindMapId: z.string().uuid() }).strict();

const materialShareBatchSchema = z
  .object({
    channelIds: z.array(z.string().uuid()).min(1).max(50),
    materialType: z.enum(["quiz", "flashcard_set", "summary", "mind_map"]),
    materialId: z.string().uuid(),
    note: z.string().max(500).optional(),
  })
  .strict()
  .superRefine(refineUniqueChannelIds);

const updateAppPublicSettingsSchema = z
  .object({
    privacyPolicyText: z.string().max(200000).optional(),
    supportEmail: z.string().max(200).optional().nullable(),
    supportPhone: z.string().max(40).optional().nullable(),
    supportFacebookUrl: z.string().max(500).optional().nullable(),
    supportInstagramUrl: z.string().max(500).optional().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const keys = Object.keys(data).filter((k) => data[k] !== undefined);
    if (keys.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one field to update",
        path: ["privacyPolicyText"],
      });
    }
    if (data.supportEmail != null && String(data.supportEmail).trim() !== "") {
      const r = z.string().email().safeParse(data.supportEmail);
      if (!r.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid email", path: ["supportEmail"] });
      }
    }
  });

const aiGenerateToolsSchema = z
  .object({
    session_id: z.string().min(1),
    tool_type: z.string().min(1),
    complexity: z.string().min(1).optional(),
  })
  .strict()
  .transform((data) => ({
    session_id: data.session_id,
    tool_type: data.tool_type.toLowerCase(),
    complexity: data.complexity,
  }))
  .pipe(
    z.object({
      session_id: z.string().min(1),
      tool_type: z.enum(["quizzes", "flashcards", "mind_maps"]),
      complexity: z.string().optional(),
    })
  );

const communityChannelMessageCreateSchema = z
  .object({
    messageContent: z.string().min(1).max(100000 + 2000),
    inputType: z.enum(["text", "material"]).optional(),
  })
  .strict();

const quizSubmitSchema = z
  .object({
    answers: z
      .array(
        z.object({
          questionId: z.string().uuid(),
          selectedOption: z.preprocess(
            (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
            z.enum(["A", "B", "C", "D"])
          ),
        })
      )
      .min(1),
  })
  .strict();

function emptyQueryToUndefined(val) {
  if (val === undefined || val === null || val === "") return undefined;
  return val;
}

/** GET /tasks, GET /todo-lists/:id/tasks, GET /users/:id/tasks — UTC date filters on `dueDate`/`dueTime`. */
const taskListQuerySchema = z
  .object({
    userId: z.string().uuid().optional(),
    q: z.preprocess(emptyQueryToUndefined, z.string().max(255).optional()),
    status: z.preprocess(emptyQueryToUndefined, z.string().max(80).optional()),
    listId: z.string().uuid().optional(),
    dueDateFrom: z.preprocess(emptyQueryToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    dueDateTo: z.preprocess(emptyQueryToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    dueOn: z.preprocess(emptyQueryToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    upcomingOnly: z
      .union([z.boolean(), z.literal("true"), z.literal("false")])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null) return false;
        return v === true || v === "true";
      }),
    withinDays: z.preprocess(
      (v) => (v === "" || v === undefined ? undefined : v),
      z.coerce.number().int().min(0).max(366).optional()
    ),
    limit: z.coerce.number().int().min(1).max(200).optional().default(100),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.dueOn && (data.dueDateFrom || data.dueDateTo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use dueOn alone or dueDateFrom/dueDateTo, not both",
        path: ["dueOn"],
      });
    }
  });

/** GET /todo-lists, GET /users/:id/todo-lists */
const todoListQuerySchema = z
  .object({
    q: z.preprocess(emptyQueryToUndefined, z.string().max(255).optional()),
    listType: z.enum(["calendar", "college", "work", "personal"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();

module.exports = {
  passwordPolicy,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendSignupOtpSchema,
  verifySignupOtpSchema,
  oauthGoogleSchema,
  oauthAppleSchema,
  oauthFacebookSchema,
  updateUserSchema,
  aiChatSchema,
  aiGenerateToolsSchema,
  dailyStreakFreezeSchema,
  dailyStreakPingSchema,
  usageBatchSchema,
  usageSummaryQuerySchema,
  updateAppPublicSettingsSchema,
  chatSessionTitleUpdateSchema,
  communityChannelCreateSchema,
  communityChannelUpdateSchema,
  communityChannelDuplicateSchema,
  communityCreateSchema,
  communityJoinSchema,
  communityLeaveSchema,
  communityUpdateSchema,
  communityAddMemberSchema,
  communityMemberRoleSchema,
  materialShareBatchSchema,
  savedMaterialShareToChannelsSchema,
  savedQuizAddSchema,
  savedQuizImportFromSharedSchema,
  savedFlashcardSetAddSchema,
  savedFlashcardSetImportFromSharedSchema,
  savedSummaryAddSchema,
  savedSummaryImportFromSharedSchema,
  savedMindMapAddSchema,
  savedMindMapImportFromSharedSchema,
  communityChannelMessageCreateSchema,
  quizSubmitSchema,
  studySessionPatchSchema,
  studyWithMishkaStartSchema,
  studyWithMishkaAdvancePhaseSchema,
  studyWithMishkaEndSchema,
  studyWithMishkaCheckInSchema,
  studyCustomTimerPresetCreateSchema,
  studyTelemetryBatchSchema,
  studyMlReportSchema,
  studyCallBreakEndSchema,
  updateMeSchema,
  taskListQuerySchema,
  todoListQuerySchema,
};
