-- Study With Mishka — concentration timers, check-ins, custom presets

CREATE TYPE "StudyTopLevelMode" AS ENUM ('call_with_mishka', 'concentration');

CREATE TYPE "StudyConcentrationPreset" AS ENUM ('classic_pomodoro', 'flowtime', 'ultradian', 'quick_sprint', 'task_based', 'custom');

CREATE TYPE "StudyBlockSessionStatus" AS ENUM ('active', 'paused', 'completed', 'abandoned');

CREATE TYPE "StudyBlockPhase" AS ENUM ('none', 'focus', 'short_break', 'long_break');

CREATE TYPE "StudyCheckInKind" AS ENUM ('still_there_yes_no', 'mood_scale_5', 'mood_scale_10', 'progress_yes_no');

CREATE TABLE "study_custom_timer_presets" (
    "preset_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(120),
    "focus_minutes" INTEGER NOT NULL,
    "short_break_minutes" INTEGER NOT NULL,
    "long_break_minutes" INTEGER NOT NULL,
    "pomodoros_before_long_break" INTEGER NOT NULL DEFAULT 4,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "study_custom_timer_presets_pkey" PRIMARY KEY ("preset_id")
);

CREATE INDEX "study_custom_timer_presets_user_id_idx" ON "study_custom_timer_presets"("user_id");

CREATE INDEX "study_custom_timer_presets_user_id_last_used_at_idx" ON "study_custom_timer_presets"("user_id", "last_used_at" DESC);

ALTER TABLE "study_custom_timer_presets" ADD CONSTRAINT "study_custom_timer_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "study_concentration_sessions" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "custom_preset_id" TEXT,
    "top_level_mode" "StudyTopLevelMode" NOT NULL,
    "concentration_preset" "StudyConcentrationPreset",
    "status" "StudyBlockSessionStatus" NOT NULL DEFAULT 'active',
    "phase" "StudyBlockPhase" NOT NULL DEFAULT 'focus',
    "title" VARCHAR(200),
    "task_estimated_minutes" INTEGER,
    "focus_minutes_planned" INTEGER,
    "short_break_minutes_planned" INTEGER,
    "long_break_minutes_planned" INTEGER,
    "cycles_target" INTEGER,
    "cycles_completed" INTEGER NOT NULL DEFAULT 0,
    "pomodoros_before_long_break" INTEGER NOT NULL DEFAULT 4,
    "pomodoros_since_long_break" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "total_paused_seconds" INTEGER NOT NULL DEFAULT 0,
    "current_phase_started_at" TIMESTAMP(3),
    "last_completed_focus_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_concentration_sessions_pkey" PRIMARY KEY ("session_id")
);

CREATE INDEX "study_concentration_sessions_user_id_status_idx" ON "study_concentration_sessions"("user_id", "status");

CREATE INDEX "study_concentration_sessions_user_id_started_at_idx" ON "study_concentration_sessions"("user_id", "started_at" DESC);

ALTER TABLE "study_concentration_sessions" ADD CONSTRAINT "study_concentration_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_concentration_sessions" ADD CONSTRAINT "study_concentration_sessions_custom_preset_id_fkey" FOREIGN KEY ("custom_preset_id") REFERENCES "study_custom_timer_presets"("preset_id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "study_concentration_check_ins" (
    "check_in_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "kind" "StudyCheckInKind" NOT NULL,
    "response_bool" BOOLEAN,
    "response_int" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_concentration_check_ins_pkey" PRIMARY KEY ("check_in_id")
);

CREATE INDEX "study_concentration_check_ins_session_id_idx" ON "study_concentration_check_ins"("session_id");

ALTER TABLE "study_concentration_check_ins" ADD CONSTRAINT "study_concentration_check_ins_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "study_concentration_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
