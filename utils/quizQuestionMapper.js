const { badRequest } = require("./httpError");

const LETTERS = ["A", "B", "C", "D"];

/**
 * Map REST body to Prisma QuizQuestion fields.
 * Accepts legacy shape (optionA–D, correctOption) or Flutter shape (options[], correctOptionIndex).
 */
function mapQuizQuestionBody(body) {
  const quizId = body.quizId;
  const questionText = body.questionText != null ? String(body.questionText).trim() : "";
  if (!questionText) {
    throw badRequest("questionText is required", [{ path: "questionText", message: "Required" }], "VALIDATION_ERROR");
  }

  if (body.optionA != null && body.optionB != null && body.optionC != null && body.optionD != null) {
    const letter = String(body.correctOption || "A")
      .trim()
      .toUpperCase()
      .slice(0, 1);
    if (!LETTERS.includes(letter)) {
      throw badRequest("correctOption must be A, B, C, or D", [{ path: "correctOption", message: "Invalid" }], "VALIDATION_ERROR");
    }
    return {
      quizId,
      questionText: questionText.slice(0, 8000),
      optionA: String(body.optionA).slice(0, 2000),
      optionB: String(body.optionB).slice(0, 2000),
      optionC: String(body.optionC).slice(0, 2000),
      optionD: String(body.optionD).slice(0, 2000),
      correctOption: letter,
    };
  }

  if (Array.isArray(body.options) && body.options.length >= 2) {
    const opts = body.options.map((o) => String(o ?? "").slice(0, 2000));
    while (opts.length < 4) opts.push("");
    const idx = Number(body.correctOptionIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
      throw badRequest(
        "correctOptionIndex must be 0–3 when using options[]",
        [{ path: "correctOptionIndex", message: "Invalid" }],
        "VALIDATION_ERROR"
      );
    }
    return {
      quizId,
      questionText: questionText.slice(0, 8000),
      optionA: opts[0],
      optionB: opts[1],
      optionC: opts[2],
      optionD: opts[3],
      correctOption: LETTERS[idx],
    };
  }

  throw badRequest(
    "Provide optionA–optionD and correctOption, or options[] and correctOptionIndex",
    [{ path: "options", message: "Required" }],
    "VALIDATION_ERROR"
  );
}

module.exports = { mapQuizQuestionBody };
