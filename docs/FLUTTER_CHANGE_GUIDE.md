# Flutter — small change guide (June 2026)

Short checklist for `mishka-app`. Full detail lives in the linked handoffs.

**Base URL:** same as today (localhost / ngrok / `https://mishka-backend-production.up.railway.app`)  
**Auth:** `Authorization: Bearer <accessToken>` on all routes below unless noted.

---

## 1. Your Report (priority)

### Load the screen — one call

```http
GET /reports/your-report?period=weekly|monthly|yearly&date=YYYY-MM-DD&locale=en
```

- Default `format=bundle` — use this; stop merging multiple study/AI/task calls on this screen.
- `includeCommunity=false` if you hide community.

**Remove:** duplicate `GET /study-with-mishka/reports/...` for concentration + call_with_mishka on this screen.

### PDF export — switch endpoint

| Do | Don’t |
|----|--------|
| `POST /reports/your-report/export` | `POST /study-with-mishka/reports/export` (legacy plain PDF) |
| Open `data.pdfUrl` from response | Local Syncfusion plain-text PDF builder |

```json
POST /reports/your-report/export
{
  "period": "weekly",
  "anchorDate": "2026-06-01",
  "locale": "en",
  "delivery": "download",
  "emailRecipient": "account",
  "emailTo": null
}
```

- `delivery`: `"download"` \| `"email"` \| `"both"`
- PDF is **full-width, single scrollable page**, cream background (regenerate after backend deploy).

### Report email recipient (optional UI)

```http
PATCH /user-preferences/me
{ "reportEmailRecipient": "user@custom.com" }
```

`GET /user-preferences/me` → read `reportEmail.accountEmail`, `effectiveRecipientEmail`, `usingCustomRecipient`.

### Models / parsing

- [ ] `Task` includes `completedAt` (use for completed chart; stop inferring from `updatedAt` only).
- [ ] Handle `422` + `REPORT_NO_DATA` when period has no data.

**Deep dive:** [`FLUTTER_YOUR_REPORT_CHANGE_GUIDE.md`](./FLUTTER_YOUR_REPORT_CHANGE_GUIDE.md) · [`FLUTTER_STUDENT_SUBJECTS_HANDOFF.md`](./FLUTTER_STUDENT_SUBJECTS_HANDOFF.md) · [`FLUTTER_YOUR_REPORT_HANDOFF.md`](./FLUTTER_YOUR_REPORT_HANDOFF.md)

---

## 2. Our Community — hub, save, share, chat

### Saved communities (P0)

Parse on **`GET /user-communities`** and **`GET /communities`**:

- `isPinned`, `saved` (same value), `pinnedAt`

**Remove:** local-only pinned-ID cache after backend is live.

```dart
class UserCommunity {
  final bool isPinned;
  final bool saved;
  final DateTime? pinnedAt;
}
```

### Share link — public communities (P1)

```http
GET /communities/{id}/invite
```

- Always **200** for public (not 400).
- Use `data.shareUrl` + `data.joinPayload` — drop client-built fallback URL when this works.

### Group chat labels (P1)

On **`GET|POST …/channels/{channelId}/messages`**:

- `senderDisplay`, `senderRole`, `senderUserId`
- Join channel before list/post: `POST …/channels/{channelId}/join`

**Remove:** extra `GET /members` round-trip just for names/roles.

### Direct invite — email or username (P2)

```http
POST /communities/{id}/invite
{ "email": "friend@example.com" }
```
or
```json
{ "username": "norhan_mohamed_abc123" }
```

| `error` | UI |
|---------|-----|
| `INVITE_USER_NOT_FOUND` | No Mishka account — ask them to sign up |
| `INVITE_SELF_NOT_ALLOWED` | “You can’t invite yourself” |
| `201` + `status: "joined"` | Added immediately (not “invitation sent”) |
| `200` + `status: "already_member"` | Already in community |

Username = profile `user.username` (with or without `@`), case-insensitive.

**Deep dive:** [`FLUTTER_COMMUNITY_API_RESPONSE.md`](./FLUTTER_COMMUNITY_API_RESPONSE.md)

---

## 3. Discover / recommendations (if shipping browse)

```http
GET /communities/recommended?section=for_you|popular|new
GET /communities/discover?subject=physics&...
GET /communities/discover/categories?locale=en
```

Create/update community: send `subjectKeys`, `educationStatus`, `purpose`, etc. (see handoff).

**Deep dive:** [`FLUTTER_COMMUNITY_DISCOVER_HANDOFF.md`](./FLUTTER_COMMUNITY_DISCOVER_HANDOFF.md)

---

## 4. Quick “remove / replace” list

| Remove in Flutter | Replace with |
|-------------------|--------------|
| Local pinned community ID storage | `isPinned` / `saved` from API |
| Public-community skip of `GET /invite` + manual share URL | `GET /invite` → `shareUrl` |
| Chat sender enrichment via members list | `senderDisplay` + `senderRole` on messages |
| `POST /study-with-mishka/reports/export` | `POST /reports/your-report/export` |
| Syncfusion Your Report PDF | Server `pdfUrl` |
| Multiple parallel APIs on Your Report screen | `GET /reports/your-report` bundle |

---

## 5. Error codes to handle (new)

| Code | Where |
|------|--------|
| `REPORT_NO_DATA` | Your Report export / payload |
| `INVITE_USER_NOT_FOUND` | Community invite POST |
| `INVITE_SELF_NOT_ALLOWED` | Community invite POST |
| `REPORT_EXPORT_EMAIL_NOT_CONFIGURED` | Export with `delivery: email` when SMTP off |

---

## 6. Ops (not Flutter, but blockers)

Backend deploy must run:

```bash
npx prisma migrate deploy
```

Migrations through `20260602140000_community_discovery` (and earlier report/task migrations).

---

## Doc map

| Topic | Document |
|-------|----------|
| Student subjects + per-course report | [`FLUTTER_STUDENT_SUBJECTS_HANDOFF.md`](./FLUTTER_STUDENT_SUBJECTS_HANDOFF.md) |
| Your Report (full) | [`FLUTTER_YOUR_REPORT_HANDOFF.md`](./FLUTTER_YOUR_REPORT_HANDOFF.md) |
| Community pin/invite/chat | [`FLUTTER_COMMUNITY_API_RESPONSE.md`](./FLUTTER_COMMUNITY_API_RESPONSE.md) |
| Discover filters | [`FLUTTER_COMMUNITY_DISCOVER_HANDOFF.md`](./FLUTTER_COMMUNITY_DISCOVER_HANDOFF.md) |
| API reference | [`YOUR_REPORT_BACKEND.md`](./YOUR_REPORT_BACKEND.md) |
| May changelog (auth, tasks, …) | [`FLUTTER_BACKEND_CHANGELOG.md`](./FLUTTER_BACKEND_CHANGELOG.md) |

---

**Questions:** backend team · Swagger `/api-docs` · verify scripts in `scripts/verify-your-report.js`, `scripts/verify-community-api-response.js`
