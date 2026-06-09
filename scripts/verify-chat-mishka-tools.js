require("dotenv").config();
const base = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function main() {
  const uniq = Date.now();
  const reg = await fetch(`${base}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Tool",
      lastName: "User",
      email: `tools_${uniq}@example.com`,
      password: "Verify1!Pass9",
      agreeTerms: true,
      phoneNumber: `556${String(uniq).slice(-7)}`,
      countryCode: "+1",
      educationStatus: "university",
      universityYear: 2,
    }),
  }).then((r) => r.json());
  if (!reg.success) throw new Error("register: " + JSON.stringify(reg));
  const auth = { Authorization: `Bearer ${reg.data.accessToken}`, "content-type": "application/json" };

  const session = await fetch(`${base}/chat-sessions`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ title: "Tool test", startedAt: new Date().toISOString() }),
  }).then((r) => r.json());
  if (!session.success) throw new Error("session: " + JSON.stringify(session));
  const sessionId = session.data.id;

  const badQuiz = await fetch(`${base}/quizzes`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      title: "Bad",
      sourceType: "ai",
      raw: { questions: [] },
    }),
  }).then((r) => r.json());
  if (badQuiz.success) throw new Error("expected validation error for raw on quiz");
  console.log("quiz rejects raw OK");

  const quiz = await fetch(`${base}/quizzes`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      title: "Generated Quiz",
      sourceType: "ai",
      totalQuestions: 1,
      chatSessionId: sessionId,
    }),
  }).then((r) => r.json());
  if (!quiz.success) throw new Error("quiz create: " + JSON.stringify(quiz));
  console.log("quiz create OK", quiz.data.sourceType);

  const q = await fetch(`${base}/quiz-questions`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      quizId: quiz.data.id,
      questionText: "In Dart, what is the scope of private variables?",
      options: ["Class level", "Function level", "Library level", "Global level"],
      correctOptionIndex: 2,
      order: 0,
    }),
  }).then((r) => r.json());
  if (!q.success) throw new Error("quiz question: " + JSON.stringify(q));
  console.log("quiz question Flutter shape OK", q.data.correctOption);

  const preview = await fetch(`${base}/chat-messages`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      sessionId,
      senderType: "ai",
      inputType: "tool_preview",
      messageContent: JSON.stringify({
        status: "success",
        tool_type: "quizzes",
        content: [],
        quizProgress: { currentIndex: 0 },
      }),
    }),
  }).then((r) => r.json());
  if (!preview.success) throw new Error("tool_preview create: " + JSON.stringify(preview));
  const messageId = preview.data.id;

  const patch = await fetch(`${base}/chat-messages/${messageId}`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({
      messageContent: JSON.stringify({
        status: "success",
        tool_type: "quizzes",
        content: [],
        quizProgress: { currentIndex: 1, score: 1 },
      }),
    }),
  }).then((r) => r.json());
  if (!patch.success) throw new Error("PATCH message: " + JSON.stringify(patch));
  console.log("PATCH chat-messages OK");

  const put = await fetch(`${base}/chat-messages/${messageId}`, {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({
      messageContent: JSON.stringify({
        status: "success",
        tool_type: "quizzes",
        quizProgress: { currentIndex: 2 },
      }),
    }),
  }).then((r) => r.json());
  if (!put.success) throw new Error("PUT message: " + JSON.stringify(put));
  console.log("PUT chat-messages OK");

  const missing = await fetch(`${base}/chat-messages/00000000-0000-4000-8000-000000000099`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ messageContent: "{}" }),
  }).then((r) => r.json());
  if (missing.success || missing.error !== "NOT_FOUND") {
    throw new Error("expected NOT_FOUND for missing message: " + JSON.stringify(missing));
  }
  console.log("missing message 404 OK");

  console.log("\nCHAT MISHKA TOOLS OK");
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
