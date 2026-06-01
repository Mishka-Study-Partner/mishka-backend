-- CreateEnum
CREATE TYPE "ReportEmailFrequency" AS ENUM ('weekly', 'monthly');

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN "report_email_auto_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_preferences" ADD COLUMN "report_email_frequency" "ReportEmailFrequency";
ALTER TABLE "user_preferences" ADD COLUMN "report_email_locale" VARCHAR(5) NOT NULL DEFAULT 'en';
ALTER TABLE "user_preferences" ADD COLUMN "report_email_last_sent_at" TIMESTAMP(3);
ALTER TABLE "user_preferences" ADD COLUMN "report_email_last_period_key" VARCHAR(32);
