const prisma = require("../utils/prisma");

/**
 * True if the viewer belongs to a community whose channels received this material.
 * @param {string} viewerUserId
 * @param {"quiz" | "flashcard_set" | "summary" | "mind_map"} materialType
 * @param {string} materialId
 */
async function viewerHasSharedAccess(viewerUserId, materialType, materialId) {
  const n = await prisma.materialShare.count({
    where: {
      materialType,
      materialId,
      channel: {
        groupMembers: { some: { userId: viewerUserId } },
      },
    },
  });
  return n > 0;
}

module.exports = { viewerHasSharedAccess };
