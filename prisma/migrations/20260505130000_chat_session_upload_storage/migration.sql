-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN "upload_stored_path" VARCHAR(1024);
ALTER TABLE "chat_sessions" ADD COLUMN "upload_original_filename" VARCHAR(255);
ALTER TABLE "chat_sessions" ADD COLUMN "upload_mime_type" VARCHAR(255);
ALTER TABLE "chat_sessions" ADD COLUMN "upload_size_bytes" INTEGER;
