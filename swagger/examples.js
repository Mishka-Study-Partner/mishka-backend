/** Shared OpenAPI / Swagger example values (not used at runtime by the API). */

const UUID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const UUID2 = "8b2c4e10-9d3a-4f1e-bc7a-1a2b3c4d5e6f";

const exampleUser = {
  id: UUID,
  firstName: "Norhan",
  lastName: "Mohamed",
  fullName: "Norhan Mohamed",
  username: "norhan_mohamed",
  email: "norhankandil160@gmail.com",
  phoneNumber: "1000000000",
  countryCode: "+20",
  rememberMe: false,
  agreeTerms: true,
  provider: null,
  providerId: null,
  role: "student",
  isVerified: true,
  profileImageUrl: null,
  gender: "female",
  educationStatus: "university",
  educationOtherDetail: null,
  schoolTrack: null,
  schoolGrade: null,
  universityYear: 5,
  createdAt: "2026-05-05T10:00:00.000Z",
  updatedAt: "2026-05-05T10:00:00.000Z",
};

const authDataExample = {
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature",
  tokenType: "Bearer",
  expiresIn: "7d",
  user: exampleUser,
};

const envelopeSuccess = (data) => ({
  success: true,
  message: "OK",
  message_en: "OK",
  message_ar: "تم",
  data,
  error: null,
  details: null,
});

const envelopeError = (error, details = null) => ({
  success: false,
  message: "Human-readable summary (language from Accept-Language when available)",
  message_en: "Human-readable summary",
  message_ar: "ملخص قابل للقراءة",
  data: null,
  error,
  details,
});

const registerRequestExample = {
  firstName: "Norhan",
  lastName: "Mohamed",
  email: "norhankandil160@gmail.com",
  password: "Str0ng!Pass",
  agreeTerms: true,
  rememberMe: true,
  phoneNumber: "1000000000",
  countryCode: "+20",
  gender: "female",
  educationStatus: "university",
  universityYear: 5,
};

const preferenceExample = {
  id: UUID,
  userId: UUID,
  language: "Arabic",
  theme: "light",
  notificationsEnabled: true,
  updatedAt: "2026-05-05T12:00:00.000Z",
};

const loginRequestExample = {
  email: "norhankandil160@gmail.com",
  password: "Str0ng!Pass",
  rememberMe: false,
};

const aiChatRequestExample = {
  session_id: UUID,
  message: "Summarize the main idea in two sentences.",
};

const aiGenerateToolsRequestExample = {
  session_id: UUID,
  tool_type: "flashcards",
  complexity: "Intermediate",
};

const listExample = [
  { id: UUID, title: "Plan your week", sortOrder: 0 },
  { id: UUID2, title: "Review notes", sortOrder: 1 },
];

/** `GET /saved-quizzes/{id}` — same shape as list rows; `id` path param is this quiz `id`. */
const savedQuizDetailExample = {
  id: UUID,
  userId: UUID,
  title: "Cell biology quick check",
  sourceType: "tutor",
  sourceReference: null,
  chatSessionId: UUID2,
  savedAt: "2026-05-08T10:00:00.000Z",
  totalQuestions: 1,
  createdAt: "2026-05-08T09:00:00.000Z",
  questions: [
    {
      id: "9b2c4e10-9d3a-4f1e-bc7a-1a2b3c4d5e7a",
      quizId: UUID,
      questionText: "Primary energy currency of the cell?",
      optionA: "ATP",
      optionB: "DNA",
      optionC: "Glucose",
      optionD: "RNA",
      correctOption: "A",
      createdAt: "2026-05-08T09:00:00.000Z",
    },
  ],
};

const savedFlashcardSetDetailExample = {
  id: UUID,
  userId: UUID,
  title: "Latin roots",
  sourceType: "tutor",
  sourceReference: null,
  chatSessionId: UUID2,
  savedAt: "2026-05-08T10:00:00.000Z",
  createdAt: "2026-05-08T09:00:00.000Z",
  flashcards: [
    {
      id: "ab2c4e10-9d3a-4f1e-bc7a-1a2b3c4d5e7b",
      setId: UUID,
      question: "Meaning of *aqua*?",
      answer: "Water",
      createdAt: "2026-05-08T09:00:00.000Z",
    },
  ],
};

const savedSummaryDetailExample = {
  id: UUID,
  userId: UUID,
  sourceType: "tutor",
  sourceReference: null,
  summaryText: "Chapter 3 recap: photosynthesis converts light to chemical energy…",
  chatSessionId: UUID2,
  savedAt: "2026-05-08T10:00:00.000Z",
  createdAt: "2026-05-08T09:00:00.000Z",
};

const savedMindMapDetailExample = {
  id: UUID,
  userId: UUID,
  title: "Exam topics",
  content: {
    title: "Exam topics",
    children: [{ title: "Cells", children: [] }, { title: "Genetics", children: [] }],
  },
  sourceType: "ai_gemini",
  sourceReference: null,
  chatSessionId: UUID2,
  savedAt: "2026-05-08T10:00:00.000Z",
  createdAt: "2026-05-08T09:00:00.000Z",
};

const appPublicSettingsExample = {
  id: "default",
  privacyPolicyText: "# Privacy Policy\n\nYour privacy matters to us.",
  supportEmail: "support@mishka.app",
  supportPhone: "+201234567890",
  supportFacebookUrl: "https://facebook.com/mishka",
  supportInstagramUrl: "https://instagram.com/mishka",
  updatedAt: "2026-05-14T12:00:00.000Z",
};

const updateAppPublicSettingsExample = {
  supportEmail: "support@mishka.app",
  supportPhone: "+201234567890",
  supportFacebookUrl: "https://facebook.com/mishka",
  supportInstagramUrl: "https://instagram.com/mishka",
};

module.exports = {
  UUID,
  UUID2,
  exampleUser,
  appPublicSettingsExample,
  updateAppPublicSettingsExample,
  authDataExample,
  envelopeSuccess,
  envelopeError,
  registerRequestExample,
  preferenceExample,
  loginRequestExample,
  aiChatRequestExample,
  aiGenerateToolsRequestExample,
  listExample,
  savedQuizDetailExample,
  savedFlashcardSetDetailExample,
  savedSummaryDetailExample,
  savedMindMapDetailExample,
  rootData: {
    name: "Mishka API",
    status: "ok",
    docs: "The root URL returns this JSON. Open Swagger UI at /api-docs (not here).",
    swaggerUi: "http://127.0.0.1:3000/api-docs",
    openApiJson: "http://127.0.0.1:3000/openapi.json",
  },
  validationDetails: [{ path: "email", message: "Invalid email" }],
  aiTutorUploadData: {
    session_id: UUID,
    explanation: "Summary of the uploaded document…",
  },
  aiTutorChatData: {
    response: "Here is the answer based on your material…",
  },
  aiTutorGenerateToolsData: {
    status: "success",
    tool_type: "flashcards",
    content: [{ type: "term", front: "Mitochondria", back: "Powerhouse of the cell" }],
  },

  /** Minimal Study With Mishka catalog shape (live `/catalog` returns full presets + media placeholders). */
  studyCatalogDataMinimal: {
    concentrationModes: [
      {
        id: "classic_pomodoro",
        title: "Classic Pomodoro",
        defaults: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, pomodorosBeforeLongBreak: 4 },
      },
    ],
    callWithMishka: {
      id: "call_with_mishka",
      summary: "Study during a mascot video call — telemetry + ML JSON only (no raw video on API).",
    },
    checkInKinds: [{ kind: "still_there_yes_no", labelKey: "study.check_in.still_there", responseType: "bool" }],
  },

  studyStatsSummaryData: {
    completedTotal: 42,
    completedLast30Days: 8,
  },

  studyTimerPresetRow: {
    id: UUID,
    userId: UUID,
    name: "My 45/10",
    focusMinutes: 45,
    shortBreakMinutes: 10,
    longBreakMinutes: 20,
    pomodorosBeforeLongBreak: 4,
    createdAt: "2026-05-05T09:00:00.000Z",
    lastUsedAt: "2026-05-05T11:30:00.000Z",
  },

  studySessionRowExample: {
    id: UUID,
    userId: UUID,
    customPresetId: null,
    topLevelMode: "concentration",
    concentrationPreset: "classic_pomodoro",
    status: "active",
    phase: "focus",
    title: "Year 5 — midterm revision",
    taskEstimatedMinutes: 45,
    focusMinutesPlanned: 25,
    shortBreakMinutesPlanned: 5,
    longBreakMinutesPlanned: 15,
    cyclesTarget: null,
    cyclesCompleted: 1,
    pomodorosBeforeLongBreak: 4,
    pomodorosSinceLongBreak: 1,
    startedAt: "2026-05-05T12:00:00.000Z",
    endedAt: null,
    pausedAt: null,
    totalPausedSeconds: 0,
    currentPhaseStartedAt: "2026-05-05T12:10:00.000Z",
    lastCompletedFocusMinutes: 25,
    callBreakActive: false,
    callBreakStartedAt: null,
    totalCallBreakSeconds: 0,
    tags: ["exam", "math"],
    linkedTaskId: null,
    outcomeNotes: null,
    clientAppVersion: "1.4.2",
    platform: "android",
    createdAt: "2026-05-05T12:00:00.000Z",
    updatedAt: "2026-05-05T12:10:00.000Z",
    flowtimeBreakSuggestion: null,
    timerState: {
      serverNow: "2026-05-05T12:15:00.000Z",
      topLevelMode: "concentration",
      concentrationPreset: "classic_pomodoro",
      status: "active",
      phase: "focus",
      approximateMainStudySeconds: 870,
      caveats: ["…"],
    },
  },

  studyTelemetryInsertedData: { inserted: 3 },

  studyMlReportRowExample: {
    id: UUID2,
    sessionId: UUID,
    payload: { windowSeconds: 60, avgAttentionScore: 0.82 },
    schemaVersion: 1,
    createdAt: "2026-05-05T12:05:00.000Z",
  },

  studyFullReportDataMinimal: {
    exportMeta: {
      generatedAt: "2026-05-05T12:20:00.000Z",
      activityEventsReturned: 12,
      activityEventsTotal: 12,
      activityEventsTruncated: false,
      mlReportsReturned: 1,
      mlReportsTotal: 1,
      mlReportsTruncated: false,
      activityEventsLimit: 800,
      mlReportsLimit: 100,
    },
    session: { id: UUID, status: "active", topLevelMode: "concentration", timerState: { serverNow: "2026-05-05T12:20:00.000Z" } },
    catalogSnapshot: {
      concentrationPreset: { id: "classic_pomodoro", title: "Classic Pomodoro" },
      customPreset: null,
      callWithMishka: null,
      checkInKinds: [],
    },
    linkedTask: null,
    checkIns: [],
    activityEvents: [{ id: UUID2, eventType: "camera_enabled", payload: {}, createdAt: "2026-05-05T12:01:00.000Z" }],
    mlReports: [{ id: UUID2, payload: { avgAttentionScore: 0.8 }, schemaVersion: 1, createdAt: "2026-05-05T12:05:00.000Z" }],
    computed: {
      wallClockElapsedSeconds: 1200,
      approximateMainStudySeconds: 1100,
      checkInsCount: 0,
      mlReportsCount: 1,
      activityBucketsFiveMinute: [{ bucketStartIso: "2026-05-05T12:00:00.000Z", count: 3 }],
      lifecycleTimeline: { entries: [], pauseEpisodesApprox: 0, callBreakEpisodesApprox: 0 },
    },
  },

  studyReportsListDataMinimal: {
    total: 2,
    limit: 20,
    offset: 0,
    items: [{ exportMeta: { generatedAt: "2026-05-05T12:20:00.000Z" }, session: { id: UUID } }],
  },

  studyPeriodReportDataMinimal: {
    period: {
      kind: "day",
      label: "2026-05-05",
      startUtc: "2026-05-05T00:00:00.000Z",
      endUtc: "2026-05-06T00:00:00.000Z",
      timeZoneNote: "Bounds are UTC; day = calendar date in UTC.",
    },
    generatedAt: "2026-05-05T22:00:00.000Z",
    filters: {},
    totals: {
      sessionsStarted: 2,
      byStatus: { active: 0, paused: 0, completed: 2, abandoned: 0 },
      byTopLevelMode: { concentration: 2, call_with_mishka: 0 },
      sumApproximateMainStudySeconds: 5400,
      totalCheckIns: 4,
      totalMlReports: 2,
      activityEventCounts: { camera_enabled: 6 },
    },
    sessionSummaries: [
      {
        id: UUID,
        title: "Morning focus",
        topLevelMode: "concentration",
        status: "completed",
        approximateMainStudySeconds: 2700,
        counts: { checkIns: 2, activityEvents: 10, mlReports: 1 },
      },
    ],
    userContext: {
      dailyStreak: { currentStreak: 5, longestStreak: 14, freezesRemaining: 2 },
      completedSessionsAllTime: 40,
      baselineAvgMainStudySecondsLast90d: 2400,
      periodAvgApproximateMainStudySeconds: 2700,
      periodVsBaselineAvgPercent: 12.5,
    },
  },

  studyYearReportDataMinimal: {
    period: {
      kind: "year",
      label: "2026",
      startUtc: "2026-01-01T00:00:00.000Z",
      endUtc: "2027-01-01T00:00:00.000Z",
    },
    generatedAt: "2026-05-24T12:00:00.000Z",
    filters: { topLevelMode: "all" },
    totals: {
      sessionsStarted: 48,
      sumApproximateMainStudySeconds: 86400,
      byTopLevelMode: { concentration: 30, call_with_mishka: 18 },
    },
    monthlyBuckets: [
      {
        label: "2026-01",
        month: 1,
        year: 2026,
        totals: { sessionsStarted: 4, sumApproximateMainStudySeconds: 7200, byTopLevelMode: { concentration: 3, call_with_mishka: 1 } },
      },
    ],
  },

  taskCompletionsReportDataMinimal: {
    periodStart: "2026-05-19T00:00:00.000Z",
    periodEnd: "2026-05-27T00:00:00.000Z",
    granularity: "day",
    buckets: [
      { label: "2026-05-19", completedCount: 2 },
      { label: "2026-05-20", completedCount: 0 },
    ],
    totalCompleted: 2,
  },

  aiUsageReportDataMinimal: {
    quizzes: 12,
    flashcards: 8,
    summaries: 5,
    mindMaps: 3,
    periodStart: "2026-05-01T00:00:00.000Z",
    periodEnd: "2026-06-01T00:00:00.000Z",
  },

  dailyStreakHistoryDataMinimal: {
    periodStart: "2026-05-01",
    periodEnd: "2026-05-07",
    currentStreak: 5,
    longestStreak: 14,
    freezesRemaining: 2,
    days: [
      { date: "2026-05-01", status: "completed", state: "past_done" },
      { date: "2026-05-02", status: null, state: "past_missed" },
    ],
  },

  studyReportExportDataMinimal: {
    exportId: UUID,
    pdfUrl: "https://mishka-backend-production.up.railway.app/study-with-mishka/reports/export/00000000-0000-4000-8000-000000000001?token=eyJhbG…",
    expiresAt: "2026-06-06T12:00:00.000Z",
    periodLabel: "Week of 2026-05-19 (UTC)",
    delivery: "download",
    emailedTo: null,
  },

  yourReportExportDataMinimal: {
    reportId: UUID,
    periodLabel: "Jun 1, 2026 – Jun 7, 2026",
    pdfUrl: "https://fleshy-lemon-persevere.ngrok-free.dev/reports/your-report/export/00000000-0000-4000-8000-000000000001?token=eyJhbG…",
    expiresAt: "2026-06-08T12:00:00.000Z",
    emailedTo: "norhan.moh@gmail.com",
    emailSentAt: "2026-06-02T10:00:00.000Z",
    delivery: "both",
  },

  userPreferenceMeDataMinimal: {
    id: UUID,
    userId: UUID,
    language: "English",
    theme: "light",
    notificationsEnabled: true,
    reportEmailAutoEnabled: true,
    reportEmailFrequency: "weekly",
    reportEmailLocale: "en",
    reportEmailRecipient: "norhan.moh@gmail.com",
    reportEmailLastSentAt: null,
    reportEmailLastPeriodKey: null,
    updatedAt: "2026-06-02T10:00:00.000Z",
    reportEmail: {
      reportEmailAutoEnabled: true,
      reportEmailFrequency: "weekly",
      reportEmailLocale: "en",
      accountEmail: "norhan.moh99@gmail.com",
      reportEmailRecipient: "norhan.moh@gmail.com",
      usingCustomRecipient: true,
      effectiveRecipientEmail: "norhan.moh@gmail.com",
      reportEmailLastSentAt: null,
      reportEmailLastPeriodKey: null,
    },
  },
};
