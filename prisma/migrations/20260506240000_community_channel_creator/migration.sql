-- Who created each community group (channel); nullable for existing rows.
ALTER TABLE "community_channels" ADD COLUMN "created_by_user_id" TEXT;

CREATE INDEX "community_channels_created_by_user_id_idx" ON "community_channels"("created_by_user_id");

ALTER TABLE "community_channels" ADD CONSTRAINT "community_channels_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
