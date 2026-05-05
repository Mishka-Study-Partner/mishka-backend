/**
 * Pure helpers for Study With Mishka session / period reports (telemetry shaping,
 * check-in summaries, heuristic ML rollups, goals vs planned).
 */

const FIVE_MIN_MS = 5 * 60 * 1000;
const ML_NUMERIC_KEY_HINT = /score|focus|attention|confidence|engagement|fatigue|blink|yawn|distraction/i;

function eventTimeMs(ev) {
  if (ev.clientTs) return ev.clientTs.getTime();
  return ev.createdAt.getTime();
}

/** Wall-clock elapsed for session up to refDate (exclusive cap on ended sessions). */
function wallElapsedSeconds(session, refDate) {
  const start = session.startedAt.getTime();
  const cap = Math.min(refDate.getTime(), Date.now());
  const endMs = session.endedAt ? Math.min(session.endedAt.getTime(), cap) : cap;
  return Math.max(0, Math.floor((endMs - start) / 1000));
}

/** Mirrors timer-state main-study approximation using refDate instead of always "now". */
function approximateMainStudySecondsAt(session, refDate) {
  const elapsedWall = wallElapsedSeconds(session, refDate);
  let ongoingBreakSec = 0;
  if (!session.endedAt && session.callBreakActive && session.callBreakStartedAt) {
    const cap = Math.min(refDate.getTime(), Date.now());
    ongoingBreakSec = Math.max(0, Math.floor((cap - session.callBreakStartedAt.getTime()) / 1000));
  }
  if (session.status === "completed" || session.status === "abandoned") {
    const endMs = session.endedAt.getTime();
    return Math.max(0, Math.floor((endMs - session.startedAt.getTime()) / 1000) - session.totalPausedSeconds - session.totalCallBreakSeconds);
  }
  const elapsedUntilRef = Math.max(0, Math.floor((Math.min(refDate.getTime(), Date.now()) - session.startedAt.getTime()) / 1000));
  return Math.max(
    0,
    elapsedUntilRef - session.totalPausedSeconds - session.totalCallBreakSeconds - ongoingBreakSec
  );
}

/** Bucket counts keyed by ISO start-of-bucket (UTC) for charting. */
function buildFiveMinuteBuckets(events, sessionStartedAt, bucketMs = FIVE_MIN_MS) {
  if (!events.length) return [];
  const startMs = sessionStartedAt.getTime();
  const map = new Map();
  for (const ev of events) {
    const t = eventTimeMs(ev);
    const slot = Math.floor((t - startMs) / bucketMs);
    if (slot < 0) continue;
    const bucketStart = startMs + slot * bucketMs;
    const key = new Date(bucketStart).toISOString();
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([bucketStartIso, count]) => ({ bucketStartIso, count }));
}

/**
 * Ordered lifecycle hints from telemetry (best-effort; depends on client event types).
 */
function buildLifecycleTimeline(events) {
  const lifecycleTypes = new Set([
    "pause",
    "resume",
    "phase_change",
    "call_break_start",
    "call_break_end",
    "app_background",
    "app_foreground",
  ]);
  const sorted = [...events].sort((a, b) => eventTimeMs(a) - eventTimeMs(b));
  const entries = [];
  for (const ev of sorted) {
    if (!lifecycleTypes.has(ev.eventType)) continue;
    const ts = eventTimeMs(ev);
    entries.push({
      at: new Date(ts).toISOString(),
      eventType: ev.eventType,
      payload:
        ev.payload && typeof ev.payload === "object"
          ? ev.payload
          : ev.payload === null || ev.payload === undefined
            ? undefined
            : { value: ev.payload },
    });
  }

  let pauseEpisodes = 0;
  let openPause = false;
  let openBreak = false;
  let breakStarts = 0;
  for (const e of entries) {
    if (e.eventType === "pause" && !openPause) {
      openPause = true;
      pauseEpisodes += 1;
    } else if (e.eventType === "resume" && openPause) {
      openPause = false;
    }
    if (e.eventType === "call_break_start" && !openBreak) {
      openBreak = true;
      breakStarts += 1;
    } else if (e.eventType === "call_break_end" && openBreak) {
      openBreak = false;
    }
  }

  return { entries, pauseEpisodesApprox: pauseEpisodes, callBreakEpisodesApprox: breakStarts };
}

function summarizeCheckIns(checkIns) {
  const byKind = {};
  const moodSamples = [];
  for (const c of checkIns) {
    byKind[c.kind] = (byKind[c.kind] || 0) + 1;
    if ((c.kind === "mood_scale_5" || c.kind === "mood_scale_10") && c.responseInt != null) {
      moodSamples.push(c.responseInt);
    }
  }
  let moodStats = null;
  if (moodSamples.length) {
    const sum = moodSamples.reduce((a, b) => a + b, 0);
    moodStats = {
      count: moodSamples.length,
      min: Math.min(...moodSamples),
      max: Math.max(...moodSamples),
      avg: Math.round((sum / moodSamples.length) * 100) / 100,
    };
  }
  return { byKind, moodScaleStats: moodStats };
}

function collectNumericLeaves(obj, path = "") {
  const out = [];
  if (obj == null || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => out.push(...collectNumericLeaves(item, `${path}[${i}]`)));
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k;
    if (typeof v === "number" && Number.isFinite(v)) {
      out.push({ path: p, key: k, value: v });
    } else if (v && typeof v === "object") {
      out.push(...collectNumericLeaves(v, p));
    }
  }
  return out;
}

/** Best-effort rollup when ML schema is unknown — groups hinted metric keys across reports. */
function heuristicMlRollups(mlReports) {
  const byKey = {};
  for (const row of mlReports) {
    const leaves = collectNumericLeaves(row.payload);
    for (const { key, value } of leaves) {
      if (!ML_NUMERIC_KEY_HINT.test(key)) continue;
      if (!byKey[key]) byKey[key] = { values: [] };
      byKey[key].values.push(value);
    }
  }
  const metrics = {};
  for (const [key, { values }] of Object.entries(byKey)) {
    if (!values.length) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    metrics[key] = {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round((sum / values.length) * 1000) / 1000,
    };
  }
  return Object.keys(metrics).length ? metrics : null;
}

function goalsVsActual(session) {
  const plannedFocusMin = session.focusMinutesPlanned;
  const lastFocus = session.lastCompletedFocusMinutes;
  const cyclesTarget = session.cyclesTarget;
  const cyclesCompleted = session.cyclesCompleted;

  let focusPlanVsLastCompleted = null;
  if (plannedFocusMin != null && plannedFocusMin > 0 && lastFocus != null) {
    focusPlanVsLastCompleted = {
      plannedFocusMinutes: plannedFocusMin,
      lastCompletedFocusMinutes: lastFocus,
      deltaMinutes: Math.round((lastFocus - plannedFocusMin) * 100) / 100,
    };
  }

  let cyclesPlan = null;
  if (cyclesTarget != null && cyclesTarget > 0) {
    cyclesPlan = {
      cyclesTarget,
      cyclesCompleted,
      metTarget: cyclesCompleted >= cyclesTarget,
    };
  }

  return {
    focusMinutesPlanned: plannedFocusMin,
    cyclesTarget,
    cyclesCompleted,
    pomodorosSinceLongBreak: session.pomodorosSinceLongBreak,
    pomodorosBeforeLongBreak: session.pomodorosBeforeLongBreak,
    focusPlanVsLastCompleted,
    cyclesPlan,
  };
}

function telemetryCoverage(events, sessionStartedAt, sessionEndedAt) {
  if (!events.length) {
    return {
      telemetryFirstAt: null,
      telemetryLastAt: null,
      spanSeconds: null,
      spanRelativeToSessionStartSeconds: null,
    };
  }
  let minT = Infinity;
  let maxT = -Infinity;
  for (const ev of events) {
    const t = eventTimeMs(ev);
    minT = Math.min(minT, t);
    maxT = Math.max(maxT, t);
  }
  const startMs = sessionStartedAt.getTime();
  const spanSeconds = Math.max(0, Math.floor((maxT - minT) / 1000));
  const spanRelative = Math.max(0, Math.floor((maxT - startMs) / 1000));
  return {
    telemetryFirstAt: new Date(minT).toISOString(),
    telemetryLastAt: new Date(maxT).toISOString(),
    spanSeconds,
    spanRelativeToSessionEndApproxSeconds:
      sessionEndedAt != null ? Math.max(0, Math.floor((sessionEndedAt.getTime() - maxT) / 1000)) : null,
  };
}

module.exports = {
  eventTimeMs,
  wallElapsedSeconds,
  approximateMainStudySecondsAt,
  buildFiveMinuteBuckets,
  buildLifecycleTimeline,
  summarizeCheckIns,
  heuristicMlRollups,
  goalsVsActual,
  telemetryCoverage,
  ML_NUMERIC_KEY_HINT,
};
