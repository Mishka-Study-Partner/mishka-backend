-- CreateEnum
CREATE TYPE "EducationStatus" AS ENUM ('school', 'university', 'other');

-- CreateEnum
CREATE TYPE "SchoolTrack" AS ENUM ('middle_school', 'high_school');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "education_status" "EducationStatus";
ALTER TABLE "users" ADD COLUMN "education_other_detail" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN "school_track" "SchoolTrack";
ALTER TABLE "users" ADD COLUMN "school_grade" INTEGER;
ALTER TABLE "users" ADD COLUMN "university_year" INTEGER;

-- CreateTable
CREATE TABLE "signup_verifications" (
    "verification_id" TEXT NOT NULL,
    "email" VARCHAR(150),
    "phone_number" VARCHAR(20),
    "country_code" VARCHAR(5),
    "code" VARCHAR(10) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_verifications_pkey" PRIMARY KEY ("verification_id")
);

-- CreateIndex
CREATE INDEX "signup_verifications_email_idx" ON "signup_verifications"("email");

-- CreateIndex
CREATE INDEX "signup_verifications_phone_number_country_code_idx" ON "signup_verifications"("phone_number", "country_code");
