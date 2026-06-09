# Flutter handoff — AI tools changes only

**Date:** June 8, 2026  
**Scope:** Quiz, Flashcards, Summary, Mind map — save/share/saved library contract fixes from the full review request.

Full contract: [`AI_TOOLS_FULL_BACKEND_REVIEW.md`](./AI_TOOLS_FULL_BACKEND_REVIEW.md) · Mind map curl: [`MINDMAP_SAVE_BACKEND_HANDOFF.md`](./MINDMAP_SAVE_BACKEND_HANDOFF.md)

**Auth:** `Authorization: Bearer <accessToken>`

---

## What changed (summary)

| # | Issue | Fix |
|---|-------|-----|
| 1 | `POST /mind-maps` → 400 when saving Stanley tree | Accept `content: { title, children[] }`; top-level `title` optional |
| 2 | `GET /saved-quizzes/{id}` missing options for playback | Detail returns full `questions[]` with `optionA`–`optionD` |
| 3 | Saved quiz list shows stale `totalQuestions` | `totalQuestions` + `questionCount` synced to real DB count |
| 4 | Flashcard add route unclear | **`POST /flashcard-sets/{id}/flashcards`** confirmed canonical |
| 5 | Summary field name unclear | Plain text field is **`summaryText`** (not `content` / `raw`) |
| 6 | OpenAPI only had `JsonRecord` | Explicit create schemas in `/api-docs` |
| 7 | Create `data.id` | All four creates return **`201`** with **`data.id`** (uuid) — documented & verified |

Verify: `node scripts/verify-ai-tools-contract.js`

---

## 1. Mind map save (was BLOCKED)

### Before
Sending Stanley shape often failed validation (required top-level `title`, strict `content` shape).

### Now

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

| Rule | Detail |
|------|--------|
| `content` | Stanley `{ title, children[] }` — **not** `{ root, nodes }` |
| Top-level `title` | Optional if `content.title` is set |
| Alternative | Root `title` + `children[]` merged into `content` |
| `raw` | Rejected → `400 VALIDATION_ERROR` |
| `sourceType: "ai"` | Stored as `ai_gemini` |
| Response | `201`, **`data.id`** → use in `POST /saved-mind-maps` |

```json
POST /saved-mind-maps
{ "mindMapId": "<data.id>" }
```

---

## 2. Quiz saved playback

### `GET /saved-quizzes/{id}` (detail)

Now includes full nested **`questions[]`**:

```json
{
  "id": "...",
  "title": "...",
  "totalQuestions": 10,
  "questionCount": 10,
  "questions": [
    {
      "id": "...",
      "questionText": "...",
      "optionA": "...",
      "optionB": "...",
      "optionC": "...",
      "optionD": "...",
      "correctOption": "C"
    }
  ]
}
```

- Ordered by `createdAt` asc  
- **No extra call** to `GET /quizzes/{id}/questions` needed for playback

### `GET /saved-quizzes` (list)

- **`totalQuestions`** and **`questionCount`** match actual question count  
- List does **not** include `questions[]` (lighter payload) — use detail for playback

---

## 3. Flashcards

**Canonical add-card route:**

```http
POST /flashcard-sets/{setId}/flashcards
```

```json
{ "question": "[term] Mitochondria", "answer": "Powerhouse of the cell" }
```

`POST /flashcards` with `setId` in body still works; prefer nested route.

**`GET /saved-flashcard-sets/{id}`** — includes nested **`flashcards[]`** + **`cardCount`**.

---

## 4. Summary

```json
POST /summaries
{
  "summaryText": "Chapter 3 recap…",
  "sourceType": "ai"
}
```

| Field | Notes |
|-------|-------|
| **`summaryText`** | Plain text body — this is the detail/read field |
| Not used | `content`, `raw`, `title` |

---

## 5. OpenAPI

Explicit request bodies (Swagger `/api-docs`):

| Schema | Route |
|--------|-------|
| `QuizCreateBody` | `POST /quizzes` |
| `QuizQuestionCreateBody` | `POST /quiz-questions` |
| `FlashcardSetCreateBody` | `POST /flashcard-sets` |
| `FlashcardNestedCreateBody` | `POST /flashcard-sets/{id}/flashcards` |
| `SummaryCreateBody` | `POST /summaries` |
| `MindMapCreateBody` | `POST /mind-maps` |

---

## 6. Create responses (all four tools)

| Endpoint | Status | Id field |
|----------|--------|----------|
| `POST /quizzes` | 201 | `data.id` |
| `POST /flashcard-sets` | 201 | `data.id` |
| `POST /summaries` | 201 | `data.id` |
| `POST /mind-maps` | 201 | `data.id` |

Save step unchanged: `POST /saved-{type}` with `{ quizId | flashcardSetId | summaryId | mindMapId }`.

---

## Flutter checklist

| Do | Don't |
|----|-------|
| Mind map: `content: { title, children[] }` | Send `raw` or `{ root, nodes }` |
| Quiz playback: `GET /saved-quizzes/{id}` | Extra `GET /quizzes/{id}/questions` |
| List cards: use `questionCount` / `totalQuestions` from list | Assume stale count |
| Flashcards: `POST /flashcard-sets/{id}/flashcards` | — |
| Summary: `summaryText` | `content` or `raw` |
| Read `data.id` on create | — |

---

## Files touched (backend)

- `validation/schemas.js` — mind map, flashcard nested schemas  
- `utils/mindMapCreate.js` — normalize Stanley tree on create  
- `controllers/mindMapController.js` — custom create  
- `controllers/savedQuizController.js`, `quizController.js` — `enrichQuizRow`  
- `controllers/savedFlashcardSetController.js`, `flashcardSetController.js` — nested cards + `cardCount`  
- `services/materialResponse.js` — quiz/flashcard response enrichment  
- `swagger/components.js`, `swagger/paths.js` — explicit schemas  
- `scripts/verify-ai-tools-contract.js` — E2E verify
