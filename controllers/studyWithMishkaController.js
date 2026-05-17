const { Prisma } = require("@prisma/client");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { badRequest, notFound, forbidden, HttpError } = require("../utils/httpError");
const { normalizeTags } = require("../utils/studySessionMeta");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const { getCatalog, flowtimeSuggestion } = require("../services/studyWithMishkaCatalog");
const { buildStudySessionFullReport } = require("../services/studySessionFullReportService");
const { computeStudyTimerState } = require("../services/studyTimerStateService");
const {
  reportForDay,
  reportForWeek,
  reportForMonth,
} = require("../services/studyPeriodReportService");

function catalogMode(id) {
  const cat = getCatalog();
  return cat.concentrationModes.find((m) => m.id === id);
}

async function loadOwnedSession(req, sessionId) {
  const row = await prisma.studyConcentrationSession.findUnique({
    where: { id: sessionId },
    include: { checkIns: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!row || row.userId !== req.auth.sub) throw notFound();
  return row;
}

async function assertOwnedTask(userId, taskId) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) throw forbidden("Task not found or not yours", "FORBIDDEN");
  return task;
}

function enrichSession(row) {
  const base = { ...row };
  let suggestion = null;
  if (row.concentrationPreset === "flowtime") {
    suggestion = flowtimeSuggestion(row.lastCompletedFocusMinutes);
  }
  return {
    ...base,
    flowtimeBreakSuggestion: suggestion,
    timerState: computeStudyTimerState(row),
  };
}

exports.getCatalog = asyncHandler(async (_req, res) => {
  res.apiSuccess(getCatalog(), "OK", 200);
});

exports.listCustomTimers = asyncHandler(async (req, res) => {
  const rows = await prisma.studyCustomTimerPreset.findMany({
    where: { userId: req.auth.sub },
    orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
    take: 30,
  });
  res.apiSuccess(rows, "OK", 200);
});

exports.createCustomTimer = asyncHandler(async (req, res) => {
  const {
    name,
    focusMinutes,
    shortBreakMinutes,
    longBreakMinutes,
    pomodorosBeforeLongBreak = 4,
  } = req.body;
  const row = await prisma.studyCustomTimerPreset.create({
    data: {
      userId: req.auth.sub,
      name: name != null ? String(name).trim().slice(0, 120) || null : null,
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      pomodorosBeforeLongBreak,
      lastUsedAt: new Date(),
    },
  });
  res.apiCreated(row, "CREATED");
});

exports.deleteCustomTimer = asyncHandler(async (req, res) => {
  const row = await prisma.studyCustomTimerPreset.findUnique({ where: { id: req.params.id } });
  if (!row || row.userId !== req.auth.sub) throw notFound();
  await prisma.studyCustomTimerPreset.delete({ where: { id: row.id } });
  res.apiSuccess({ deleted: true }, "OK", 200);
});

/** Paginated merged reports (same shape as GET …/sessions/:id/full-report) for concentration + call modes. */
exports.getReportDay = asyncHandler(async (req, res) => {
  const dateStr = req.query.date;
  if (!dateStr || typeof dateStr !== "string") {
    throw badRequest("Query date=YYYY-MM-DD (UTC) is required", undefined, "VALIDATION_ERROR");
  }
  const mode = req.query.topLevelMode;
  const report = await reportForDay(req.auth.sub, dateStr, {
    topLevelMode: mode === "call_with_mishka" || mode === "concentration" ? mode : undefined,
  });
  if (!report) throw badRequest("Invalid date", undefined, "VALIDATION_ERROR");
  res.apiSuccess(report, "OK", 200);
});

exports.getReportWeek = asyncHandler(async (req, res) => {
  const dateStr = req.query.date;
  if (!dateStr || typeof dateStr !== "string") {
    throw badRequest("Query date=YYYY-MM-DD (UTC week containing this date)", undefined, "VALIDATION_ERROR");
  }
  const mode = req.query.topLevelMode;
  const report = await reportForWeek(req.auth.sub, dateStr, {
    topLevelMode: mode === "call_with_mishka" || mode === "concentration" ? mode : undefined,
  });
  if (!report) throw badRequest("Invalid date", undefined, "VALIDATION_ERROR");
  res.apiSuccess(report, "OK", 200);
});

exports.getReportMonth = asyncHandler(async (req, res) => {
  const year = req.query.year;
  const month = req.query.month;
  const mode = req.query.topLevelMode;
  const report = await reportForMonth(req.auth.sub, year, month, {
    topLevelMode: mode === "call_with_mishka" || mode === "concentration" ? mode : undefined,
  });
  if (!report) throw badRequest("Invalid year/month", undefined, "VALIDATION_ERROR");
  res.apiSuccess(report, "OK", 200);
});

exports.listReports = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);
  const mode = req.query.topLevelMode;
  const where = { userId: req.auth.sub };
  if (mode === "call_with_mishka" || mode === "concentration") {
    where.topLevelMode = mode;
  }

  const [total, sessions] = await Promise.all([
    prisma.studyConcentrationSession.count({ where }),
    prisma.studyConcentrationSession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: offset,
      take: limit,
      select: { id: true },
    }),
  ]);

  const items = await Promise.all(sessions.map((s) => buildStudySessionFullReport(req.auth.sub, s.id)));
  res.apiSuccess({ total, limit, offset, items }, "OK", 200);
});

exports.statsSummary = asyncHandler(async (req, res) => {
  const uid = req.auth.sub;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const [completedTotal, completedLast30d] = await Promise.all([
    prisma.studyConcentrationSession.count({
      where: { userId: uid, status: "completed" },
    }),
    prisma.studyConcentrationSession.count({
      where: { userId: uid, status: "completed", endedAt: { gte: since } },
    }),
  ]);
  res.apiSuccess({ completedTotal, completedLast30Days: completedLast30d }, "OK", 200);
});

exports.listSessions = asyncHandler(async (req, res) => {
  const rows = await prisma.studyConcentrationSession.findMany({
    where: { userId: req.auth.sub },
    orderBy: { startedAt: "desc" },
    take: 80,
  });
  res.apiSuccess(rows.map(enrichSession), "OK", 200);
});

exports.getSession = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  res.apiSuccess(enrichSession(row), "OK", 200);
});

function planFromPreset(body, presetRow) {
  const modeMeta = body.concentrationPreset ? catalogMode(body.concentrationPreset) : null;
  const ov = body.customOverrides || {};

  if (body.topLevelMode === "call_with_mishka") {
    return {
      concentrationPreset: null,
      phase: "focus",
      focusMinutesPlanned: null,
      shortBreakMinutesPlanned: null,
      longBreakMinutesPlanned: null,
      cyclesTarget: ov.cyclesTarget ?? null,
      pomodorosBeforeLongBreak: ov.pomodorosBeforeLongBreak ?? 4,
    };
  }

  if (!body.concentrationPreset) {
    throw badRequest("concentrationPreset is required when topLevelMode is concentration", undefined, "VALIDATION_ERROR");
  }

  let focus = modeMeta?.defaults?.focusMinutes ?? null;
  let shortB = modeMeta?.defaults?.shortBreakMinutes ?? 5;
  let longB = modeMeta?.defaults?.longBreakMinutes ?? 15;
  let pomos = modeMeta?.defaults?.pomodorosBeforeLongBreak ?? 4;
  let cyclesTarget = modeMeta?.defaults?.cyclesTarget ?? ov.cyclesTarget ?? null;

  if (presetRow) {
    focus = presetRow.focusMinutes;
    shortB = presetRow.shortBreakMinutes;
    longB = presetRow.longBreakMinutes;
    pomos = presetRow.pomodorosBeforeLongBreak;
  }

  if (ov.focusMinutes != null) focus = ov.focusMinutes;
  if (ov.shortBreakMinutes != null) shortB = ov.shortBreakMinutes;
  if (ov.longBreakMinutes != null) longB = ov.longBreakMinutes;
  if (ov.pomodorosBeforeLongBreak != null) pomos = ov.pomodorosBeforeLongBreak;
  if (ov.cyclesTarget != null) cyclesTarget = ov.cyclesTarget;

  const presetId = body.concentrationPreset;

  if (presetId === "flowtime" || presetId === "task_based") {
    focus = focus ?? null;
  }

  if (presetId === "task_based") {
    cyclesTarget = null;
  }

  if (presetId === "custom" && !presetRow && ov.focusMinutes == null) {
    throw badRequest("customOverrides.focusMinutes required when using custom without customPresetId", undefined, "VALIDATION_ERROR");
  }

  let phase = "focus";
  if (presetId === "flowtime" || presetId === "task_based") phase = "focus";
  if (focus == null && (presetId === "flowtime" || presetId === "task_based")) {
    phase = "focus";
  }

  return {
    concentrationPreset: presetId,
    phase,
    focusMinutesPlanned: focus,
    shortBreakMinutesPlanned: shortB,
    longBreakMinutesPlanned: longB,
    cyclesTarget,
    pomodorosBeforeLongBreak: pomos,
  };
}

exports.startSession = asyncHandler(async (req, res) => {
  const body = req.body;
  const existing = await prisma.studyConcentrationSession.findFirst({
    where: { userId: req.auth.sub, status: { in: ["active", "paused"] } },
  });
  if (existing) {
    throw badRequest("Pause or end your current session before starting another", undefined, "VALIDATION_ERROR");
  }

  let presetRow = null;
  if (body.customPresetId) {
    presetRow = await prisma.studyCustomTimerPreset.findUnique({ where: { id: body.customPresetId } });
    if (!presetRow || presetRow.userId !== req.auth.sub) throw forbidden("Invalid custom preset", "FORBIDDEN");
    await prisma.studyCustomTimerPreset.update({
      where: { id: presetRow.id },
      data: { lastUsedAt: new Date() },
    });
  }

  const title = body.title != null ? String(body.title).trim().slice(0, 200) : null;
  if (body.topLevelMode === "concentration" && body.concentrationPreset === "task_based") {
    if (!title || title.length === 0) {
      throw badRequest("title is required for task_based mode", undefined, "VALIDATION_ERROR");
    }
  }

  let linkedTaskId = null;
  if (body.linkedTaskId) {
    await assertOwnedTask(req.auth.sub, body.linkedTaskId);
    linkedTaskId = body.linkedTaskId;
  }

  const tags = normalizeTags(body.tags);
  const clientAppVersion =
    body.clientAppVersion != null ? String(body.clientAppVersion).trim().slice(0, 40) || null : null;
  const platform = body.platform != null ? String(body.platform).trim().slice(0, 40) || null : null;

  const plan = planFromPreset(body, presetRow);

  const now = new Date();
  let row;
  try {
    row = await prisma.studyConcentrationSession.create({
      data: {
        userId: req.auth.sub,
        customPresetId: presetRow?.id ?? null,
        topLevelMode: body.topLevelMode,
        concentrationPreset: plan.concentrationPreset,
        status: "active",
        phase: plan.phase,
        title,
        taskEstimatedMinutes: body.taskEstimatedMinutes ?? null,
        focusMinutesPlanned: plan.focusMinutesPlanned,
        shortBreakMinutesPlanned: plan.shortBreakMinutesPlanned,
        longBreakMinutesPlanned: plan.longBreakMinutesPlanned,
        cyclesTarget: plan.cyclesTarget,
        pomodorosBeforeLongBreak: plan.pomodorosBeforeLongBreak,
        pomodorosSinceLongBreak: 0,
        cyclesCompleted: 0,
        startedAt: now,
        currentPhaseStartedAt: now,
        ...(tags.length ? { tags } : {}),
        ...(linkedTaskId ? { linkedTaskId } : {}),
        ...(clientAppVersion ? { clientAppVersion } : {}),
        ...(platform ? { platform } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const showDetails = String(process.env.SHOW_ERROR_DETAILS || "").toLowerCase() === "true";
      const hint =
        e.code === "P2022" || /column/.test(String(e.message))
          ? "Database schema may be out of date — run `npx prisma migrate deploy` on production."
          : undefined;
      throw new HttpError(
        500,
        "Failed to create study session",
        showDetails
          ? { step: "studyConcentrationSession.create", prismaCode: e.code, failureHint: hint, developerMessage: e.message }
          : hint
            ? { failureHint: hint }
            : undefined,
        "STUDY_SESSION_START_FAILED"
      );
    }
    throw e;
  }

  void recordDailyStreakActivity(req.auth.sub).catch((err) => console.error("[dailyStreak]", err?.message || err));
  res.apiCreated(enrichSession(row), "CREATED");
});

exports.pauseSession = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  if (row.status !== "active") throw badRequest("Session is not active", undefined, "VALIDATION_ERROR");
  const updated = await prisma.studyConcentrationSession.update({
    where: { id: row.id },
    data: { status: "paused", pausedAt: new Date() },
  });
  res.apiSuccess(enrichSession(updated), "OK", 200);
});

exports.resumeSession = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  if (row.status !== "paused") throw badRequest("Session is not paused", undefined, "VALIDATION_ERROR");
  let addPause = 0;
  if (row.pausedAt) {
    addPause = Math.max(0, Math.floor((Date.now() - row.pausedAt.getTime()) / 1000));
  }
  const updated = await prisma.studyConcentrationSession.update({
    where: { id: row.id },
    data: {
      status: "active",
      pausedAt: null,
      totalPausedSeconds: row.totalPausedSeconds + addPause,
      currentPhaseStartedAt: row.currentPhaseStartedAt ?? new Date(),
    },
  });
  res.apiSuccess(enrichSession(updated), "OK", 200);
});

exports.endSession = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  if (row.status === "completed" || row.status === "abandoned") {
    throw badRequest("Session already ended", undefined, "VALIDATION_ERROR");
  }
  const outcome = req.body?.outcome === "abandoned" ? "abandoned" : "completed";
  let addPause = 0;
  if (row.pausedAt) {
    addPause = Math.max(0, Math.floor((Date.now() - row.pausedAt.getTime()) / 1000));
  }
  let extraBreak = 0;
  let clearBreak = {};
  if (row.callBreakActive) {
    if (row.callBreakStartedAt) {
      extraBreak = Math.max(0, Math.floor((Date.now() - row.callBreakStartedAt.getTime()) / 1000));
    }
    clearBreak = {
      callBreakActive: false,
      callBreakStartedAt: null,
      totalCallBreakSeconds: row.totalCallBreakSeconds + extraBreak,
    };
  }
  const outcomeNotes =
    req.body?.outcomeNotes != null ? String(req.body.outcomeNotes).trim().slice(0, 2000) : undefined;

  const updated = await prisma.studyConcentrationSession.update({
    where: { id: row.id },
    data: {
      status: outcome,
      endedAt: new Date(),
      pausedAt: null,
      totalPausedSeconds: row.totalPausedSeconds + addPause,
      ...(outcomeNotes !== undefined && outcomeNotes !== "" ? { outcomeNotes } : {}),
      ...clearBreak,
    },
  });
  if (outcome === "completed") {
    void recordDailyStreakActivity(req.auth.sub).catch((err) => console.error("[dailyStreak]", err?.message || err));
  }
  res.apiSuccess(enrichSession(updated), "OK", 200);
});

exports.advancePhase = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  if (row.status !== "active") throw badRequest("Session must be active to change phase", undefined, "VALIDATION_ERROR");

  const { nextPhase, actualFocusMinutes, completedFocusCycle, resetAfterLongBreak } = req.body;

  let pomodorosSinceLongBreak = row.pomodorosSinceLongBreak;
  let cyclesCompleted = row.cyclesCompleted;

  if (completedFocusCycle) {
    cyclesCompleted += 1;
    pomodorosSinceLongBreak += 1;
  }
  if (resetAfterLongBreak) {
    pomodorosSinceLongBreak = 0;
  }

  const data = {
    phase: nextPhase,
    currentPhaseStartedAt: new Date(),
    pomodorosSinceLongBreak,
    cyclesCompleted,
  };
  if (actualFocusMinutes != null) {
    data.lastCompletedFocusMinutes = actualFocusMinutes;
  }

  const updated = await prisma.studyConcentrationSession.update({
    where: { id: row.id },
    data,
  });
  res.apiSuccess(enrichSession(updated), "OK", 200);
});

exports.submitCheckIn = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  if (row.status === "completed" || row.status === "abandoned") {
    throw badRequest("Cannot check in on ended session", undefined, "VALIDATION_ERROR");
  }

  const { kind, responseBool, responseInt } = req.body;

  if (kind === "still_there_yes_no" || kind === "progress_yes_no") {
    if (typeof responseBool !== "boolean") {
      throw badRequest("responseBool required", undefined, "VALIDATION_ERROR");
    }
  } else if (kind === "mood_scale_5") {
    const n = Number(responseInt);
    if (!Number.isInteger(n) || n < 1 || n > 5) throw badRequest("responseInt must be 1–5", undefined, "VALIDATION_ERROR");
  } else if (kind === "mood_scale_10") {
    const n = Number(responseInt);
    if (!Number.isInteger(n) || n < 1 || n > 10) throw badRequest("responseInt must be 1–10", undefined, "VALIDATION_ERROR");
  }

  const created = await prisma.studyConcentrationCheckIn.create({
    data: {
      sessionId: row.id,
      kind,
      responseBool: typeof responseBool === "boolean" ? responseBool : null,
      responseInt: responseInt != null ? Number(responseInt) : null,
    },
  });
  res.apiCreated(created, "CREATED");
});

exports.ingestTelemetry = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  const events = req.body.events;
  const rows = events.map((e) => {
    let clientTs = null;
    if (e.clientTs != null) {
      const d = new Date(e.clientTs);
      if (!Number.isNaN(d.getTime())) clientTs = d;
    }
    const base = {
      sessionId: row.id,
      eventType: String(e.eventType).slice(0, 80),
      clientTs,
    };
    if (e.payload != null && typeof e.payload === "object") {
      base.payload = e.payload;
    }
    return base;
  });
  await prisma.studySessionActivityEvent.createMany({ data: rows });
  res.apiSuccess({ inserted: rows.length }, "OK", 200);
});

exports.ingestMlReport = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  const payload = req.body.payload;
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    throw badRequest("payload object required", undefined, "VALIDATION_ERROR");
  }
  const schemaVersion =
    req.body.schemaVersion != null && Number.isFinite(Number(req.body.schemaVersion))
      ? Math.floor(Number(req.body.schemaVersion))
      : undefined;
  const created = await prisma.studySessionMlReport.create({
    data: {
      sessionId: row.id,
      payload,
      ...(schemaVersion != null && schemaVersion >= 1 ? { schemaVersion } : {}),
    },
  });
  res.apiCreated(created, "CREATED");
});

exports.patchSession = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  const body = req.body;
  const data = {};

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    data.title =
      body.title === null || body.title === ""
        ? null
        : String(body.title).trim().slice(0, 200) || null;
  }
  if (body.tags !== undefined) {
    data.tags = normalizeTags(body.tags);
  }
  if (Object.prototype.hasOwnProperty.call(body, "linkedTaskId")) {
    if (body.linkedTaskId === null) {
      data.linkedTaskId = null;
    } else {
      await assertOwnedTask(req.auth.sub, body.linkedTaskId);
      data.linkedTaskId = body.linkedTaskId;
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "clientAppVersion")) {
    data.clientAppVersion =
      body.clientAppVersion === null || body.clientAppVersion === ""
        ? null
        : String(body.clientAppVersion).trim().slice(0, 40) || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "platform")) {
    data.platform =
      body.platform === null || body.platform === ""
        ? null
        : String(body.platform).trim().slice(0, 40) || null;
  }

  const updated = await prisma.studyConcentrationSession.update({
    where: { id: row.id },
    data,
  });
  res.apiSuccess(enrichSession(updated), "OK", 200);
});

exports.callBreakStart = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  if (row.topLevelMode !== "call_with_mishka") {
    throw badRequest("Call break only for call_with_mishka sessions", undefined, "VALIDATION_ERROR");
  }
  if (row.status !== "active") throw badRequest("Session must be active", undefined, "VALIDATION_ERROR");
  if (row.callBreakActive) throw badRequest("Call break already active", undefined, "VALIDATION_ERROR");
  const updated = await prisma.studyConcentrationSession.update({
    where: { id: row.id },
    data: { callBreakActive: true, callBreakStartedAt: new Date() },
  });
  res.apiSuccess(enrichSession(updated), "OK", 200);
});

exports.callBreakEnd = asyncHandler(async (req, res) => {
  const row = await loadOwnedSession(req, req.params.id);
  if (row.topLevelMode !== "call_with_mishka") {
    throw badRequest("Call break only for call_with_mishka sessions", undefined, "VALIDATION_ERROR");
  }
  if (!row.callBreakActive) throw badRequest("No active call break", undefined, "VALIDATION_ERROR");
  let sec = req.body?.durationSeconds;
  if (sec != null && Number.isFinite(sec)) {
    sec = Math.max(0, Math.min(86400, Math.floor(Number(sec))));
  } else if (row.callBreakStartedAt) {
    sec = Math.max(0, Math.floor((Date.now() - row.callBreakStartedAt.getTime()) / 1000));
  } else {
    sec = 0;
  }
  const updated = await prisma.studyConcentrationSession.update({
    where: { id: row.id },
    data: {
      callBreakActive: false,
      callBreakStartedAt: null,
      totalCallBreakSeconds: row.totalCallBreakSeconds + sec,
    },
  });
  res.apiSuccess(enrichSession(updated), "OK", 200);
});

exports.getFullReport = asyncHandler(async (req, res) => {
  const data = await buildStudySessionFullReport(req.auth.sub, req.params.id);
  res.apiSuccess(data, "OK", 200);
});
