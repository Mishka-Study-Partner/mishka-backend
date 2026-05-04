const prisma = require("../utils/prisma");
const { notFound } = require("../utils/httpError");
const {
  parseUploadSuccessBody,
  parseChatSuccessBody,
  parseGenerateToolsSuccessBody,
} = require("./aiTutorContract");
const { materializeToolContent } = require("./aiMaterializers");
const { saveUploadedMaterial } = require("../utils/aiUploadStorage");

async function assertAiTutorSession(tx, sessionId, userId) {
  const session = await tx.chatSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw notFound("AI tutor session not found for this user", "NOT_FOUND");
  return session;
}

/**
 * @param {object} opts
 * @param {import("@prisma/client").Prisma.TransactionClient} [opts.tx]
 * @param {string} opts.userId
 * @param {string | null} opts.chatSessionId
 * @param {string} opts.featureType
 * @param {string | null} [opts.requestType]
 * @param {string | null} [opts.inputType]
 * @param {string | null} [opts.inputReference]
 * @param {unknown} [opts.requestPayload]
 * @param {unknown} [opts.responsePayload]
 * @param {number | null} [opts.upstreamStatus]
 * @param {number | null} [opts.tokensUsed]
 */
async function createAiRequestRow(opts) {
  const client = opts.tx || prisma;
  return client.aiRequest.create({
    data: {
      userId: opts.userId,
      chatSessionId: opts.chatSessionId,
      featureType: opts.featureType,
      requestType: opts.requestType ?? null,
      inputType: opts.inputType ?? null,
      inputReference: opts.inputReference ?? null,
      tokensUsed: opts.tokensUsed ?? null,
      requestPayload: opts.requestPayload === undefined ? undefined : opts.requestPayload,
      responsePayload: opts.responsePayload === undefined ? undefined : opts.responsePayload,
      upstreamStatus: opts.upstreamStatus ?? null,
    },
  });
}

/**
 * FastAPI `/upload` returns `{ session_id, explanation }` and seeds MemoryManager + first history turn.
 * We mirror that: one `chat_sessions` row per `session_id`, first user/model messages, plus `ai_requests`.
 * Saves the uploaded file bytes under `AI_UPLOAD_STORAGE_DIR` keyed by user + `session_id`.
 *
 * @param {{ buffer: Buffer, originalName: string, mimeType?: string | null }} fileMeta
 */
async function persistUploadSuccess(userId, summaryLevel, upstreamStatus, upstreamData, fileMeta) {
  const { sessionId, explanation } = parseUploadSuccessBody(upstreamData);
  const userLine = `Explain this file. Level: ${summaryLevel || "detailed"}`;

  const stored = await saveUploadedMaterial(
    userId,
    sessionId,
    fileMeta.buffer,
    fileMeta.originalName,
    fileMeta.mimeType || undefined
  );

  await prisma.$transaction(async (tx) => {
    await tx.chatSession.create({
      data: {
        id: sessionId,
        userId,
        startedAt: new Date(),
        isActive: true,
        uploadStoredPath: stored.relativePath,
        uploadOriginalFilename: fileMeta.originalName,
        uploadMimeType: stored.mimeType || fileMeta.mimeType || null,
        uploadSizeBytes: stored.sizeBytes,
      },
    });
    await tx.chatMessage.create({
      data: {
        sessionId,
        senderType: "user",
        messageContent: userLine,
        inputType: "text",
      },
    });
    await tx.chatMessage.create({
      data: {
        sessionId,
        senderType: "ai",
        messageContent: explanation.slice(0, 100000),
        inputType: "text",
      },
    });
    await createAiRequestRow({
      tx,
      userId,
      chatSessionId: sessionId,
      featureType: "upload",
      requestType: "multipart",
      inputType: "file",
      inputReference: fileMeta.originalName || null,
      requestPayload: {
        summary_level: summaryLevel || "detailed",
        originalName: fileMeta.originalName || null,
        uploadStoredPath: stored.relativePath,
        uploadSizeBytes: stored.sizeBytes,
        uploadMimeType: stored.mimeType || fileMeta.mimeType || null,
      },
      responsePayload: upstreamData,
      upstreamStatus,
    });
  });
}

/**
 * FastAPI `/chat` returns `{ response: response_text }` and appends user + model to MemoryManager history.
 */
async function persistChatSuccess(userId, sessionId, message, upstreamStatus, upstreamData) {
  const { response } = parseChatSuccessBody(upstreamData);

  await prisma.$transaction(async (tx) => {
    await assertAiTutorSession(tx, sessionId, userId);
    await tx.chatMessage.create({
      data: {
        sessionId,
        senderType: "user",
        messageContent: message,
        inputType: "text",
      },
    });
    await tx.chatMessage.create({
      data: {
        sessionId,
        senderType: "ai",
        messageContent: response.slice(0, 100000),
        inputType: "text",
      },
    });
    await createAiRequestRow({
      tx,
      userId,
      chatSessionId: sessionId,
      featureType: "chat",
      requestType: "fastapi_chat",
      inputType: "text",
      requestPayload: { session_id: sessionId, message },
      responsePayload: upstreamData,
      upstreamStatus,
    });
  });
}

/**
 * FastAPI `/generate-tools` returns `{ status, tool_type, content }` on success.
 */
async function persistGenerateToolsSuccess(userId, sessionId, toolType, complexity, upstreamStatus, upstreamData) {
  const parsed = parseGenerateToolsSuccessBody(upstreamData);
  if (parsed.toolType !== toolType) {
    throw new Error("UPSTREAM_TOOL_TYPE_MISMATCH");
  }

  await prisma.$transaction(async (tx) => {
    await assertAiTutorSession(tx, sessionId, userId);
    const aiRow = await createAiRequestRow({
      tx,
      userId,
      chatSessionId: sessionId,
      featureType: toolType,
      requestType: "generate_tools",
      inputType: "json",
      requestPayload: { session_id: sessionId, tool_type: toolType, complexity },
      responsePayload: upstreamData,
      upstreamStatus,
    });

    const result = await materializeToolContent(tx, userId, toolType, parsed.content);
    if (toolType === "mind_maps" && result.mindMapTitle) {
      await tx.historyItem.create({
        data: {
          userId,
          featureType: "mind_map",
          referenceId: aiRow.id,
          title: result.mindMapTitle.slice(0, 500),
        },
      });
    }
  });
}

module.exports = {
  persistUploadSuccess,
  persistChatSuccess,
  persistGenerateToolsSuccess,
};
