-- Session metadata for richer reports + optional ML schema version.
ALTER TABLE "study_concentration_sessions"
ADD COLUMN "tags" JSONB,
ADD COLUMN "linked_task_id" TEXT,
ADD COLUMN "outcome_notes" VARCHAR(2000),
ADD COLUMN "client_app_version" VARCHAR(40),
ADD COLUMN "platform" VARCHAR(40);

ALTER TABLE "study_concentration_sessions"
ADD CONSTRAINT "study_concentration_sessions_linked_task_id_fkey"
FOREIGN KEY ("linked_task_id") REFERENCES "tasks"("task_id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "study_concentration_sessions_linked_task_id_idx" ON "study_concentration_sessions"("linked_task_id");

ALTER TABLE "study_session_ml_reports" ADD COLUMN "schema_version" INTEGER;
