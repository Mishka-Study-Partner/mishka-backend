-- Student-defined subjects + optional link on study sessions

CREATE TABLE "student_subjects" (
    "subject_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_subjects_pkey" PRIMARY KEY ("subject_id")
);

CREATE INDEX "student_subjects_user_id_sort_order_idx" ON "student_subjects"("user_id", "sort_order");

ALTER TABLE "student_subjects" ADD CONSTRAINT "student_subjects_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_concentration_sessions" ADD COLUMN "student_subject_id" UUID;

CREATE INDEX "study_concentration_sessions_student_subject_id_idx"
    ON "study_concentration_sessions"("student_subject_id");

ALTER TABLE "study_concentration_sessions" ADD CONSTRAINT "study_concentration_sessions_student_subject_id_fkey"
    FOREIGN KEY ("student_subject_id") REFERENCES "student_subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;
