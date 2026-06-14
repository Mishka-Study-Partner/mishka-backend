const prisma = require("../../utils/prisma");
const { DEFAULT_GOALS } = require("./gamificationConstants");

let cache = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

async function loadGoalsMap() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_MS) return cache;
  const rows = await prisma.gamificationGoal.findMany();
  const map = { ...DEFAULT_GOALS };
  for (const row of rows) {
    map[row.code] = row.valueNumeric;
  }
  cache = map;
  cacheAt = now;
  return map;
}

async function getGoal(code, fallback) {
  const map = await loadGoalsMap();
  return map[code] ?? fallback;
}

module.exports = { loadGoalsMap, getGoal };
