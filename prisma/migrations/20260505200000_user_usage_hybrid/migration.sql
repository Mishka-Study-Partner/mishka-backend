-- CreateEnum
CREATE TYPE "UsageIngestKind" AS ENUM ('segment', 'heartbeat');

-- CreateTable
CREATE TABLE "user_usage_ledger" (
    "ledger_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "UsageIngestKind" NOT NULL,
    "feature_key" VARCHAR(64) NOT NULL,
    "day_utc" DATE NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "seconds" INTEGER NOT NULL,
    "chat_session_id" VARCHAR(36),
    "client_request_id" VARCHAR(80) NOT NULL,

    CONSTRAINT "user_usage_ledger_pkey" PRIMARY KEY ("ledger_id")
);

-- CreateTable
CREATE TABLE "user_usage_daily_rollup" (
    "rollup_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "feature_key" VARCHAR(64) NOT NULL,
    "total_seconds" INTEGER NOT NULL,

    CONSTRAINT "user_usage_daily_rollup_pkey" PRIMARY KEY ("rollup_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_usage_ledger_user_id_client_request_id_key" ON "user_usage_ledger"("user_id", "client_request_id");

-- CreateIndex
CREATE INDEX "user_usage_ledger_user_id_day_utc_idx" ON "user_usage_ledger"("user_id", "day_utc");

-- CreateIndex
CREATE UNIQUE INDEX "user_usage_daily_rollup_user_id_date_feature_key_key" ON "user_usage_daily_rollup"("user_id", "date", "feature_key");

-- CreateIndex
CREATE INDEX "user_usage_daily_rollup_user_id_date_idx" ON "user_usage_daily_rollup"("user_id", "date");

-- AddForeignKey
ALTER TABLE "user_usage_ledger" ADD CONSTRAINT "user_usage_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_usage_daily_rollup" ADD CONSTRAINT "user_usage_daily_rollup_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
