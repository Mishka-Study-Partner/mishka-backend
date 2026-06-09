-- CreateEnum
CREATE TYPE "CommunityPurpose" AS ENUM ('study_group', 'material_sharing', 'accountability', 'exam_cohort', 'university_program', 'language_practice', 'general');

-- AlterTable
ALTER TABLE "communities" ADD COLUMN "education_status" "EducationStatus",
ADD COLUMN "school_track" "SchoolTrack",
ADD COLUMN "school_grade" INTEGER,
ADD COLUMN "university_year" INTEGER,
ADD COLUMN "subject_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "purpose" "CommunityPurpose" DEFAULT 'general',
ADD COLUMN "locale" VARCHAR(5) NOT NULL DEFAULT 'en',
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "communities_visibility_education_status_idx" ON "communities"("visibility", "education_status");
CREATE INDEX "communities_created_at_idx" ON "communities"("created_at");
