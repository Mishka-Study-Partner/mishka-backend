const { Prisma } = require("@prisma/client");
const { HttpError } = require("../utils/httpError");
const { preferredLanguage } = require("../utils/locale");
const { messagesForCode } = require("../utils/errorMessages");

function prismaErrorDetails(err) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null;
  return {
    prismaCode: err.code,
    meta: err.meta ?? null,
    developerMessage: err.message,
  };
}

function buildErrorBody(err, req) {
  const lang = preferredLanguage(req);
  const code =
    err instanceof HttpError && err.code
      ? err.code
      : err.code === "P2002"
        ? "UNIQUE_VIOLATION"
        : err.code === "P2025"
          ? "NOT_FOUND"
          : "INTERNAL_ERROR";

  const mapped = messagesForCode(code);
  let message_en;
  let message_ar;

  if (mapped) {
    message_en = mapped.en;
    message_ar = mapped.ar;
  } else if (err instanceof HttpError) {
    message_en = err.message;
    message_ar = err.message;
  } else {
    message_en = "Internal server error";
    message_ar = "حدث خطأ في الخادم";
  }

  const message = lang === "ar" ? message_ar : message_en;

  const details =
    err instanceof HttpError && err.details !== undefined
      ? err.details
      : err.code === "P2002"
        ? { target: err.meta?.target }
        : null;

  return {
    success: false,
    message,
    message_en,
    message_ar,
    data: null,
    error: code,
    details,
  };
}

function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json(buildErrorBody(err, req));
  }

  if (err.code === "P2002") {
    return res.status(409).json(buildErrorBody(err, req));
  }

  if (err.code === "P2025") {
    return res.status(404).json(buildErrorBody(err, req));
  }

  console.error(err);
  const body = buildErrorBody(err, req);
  const showDetails =
    process.env.NODE_ENV === "development" ||
    String(process.env.SHOW_ERROR_DETAILS || "").toLowerCase() === "true";
  if (showDetails) {
    body.details =
      body.details ||
      prismaErrorDetails(err) || {
        developerMessage: err.message,
        errorName: err.constructor?.name,
      };
  }
  return res.status(500).json(body);
}

module.exports = errorHandler;
