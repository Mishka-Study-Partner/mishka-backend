const prisma = require("../utils/prisma");
const { viewerHasSharedAccess } = require("./sharedMaterialAccess");

/**
 * User may attach this material in a chat if they own it or can see it via a community channel share.
 * @param {string} userId
 * @param {"quiz" | "flashcard_set" | "summary" | "mind_map"} materialType
 * @param {string} materialId
 */
async function userCanReferenceMaterialInChat(userId, materialType, materialId) {
  if (materialType === "quiz") {
    const row = await prisma.quiz.findUnique({ where: { id: materialId } });
    if (!row) return false;
    if (row.userId === userId) return true;
    return viewerHasSharedAccess(userId, "quiz", materialId);
  }
  if (materialType === "flashcard_set") {
    const row = await prisma.flashcardSet.findUnique({ where: { id: materialId } });
    if (!row) return false;
    if (row.userId === userId) return true;
    return viewerHasSharedAccess(userId, "flashcard_set", materialId);
  }
  if (materialType === "summary") {
    const row = await prisma.summary.findUnique({ where: { id: materialId } });
    if (!row) return false;
    if (row.userId === userId) return true;
    return viewerHasSharedAccess(userId, "summary", materialId);
  }
  if (materialType === "mind_map") {
    const row = await prisma.mindMap.findUnique({ where: { id: materialId } });
    if (!row) return false;
    if (row.userId === userId) return true;
    return viewerHasSharedAccess(userId, "mind_map", materialId);
  }
  return false;
}

module.exports = { userCanReferenceMaterialInChat };
