# Flutter handoff — Community changes only

Standalone delta for **Our Community**. Full discover/browse details remain in [`FLUTTER_COMMUNITY_DISCOVER_HANDOFF.md`](./FLUTTER_COMMUNITY_DISCOVER_HANDOFF.md). Pin/invite/chat details also in [`FLUTTER_COMMUNITY_API_RESPONSE.md`](./FLUTTER_COMMUNITY_API_RESPONSE.md).

**Auth:** `Authorization: Bearer <accessToken>` on all routes below.

---

## New / changed endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/user-communities` | Each row: `isPinned`, `saved`, `pinnedAt` |
| `GET` | `/communities` | Each card: `isPinned`, `saved`, `pinnedAt` |
| `POST` / `DELETE` | `/communities/{id}/pin` | Save / unsave while member |
| `GET` | `/communities/{id}/invite` | **200** for public communities (`shareUrl`, `joinPayload`) |
| `POST` | `/communities/{id}/invite` | `email` **or** `username` |
| `GET/POST` | `/communities/{id}/channels/{channelId}/messages` | `senderDisplay`, `senderRole`, `senderUserId` |
| `GET` | `/communities/discover/categories` | Added `categoryTitles[]` |
| `GET` | `/communities/category-titles` | **New** — existing category titles for create picker |
| `POST` | `/communities` | Optional `category` or `newCategoryTitle` |
| `PUT` | `/communities/{id}` | Same category fields on update |

```dart
static const String communitiesCategoryTitles = '/communities/category-titles';
```

---

## 1. Saved / pinned communities

Parse on **`GET /user-communities`** and **`GET /communities`**:

```json
{
  "isPinned": true,
  "saved": true,
  "pinnedAt": "2026-06-02T14:30:00.000Z"
}
```

- `isPinned` and `saved` are the same boolean.
- Sort saved list by `pinnedAt` desc.

**Flutter:** remove local-only pinned-ID cache; use API fields after deploy.

---

## 2. Share link — public communities

`GET /communities/{id}/invite` (owner/admin) returns **200** for public — not 400.

```json
{
  "supported": true,
  "visibility": "public",
  "communityId": "...",
  "shareUrl": "https://YOUR_BASE/communities/join?communityId=...",
  "joinPayload": { "communityId": "..." }
}
```

Private: same shape with `inviteCode`, `inviteToken`, and token/code in `joinPayload`.

Set server env `COMMUNITY_SHARE_BASE_URL` (or `REPORT_EXPORT_BASE_URL`) for correct `shareUrl`.

---

## 3. Group chat sender labels

On channel messages (`GET` / `POST …/messages`):

```json
{
  "senderUserId": "...",
  "senderDisplay": "Norhan M.",
  "senderName": "Norhan M.",
  "senderRole": "owner"
}
```

Join channel before list/post: `POST /communities/{id}/channels/{channelId}/join`.

**Flutter:** drop extra `GET /members` round-trip used only for display names.

---

## 4. Direct invite — email or username

```http
POST /communities/{id}/invite
```

```json
{ "email": "friend@example.com" }
```

or

```json
{ "username": "norhan_mohamed_abc123" }
```

| Response / `error` | UI |
|--------------------|-----|
| `INVITE_USER_NOT_FOUND` | No Mishka account |
| `INVITE_SELF_NOT_ALLOWED` | Can't invite yourself |
| `201` + `status: "joined"` | Added immediately |
| `200` + `status: "already_member"` | Already in community |

Username matches profile `user.username` (with or without `@`), case-insensitive.

---

## 5. Category on create / update *(new)*

When creating or editing a community, the user can optionally set a **display category** — either pick an existing title or type a new one.

### List existing titles

**`GET /communities/category-titles`**

| Query | Description |
|-------|-------------|
| `q` | Optional substring filter |
| `limit` | 1–100, default 50 |

```json
{
  "success": true,
  "data": {
    "items": [
      { "title": "Physics", "communityCount": 12 },
      { "title": "Exam prep Cairo", "communityCount": 3 }
    ]
  }
}
```

Titles come from public communities plus communities the user belongs to.

**Shortcut:** `GET /communities/discover/categories` now also returns top **`categoryTitles`** (same shape, max 30) alongside subject/purpose/education chips.

### Create — pick existing title

```json
POST /communities
{
  "name": "Year 2 Physics Cairo",
  "visibility": "public",
  "subjectKeys": ["physics"],
  "category": "Physics"
}
```

Send `category` exactly as returned in `items[].title` or `categoryTitles[].title`.

### Create — new title

```json
POST /communities
{
  "name": "Thanaweya Amma 2026",
  "visibility": "public",
  "subjectKeys": ["exam_prep"],
  "newCategoryTitle": "Thanaweya cohort 2026"
}
```

### Rules

| Rule | Detail |
|------|--------|
| Mutually exclusive | Send **`category`** OR **`newCategoryTitle`**, not both → `VALIDATION_ERROR` |
| Both omitted | Backend derives category from first `subjectKeys` (unchanged) |
| Max length | 100 characters |
| Update | Same fields on `PUT /communities/{id}` |

`category` is a free-text display string on the community card — **not** the admin app-catalog `Category` model and **not** the subject taxonomy keys (`physics`, `math`, …).

### Suggested Flutter UI

```text
Create community → Category (optional)
├── Autocomplete from GET /communities/category-titles?q=…
├── Tap suggestion → body.category = item.title
└── "Create new" / custom text → body.newCategoryTitle = typed text
```

Do not send both fields in the same request.

---

## 6. Remove / replace checklist

| Remove in Flutter | Replace with |
|-------------------|--------------|
| Local pinned community ID storage | `isPinned` / `saved` from API |
| Skip `GET /invite` for public + manual share URL | `GET /invite` → `shareUrl` |
| Chat sender enrichment via members list | `senderDisplay` + `senderRole` on messages |
| Hardcoded category on create | `category` or `newCategoryTitle` + picker API |

---

## 7. Error codes

| Code | Where |
|------|--------|
| `INVITE_USER_NOT_FOUND` | `POST /communities/{id}/invite` |
| `INVITE_SELF_NOT_ALLOWED` | `POST /communities/{id}/invite` |
| `VALIDATION_ERROR` | Both `category` and `newCategoryTitle` sent |

---

## Verify (backend)

```bash
node scripts/verify-community-api-response.js
node scripts/verify-community-discover.js
```
