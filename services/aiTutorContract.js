/**
 * Shapes and wire format taken only from the AI team's FastAPI app (pasted spec).
 * @see legacyAiController — proxies to the same paths on AI_SERVICE_URL.
 */

/** FastAPI `POST /upload` success body */
function parseUploadSuccessBody(data) {
  if (!data || typeof data !== "object") {
    throw new Error("UPSTREAM_UPLOAD_INVALID");
  }
  const { session_id, explanation } = data;
  if (typeof session_id !== "string" || !session_id.trim()) {
    throw new Error("UPSTREAM_UPLOAD_MISSING_SESSION_ID");
  }
  if (typeof explanation !== "string") {
    throw new Error("UPSTREAM_UPLOAD_MISSING_EXPLANATION");
  }
  return { sessionId: session_id.trim(), explanation };
}

/** FastAPI `POST /chat` success body */
function parseChatSuccessBody(data) {
  if (!data || typeof data !== "object") {
    throw new Error("UPSTREAM_CHAT_INVALID");
  }
  if (typeof data.response !== "string") {
    throw new Error("UPSTREAM_CHAT_MISSING_RESPONSE");
  }
  return { response: data.response };
}

/** FastAPI `POST /generate-tools` success body (`generate_tool_directly` on success) */
function parseGenerateToolsSuccessBody(data) {
  if (!data || typeof data !== "object") {
    throw new Error("UPSTREAM_GENERATE_INVALID");
  }
  if (data.status !== "success") {
    throw new Error("UPSTREAM_GENERATE_NOT_SUCCESS");
  }
  const toolType = String(data.tool_type).toLowerCase();
  if (toolType !== "quizzes" && toolType !== "flashcards" && toolType !== "mind_maps") {
    throw new Error("UPSTREAM_GENERATE_UNKNOWN_TOOL_TYPE");
  }
  if (!("content" in data)) {
    throw new Error("UPSTREAM_GENERATE_MISSING_CONTENT");
  }
  return { toolType, content: data.content };
}

const CARD_TYPES = new Set(["term", "fact", "note"]);

function assertQuizContent(content) {
  if (!Array.isArray(content) || content.length !== 10) {
    throw new Error("QUIZZES_CONTENT_MUST_BE_ARRAY_OF_10");
  }
  return content.map((item, i) => {
    if (!item || typeof item !== "object") throw new Error(`QUIZZES_ITEM_${i}_INVALID`);
    const q = item.question;
    const options = item.options;
    const correctAnswer = item.correct_answer;
    if (typeof q !== "string" || !q.trim()) throw new Error(`QUIZZES_ITEM_${i}_QUESTION`);
    if (!Array.isArray(options) || options.length !== 4) {
      throw new Error(`QUIZZES_ITEM_${i}_OPTIONS`);
    }
    for (let j = 0; j < 4; j++) {
      if (typeof options[j] !== "string") throw new Error(`QUIZZES_ITEM_${i}_OPTION_${j}`);
    }
    if (typeof correctAnswer !== "string") throw new Error(`QUIZZES_ITEM_${i}_CORRECT_ANSWER`);
    const idx = options.findIndex((o) => o === correctAnswer);
    if (idx < 0) throw new Error(`QUIZZES_ITEM_${i}_CORRECT_NOT_IN_OPTIONS`);
    const letter = ["A", "B", "C", "D"][idx];
    return {
      questionText: q.trim(),
      optionA: options[0],
      optionB: options[1],
      optionC: options[2],
      optionD: options[3],
      correctOption: letter,
    };
  });
}

function assertFlashcardsContent(content) {
  if (!Array.isArray(content) || content.length !== 10) {
    throw new Error("FLASHCARDS_CONTENT_MUST_BE_ARRAY_OF_10");
  }
  return content.map((item, i) => {
    if (!item || typeof item !== "object") throw new Error(`FLASHCARDS_ITEM_${i}_INVALID`);
    const type = item.type;
    const front = item.front;
    const back = item.back;
    if (typeof type !== "string" || !CARD_TYPES.has(type)) {
      throw new Error(`FLASHCARDS_ITEM_${i}_TYPE`);
    }
    if (typeof front !== "string" || !front.trim()) throw new Error(`FLASHCARDS_ITEM_${i}_FRONT`);
    if (typeof back !== "string" || !back.trim()) throw new Error(`FLASHCARDS_ITEM_${i}_BACK`);
    return {
      question: `[${type}] ${front.trim()}`,
      answer: back.trim(),
    };
  });
}

function assertMindMapContent(content) {
  if (!content || typeof content !== "object") {
    throw new Error("MIND_MAPS_CONTENT_MUST_BE_OBJECT");
  }
  if (typeof content.title !== "string" || !content.title.trim()) {
    throw new Error("MIND_MAPS_MISSING_TITLE");
  }
  if (!Array.isArray(content.children)) {
    throw new Error("MIND_MAPS_CHILDREN_NOT_ARRAY");
  }
  return content;
}

module.exports = {
  parseUploadSuccessBody,
  parseChatSuccessBody,
  parseGenerateToolsSuccessBody,
  assertQuizContent,
  assertFlashcardsContent,
  assertMindMapContent,
};
