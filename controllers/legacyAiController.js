const axios = require("axios");
const FormData = require("form-data");
const asyncHandler = require("../utils/asyncHandler");
const { HttpError } = require("../utils/httpError");
const { preferredLanguage } = require("../utils/locale");
const { messagesForCode } = require("../utils/errorMessages");
const { persistUploadSuccess, persistChatSuccess, persistGenerateToolsSuccess } = require("../services/aiPersistence");

const AI_BASE = () => process.env.AI_SERVICE_URL || "";

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
    return res.status(r.status).json(successEnvelope(req, r.data, r.status));
  }
  return res.status(r.status >= 400 ? r.status : 502).json(errorEnvelope(req, r.status, r.data));
});

exports.chat = asyncHandler(async (req, res) => {
  if (!AI_BASE()) {
    throw new HttpError(503, "AI_SERVICE_URL is not configured", undefined, "SERVICE_UNAVAILABLE");
  }

  const { session_id, message } = req.body;
  const r = await axios.post(`${AI_BASE()}/chat`, null, {
    params: { session_id, message },
    validateStatus: () => true,
  });

  if (r.status >= 200 && r.status < 300) {
    try {
      await persistChatSuccess(req.auth.sub, session_id, message, r.status, normalizeAiPayload(r.data));
    } catch (e) {
      console.error("[ai] persist chat failed", e);
    }
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

  const r = await axios.post(`${AI_BASE()}/generate-tools`, null, {
    params: { session_id, tool_type, complexity },
    validateStatus: () => true,
  });

  if (r.status >= 200 && r.status < 300) {
    try {
      await persistGenerateToolsSuccess(
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
    return res.status(r.status).json(successEnvelope(req, r.data, r.status));
  }
  return res.status(r.status >= 400 ? r.status : 502).json(errorEnvelope(req, r.status, r.data));
});
