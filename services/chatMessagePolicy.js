const { z } = require("zod");
const { badRequest, notFound } = require("../utils/httpError");
const { userCanReferenceMaterialInChat } = require("./chatMaterialRef");

const MATERIAL_REF_SCHEMA = z
  .object({
    materialType: z.enum(["quiz", "flashcard_set", "summary", "mind_map"]),
    materialId: z.string().uuid(),
  })
  .strict();

const MAX_TEXT_LEN = 100_000;

/**
 * @param {string | undefined} inputTypeRaw
 * @param {string} messageContent
 * @returns {{ inputType: "text" | "material"; messageContent: string; materialRef?: { materialType: string; materialId: string } }}
 */
function normalizeChatMessageInput(inputTypeRaw, messageContent) {
  const inputType = inputTypeRaw === "material" ? "material" : "text";

  if (typeof messageContent !== "string") {
    throw badRequest("messageContent must be a string", undefined, "VALIDATION_ERROR");
  }

  if (messageContent.includes("\0")) {
    throw badRequest("messageContent contains invalid characters", undefined, "VALIDATION_ERROR");
  }

  if (inputType === "text") {
    if (messageContent.length > MAX_TEXT_LEN) {
      throw badRequest(`messageContent must be at most ${MAX_TEXT_LEN} characters`, undefined, "VALIDATION_ERROR");
    }
    return { inputType: "text", messageContent };
  }

  let parsed;
  try {
    parsed = JSON.parse(messageContent);
  } catch {
    throw badRequest(
      "For inputType material, messageContent must be JSON: {\"materialType\":\"quiz|flashcard_set|summary|mind_map\",\"materialId\":\"<uuid>\"}",
      undefined,
      "VALIDATION_ERROR"
    );
  }

  const ref = MATERIAL_REF_SCHEMA.safeParse(parsed);
  if (!ref.success) {
    throw badRequest("Invalid material reference in messageContent", ref.error.flatten(), "VALIDATION_ERROR");
  }

  const canonical = JSON.stringify(ref.data);
  if (canonical.length > 2000) {
    throw badRequest("Material reference payload is too large", undefined, "VALIDATION_ERROR");
  }

  return {
    inputType: "material",
    messageContent: canonical,
    materialRef: ref.data,
  };
}

/**
 * Community channel messages: same text vs in-app material rules; `userId` is the author.
 * @param {string} userId
 * @param {string | undefined} inputTypeRaw
 * @param {string} messageContent
 */
async function assertChatMessageAllowedForUser(userId, inputTypeRaw, messageContent) {
  const normalized = normalizeChatMessageInput(inputTypeRaw, messageContent);
  if (normalized.inputType === "material" && normalized.materialRef) {
    const ok = await userCanReferenceMaterialInChat(
      userId,
      normalized.materialRef.materialType,
      normalized.materialRef.materialId
    );
    if (!ok) throw notFound();
  }
  return {
    inputType: normalized.inputType,
    messageContent: normalized.messageContent,
  };
}

module.exports = {
  normalizeChatMessageInput,
  assertChatMessageAllowedForUser,
  MAX_TEXT_LEN,
};
