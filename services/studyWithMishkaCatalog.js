/**
 * Static catalog for Study With Mishka — Flutter reads GET /study-with-mishka/catalog.
 * Replace media URLs via env STUDY_WITH_MISHKA_MEDIA_BASE or swap to CDN paths.
 */

const MEDIA_BASE =
  (typeof process.env.STUDY_WITH_MISHKA_MEDIA_BASE === "string" && process.env.STUDY_WITH_MISHKA_MEDIA_BASE.trim()) ||
  "https://cdn.example.com/study-with-mishka";

function asset(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${MEDIA_BASE}${p}`;
}

/** Per-phase visuals for concentration cycles (focus / breaks). */
function standardStages(prefix) {
  return [
    {
      phase: "focus",
      labelKey: "focus",
      mediaType: "image",
      url: asset(`${prefix}/focus.png`),
      animatedUrl: asset(`${prefix}/focus.webp`),
      videoUrl: null,
    },
    {
      phase: "short_break",
      labelKey: "short_break",
      mediaType: "image",
      url: asset(`${prefix}/short_break.png`),
      animatedUrl: asset(`${prefix}/short_break.webp`),
      videoUrl: null,
    },
    {
      phase: "long_break",
      labelKey: "long_break",
      mediaType: "image",
      url: asset(`${prefix}/long_break.png`),
      animatedUrl: asset(`${prefix}/long_break.webp`),
      videoUrl: null,
    },
  ];
}

const concentrationModes = [
  {
    id: "classic_pomodoro",
    name: "Classic Pomodoro",
    tagline: "Baseline timer — familiar and easy to start.",
    description:
      "Structured focus blocks with short rests and a longer break after several rounds. Helps beat procrastination with a clear rhythm.",
    structureSummary: "Default 25 min focus / 5 min short break; after 4 pomodoros → long break (default 15 min). Users may customize focus length.",
    defaults: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      pomodorosBeforeLongBreak: 4,
      cyclesTarget: null,
    },
    customizable: {
      focusMinutesMin: 15,
      focusMinutesMax: 60,
      shortBreakMinutesMin: 3,
      shortBreakMinutesMax: 15,
      longBreakMinutesMin: 10,
      longBreakMinutesMax: 30,
    },
    recommendations: [
      "Pair with streaks and “sessions completed” in the app summary.",
      "Let users tweak focus 15–60 min while keeping short/long break ratios sensible.",
      "After long break, reset pomodoro count toward the next long break.",
    ],
    flowHints: {
      supportsPauseResume: true,
      supportsCycles: true,
      timeboxedFocus: true,
    },
    stages: standardStages("pomodoro"),
  },
  {
    id: "flowtime",
    name: "Flowtime",
    tagline: "Stop when tired — matches real deep work.",
    description:
      "User starts focus and ends when energy drops; then logs or accepts a suggested break length. Fits developers and designers doing deep work.",
    structureSummary: "No fixed focus duration; optional smart break hints based on last focus segment.",
    defaults: {
      focusMinutes: null,
      shortBreakMinutes: 10,
      longBreakMinutes: 20,
      pomodorosBeforeLongBreak: 4,
      cyclesTarget: null,
    },
    smartBreakSuggestionRules: [
      { whenFocusUnderMinutes: 25, suggestedBreakMinutes: 5, reason: "short_focus_segment" },
      { whenFocusAtLeastMinutes: 60, suggestedBreakMinutes: 20, reason: "deep_focus_segment" },
      { fallbackSuggestedBreakMinutes: 10, reason: "default_flow_gap" },
    ],
    recommendations: [
      "Expose suggested break minutes after each focus segment (server echoes rules in catalog).",
      "Let users override suggestion with one tap.",
    ],
    flowHints: {
      supportsPauseResume: true,
      supportsCycles: false,
      timeboxedFocus: false,
    },
    stages: standardStages("flowtime"),
  },
  {
    id: "ultradian",
    name: "Ultradian rhythm",
    tagline: "~90 minute biological cycles.",
    description:
      "Aligns with natural ultradian rhythms: a longer deep-work block followed by a restorative break.",
    structureSummary: "Default 90 min focus; 20–30 min break (defaults configurable).",
    defaults: {
      focusMinutes: 90,
      shortBreakMinutes: 25,
      longBreakMinutes: 25,
      pomodorosBeforeLongBreak: 1,
      cyclesTarget: null,
    },
    customizable: {
      focusMinutesMin: 75,
      focusMinutesMax: 120,
      longBreakMinutesMin: 20,
      longBreakMinutesMax: 35,
    },
    recommendations: ["Best for heavy thinking: exams, coding marathons, complex reading."],
    flowHints: {
      supportsPauseResume: true,
      supportsCycles: false,
      timeboxedFocus: true,
    },
    stages: standardStages("ultradian"),
  },
  {
    id: "quick_sprint",
    name: "Quick sprint",
    tagline: '“Just start” mode.',
    description:
      "Very short focus bursts with tiny breaks — lowers friction when motivation is low.",
    structureSummary: "Default ~12 min focus; ~3 min short break.",
    defaults: {
      focusMinutes: 12,
      shortBreakMinutes: 3,
      longBreakMinutes: 12,
      pomodorosBeforeLongBreak: 4,
      cyclesTarget: null,
    },
    customizable: {
      focusMinutesMin: 10,
      focusMinutesMax: 15,
      shortBreakMinutesMin: 2,
      shortBreakMinutesMax: 5,
    },
    recommendations: ["Market as overcoming resistance; stack multiple sprints if needed."],
    flowHints: {
      supportsPauseResume: true,
      supportsCycles: true,
      timeboxedFocus: true,
    },
    stages: standardStages("quick_sprint"),
  },
  {
    id: "task_based",
    name: "Task-based",
    tagline: "Timer follows the task, not only the clock.",
    description:
      "User picks a concrete task; session stays in focus until they mark complete (with optional estimate vs actual later).",
    structureSummary: "Single focus phase until completion; breaks optional after completion.",
    defaults: {
      focusMinutes: null,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      pomodorosBeforeLongBreak: 4,
      cyclesTarget: null,
    },
    recommendations: [
      "Collect optional estimated minutes vs actual duration when task completes.",
      "Pair completion with lightweight rewards / animations on the client.",
    ],
    flowHints: {
      supportsPauseResume: true,
      supportsCycles: false,
      timeboxedFocus: false,
    },
    stages: standardStages("task_based"),
  },
  {
    id: "custom",
    name: "Custom timer",
    tagline: "Saved lengths — study / short break / long break.",
    description:
      "Uses user-defined minute lengths (including presets saved under GET /study-with-mishka/custom-timers). Same pause / resume / end as other modes.",
    defaults: {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      pomodorosBeforeLongBreak: 4,
      cyclesTarget: null,
    },
    recommendations: ["Surface recently used presets sorted by lastUsedAt."],
    flowHints: {
      supportsPauseResume: true,
      supportsCycles: true,
      timeboxedFocus: true,
    },
    stages: standardStages("custom"),
  },
];

const callWithMishka = {
  id: "call_with_mishka",
  name: "Call with Mishka",
  description:
    "Video-call-style UI: mascot stream on one side and the device camera preview on the other. **No continuous video recording** is stored on the server — processing stays on-device or in your ML pipeline; only **aggregated focus reports** should be POSTed as JSON.",
  uiLayout: {
    mascotVideo: "Remote-style Mishka character loop (asset or stream URL from your CDN).",
    userCameraPreview: "Local preview only by default; user may **open or close** the camera anytime.",
  },
  mlPipeline: {
    summary:
      "Run attention / gaze / posture (your model) on frames locally or via ephemeral inference; send compact scores or intervals to **POST …/ml-reports**.",
    privacyNote:
      "Do not upload raw video to this REST API; store only structured metrics (e.g. average focus score, drift events).",
  },
  timers: {
    mainSession:
      "Elapsed wall time from session **start** until **end call**; respects global **pause/resume** (`totalPausedSeconds`).",
    callBreak:
      "Parallel **call break** timer: **POST …/call-break/start** and **…/call-break/end** (totals into `totalCallBreakSeconds`) without abandoning the call — then resume main study timer until hang up.",
  },
  telemetrySuggestions: [
    "camera_enabled — user turned preview on",
    "camera_disabled — user turned preview off",
    "call_break_start / call_break_end — optional duplicates of server break endpoints",
    "navigation_feature_open — user opened another tab while timer runs",
  ],
  stages: [
    {
      phase: "session",
      labelKey: "with_mishka",
      mediaType: "video",
      url: asset("call/mascot_loop.mp4"),
      animatedUrl: asset("call/mascot_loop.webp"),
      videoUrl: asset("call/mascot_loop.mp4"),
    },
    {
      phase: "focus",
      labelKey: "focus_with_coach",
      mediaType: "image",
      url: asset("call/focus.png"),
      animatedUrl: asset("call/focus.webp"),
      videoUrl: null,
    },
    {
      phase: "short_break",
      labelKey: "call_break",
      mediaType: "image",
      url: asset("call/break.png"),
      animatedUrl: asset("call/break.webp"),
      videoUrl: null,
    },
  ],
};

function flowtimeSuggestion(lastCompletedFocusMinutes) {
  if (lastCompletedFocusMinutes == null || Number.isNaN(lastCompletedFocusMinutes)) return null;
  const m = Math.floor(Number(lastCompletedFocusMinutes));
  if (m < 25) return { suggestedBreakMinutes: 5, reason: "short_focus_segment" };
  if (m >= 90) return { suggestedBreakMinutes: 25, reason: "very_deep_focus" };
  if (m >= 60) return { suggestedBreakMinutes: 20, reason: "deep_focus_segment" };
  return { suggestedBreakMinutes: 10, reason: "default_flow_gap" };
}

function getCatalog() {
  return {
    mediaBaseNote:
      "URLs are placeholders until STUDY_WITH_MISHKA_MEDIA_BASE points at your CDN. Animated assets may use WebP/APNG client-side.",
    topLevelModes: [
      {
        id: "concentration",
        description: "Timers, phases (focus / breaks), pomodoros, check-ins.",
      },
      {
        id: "call_with_mishka",
        description: callWithMishka.description,
      },
    ],
    concentrationModes,
    callWithMishka,
    checkInKinds: [
      {
        kind: "still_there_yes_no",
        prompt: "Are you still there?",
        responseType: "boolean",
      },
      {
        kind: "mood_scale_5",
        prompt: "How is your mood while studying?",
        responseType: "integer",
        min: 1,
        max: 5,
        labels: { 1: "bad", 5: "super happy" },
      },
      {
        kind: "mood_scale_10",
        prompt: "How is your mood while studying?",
        responseType: "integer",
        min: 1,
        max: 10,
        labels: { 1: "bad", 10: "super happy" },
      },
      {
        kind: "progress_yes_no",
        prompt: "Making good progress today?",
        responseType: "boolean",
      },
    ],
  };
}

module.exports = {
  getCatalog,
  flowtimeSuggestion,
  MEDIA_BASE,
};
