# Mind map save — backend handoff

How to save Stanley AI mind maps to Mishka saved library.

**Auth:** `Authorization: Bearer <accessToken>`

---

## Stanley AI shape (keep as-is)

```json
{
  "title": "Exam topics",
  "children": [
    { "title": "Cells", "children": [] },
    { "title": "Genetics", "children": [] }
  ]
}
```

Do **not** convert to `{ root, nodes }`. Mishka stores this tree in the `content` JSON column.

---

## Step 1 — Create mind map

```http
POST /mind-maps
Content-Type: application/json
```

### Option A (recommended — content only)

```json
{
  "content": {
    "title": "Exam topics",
    "children": [
      { "title": "Cells", "children": [] },
      { "title": "Genetics", "children": [] }
    ]
  },
  "sourceType": "ai",
  "chatSessionId": "024edaec-6720-4825-ad97-a22d40fe8a82"
}
```

Top-level `title` is **optional** when `content.title` is set.

### Option B — root title + children

```json
{
  "title": "Exam topics",
  "children": [
    { "title": "Cells", "children": [] }
  ],
  "sourceType": "ai"
}
```

Backend merges into `content: { title, children }`.

### Do not send

- `raw`
- `userId` (server sets from JWT)
- `{ root: { label, children } }` (legacy swagger example — not Stanley shape)

### Response `201`

```json
{
  "success": true,
  "data": {
    "id": "<uuid>",
    "title": "Exam topics",
    "content": { "title": "Exam topics", "children": [ ... ] },
    "sourceType": "ai_gemini",
    "chatSessionId": "...",
    "savedAt": null,
    "createdAt": "..."
  }
}
```

Use **`data.id`** for save step.

---

## Step 2 — Save to library

```http
POST /saved-mind-maps
```

```json
{ "mindMapId": "<uuid from step 1>" }
```

Response `200` with same row + `savedAt` set.

---

## Step 3 — Share (optional)

```http
POST /mind-maps/{id}/share
```

```json
{
  "channelIds": ["<community-channel-uuid>"],
  "note": "Check this out"
}
```

---

## Zod schema (server)

```javascript
// validation/schemas.js — mindMapCreateSchema
{
  title?: string (1–500)           // optional if content.title set
  content?: { title?: string, children?: object[] }
  children?: object[]              // alternative to content.children
  sourceType: string               // "ai" → stored as "ai_gemini"
  chatSessionId?: uuid
  sourceReference?: string | null
  savedAt?: datetime | null
}
// .strict() — unknown keys (e.g. raw) → 400 VALIDATION_ERROR
```

---

## curl example

```bash
export BASE=https://fleshy-lemon-persevere.ngrok-free.dev
export TOKEN=<jwt>

curl -s -X POST "$BASE/mind-maps" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "title": "Exam topics",
      "children": [
        { "title": "Cells", "children": [] },
        { "title": "Genetics", "children": [] }
      ]
    },
    "sourceType": "ai"
  }'

# Save (replace MIND_MAP_ID)
curl -s -X POST "$BASE/saved-mind-maps" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mindMapId":"MIND_MAP_ID"}'
```

Expected: **201** on create, **200** on save.

Verify locally: `node scripts/verify-ai-tools-contract.js`
