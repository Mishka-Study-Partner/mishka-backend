/**
 * Reads Accept-Language (e.g. "ar", "ar-EG", "en-US, ar;q=0.9").
 * Returns "ar" or "en".
 */
function preferredLanguage(req) {
  const raw = (req.headers["accept-language"] || "").trim();
  if (!raw) return "en";
  const first = raw.split(",")[0].trim().toLowerCase();
  if (first.startsWith("ar")) return "ar";
  return "en";
}

module.exports = { preferredLanguage };
