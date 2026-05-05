/** Normalize client-provided tag list (dedupe case-insensitive, cap count/length). */
function normalizeTags(input) {
  if (input == null) return [];
  if (!Array.isArray(input)) return [];
  const out = [];
  const seen = new Set();
  for (const x of input.slice(0, 20)) {
    const t = String(x).trim().slice(0, 80);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

module.exports = { normalizeTags };
