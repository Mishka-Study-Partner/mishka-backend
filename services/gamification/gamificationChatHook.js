const prisma = require("../../utils/prisma");
const { recordChatPointForMessage } = require("./gamificationChatPointsService");

/**
 * Award chat gamification point for a user tutor message.
 * @param {string} userId
 * @param {{ id: string, senderType?: string }} message
 */
async function onUserChatMessageCreated(userId, message) {
  if (!message?.id) return;
  const sender = message.senderType ?? "user";
  if (sender !== "user") return;
  try {
    await recordChatPointForMessage(userId, message.id);
  } catch (err) {
    console.error("[gamification.chatPoints]", err?.message || err);
  }
}

module.exports = { onUserChatMessageCreated };
