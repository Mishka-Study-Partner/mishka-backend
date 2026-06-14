-- Gamification: badges, events, chat points, goals

CREATE TABLE "badge_definitions" (
    "badge_definition_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(64) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "title_en" VARCHAR(255) NOT NULL,
    "title_ar" VARCHAR(255),
    "asset_key" VARCHAR(64),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "badge_definitions_pkey" PRIMARY KEY ("badge_definition_id")
);

CREATE UNIQUE INDEX "badge_definitions_code_key" ON "badge_definitions"("code");

CREATE TABLE "user_badge_events" (
    "badge_event_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "badge_code" VARCHAR(64) NOT NULL,
    "source_type" VARCHAR(32) NOT NULL,
    "source_id" VARCHAR(128),
    "metadata" JSONB,
    "period_week" DATE,
    "period_month" DATE,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_badge_events_pkey" PRIMARY KEY ("badge_event_id")
);

CREATE UNIQUE INDEX "user_badge_events_idempotency_key_key" ON "user_badge_events"("idempotency_key");
CREATE INDEX "user_badge_events_user_id_badge_code_idx" ON "user_badge_events"("user_id", "badge_code");
CREATE INDEX "user_badge_events_user_id_period_week_idx" ON "user_badge_events"("user_id", "period_week");
CREATE INDEX "user_badge_events_user_id_period_month_idx" ON "user_badge_events"("user_id", "period_month");
CREATE INDEX "user_badge_events_user_id_badge_code_period_week_idx" ON "user_badge_events"("user_id", "badge_code", "period_week");

ALTER TABLE "user_badge_events" ADD CONSTRAINT "user_badge_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_chat_points" (
    "user_id" TEXT NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_chat_points_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "user_chat_points" ADD CONSTRAINT "user_chat_points_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_chat_point_events" (
    "chat_point_event_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_chat_point_events_pkey" PRIMARY KEY ("chat_point_event_id")
);

CREATE UNIQUE INDEX "user_chat_point_events_message_id_key" ON "user_chat_point_events"("message_id");
CREATE INDEX "user_chat_point_events_user_id_created_at_idx" ON "user_chat_point_events"("user_id", "created_at");

ALTER TABLE "user_chat_point_events" ADD CONSTRAINT "user_chat_point_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "gamification_goals" (
    "code" VARCHAR(64) NOT NULL,
    "value_numeric" INTEGER NOT NULL,
    "unit" VARCHAR(32),
    "description_en" TEXT,
    CONSTRAINT "gamification_goals_pkey" PRIMARY KEY ("code")
);

INSERT INTO "badge_definitions" ("code", "category", "title_en", "title_ar", "asset_key", "sort_order") VALUES
  ('quiz_perfect', 'ai_tools', 'Perfect quiz score', NULL, 'perfectScore', 1),
  ('quiz_score_80', 'ai_tools', 'Quiz score 80%+', NULL, 'score80', 2),
  ('quiz_keep_learning', 'ai_tools', 'Keep learning', NULL, 'keep-learning', 3),
  ('flashcards_complete', 'ai_tools', 'Flashcards reviewed', NULL, 'flashcards-reviewed', 4),
  ('summary_complete', 'ai_tools', 'Summary reviewed', NULL, 'summary-reviewed', 5),
  ('mindmap_complete', 'ai_tools', 'Mind map complete', NULL, 'summary-reviewed', 6),
  ('chat_points', 'ai_tools', 'Chat with Mishka', NULL, 'chat_with_mishka_badge', 7),
  ('tasks_weekly_complete', 'tasks', 'Weekly tasks complete', NULL, 'finishing_all_your_tasks', 10),
  ('study_weekly_goal', 'study', 'Weekly study goal', NULL, 'miska_support1', 11),
  ('community_weekly_active', 'community', 'Community weekly active', NULL, 'mishka_support2', 12);

INSERT INTO "gamification_goals" ("code", "value_numeric", "unit", "description_en") VALUES
  ('tasks_weekly_goal', 30, 'tasks', 'Completed tasks per Sat–Fri week'),
  ('study_weekly_minutes', 1260, 'minutes', '21 hours study per week'),
  ('community_weekly_display_goal', 700, 'score', 'Community progress bar denominator'),
  ('community_badge_threshold', 500, 'score', 'Minimum score to earn weekly community badge'),
  ('community_points_per_message', 10, 'points', 'Points per community text message'),
  ('community_points_per_share', 25, 'points', 'Points per material share'),
  ('community_points_per_channel_join', 15, 'points', 'Points per new channel join in week');
