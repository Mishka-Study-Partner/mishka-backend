-- Idempotent repair if 20260508140000 failed after adding columns but before FK/index.
-- Safe to run when migration already succeeded (IF NOT EXISTS / conditional constraint).

ALTER TABLE "study_concentration_sessions" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "study_concentration_sessions" ADD COLUMN IF NOT EXISTS "outcome_notes" VARCHAR(2000);
ALTER TABLE "study_concentration_sessions" ADD COLUMN IF NOT EXISTS "client_app_version" VARCHAR(40);
ALTER TABLE "study_concentration_sessions" ADD COLUMN IF NOT EXISTS "platform" VARCHAR(40);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'study_concentration_sessions'
      AND column_name = 'linked_task_id'
  ) THEN
    ALTER TABLE "study_concentration_sessions" ADD COLUMN "linked_task_id" TEXT;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'study_concentration_sessions'
      AND column_name = 'linked_task_id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE "study_concentration_sessions"
      ALTER COLUMN "linked_task_id" TYPE TEXT USING "linked_task_id"::text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'study_concentration_sessions_linked_task_id_fkey'
  ) THEN
    ALTER TABLE "study_concentration_sessions"
      ADD CONSTRAINT "study_concentration_sessions_linked_task_id_fkey"
      FOREIGN KEY ("linked_task_id") REFERENCES "tasks"("task_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "study_concentration_sessions_linked_task_id_idx"
  ON "study_concentration_sessions"("linked_task_id");

ALTER TABLE "study_session_ml_reports" ADD COLUMN IF NOT EXISTS "schema_version" INTEGER;
