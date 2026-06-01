/**
 * Parse `topLevelMode` for study period report endpoints.
 * Omit, empty, or `all` → aggregate concentration + call_with_mishka (no DB filter).
 */
function parseReportTopLevelMode(raw) {
  if (raw === "all" || raw === undefined || raw === null || raw === "") {
    return { mode: undefined, explicitAll: raw === "all" };
  }
  if (raw === "concentration" || raw === "call_with_mishka") {
    return { mode: raw, explicitAll: false };
  }
  return { mode: undefined, explicitAll: false };
}

function reportFiltersFromMode(mode, explicitAll) {
  if (mode) return { topLevelMode: mode };
  if (explicitAll) return { topLevelMode: "all" };
  return {};
}

module.exports = { parseReportTopLevelMode, reportFiltersFromMode };
