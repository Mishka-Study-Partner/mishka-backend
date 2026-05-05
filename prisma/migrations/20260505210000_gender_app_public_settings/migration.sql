-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'prefer_not_to_say');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "gender" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "gender" TYPE "Gender" USING (
  CASE
    WHEN "gender" IS NULL THEN NULL::"Gender"
    WHEN lower(trim("gender"::text)) IN ('male', 'm') THEN 'male'::"Gender"
    WHEN lower(trim("gender"::text)) IN ('female', 'f') THEN 'female'::"Gender"
    WHEN lower(trim("gender"::text)) IN ('prefer_not_to_say', 'other', 'rather_not_to_say', 'none', 'unspecified', 'n/a', 'na') THEN 'prefer_not_to_say'::"Gender"
    ELSE NULL::"Gender"
  END
);

-- CreateTable
CREATE TABLE "app_public_settings" (
    "settings_id" TEXT NOT NULL,
    "privacy_policy_text" TEXT NOT NULL DEFAULT '',
    "support_email" VARCHAR(200),
    "support_phone" VARCHAR(40),
    "support_facebook_url" VARCHAR(500),
    "support_instagram_url" VARCHAR(500),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_public_settings_pkey" PRIMARY KEY ("settings_id")
);

INSERT INTO "app_public_settings" ("settings_id", "privacy_policy_text", "updated_at")
VALUES ('default', '', CURRENT_TIMESTAMP);
