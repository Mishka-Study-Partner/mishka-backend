const { badRequest } = require("./httpError");

/**
 * Normalize mind map create body after Zod parse.
 * Accepts Stanley tree in `content`, or root-level `title` + `children`.
 */
function normalizeMindMapCreateBody(body) {
  let content = body.content;
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      throw badRequest("content must be a JSON object", [{ path: "content", message: "Invalid JSON" }], "VALIDATION_ERROR");
    }
  }

  if (Array.isArray(body.children)) {
    const title = String(body.title || content?.title || "").trim();
    if (!title) {
      throw badRequest("title is required", [{ path: "title", message: "Required" }], "VALIDATION_ERROR");
    }
    content = { title, children: body.children };
  }

  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw badRequest("content must be an object with title and children", [{ path: "content", message: "Required" }], "VALIDATION_ERROR");
  }

  const title = String(body.title || content.title || "").trim();
  if (!title) {
    throw badRequest("title is required (top-level or content.title)", [{ path: "title", message: "Required" }], "VALIDATION_ERROR");
  }

  const children = content.children;
  if (children != null && !Array.isArray(children)) {
    throw badRequest("content.children must be an array", [{ path: "content", message: "children must be array" }], "VALIDATION_ERROR");
  }

  const normalizedContent = {
    ...content,
    title: String(content.title || title).trim().slice(0, 500),
    children: Array.isArray(children) ? children : [],
  };

  return {
    title: title.slice(0, 500),
    content: normalizedContent,
    sourceType: body.sourceType,
    sourceReference: body.sourceReference ?? null,
    chatSessionId: body.chatSessionId ?? null,
    savedAt: body.savedAt ?? null,
  };
}

module.exports = { normalizeMindMapCreateBody };
