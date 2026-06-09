# AI tools — full backend contract review

Date: June 8, 2026  
Audience: Flutter team (mishka-app)  
Scope: Quiz, Flashcards, Summary, Mind map — generate (Stanley AI) + persist (Mishka save/share/saved library)

Related: [`FLUTTER_CHAT_MISHKA_BACKEND_RESPONSE.md`](./FLUTTER_CHAT_MISHKA_BACKEND_RESPONSE.md) · [`MINDMAP_SAVE_BACKEND_HANDOFF.md`](./MINDMAP_SAVE_BACKEND_HANDOFF.md)

**Auth:** `Authorization: Bearer <accessToken>` on all Mishka routes below.

---

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **Stanley AI** | `POST /upload`, `POST /generate-tools` (quiz, flashcards, mind map); summary text from upload explanation |
| **Mishka** | Create entity → add children → `POST /saved-*` → optional `POST /{entity}/{id}/share` |

**Rule:** Do **not** send `raw` on any Mishka create. Unknown keys → `400 VALIDATION_ERROR`.

**Create responses:** All four types return **`201`** with **`data.id`** (uuid of the new row).

---

## Quick reference

| Tool | Create | Add children | Save | Share | Detail text field |
|------|--------|--------------|------|-------|-------------------|
| Quiz | `POST /quizzes` | `POST /quiz-questions` | `POST /saved-quizzes` | `POST /quizzes/{id}/share` | — |
| Flashcards | `POST /flashcard-sets` | **`POST /flashcard-sets/{id}/flashcards`** | `POST /saved-flashcard-sets` | `POST /flashcard-sets/{id}/share` | — |
| Summary | `POST /summaries` | — | `POST /saved-summaries` | `POST /summaries/{id}/share` | **`summaryText`** |
| Mind map | `POST /mind-maps` | — (tree in `content`) | `POST /saved-mind-maps` | `POST /mind-maps/{id}/share` | `content` JSON |

`sourceType: "ai"` on all creates → stored as **`ai_gemini`**.

---

## 1. Quiz

### Create

```json
POST /quizzes
{
  "title": "Generated Quiz",
  "sourceType": "ai",
  "totalQuestions": 10,
  "chatSessionId": "<session-uuid>"
}
```

Response: `201`, **`data.id`** = quiz uuid.

### Add questions

**Flutter shape (preferred):**

```json
POST /quiz-questions
{
  "quizId": "<quiz-uuid>",
  "questionText": "In Dart, what is the scope of private variables?",
  "options": ["Class level", "Function level", "Library level", "Global level"],
  "correctOptionIndex": 2,
  "order": 0
}
```

**Legacy shape:** `optionA`–`optionD` + `correctOption` (`"A"`–`"D"`).

Alternative: `POST /quizzes/{id}/questions` (same body without `quizId`).

### Save & playback

```json
POST /saved-quizzes
{ "quizId": "<quiz-uuid>" }
```

**List** `GET /saved-quizzes`:
- `totalQuestions` and **`questionCount`** synced from DB count (not stale)
- No nested `questions[]` on list (use detail for playback)

**Detail** `GET /saved-quizzes/{id}`:
- Full **`questions[]`** ordered by `createdAt` asc
- Each question includes **`optionA`–`optionD`**, `correctOption`, `questionText`
- `totalQuestions` = `questionCount` = `questions.length`

No need to call `GET /quizzes/{id}/questions` after detail fetch.

### Question object shape

```json
{
  "id": "<uuid>",
  "quizId": "<uuid>",
  "questionText": "...",
  "optionA": "...",
  "optionB": "...",
  "optionC": "...",
  "optionD": "...",
  "correctOption": "C",
  "createdAt": "..."
}
```

---

## 2. Flashcards

### Canonical add-card route

**Yes — use nested route:**

```http
POST /flashcard-sets/{setId}/flashcards
```

```json
{ "question": "[term] Mitochondria", "answer": "Powerhouse of the cell" }
```

`POST /flashcards` with body `{ setId, question, answer }` still works but nested route is preferred.

### Create set

```json
POST /flashcard-sets
{ "title": "Generated Flashcards", "sourceType": "ai", "chatSessionId": "..." }
```

Response: `201`, **`data.id`** = set uuid.

### Save & detail

```json
POST /saved-flashcard-sets
{ "flashcardSetId": "<set-uuid>" }
```

**Detail** `GET /saved-flashcard-sets/{id}`:
- Nested **`flashcards[]`** ordered by `createdAt` asc
- **`cardCount`** on list and detail

Flashcard row: `id`, `setId`, `question`, `answer`, `createdAt`.

---

## 3. Summary

Summary is **plain text** — not generated via `/generate-tools` in the Stanley flow (comes from upload explanation). Save like other materials.

### Create

```json
POST /summaries
{
  "summaryText": "Chapter 3 recap: photosynthesis converts light to chemical energy…",
  "sourceType": "ai",
  "chatSessionId": "<session-uuid>"
}
```

**Detail field name:** **`summaryText`** (there is no `title` or `content` on Summary).

Response: `201`, **`data.id`** = summary uuid.

### Save

```json
POST /saved-summaries
{ "summaryId": "<summary-uuid>" }
```

Detail `GET /saved-summaries/{id}` returns full row including `summaryText`.

---

## 4. Mind map

See [`MINDMAP_SAVE_BACKEND_HANDOFF.md`](./MINDMAP_SAVE_BACKEND_HANDOFF.md) for curl examples.

### Create (Stanley tree)

```json
POST /mind-maps
{
  "content": {
    "title": "Exam topics",
    "children": [
      { "title": "Cells", "children": [] },
      { "title": "Genetics", "children": [] }
    ]
  },
  "sourceType": "ai"
}
```

- Top-level **`title` optional** when `content.title` is present
- **`content.children`** must be an array (can be empty)
- Stored: DB `title` + DB `content` = full `{ title, children }` tree

Response: `201`, **`data.id`** = mind map uuid.

### Save

```json
POST /saved-mind-maps
{ "mindMapId": "<mind-map-uuid>" }
```

---

## 5. Share (all types)

```json
POST /quizzes/{id}/share
POST /flashcard-sets/{id}/share
POST /summaries/{id}/share
POST /mind-maps/{id}/share
```

```json
{
  "channelIds": ["<channel-uuid>"],
  "note": "Optional note"
}
```

Or via saved routes: `POST /saved-quizzes/{id}/share`, etc. (`id` = resource id, not a separate saved-library id).

---

## 6. OpenAPI / Swagger

Explicit request schemas (replacing generic `JsonRecord` on creates):

| Schema | Route |
|--------|-------|
| `QuizCreateBody` | `POST /quizzes` |
| `QuizQuestionCreateBody` | `POST /quiz-questions` |
| `FlashcardSetCreateBody` | `POST /flashcard-sets` |
| `FlashcardNestedCreateBody` | `POST /flashcard-sets/{id}/flashcards` |
| `SummaryCreateBody` | `POST /summaries` |
| `MindMapCreateBody` | `POST /mind-maps` |
| `MindMapTreeContent` | nested in mind map create |
| `AiMaterialSourceType` | shared enum |

Live docs: `/api-docs`

---

## 7. End-to-end save flow (Flutter)

```text
Generate (Stanley) → build local model
  → POST /{entity}           → data.id
  → POST children (quiz/FC)  → repeat
  → POST /saved-{type}       → { quizId | flashcardSetId | summaryId | mindMapId }
  → optional POST /{entity}/{id}/share
```

---

## 8. Error codes

| Code | When |
|------|------|
| `VALIDATION_ERROR` | Unknown fields (`raw`), invalid mind map tree, bad quiz question shape |
| `SAVED_LIBRARY_NOT_SAVED` | `GET /saved-*` when `savedAt` is null |
| `QUIZ_NOT_FOUND` / `FLASHCARD_SET_NOT_FOUND` / etc. | Missing resource |

---

## 9. Verification

```bash
node scripts/verify-ai-tools-contract.js
node scripts/verify-chat-mishka-tools.js
```

---

## 10. Flutter checklist

| Item | Action |
|------|--------|
| Mind map save | Send `content: { title, children[] }`; top-level title optional |
| Quiz playback | Use `GET /saved-quizzes/{id}` — includes full `questions[]` |
| Quiz list cards | Use `totalQuestions` or `questionCount` from list (synced) |
| Flashcards | Use `POST /flashcard-sets/{id}/flashcards` |
| Summary | Field is **`summaryText`**, not `content` |
| All creates | Read **`data.id`**; never send `raw` |
| OpenAPI | Regenerate client from `/api-docs` for typed bodies |
