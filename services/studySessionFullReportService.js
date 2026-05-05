const prisma = require("../utils/prisma");
const { notFound } = require("../utils/httpError");
const { getCatalog } = require("./studyWithMishkaCatalog");
const { computeStudyTimerState } = require("./studyTimerStateService");
const {
  buildFiveMinuteBuckets,
  buildLifecycleTimeline,
  summarizeCheckIns,
  heuristicMlRollups,
  goalsVsActual,
  telemetryCoverage,
  wallElapsedSeconds,
  approximateMainStudySecondsAt,
} = require("./studyReportAnalytics");

const ACTIVITY_EVENTS_LIMIT = 800;
const ML_REPORTS_LIMIT = 100;

/**
 * One merged payload for dashboards / exports: session row + catalog snapshot + check-ins +
 * telemetry + ML summaries + derived metrics (both concentration and call_with_mishka).
 */
async function buildStudySessionFullReport(userId, sessionId) {
  const generatedAt = new Date().toISOString();

  const [activityEventsTotal, mlReportsTotal, session] = await Promise.all([
    prisma.studySessionActivityEvent.count({ where: { sessionId } }),
    prisma.studySessionMlReport.count({ where: { sessionId } }),
    prisma.studyConcentrationSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        customPreset: true,
        linkedTask: { select: { id: true, title: true, status: true } },
      },
    }),
  ]);

  if (!session) throw notFound();

  const [checkIns, activityEvents, mlReports] = await Promise.all([
    prisma.studyConcentrationCheckIn.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.studySessionActivityEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: ACTIVITY_EVENTS_LIMIT,
    }),
    prisma.studySessionMlReport.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: ML_REPORTS_LIMIT,
    }),
  ]);

  const { customPreset, linkedTask, ...sessionScalars } = session;

  const catalog = getCatalog();
  let concentrationPresetCatalog = null;
  if (sessionScalars.concentrationPreset) {
    concentrationPresetCatalog =
      catalog.concentrationModes.find((m) => m.id === sessionScalars.concentrationPreset) || null;
  }

  const counts = {};
  for (const ev of activityEvents) {
    counts[ev.eventType] = (counts[ev.eventType] || 0) + 1;
  }

  const now = new Date();
  const wallElapsedSec = wallElapsedSeconds(sessionScalars, now);
  const approximateMainStudySeconds = approximateMainStudySecondsAt(sessionScalars, now);

  const lifecycleTimeline = buildLifecycleTimeline(activityEvents);
  const checkInSummary = summarizeCheckIns(checkIns);
  const telemetryWindow = telemetryCoverage(activityEvents, sessionScalars.startedAt, sessionScalars.endedAt);
  const activityBucketsFiveMinute = buildFiveMinuteBuckets(activityEvents, sessionScalars.startedAt);
  const mlRollupsHeuristic = heuristicMlRollups(mlReports);
  const goalsVsActualBlock = goalsVsActual(sessionScalars);

  const computed = {
    wallClockElapsedSeconds: wallElapsedSec,
    approximateMainStudySeconds,
    activityEventCounts: counts,
    checkInsCount: checkIns.length,
    mlReportsCount: mlReports.length,
    suggestedTelemetryTypes: [
      "camera_enabled",
      "camera_disabled",
      "call_break_start",
      "call_break_end",
      "phase_change",
      "pause",
      "resume",
      "app_background",
      "app_foreground",
      "navigation_feature_open",
    ],
    telemetryCoverage: telemetryWindow,
    activityBucketsFiveMinute,
    lifecycleTimeline,
    checkInSummary,
    mlRollupsHeuristic,
    goalsVsActual: goalsVsActualBlock,
  };

  if ((counts.camera_enabled || 0) + (counts.camera_disabled || 0) > 0) {
    computed.cameraToggleCounts = {
      enabled: counts.camera_enabled || 0,
      disabled: counts.camera_disabled || 0,
    };
  }

  const exportMeta = {
    generatedAt,
    activityEventsReturned: activityEvents.length,
    activityEventsTotal,
    activityEventsTruncated: activityEventsTotal > ACTIVITY_EVENTS_LIMIT,
    mlReportsReturned: mlReports.length,
    mlReportsTotal,
    mlReportsTruncated: mlReportsTotal > ML_REPORTS_LIMIT,
    activityEventsLimit: ACTIVITY_EVENTS_LIMIT,
    mlReportsLimit: ML_REPORTS_LIMIT,
  };

  return {
    exportMeta,
    session: { ...sessionScalars, timerState: computeStudyTimerState(sessionScalars) },
    catalogSnapshot: {
      concentrationPreset: concentrationPresetCatalog,
      customPreset: customPreset || null,
      callWithMishka: sessionScalars.topLevelMode === "call_with_mishka" ? catalog.callWithMishka : null,
      checkInKinds: catalog.checkInKinds,
    },
    linkedTask: linkedTask || null,
    checkIns,
    activityEvents,
    mlReports,
    computed,
  };
}

module.exports = { buildStudySessionFullReport };
