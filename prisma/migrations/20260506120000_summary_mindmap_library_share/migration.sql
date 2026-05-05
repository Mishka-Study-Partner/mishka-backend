-- Summary: library + link to tutor session (upload explanation row).
ALTER TABLE "summaries" ADD COLUMN "saved_at" TIMESTAMP(3);
ALTER TABLE "summaries" ADD COLUMN "chat_session_id" TEXT;

CREATE INDEX "summaries_chat_session_id_idx" ON "summaries"("chat_session_id");

ALTER TABLE "summaries" ADD CONSTRAINT "summaries_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Mind maps: first-class row (was only ai_requests + history_items).
CREATE TABLE "mind_maps" (
    "mind_map_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" JSONB NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_reference" VARCHAR(255),
    "chat_session_id" TEXT,
    "saved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mind_maps_pkey" PRIMARY KEY ("mind_map_id")
);

CREATE INDEX "mind_maps_user_id_idx" ON "mind_maps"("user_id");
CREATE INDEX "mind_maps_chat_session_id_idx" ON "mind_maps"("chat_session_id");

ALTER TABLE "mind_maps" ADD CONSTRAINT "mind_maps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mind_maps" ADD CONSTRAINT "mind_maps_chat_session_id_fkey" FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;
