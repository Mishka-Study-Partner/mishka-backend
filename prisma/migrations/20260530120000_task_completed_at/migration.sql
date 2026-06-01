-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "completed_at" TIMESTAMP(3);

-- Backfill completion time from last update for already-completed tasks
UPDATE "tasks"
SET "completed_at" = "updated_at"
WHERE "status" = 'completed' AND "completed_at" IS NULL;
