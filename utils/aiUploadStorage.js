const fs = require("fs/promises");
const path = require("path");

function uploadRootDir() {
  const rel = process.env.AI_UPLOAD_STORAGE_DIR || "data/ai-uploads";
  return path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
}

/**
 * @param {string} name
 */
function sanitizeFilename(name) {
  const base = path.basename(name || "upload").replace(/[\x00-\x1f\\/?*:|"<>]/g, "_");
  return base.slice(0, 200) || "upload.bin";
}

/**
 * Persists the raw upload bytes on disk for the given tutor session (Python `session_id`).
 * @param {string} userId
 * @param {string} sessionId
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} [mimeType]
 * @returns {Promise<{ relativePath: string; sizeBytes: number; storedFilename: string }>}
 */
async function saveUploadedMaterial(userId, sessionId, buffer, originalName, mimeType) {
  const root = uploadRootDir();
  const dir = path.join(root, userId, sessionId);
  await fs.mkdir(dir, { recursive: true });
  const storedFilename = sanitizeFilename(originalName);
  const absFile = path.join(dir, storedFilename);
  await fs.writeFile(absFile, buffer);
  const relativePath = path.relative(uploadRootDir(), absFile).split(path.sep).join("/");
  return {
    relativePath,
    sizeBytes: buffer.length,
    storedFilename,
    mimeType: mimeType || null,
  };
}

module.exports = { saveUploadedMaterial, uploadRootDir, sanitizeFilename };
