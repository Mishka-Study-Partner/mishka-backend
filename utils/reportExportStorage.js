const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function exportRootDir() {
  const rel = process.env.REPORT_EXPORT_STORAGE_DIR || "data/report-exports";
  return path.isAbsolute(rel) ? rel : path.join(__dirname, "..", rel);
}

function userExportDir(userId) {
  return path.join(exportRootDir(), userId);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function newExportId() {
  return crypto.randomUUID();
}

function pdfPath(userId, exportId) {
  return path.join(userExportDir(userId), `${exportId}.pdf`);
}

function metaPath(userId, exportId) {
  return path.join(userExportDir(userId), `${exportId}.json`);
}

/**
 * @param {string} userId
 * @param {string} exportId
 * @param {{ expiresAt: string; periodLabel: string; period: string }} meta
 */
function writeMeta(userId, exportId, meta) {
  ensureDir(userExportDir(userId));
  fs.writeFileSync(metaPath(userId, exportId), JSON.stringify(meta), "utf8");
}

/**
 * @returns {{ userId: string; exportId: string; expiresAt: string; periodLabel: string; period: string } | null}
 */
function readMeta(userId, exportId) {
  const p = metaPath(userId, exportId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

module.exports = {
  exportRootDir,
  newExportId,
  pdfPath,
  writeMeta,
  readMeta,
  ensureDir,
};
