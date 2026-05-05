-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN "title" VARCHAR(200);

UPDATE "chat_sessions"
SET "title" = LEFT(TRIM("upload_original_filename"), 200)
WHERE "title" IS NULL
  AND "upload_original_filename" IS NOT NULL
  AND TRIM("upload_original_filename") <> '';

-- AlterTable quizzes / flashcard_sets
ALTER TABLE "quizzes" ADD COLUMN "chat_session_id" TEXT;
ALTER TABLE "quizzes" ADD COLUMN "saved_at" TIMESTAMP(3);

ALTER TABLE "flashcard_sets" ADD COLUMN "chat_session_id" TEXT;
ALTER TABLE "flashcard_sets" ADD COLUMN "saved_at" TIMESTAMP(3);

-- AlterTable history_items
ALTER TABLE "history_items" ADD COLUMN "chat_session_id" TEXT;

-- CreateTable community_channels
CREATE TABLE "community_channels" (
    "channel_id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_channels_pkey" PRIMARY KEY ("channel_id")
);

CREATE INDEX "community_channels_community_id_idx" ON "community_channels"("community_id");

ALTER TABLE "community_channels" ADD CONSTRAINT "community_channels_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("community_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable material_shares
CREATE TABLE "material_shares" (
    "share_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "community_channel_id" TEXT NOT NULL,
    "material_type" VARCHAR(50) NOT NULL,
    "material_id" VARCHAR(36) NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_shares_pkey" PRIMARY KEY ("share_id")
);

CREATE UNIQUE INDEX "material_shares_user_id_community_channel_id_material_type_material_id_key" ON "material_shares"("user_id", "community_channel_id", "material_type", "material_id");

CREATE INDEX "material_shares_community_channel_id_idx" ON "material_shares"("community_channel_id");

CREATE INDEX "material_shares_user_id_idx" ON "material_shares"("user_id");

ALTER TABLE "material_shares" ADD CONSTRAINT "material_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "material_shares" ADD CONSTRAINT "material_shares_community_channel_id_fkey" FOREIGN KEY ("community_channel_id") REFERENCES "community_channels"("channel_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "quizzes_chat_session_id_idx" ON "quizzes"("chat_session_id");

CREATE INDEX "flashcard_sets_chat_session_id_idx" ON "flashcard_sets"("chat_session_id");

CREATE INDEX "history_items_chat_session_id_idx" ON "history_items"("chat_session_id");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "flashcard_sets" ADD CONSTRAINT "flashcard_sets_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "history_items" ADD CONSTRAINT "history_items_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;
