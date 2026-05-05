/**
 * Server-derived snapshot from stored timestamps — safe for polling GET session.
 *
 * **Not** a WebSocket ticker: the backend does not “tick” independently; it recomputes
 * when you request session detail. Use `timerState.serverNow` + remaining/elapsed fields
 * to align UI; global pause / mid-phase pause nuances are documented in `caveats`.
 */

function computeStudyTimerState(session) {
  const now = Date.now();
  const started = session.startedAt.getTime();
  const endedMs = session.endedAt ? session.endedAt.getTime() : now;

  let ongoingCallBreakSec = 0;
  if (!session.endedAt && session.callBreakActive && session.callBreakStartedAt) {
    ongoingCallBreakSec = Math.max(0, Math.floor((now - session.callBreakStartedAt.getTime()) / 1000));
  }

  const elapsedWallToNowSec = Math.max(0, Math.floor((now - started) / 1000));
  const elapsedWallToEndSec = Math.max(0, Math.floor((endedMs - started) / 1000));

  const approximateMainStudySeconds =
    session.status === "completed" || session.status === "abandoned"
      ? Math.max(0, elapsedWallToEndSec - session.totalPausedSeconds - session.totalCallBreakSeconds)
      : Math.max(
          0,
          elapsedWallToNowSec -
            session.totalPausedSeconds -
            session.totalCallBreakSeconds -
            ongoingCallBreakSec
        );

  let currentPhaseElapsedWallSeconds = null;
  let plannedSegmentRemainingApproxSeconds = null;

  if (session.currentPhaseStartedAt && (!session.endedAt || session.status === "active" || session.status === "paused")) {
    const phaseStart = session.currentPhaseStartedAt.getTime();
    const refNow = session.endedAt ? endedMs : now;
    currentPhaseElapsedWallSeconds = Math.max(0, Math.floor((refNow - phaseStart) / 1000));

    const plannedMin =
      session.phase === "focus"
        ? session.focusMinutesPlanned
        : session.phase === "short_break"
          ? session.shortBreakMinutesPlanned
          : session.phase === "long_break"
            ? session.longBreakMinutesPlanned
            : null;

    if (plannedMin != null && plannedMin > 0 && ["focus", "short_break", "long_break"].includes(session.phase)) {
      const budgetSec = plannedMin * 60;
      plannedSegmentRemainingApproxSeconds = Math.max(0, budgetSec - currentPhaseElapsedWallSeconds);
    }
  }

  const caveats = [
    "`plannedSegmentRemainingApproxSeconds` uses wall time since `currentPhaseStartedAt`; it does **not** subtract global pause intervals that occurred inside the current phase unless the client resets `currentPhaseStartedAt` when resuming.",
    "**Call with Mishka** and **concentration** share this helper but interpret UX separately — both expose `topLevelMode`.",
    "Open-ended modes (e.g. Flowtime focus with no `focusMinutesPlanned`) leave `plannedSegmentRemainingApproxSeconds` null.",
  ];

  return {
    serverNow: new Date(now).toISOString(),
    topLevelMode: session.topLevelMode,
    concentrationPreset: session.concentrationPreset,
    status: session.status,
    phase: session.phase,
    callBreakActive: session.callBreakActive,
    ongoingCallBreakSeconds: session.callBreakActive ? ongoingCallBreakSec : 0,
    wallElapsedSecondsToNow: elapsedWallToNowSec,
    approximateMainStudySeconds,
    totalPausedSecondsStored: session.totalPausedSeconds,
    totalCallBreakSecondsStored: session.totalCallBreakSeconds,
    currentPhaseElapsedWallSeconds,
    plannedSegmentRemainingApproxSeconds,
    caveats,
  };
}

module.exports = { computeStudyTimerState };
