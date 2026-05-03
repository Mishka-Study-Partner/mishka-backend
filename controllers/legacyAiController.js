const axios = require("axios");
const FormData = require("form-data");
const asyncHandler = require("../utils/asyncHandler");
const { HttpError } = require("../utils/httpError");
const { preferredLanguage } = require("../utils/locale");
const { messagesForCode } = require("../utils/errorMessages");

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
  if (req.body.summary_level) form.append("summary_level", req.body.summary_level);

  const r = await axios.post(`${AI_BASE()}/upload`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });

  if (r.status >= 200 && r.status < 300) {
    return res.status(r.status).json(successEnvelope(req, r.data, r.status));
  }
  return res.status(r.status >= 400 ? r.status : 502).json(errorEnvelope(req, r.status, r.data));
});

exports.chat = asyncHandler(async (req, res) => {
  if (!AI_BASE()) {
    throw new HttpError(503, "AI_SERVICE_URL is not configured", undefined, "SERVICE_UNAVAILABLE");
  }
  const r = await axios.post(`${AI_BASE()}/chat`, req.body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    validateStatus: () => true,
  });

  if (r.status >= 200 && r.status < 300) {
    return res.status(r.status).json(successEnvelope(req, r.data, r.status));
  }
  return res.status(r.status >= 400 ? r.status : 502).json(errorEnvelope(req, r.status, r.data));
});

exports.generateTools = asyncHandler(async (req, res) => {
  if (!AI_BASE()) {
    throw new HttpError(503, "AI_SERVICE_URL is not configured", undefined, "SERVICE_UNAVAILABLE");
  }
  const r = await axios.post(`${AI_BASE()}/generate-tools`, req.body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    validateStatus: () => true,
  });

  if (r.status >= 200 && r.status < 300) {
    return res.status(r.status).json(successEnvelope(req, r.data, r.status));
  }
  return res.status(r.status >= 400 ? r.status : 502).json(errorEnvelope(req, r.status, r.data));
});
