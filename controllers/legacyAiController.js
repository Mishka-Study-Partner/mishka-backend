const axios = require("axios");
const FormData = require("form-data");
const asyncHandler = require("../utils/asyncHandler");
const { HttpError, notFound } = require("../utils/httpError");
const { preferredLanguage } = require("../utils/locale");
const { messagesForCode } = require("../utils/errorMessages");
const { persistUploadSuccess, persistChatSuccess, persistGenerateToolsSuccess } = require("../services/aiPersistence");
const { recordDailyStreakActivity } = require("../services/dailyStreakService");
const prisma = require("../utils/prisma");

const AI_BASE = () => process.env.AI_SERVICE_URL || "";

async function assertUserChatSession(userId, sessionId) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw notFound("Chat session not found", "CHAT_SESSION_NOT_FOUND");
  return session;
}

function throwIfAiSessionNotFound(upstreamStatus, upstreamBody) {
  if (upstreamStatus !== 404) return;
  const detail = typeof upstreamBody?.detail === "string" ? upstreamBody.detail : "";
  if (/session not found/i.test(detail)) {
    throw new HttpError(
      404,
      "AI tutor session expired or not found — start a new chat or re-upload your file",
      { upstream: upstreamBody },
      "AI_SESSION_NOT_FOUND"
    );
  }
}

function normalizeAiPayload(data) {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return { raw: data };
    }
  }
  return data;
}

function successEnvelope(req, data, status) {
  const lang = preferredLanguage(req);
  const ok = { en: "OK", ar: "تم" };
  return {
    success: true,
    message: lang === "ar" ? ok.ar : ok.en,
    message_en: ok.en,
    message_ar: ok.ar,
    data: normalizeAiPayload(data),
    error: null,
    details: null,
  };
}

function errorEnvelope(req, status, body) {
  const lang = preferredLanguage(req);
  const mapped = messagesForCode("AI_SERVICE_ERROR");
  const message_en = mapped.en;
  const message_ar = mapped.ar;
  return {
    success: false,
    message: lang === "ar" ? message_ar : message_en,
    message_en,
    message_ar,
    data: normalizeAiPayload(body),
    error: "AI_SERVICE_ERROR",
    details: { upstreamStatus: status },
  };
}

exports.upload = asyncHandler(async (req, res) => {
  if (!AI_BASE()) {
    throw new HttpError(503, "AI_SERVICE_URL is not configured", undefined, "SERVICE_UNAVAILABLE");
  }
  if (!req.file) {
    throw new HttpError(400, "file is required", undefined, "VALIDATION_ERROR");
  }

  const form = new FormData();
  form.append("file", req.file.buffer, req.file.originalname);
  form.append("summary_level", req.body.summary_level ?? "detailed");

  const r = await axios.post(`${AI_BASE()}/upload`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });

  if (r.status >= 200 && r.status < 300) {
    try {
      await persistUploadSuccess(req.auth.sub, req.body.summary_level ?? "detailed", r.status, normalizeAiPayload(r.data), {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
    } catch (e) {
      console.error("[ai] persist upload failed", e);
    }
    void recordDailyStreakActivity(req.auth.sub).catch((err) => console.error("[dailyStreak]", err?.message || err));
    return res.status(r.status).json(successEnvelope(req, r.data, r.status));
  }
  return res.status(r.status >= 400 ? r.status : 502).json(errorEnvelope(req, r.status, r.data));
});

exports.chat = asyncHandler(async (req, res) => {
  if (!AI_BASE()) {
    throw new HttpError(503, "AI_SERVICE_URL is not configured", undefined, "SERVICE_UNAVAILABLE");
  }

  const { session_id, message } = req.body;
  await assertUserChatSession(req.auth.sub, session_id);
  const r = await axios.post(`${AI_BASE()}/chat`, null, {
    params: { session_id, message },
    validateStatus: () => true,
  });

  throwIfAiSessionNotFound(r.status, normalizeAiPayload(r.data));

  if (r.status >= 200 && r.status < 300) {
    try {
      await persistChatSuccess(req.auth.sub, session_id, message, r.status, normalizeAiPayload(r.data));
    } catch (e) {
      console.error("[ai] persist chat failed", e);
    }
    void recordDailyStreakActivity(req.auth.sub).catch((err) => console.error("[dailyStreak]", err?.message || err));
    return res.status(r.status).json(successEnvelope(req, r.data, r.status));
  }
  return res.status(r.status >= 400 ? r.status : 502).json(errorEnvelope(req, r.status, r.data));
});

exports.generateTools = asyncHandler(async (req, res) => {
  if (!AI_BASE()) {
    throw new HttpError(503, "AI_SERVICE_URL is not configured", undefined, "SERVICE_UNAVAILABLE");
  }

  const { session_id, tool_type, complexity: complexityRaw } = req.body;
  const complexity = complexityRaw ?? "Intermediate";

  await assertUserChatSession(req.auth.sub, session_id);

  const r = await axios.post(`${AI_BASE()}/generate-tools`, null, {
    params: { session_id, tool_type, complexity },
    validateStatus: () => true,
  });

  throwIfAiSessionNotFound(r.status, normalizeAiPayload(r.data));

  if (r.status >= 200 && r.status < 300) {
    let persistMeta = {};
    try {
      persistMeta = await persistGenerateToolsSuccess(
        req.auth.sub,
        session_id,
        tool_type,
        complexity,
        r.status,
        normalizeAiPayload(r.data)
      );
    } catch (e) {
      console.error("[ai] persist generate-tools failed", e);
    }
    void recordDailyStreakActivity(req.auth.sub).catch((err) => console.error("[dailyStreak]", err?.message || err));
    const payload = normalizeAiPayload(r.data);
    if (payload && typeof payload === "object" && persistMeta.toolPreviewMessageId) {
      payload.tool_preview_message_id = persistMeta.toolPreviewMessageId;
    }
    return res.status(r.status).json(successEnvelope(req, payload, r.status));
  }
  return res.status(r.status >= 400 ? r.status : 502).json(errorEnvelope(req, r.status, r.data));
});
