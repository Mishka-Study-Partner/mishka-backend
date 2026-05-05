const prisma = require("../utils/prisma");
const { assertOwnedOrAdmin } = require("../utils/authz");
const { forbidden, badRequest } = require("../utils/httpError");
const { recordDailyStreakActivity } = require("./dailyStreakService");
const { assertCanPostToChannel } = require("./communityAuthz");

/**
 * Owner must match `req` (or admin). User must be a member of each channel's community.
 * Idempotent per user/channel/material (unique constraint → skippedDuplicates).
 *
 * @param {import("express").Request} req
 * @param {{ channelIds: string[]; materialType: string; materialId: string; note?: string | null }} input
 * @returns {Promise<{ created: import('@prisma/client').MaterialShare[]; skippedDuplicates: number }>}
 */
async function createMaterialSharesBatch(req, { channelIds, materialType, materialId, note }) {
  const userId = req.auth.sub;

  if (materialType === "quiz") {
    const row = await prisma.quiz.findUnique({ where: { id: materialId } });
    assertOwnedOrAdmin(req, row, "userId");
  } else if (materialType === "flashcard_set") {
    const row = await prisma.flashcardSet.findUnique({ where: { id: materialId } });
    assertOwnedOrAdmin(req, row, "userId");
  } else if (materialType === "summary") {
    const row = await prisma.summary.findUnique({ where: { id: materialId } });
    assertOwnedOrAdmin(req, row, "userId");
  } else if (materialType === "mind_map") {
    const row = await prisma.mindMap.findUnique({ where: { id: materialId } });
    assertOwnedOrAdmin(req, row, "userId");
  } else {
    throw badRequest("Unsupported materialType", undefined, "VALIDATION_ERROR");
  }

  const channels = await prisma.communityChannel.findMany({
    where: { id: { in: channelIds } },
  });
  if (channels.length !== channelIds.length) {
    throw badRequest("One or more channel ids are invalid", undefined, "VALIDATION_ERROR");
  }

  const created = [];
  let skippedDuplicates = 0;
  for (const ch of channels) {
    await assertCanPostToChannel(userId, ch.id);
    try {
      const row = await prisma.materialShare.create({
        data: {
          userId,
          communityChannelId: ch.id,
          materialType,
          materialId,
          note: note ?? null,
        },
      });
      created.push(row);
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
        skippedDuplicates += 1;
        continue;
      }
      throw e;
    }
  }

  void recordDailyStreakActivity(userId).catch((err) => console.error("[dailyStreak]", err?.message || err));
  return { created, skippedDuplicates };
}

module.exports = { createMaterialSharesBatch };
