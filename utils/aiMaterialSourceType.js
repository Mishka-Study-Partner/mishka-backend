/** Normalize client sourceType values to backend conventions. */
function normalizeMaterialSourceType(raw) {
  if (raw == null || String(raw).trim() === "") return "ai_gemini";
  const s = String(raw).trim().toLowerCase();
  if (s === "ai" || s === "ai_gemini") return "ai_gemini";
  return String(raw).trim().slice(0, 50);
}

module.exports = { normalizeMaterialSourceType };
