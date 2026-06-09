require("dotenv").config();
const base = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function main() {
  const uniq = Date.now();
  const reg = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "AI",
      lastName: "Tools",
      email: `aitools_${uniq}@example.com`,
      password: "Verify1!Pass9",
      agreeTerms: true,
      phoneNumber: `557${String(uniq).slice(-7)}`,
      countryCode: "+1",
      educationStatus: "university",
      universityYear: 2,
    }),
  }).then((r) => r.json());
  if (!reg.success) throw new Error("register: " + JSON.stringify(reg));
  const auth = { Authorization: `Bearer ${reg.data.accessToken}`, "content-type": "application/json" };

  // Mind map — Stanley content-only shape (no top-level title)
  const mm = await fetch(`${base}/mind-maps`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      content: {
        title: `Exam topics ${uniq}`,
        children: [{ title: "Cells", children: [] }, { title: "Genetics", children: [] }],
      },
      sourceType: "ai",
    }),
  }).then((r) => r.json());
  if (!mm.success || !mm.data.id) throw new Error("mind-map create: " + JSON.stringify(mm));
  console.log("mind-map create OK", mm.data.id, mm.data.content?.title);

  const savedMm = await fetch(`${base}/saved-mind-maps`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ mindMapId: mm.data.id }),
  }).then((r) => r.json());
  if (!savedMm.success) throw new Error("saved mind-map: " + JSON.stringify(savedMm));
  console.log("saved mind-map OK");

  // Quiz + questions + saved detail
  const quiz = await fetch(`${base}/quizzes`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ title: "Playback Quiz", sourceType: "ai", totalQuestions: 0 }),
  }).then((r) => r.json());
  if (!quiz.success) throw new Error("quiz: " + JSON.stringify(quiz));

  await fetch(`${base}/quiz-questions`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      quizId: quiz.data.id,
      questionText: "Q1?",
      options: ["A", "B", "C", "D"],
      correctOptionIndex: 1,
    }),
  }).then((r) => r.json());

  await fetch(`${base}/saved-quizzes`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ quizId: quiz.data.id }),
  });

  const savedQuiz = await fetch(`${base}/saved-quizzes/${quiz.data.id}`, { headers: auth }).then((r) => r.json());
  if (!savedQuiz.success || !savedQuiz.data.questions?.[0]?.optionB) {
    throw new Error("saved quiz detail missing options: " + JSON.stringify(savedQuiz));
  }
  if (savedQuiz.data.totalQuestions !== 1 || savedQuiz.data.questionCount !== 1) {
    throw new Error("question count not synced: " + JSON.stringify(savedQuiz.data));
  }
  console.log("saved quiz detail OK", savedQuiz.data.questionCount, "questions");

  const savedList = await fetch(`${base}/saved-quizzes`, { headers: auth }).then((r) => r.json());
  const card = savedList.data.find((q) => q.id === quiz.data.id);
  if (!card || card.totalQuestions !== 1) throw new Error("list card count: " + JSON.stringify(card));
  console.log("saved quiz list count OK");

  // Flashcards nested route
  const set = await fetch(`${base}/flashcard-sets`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ title: "FC Set", sourceType: "ai" }),
  }).then((r) => r.json());
  if (!set.success) throw new Error("flashcard set: " + JSON.stringify(set));

  const card1 = await fetch(`${base}/flashcard-sets/${set.data.id}/flashcards`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ question: "Front", answer: "Back" }),
  }).then((r) => r.json());
  if (!card1.success) throw new Error("nested flashcard: " + JSON.stringify(card1));

  await fetch(`${base}/saved-flashcard-sets`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ flashcardSetId: set.data.id }),
  });

  const savedSet = await fetch(`${base}/saved-flashcard-sets/${set.data.id}`, { headers: auth }).then((r) => r.json());
  if (!savedSet.success || !savedSet.data.flashcards?.length) {
    throw new Error("saved flashcard detail: " + JSON.stringify(savedSet));
  }
  console.log("flashcard nested + saved detail OK", savedSet.data.cardCount, "cards");

  // Summary
  const sum = await fetch(`${base}/summaries`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ summaryText: "Plain text summary body.", sourceType: "ai" }),
  }).then((r) => r.json());
  if (!sum.success || !sum.data.summaryText) throw new Error("summary: " + JSON.stringify(sum));
  console.log("summary create OK", sum.data.id);

  console.log("\nAI TOOLS CONTRACT OK");
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
