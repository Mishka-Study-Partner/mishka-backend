-- Community visibility, metadata, private invites, member roles, per-group membership, saved bookmarks, group chat messages.

CREATE TYPE "CommunityVisibility" AS ENUM ('public', 'private');
CREATE TYPE "CommunityMemberRole" AS ENUM ('owner', 'admin', 'member');

ALTER TABLE "communities" ADD COLUMN "visibility" "CommunityVisibility" NOT NULL DEFAULT 'public';
ALTER TABLE "communities" ADD COLUMN "description" TEXT;
ALTER TABLE "communities" ADD COLUMN "image_url" VARCHAR(500);
ALTER TABLE "communities" ADD COLUMN "owner_user_id" TEXT;
ALTER TABLE "communities" ADD COLUMN "invite_code" VARCHAR(32);
ALTER TABLE "communities" ADD COLUMN "invite_token" VARCHAR(36);

CREATE UNIQUE INDEX "communities_invite_code_key" ON "communities"("invite_code");
CREATE UNIQUE INDEX "communities_invite_token_key" ON "communities"("invite_token");

ALTER TABLE "communities" ADD CONSTRAINT "communities_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "communities_owner_user_id_idx" ON "communities"("owner_user_id");

UPDATE "communities" c
SET "owner_user_id" = (
  SELECT uc."user_id" FROM "user_communities" uc
  WHERE uc."community_id" = c."community_id"
  ORDER BY uc."id" ASC
  LIMIT 1
)
WHERE c."owner_user_id" IS NULL;

ALTER TABLE "user_communities" ADD COLUMN "role" "CommunityMemberRole" NOT NULL DEFAULT 'member';

UPDATE "user_communities" uc
SET "role" = 'owner'
FROM "communities" c
WHERE uc."community_id" = c."community_id"
  AND c."owner_user_id" IS NOT NULL
  AND uc."user_id" = c."owner_user_id";

ALTER TABLE "community_channels" ADD COLUMN "description" TEXT;
ALTER TABLE "community_channels" ADD COLUMN "image_url" VARCHAR(500);

CREATE TABLE "user_community_channels" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "community_channel_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_community_channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_community_channels_user_id_community_channel_id_key" ON "user_community_channels"("user_id", "community_channel_id");
CREATE INDEX "user_community_channels_community_channel_id_idx" ON "user_community_channels"("community_channel_id");
CREATE INDEX "user_community_channels_user_id_idx" ON "user_community_channels"("user_id");

ALTER TABLE "user_community_channels" ADD CONSTRAINT "user_community_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_community_channels" ADD CONSTRAINT "user_community_channels_community_channel_id_fkey" FOREIGN KEY ("community_channel_id") REFERENCES "community_channels"("channel_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_saved_communities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_communities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_saved_communities_user_id_community_id_key" ON "user_saved_communities"("user_id", "community_id");
CREATE INDEX "user_saved_communities_community_id_idx" ON "user_saved_communities"("community_id");

ALTER TABLE "user_saved_communities" ADD CONSTRAINT "user_saved_communities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_saved_communities" ADD CONSTRAINT "user_saved_communities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("community_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "community_channel_messages" (
    "message_id" TEXT NOT NULL,
    "community_channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_content" TEXT NOT NULL,
    "input_type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_channel_messages_pkey" PRIMARY KEY ("message_id")
);

CREATE INDEX "community_channel_messages_community_channel_id_idx" ON "community_channel_messages"("community_channel_id");
CREATE INDEX "community_channel_messages_user_id_idx" ON "community_channel_messages"("user_id");

ALTER TABLE "community_channel_messages" ADD CONSTRAINT "community_channel_messages_community_channel_id_fkey" FOREIGN KEY ("community_channel_id") REFERENCES "community_channels"("channel_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_channel_messages" ADD CONSTRAINT "community_channel_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
