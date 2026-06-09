/** Normalize quiz API rows: ordered questions + synced counts for list/detail. */

function enrichQuizRow(quiz, { includeQuestions = true } = {}) {
  if (!quiz) return quiz;
  const { _count, ...rest } = quiz;
  const countFromDb = _count?.questions;
  const questions = includeQuestions
    ? [...(rest.questions || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : undefined;
  const questionCount = questions ? questions.length : countFromDb ?? rest.totalQuestions ?? 0;
  const out = {
    ...rest,
    totalQuestions: questionCount,
    questionCount,
  };
  if (includeQuestions) out.questions = questions;
  else delete out.questions;
  return out;
}

function enrichFlashcardSetRow(set, { includeCards = true } = {}) {
  if (!set) return set;
  const { _count, ...rest } = set;
  const cards = includeCards
    ? [...(rest.flashcards || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : undefined;
  const cardCount = cards ? cards.length : _count?.flashcards ?? rest.flashcards?.length ?? 0;
  const out = { ...rest, cardCount };
  if (includeCards) out.flashcards = cards;
  else delete out.flashcards;
  return out;
}

module.exports = { enrichQuizRow, enrichFlashcardSetRow };
