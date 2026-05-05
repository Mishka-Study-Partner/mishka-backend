-- Study session telemetry, ML summaries (no video), call-with-Mishka parallel break timer

ALTER TABLE "study_concentration_sessions" ADD COLUMN "call_break_active" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "study_concentration_sessions" ADD COLUMN "call_break_started_at" TIMESTAMP(3);

ALTER TABLE "study_concentration_sessions" ADD COLUMN "total_call_break_seconds" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "study_session_activity_events" (
    "activity_event_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "payload" JSONB,
    "client_ts" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_session_activity_events_pkey" PRIMARY KEY ("activity_event_id")
);

CREATE INDEX "study_session_activity_events_session_id_idx" ON "study_session_activity_events"("session_id");

CREATE INDEX "study_session_activity_events_session_id_created_at_idx" ON "study_session_activity_events"("session_id", "created_at" DESC);

ALTER TABLE "study_session_activity_events" ADD CONSTRAINT "study_session_activity_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "study_concentration_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "study_session_ml_reports" (
    "ml_report_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_session_ml_reports_pkey" PRIMARY KEY ("ml_report_id")
);

CREATE INDEX "study_session_ml_reports_session_id_idx" ON "study_session_ml_reports"("session_id");

CREATE INDEX "study_session_ml_reports_session_id_created_at_idx" ON "study_session_ml_reports"("session_id", "created_at" DESC);

ALTER TABLE "study_session_ml_reports" ADD CONSTRAINT "study_session_ml_reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "study_concentration_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
