const express = require("express");
const c = require("../controllers/studyWithMishkaController");
const { validate } = require("../middleware/validateRequest");
const {
  studySessionPatchSchema,
  studyWithMishkaStartSchema,
  studyWithMishkaAdvancePhaseSchema,
  studyWithMishkaEndSchema,
  studyWithMishkaCheckInSchema,
  studyCustomTimerPresetCreateSchema,
  studyTelemetryBatchSchema,
  studyMlReportSchema,
  studyCallBreakEndSchema,
  studyReportExportSchema,
} = require("../validation/schemas");

const router = express.Router();

router.get("/catalog", c.getCatalog);

router.get("/custom-timers", c.listCustomTimers);
router.post("/custom-timers", validate(studyCustomTimerPresetCreateSchema), c.createCustomTimer);
router.delete("/custom-timers/:id", c.deleteCustomTimer);

router.get("/stats/summary", c.statsSummary);
router.get("/reports", c.listReports);
router.get("/reports/day", c.getReportDay);
router.get("/reports/week", c.getReportWeek);
router.get("/reports/month", c.getReportMonth);
router.get("/reports/year", c.getReportYear);
router.post("/reports/export", validate(studyReportExportSchema), c.exportReport);

router.get("/sessions", c.listSessions);
router.post("/sessions/start", validate(studyWithMishkaStartSchema), c.startSession);
router.get("/sessions/:id/full-report", c.getFullReport);
router.patch("/sessions/:id", validate(studySessionPatchSchema), c.patchSession);
router.get("/sessions/:id", c.getSession);
router.post("/sessions/:id/pause", c.pauseSession);
router.post("/sessions/:id/resume", c.resumeSession);
router.post("/sessions/:id/end", validate(studyWithMishkaEndSchema), c.endSession);
router.post("/sessions/:id/advance-phase", validate(studyWithMishkaAdvancePhaseSchema), c.advancePhase);
router.post("/sessions/:id/check-ins", validate(studyWithMishkaCheckInSchema), c.submitCheckIn);
router.post("/sessions/:id/telemetry", validate(studyTelemetryBatchSchema), c.ingestTelemetry);
router.post("/sessions/:id/ml-reports", validate(studyMlReportSchema), c.ingestMlReport);
router.post("/sessions/:id/call-break/start", c.callBreakStart);
router.post("/sessions/:id/call-break/end", validate(studyCallBreakEndSchema), c.callBreakEnd);

module.exports = router;
