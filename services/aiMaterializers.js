/**
 * Maps Gemini/FastAPI `generate-tools` **success** payloads into Prisma models.
 * Only structures defined in the AI team doc (`generate_tool_directly` return value).
 */

const { assertQuizContent, assertFlashcardsContent, assertMindMapContent } = require("./aiTutorContract");

const QUIZ_DB_TITLE = "Study quiz (AI)";
const FLASHCARD_SET_TITLE = "Study flashcards (AI)";

/**
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {string} userId
 * @param {"quizzes"|"flashcards"|"mind_maps"} toolType
 * @param {unknown} content — `result.content` from FastAPI
 */
async function materializeToolContent(tx, userId, toolType, content) {
  if (toolType === "quizzes") {
    const rows = assertQuizContent(content);
    const quiz = await tx.quiz.create({
      data: {
        userId,
        title: QUIZ_DB_TITLE,
        sourceType: "ai_gemini",
        sourceReference: null,
        totalQuestions: rows.length,
      },
    });
    for (const row of rows) {
      await tx.quizQuestion.create({
        data: { quizId: quiz.id, ...row },
      });
    }
    await tx.historyItem.create({
      data: {
        userId,
        featureType: "quiz",
        referenceId: quiz.id,
        title: quiz.title.slice(0, 500),
      },
    });
    return { quizId: quiz.id };
  }

  if (toolType === "flashcards") {
    const cards = assertFlashcardsContent(content);
    const set = await tx.flashcardSet.create({
      data: {
        userId,
        title: FLASHCARD_SET_TITLE,
        sourceType: "ai_gemini",
        sourceReference: null,
      },
    });
    for (const c of cards) {
      await tx.flashcard.create({
        data: { setId: set.id, question: c.question, answer: c.answer },
      });
    }
    await tx.historyItem.create({
      data: {
        userId,
        featureType: "flashcards",
        referenceId: set.id,
        title: set.title.slice(0, 500),
      },
    });
    return { flashcardSetId: set.id };
  }

  if (toolType === "mind_maps") {
    const tree = assertMindMapContent(content);
    return { mindMapTitle: tree.title.trim() };
  }

  throw new Error("UNKNOWN_TOOL_TYPE");
}

module.exports = { materializeToolContent };
