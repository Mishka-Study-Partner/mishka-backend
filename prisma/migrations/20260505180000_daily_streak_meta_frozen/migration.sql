-- AlterEnum: add frozen (compatible with PostgreSQL versions without IF NOT EXISTS on enums)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'StreakRecordStatus'
      AND e.enumlabel = 'frozen'
  ) THEN
    ALTER TYPE "StreakRecordStatus" ADD VALUE 'frozen';
  END IF;
END
$$;

-- CreateTable
CREATE TABLE "user_daily_streak_meta" (
    "user_id" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "freezes_remaining" INTEGER NOT NULL DEFAULT 2,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_streak_meta_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_daily_streak_meta" ADD CONSTRAINT "user_daily_streak_meta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "user_streaks_user_id_date_key" ON "user_streaks"("user_id", "date");
