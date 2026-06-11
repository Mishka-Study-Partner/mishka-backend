const fs = require("fs");
const path = require("path");

const CANDIDATE_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome-stable",
].filter(Boolean);

/**
 * Resolve Chromium/Chrome for Puppeteer on Railway, Alpine Docker, or local dev.
 * @returns {string}
 */
function resolveChromiumExecutablePath() {
  for (const p of CANDIDATE_PATHS) {
    if (p && fs.existsSync(p)) return p;
  }

  try {
    const puppeteer = require("puppeteer");
    if (typeof puppeteer.executablePath === "function") {
      const bundled = puppeteer.executablePath();
      if (bundled && fs.existsSync(bundled)) return bundled;
    }
  } catch {
    /* fall through */
  }

  const cacheRoot = process.env.PUPPETEER_CACHE_DIR || path.join(process.env.HOME || "/root", ".cache", "puppeteer");
  if (fs.existsSync(cacheRoot)) {
    const found = findChromeUnder(cacheRoot);
    if (found) return found;
  }

  throw new Error(
    "Chromium not found. On Railway: redeploy with the updated Dockerfile (apk chromium + puppeteer browsers install chrome)."
  );
}

function findChromeUnder(dir, depth = 0) {
  if (depth > 8 || !fs.existsSync(dir)) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isFile() && (ent.name === "chrome" || ent.name === "chromium" || ent.name === "google-chrome")) {
      return full;
    }
    if (ent.isDirectory()) {
      const nested = findChromeUnder(full, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

module.exports = { resolveChromiumExecutablePath };
