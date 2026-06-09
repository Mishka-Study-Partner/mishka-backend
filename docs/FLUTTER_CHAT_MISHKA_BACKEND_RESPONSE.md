# Backend response — Chat with Mishka: Save, Share & Quiz Progress

Date: June 8, 2026  
Answers the Flutter gap report (Save/Share quiz, quiz progress sync, generate-tools session, `tool_preview` messages).

**Auth:** `Authorization: Bearer <accessToken>` on all routes below.

---

## Summary

| Priority | Issue | Status |
|----------|-------|--------|
| P0 | `POST /quizzes` rejects `raw` (500) | **Fixed** — strict schema; use create + `/quiz-questions` |
| P0 | `PATCH /chat-messages/{id}` 404 | **Fixed** — `PATCH` and `PUT` both work |
| P1 | AI generate-tools “Session not found” | **Improved** — structured `AI_SESSION_NOT_FOUND` |
| P1 | `tool_preview` messages not persisted | **Fixed** — server creates on generate-tools success |
| P2 | Same `raw` issue on other materials | **Fixed** — strict create schemas |

Verify: `node scripts/verify-chat-mishka-tools.js`

---

## Issue 1 — POST /quizzes (P0)

### Do not send `raw`

`POST /quizzes` now validates the body. Unknown keys (including `raw`) return **`400 VALIDATION_ERROR`**, not 500.

### Create quiz

```http
POST /quizzes
```

```json
{
  "title": "Generated Quiz",
  "sourceType": "ai",
  "totalQuestions": 10,
  "chatSessionId": "024edaec-6720-4825-ad97-a22d40fe8a82"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `title` | yes | max 150 |
| `sourceType` | yes | `"ai"` accepted → stored as **`ai_gemini`** |
| `totalQuestions` | no | int 0–100; auto-incremented when adding questions |
| `chatSessionId` | no | UUID |
| `sourceReference` | no | string |
| `savedAt` | no | ISO datetime |

**Nested `questions` on create is not supported.** Add questions separately.

### Add questions — two accepted shapes

**Flutter shape (preferred for generated tools):**

```http
POST /quiz-questions
```

```json
{
  "quizId": "<uuid>",
  "questionText": "In Dart, what is the scope of private variables?",
  "options": ["Class level", "Function level", "Library level", "Global level"],
  "correctOptionIndex": 2,
  "order": 0
}
```

- `options`: 2–4 strings (padded to 4 for storage)
- `correctOptionIndex`: 0–3
- `order`: accepted but not stored (questions ordered by `createdAt`)

**Legacy / Swagger shape:**

```json
{
  "quizId": "<uuid>",
  "questionText": "Primary energy currency of the cell?",
  "optionA": "ATP",
  "optionB": "DNA",
  "optionC": "Glucose",
  "optionD": "RNA",
  "correctOption": "A"
}
```

Alternative route: `POST /quizzes/{id}/questions` (same body **without** `quizId`).

### Save / share flow (unchanged endpoints)

1. `POST /quizzes` + `POST /quiz-questions` × N  
2. Save: `POST /saved-quizzes` `{ "quizId": "..." }`  
3. Share: `POST /quizzes/{id}/share` `{ "channelIds": [...] }`

---

## Issue 2 — PATCH /chat-messages/{id} (P0)

Both methods are supported:

```http
PATCH /chat-messages/{messageId}
PUT   /chat-messages/{messageId}
```

```json
{
  "messageContent": "{\"status\":\"success\",\"tool_type\":\"quizzes\",\"quizProgress\":{\"currentIndex\":1}}"
}
```

| Rule | Detail |
|------|--------|
| Auth | User must own the parent `chat_sessions` row |
| Body | **`messageContent` only** (string, max 100000) |
| Response | `200` with updated message |
| Missing / wrong owner | `404 NOT_FOUND` |

Use the message **`id`** from timeline or from `tool_preview_message_id` on generate-tools response (see Issue 4).

---

## Issue 3 — generate-tools session 404 (P1)

Before calling the AI worker, the backend verifies the Mishka chat session exists:

- Missing session → **`404 CHAT_SESSION_NOT_FOUND`**

When the AI worker returns 404 with `"Session not found"`:

- **`404 AI_SESSION_NOT_FOUND`** with user-facing message (EN/AR)  
- Do not surface raw Prisma/upstream stack traces

**Note:** AI memory lives in the FastAPI worker (seeded on `/upload`). Sessions created only via `POST /chat-sessions` without upload may exist in Postgres but not in AI memory — user should re-upload or start a new tutor session from file upload.

---

## Issue 4 — tool_preview messages (P1)

On successful **`POST /generate-tools`**, the backend now:

1. Materializes quiz / flashcards / mind map (as before)
2. Creates a **`chat_messages`** row:
   - `senderType`: `ai`
   - `inputType`: `tool_preview`
   - `messageContent`: upstream JSON + `materialId` (quiz/set/map uuid)

Response `data` includes:

```json
{
  "status": "success",
  "tool_type": "quizzes",
  "content": [ ... ],
  "materialId": "<quiz-uuid>",
  "tool_preview_message_id": "<message-uuid>"
}
```

Flutter should use **`tool_preview_message_id`** (or poll `GET /chat-sessions/{id}/timeline` → `messages[]` where `inputType === "tool_preview"`) as the key for quiz progress PATCH.

---

## Issue 5 — Other materials (P2)

Same rule: **no `raw`** on create. Accepted fields:

| Endpoint | Body fields |
|----------|-------------|
| `POST /flashcard-sets` | `title`, `sourceType`, optional `chatSessionId`, `sourceReference` |
| `POST /flashcards` | `setId`, `question`, `answer` |
| `POST /summaries` | `summaryText`, `sourceType`, optional `chatSessionId`, `sourceReference`, `savedAt` |
| `POST /mind-maps` | `title`, `content` (object), `sourceType`, optional `chatSessionId`, `sourceReference`, `savedAt` |

`sourceType: "ai"` → stored as `ai_gemini`.

---

## Verification curl

```bash
export BASE=https://fleshy-lemon-persevere.ngrok-free.dev
export TOKEN=<jwt>

# 1) Create quiz (no raw)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Test Quiz","sourceType":"ai","totalQuestions":1}' \
  "$BASE/quizzes"

# 2) Add question (Flutter shape)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"quizId":"'"$QUIZ_ID"'","questionText":"Q1?","options":["A","B","C","D"],"correctOptionIndex":0}' \
  "$BASE/quiz-questions"

# 3) Update tool preview message
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"messageContent":"{\"tool_type\":\"quizzes\",\"quizProgress\":{\"currentIndex\":1}}"}' \
  "$BASE/chat-messages/$MESSAGE_ID"
```

Expected: **201/200** on steps 1–2, **200** on step 3.

---

## Flutter alignment checklist

| Item | Action |
|------|--------|
| Quiz save/share | Keep workaround (no `raw`); `sourceType: "ai"` is fine |
| Quiz questions | Use `options[]` + `correctOptionIndex` OR `optionA`–`D` + `correctOption` |
| Quiz progress | Use `PATCH` or `PUT` `/chat-messages/{id}`; re-enable backend sync |
| Generate tools | Read `tool_preview_message_id` from response; fallback to timeline poll |
| Session expired | Handle `AI_SESSION_NOT_FOUND` with “start new chat / re-upload” UI |
| Local progress cache | Can remain as offline fallback; backend sync now supported |

---

## Error codes

| Code | When |
|------|------|
| `VALIDATION_ERROR` | Unknown fields (`raw`), invalid quiz question shape |
| `NOT_FOUND` | Message id missing or not owned |
| `CHAT_SESSION_NOT_FOUND` | `session_id` not in user's chat_sessions |
| `AI_SESSION_NOT_FOUND` | AI worker lost session memory |
