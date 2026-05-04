-- AlterTable
ALTER TABLE "ai_requests" ADD COLUMN "request_payload" JSONB;
ALTER TABLE "ai_requests" ADD COLUMN "response_payload" JSONB;
ALTER TABLE "ai_requests" ADD COLUMN "upstream_status" INTEGER;
