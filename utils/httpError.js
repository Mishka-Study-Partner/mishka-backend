class HttpError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} message English message (fallback if no i18n entry for code)
   * @param {unknown} [details]
   * @param {string} [code] stable machine-readable code for clients
   */
  constructor(status, message, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code || defaultCodeForStatus(status);
    this.name = "HttpError";
  }
}

function defaultCodeForStatus(status) {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  return "INTERNAL_ERROR";
}

function badRequest(message, details, code) {
  return new HttpError(400, message, details, code || "VALIDATION_ERROR");
}

function notFound(message = "Resource not found", code = "NOT_FOUND") {
  return new HttpError(404, message, undefined, code);
}

function conflict(message, code = "CONFLICT") {
  return new HttpError(409, message, undefined, code);
}

function forbidden(message = "Forbidden", code = "FORBIDDEN") {
  return new HttpError(403, message, undefined, code);
}

module.exports = { HttpError, badRequest, notFound, conflict, forbidden };
