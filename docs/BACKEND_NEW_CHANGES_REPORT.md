# Backend — new changes report (June 2026)

**Date:** June 2–8, 2026  
**Audience:** Flutter team  
**Scope:** Changes shipped since the May Your Report work — community, Chat with Mishka, AI tools save/share, student subjects.

Full specs live in linked docs below. This file is the **delta only**.

---

## Deploy

1. Pull latest backend
2. `npx prisma migrate deploy` (through `20260604120000_student_subjects` if not applied)
3. Restart / redeploy (Railway or ngrok dev)
4. Verify: see scripts at bottom

---

## 1. Community — optional category on create

| What | Detail |
|------|--------|
| **New** | `GET /communities/category-titles` — existing category titles for picker |
| **Changed** | `GET /communities/discover/categories` — adds `categoryTitles[]` |
| **Changed** | `POST /communities`, `PUT /communities/{id}` — optional category |

**Create — pick one mode (both optional):**

```json
{ "category": "Physics" }
```
or
```json
{ "newCategoryTitle": "Thanaweya cohort 2026" }
```

Do **not** send both → `VALIDATION_ERROR`.

**Doc:** [`FLUTTER_COMMUNITY_CHANGES.md`](./FLUTTER_COMMUNITY_CHANGES.md)

---

## 2. Community — pin, invite, chat labels (earlier June)

| What | Detail |
|------|--------|
| **Changed** | `GET /user-communities`, `GET /communities` — `isPinned`, `saved`, `pinnedAt` |
| **Changed** | `GET /communities/{id}/invite` — **200** for public (`shareUrl`, `joinPayload`) |
| **Changed** | `POST /communities/{id}/invite` — `email` **or** `username` |
| **Changed** | Channel messages — `senderDisplay`, `senderRole`, `senderUserId` |

**Doc:** [`FLUTTER_COMMUNITY_CHANGES.md`](./FLUTTER_COMMUNITY_CHANGES.md) · [`FLUTTER_COMMUNITY_API_RESPONSE.md`](./FLUTTER_COMMUNITY_API_RESPONSE.md)

---

## 3. Chat with Mishka — save, share, quiz progress

| Priority | Change |
|----------|--------|
| P0 | `POST /quizzes` — no `raw`; strict validation → `400` not `500` |
| P0 | `POST /quiz-questions` — accepts `options[]` + `correctOptionIndex` |
| P0 | `PATCH` and `PUT` `/chat-messages/{id}` — update `messageContent` (quiz progress) |
| P1 | `POST /generate-tools` — creates `tool_preview` message; response includes `tool_preview_message_id` |
| P1 | AI session errors — `CHAT_SESSION_NOT_FOUND`, `AI_SESSION_NOT_FOUND` |

**Quiz save flow (unchanged endpoints, fixed contract):**

```
POST /quizzes  →  POST /quiz-questions (×N)  →  POST /saved-quizzes
```

**Doc:** [`FLUTTER_CHAT_MISHKA_BACKEND_RESPONSE.md`](./FLUTTER_CHAT_MISHKA_BACKEND_RESPONSE.md)

---

## 4. AI tools — full contract (Quiz, Flashcards, Summary, Mind map)

| Priority | Change |
|----------|--------|
| **BLOCKED fix** | `POST /mind-maps` — accepts Stanley `content: { title, children[] }`; top-level `title` optional |
| **Fixed** | `GET /saved-quizzes/{id}` — full `questions[]` with `optionA`–`optionD`; synced `questionCount` |
| **Fixed** | `GET /saved-quizzes` list — `totalQuestions` / `questionCount` from real count |
| **Confirmed** | Flashcards — canonical `POST /flashcard-sets/{id}/flashcards` |
| **Confirmed** | Summary — plain text field **`summaryText`** (not `content`) |
| **Added** | OpenAPI explicit create schemas (not generic `JsonRecord`) |
| **Standard** | All creates return `201` with **`data.id`** (uuid) |

**Mind map save:**

```json
POST /mind-maps
{
  "content": { "title": "Exam topics", "children": [{ "title": "Cells", "children": [] }] },
  "sourceType": "ai"
}
```

**Docs:** [`AI_TOOLS_FULL_BACKEND_REVIEW.md`](./AI_TOOLS_FULL_BACKEND_REVIEW.md) · [`MINDMAP_SAVE_BACKEND_HANDOFF.md`](./MINDMAP_SAVE_BACKEND_HANDOFF.md)

---

## 5. Student subjects (courses)

| What | Detail |
|------|--------|
| **New** | `GET/POST/PATCH/DELETE /student-subjects` — user course labels (max 20) |
| **Changed** | Study sessions — optional `studentSubjectId` on start/patch |
| **Changed** | Your Report — `study.bySubject[]` bucket + PDF card |

**Doc:** [`FLUTTER_STUDENT_SUBJECTS_HANDOFF.md`](./FLUTTER_STUDENT_SUBJECTS_HANDOFF.md)

---

## New / changed endpoints (quick list)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/communities/category-titles` | Category picker |
| `GET` | `/communities/discover/categories` | + `categoryTitles[]` |
| `POST` | `/communities` | + `category` / `newCategoryTitle` |
| `PATCH` | `/chat-messages/{id}` | Quiz progress sync |
| `GET` | `/saved-quizzes/{id}` | Full `questions[]` |
| `POST` | `/mind-maps` | Stanley tree in `content` |
| `POST` | `/flashcard-sets/{id}/flashcards` | Canonical add card |
| `GET/POST/PATCH/DELETE` | `/student-subjects` | User subjects |

---

## Flutter action checklist

| Area | Do this |
|------|---------|
| Community create | Category picker from `/category-titles`; `category` OR `newCategoryTitle` |
| Community hub | Use `isPinned` / `saved` from API; drop local pin cache |
| Quiz save/share | No `raw`; questions via `/quiz-questions` |
| Quiz progress | Re-enable `PATCH /chat-messages/{id}`; use `tool_preview_message_id` |
| Quiz playback | `GET /saved-quizzes/{id}` only — no extra `/questions` call |
| Mind map save | `content: { title, children[] }` — see mind map handoff |
| Flashcards | `POST /flashcard-sets/{id}/flashcards` |
| Summary | Field **`summaryText`** |
| Study sessions | Optional `studentSubjectId` |
| Errors | Handle `AI_SESSION_NOT_FOUND`, `CHAT_SESSION_NOT_FOUND` |

---

## Verify scripts

```bash
node scripts/verify-community-discover.js
node scripts/verify-community-api-response.js
node scripts/verify-chat-mishka-tools.js
node scripts/verify-ai-tools-contract.js
```

---

## Deep-dive docs (by feature)

| Feature | Doc |
|---------|-----|
| Community (delta) | [`FLUTTER_COMMUNITY_CHANGES.md`](./FLUTTER_COMMUNITY_CHANGES.md) |
| Community discover | [`FLUTTER_COMMUNITY_DISCOVER_HANDOFF.md`](./FLUTTER_COMMUNITY_DISCOVER_HANDOFF.md) |
| Chat Mishka | [`FLUTTER_CHAT_MISHKA_BACKEND_RESPONSE.md`](./FLUTTER_CHAT_MISHKA_BACKEND_RESPONSE.md) |
| AI tools contract | [`AI_TOOLS_FULL_BACKEND_REVIEW.md`](./AI_TOOLS_FULL_BACKEND_REVIEW.md) |
| Mind map save | [`MINDMAP_SAVE_BACKEND_HANDOFF.md`](./MINDMAP_SAVE_BACKEND_HANDOFF.md) |
| Student subjects | [`FLUTTER_STUDENT_SUBJECTS_HANDOFF.md`](./FLUTTER_STUDENT_SUBJECTS_HANDOFF.md) |
