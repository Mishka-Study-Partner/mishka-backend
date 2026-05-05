/**
 * Normalize quiz performance to 0–10 for badges / tiers (independent of question count).
 * @param {number} correctCount
 * @param {number} totalQuestions
 * @returns {number} integer 0–10
 */
function scoreOutOfTen(correctCount, totalQuestions) {
  const c = Math.max(0, Math.floor(Number(correctCount)) || 0);
  const t = Math.floor(Number(totalQuestions)) || 0;
  if (t < 1) return 0;
  return Math.min(10, Math.max(0, Math.round((c / t) * 10)));
}

/**
 * @param {Array<{ id: string, correctOption: string }>} questions
 * @param {Array<{ questionId: string, selectedOption: string }>} answers
 * @returns {{ correctCount: number, totalQuestions: number, scoreOutOfTen: number, percentage: number }}
 */
function gradeQuizAnswers(questions, answers) {
  const totalQuestions = questions.length;
  const byId = new Map(questions.map((q) => [q.id, q.correctOption.toUpperCase()]));
  const answerById = new Map();
  for (const a of answers) {
    const qid = a.questionId;
    const letter = String(a.selectedOption || "")
      .trim()
      .toUpperCase();
    answerById.set(qid, letter);
  }
  let correctCount = 0;
  for (const q of questions) {
    const picked = answerById.get(q.id);
    if (picked && picked === byId.get(q.id)) correctCount += 1;
  }
  const ten = scoreOutOfTen(correctCount, totalQuestions);
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0;
  return { correctCount, totalQuestions, scoreOutOfTen: ten, percentage };
}

module.exports = { scoreOutOfTen, gradeQuizAnswers };
