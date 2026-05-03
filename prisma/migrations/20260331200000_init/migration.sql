-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'teacher', 'admin');

-- CreateEnum
CREATE TYPE "AiToolKind" AS ENUM ('CHAT', 'SUMMARY', 'FLASHCARDS', 'QUIZ');

-- CreateEnum
CREATE TYPE "StreakRecordStatus" AS ENUM ('completed', 'missed');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'completed');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "TodoListKind" AS ENUM ('calendar', 'college', 'work', 'personal');

-- CreateEnum
CREATE TYPE "SenderKind" AS ENUM ('user', 'ai');

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(150),
    "username" VARCHAR(50),
    "email" VARCHAR(150) NOT NULL,
    "phone_number" VARCHAR(20),
    "country_code" VARCHAR(5),
    "password" VARCHAR(255),
    "remember_me" BOOLEAN NOT NULL DEFAULT false,
    "agree_terms" BOOLEAN NOT NULL DEFAULT false,
    "provider" VARCHAR(20),
    "provider_id" VARCHAR(100),
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "profile_image_url" TEXT,
    "gender" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "reset_code" VARCHAR(10) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "preference_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "language" VARCHAR(50) NOT NULL DEFAULT 'English',
    "theme" VARCHAR(20) NOT NULL DEFAULT 'light',
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "tips" (
    "tip_id" TEXT NOT NULL,
    "tip_text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "displayed_date" DATE,

    CONSTRAINT "tips_pkey" PRIMARY KEY ("tip_id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "streak_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "StreakRecordStatus" NOT NULL,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("streak_id")
);

-- CreateTable
CREATE TABLE "ai_tools" (
    "tool_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "tool_type" "AiToolKind" NOT NULL,
    "image_url" TEXT,
    "route_key" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tools_pkey" PRIMARY KEY ("tool_id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(200),
    "image_url" TEXT,
    "duration" INTEGER,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "communities" (
    "community_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("community_id")
);

-- CreateTable
CREATE TABLE "user_communities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,

    CONSTRAINT "user_communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "route_key" VARCHAR(50),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "user_saved_categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "user_saved_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ai_activity" (
    "activity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "input_type" VARCHAR(50) NOT NULL,
    "input_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_ai_activity_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "message_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "sender_type" "SenderKind" NOT NULL,
    "message_content" TEXT NOT NULL,
    "input_type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "ai_requests" (
    "request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT,
    "feature_type" VARCHAR(50) NOT NULL,
    "request_type" VARCHAR(50),
    "input_type" VARCHAR(50),
    "input_reference" TEXT,
    "tokens_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "flashcard_sets" (
    "set_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_sets_pkey" PRIMARY KEY ("set_id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "flashcard_id" TEXT NOT NULL,
    "set_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("flashcard_id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "quiz_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_reference" TEXT,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("quiz_id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "question_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" CHAR(1) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "summaries" (
    "summary_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_type" VARCHAR(50) NOT NULL,
    "source_reference" TEXT,
    "summary_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("summary_id")
);

-- CreateTable
CREATE TABLE "history_items" (
    "history_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature_type" VARCHAR(50) NOT NULL,
    "reference_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_items_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "icons" (
    "icon_id" SERIAL NOT NULL,
    "icon_name" VARCHAR(50) NOT NULL,
    "icon_path" VARCHAR(255) NOT NULL,

    CONSTRAINT "icons_pkey" PRIMARY KEY ("icon_id")
);

-- CreateTable
CREATE TABLE "todo_lists" (
    "list_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "list_name" VARCHAR(100) NOT NULL,
    "list_type" "TodoListKind" NOT NULL,
    "icon_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todo_lists_pkey" PRIMARY KEY ("list_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "due_date" DATE,
    "due_time" TIME(0),
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "task_type" "TaskKind",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_streaks_user_id_idx" ON "user_streaks"("user_id");

-- CreateIndex
CREATE INDEX "study_sessions_user_id_idx" ON "study_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_communities_community_id_idx" ON "user_communities"("community_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_communities_user_id_community_id_key" ON "user_communities"("user_id", "community_id");

-- CreateIndex
CREATE INDEX "user_saved_categories_category_id_idx" ON "user_saved_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_categories_user_id_category_id_key" ON "user_saved_categories"("user_id", "category_id");

-- CreateIndex
CREATE INDEX "user_ai_activity_user_id_idx" ON "user_ai_activity"("user_id");

-- CreateIndex
CREATE INDEX "user_ai_activity_tool_id_idx" ON "user_ai_activity"("tool_id");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "ai_requests_user_id_idx" ON "ai_requests"("user_id");

-- CreateIndex
CREATE INDEX "ai_requests_session_id_idx" ON "ai_requests"("session_id");

-- CreateIndex
CREATE INDEX "flashcard_sets_user_id_idx" ON "flashcard_sets"("user_id");

-- CreateIndex
CREATE INDEX "flashcards_set_id_idx" ON "flashcards"("set_id");

-- CreateIndex
CREATE INDEX "quizzes_user_id_idx" ON "quizzes"("user_id");

-- CreateIndex
CREATE INDEX "quiz_questions_quiz_id_idx" ON "quiz_questions"("quiz_id");

-- CreateIndex
CREATE INDEX "summaries_user_id_idx" ON "summaries"("user_id");

-- CreateIndex
CREATE INDEX "history_items_user_id_idx" ON "history_items"("user_id");

-- CreateIndex
CREATE INDEX "todo_lists_user_id_idx" ON "todo_lists"("user_id");

-- CreateIndex
CREATE INDEX "tasks_user_id_idx" ON "tasks"("user_id");

-- CreateIndex
CREATE INDEX "tasks_list_id_idx" ON "tasks"("list_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_communities" ADD CONSTRAINT "user_communities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_communities" ADD CONSTRAINT "user_communities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("community_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_categories" ADD CONSTRAINT "user_saved_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_categories" ADD CONSTRAINT "user_saved_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ai_activity" ADD CONSTRAINT "user_ai_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ai_activity" ADD CONSTRAINT "user_ai_activity_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "ai_tools"("tool_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_sets" ADD CONSTRAINT "flashcard_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "flashcard_sets"("set_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("quiz_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history_items" ADD CONSTRAINT "history_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_lists" ADD CONSTRAINT "todo_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_lists" ADD CONSTRAINT "todo_lists_icon_id_fkey" FOREIGN KEY ("icon_id") REFERENCES "icons"("icon_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "todo_lists"("list_id") ON DELETE CASCADE ON UPDATE CASCADE;

