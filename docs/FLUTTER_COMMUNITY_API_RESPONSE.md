# Backend response — Community API gaps (June 2, 2026)

This document answers [BACKEND_COMMUNITY_API_REQUEST.md](BACKEND_COMMUNITY_API_REQUEST.md). All items below are **implemented** on the current backend branch.

---

## Standard field names (please use these in Flutter)

| Concern | Fields |
|---------|--------|
| Saved / pinned | `isPinned` (boolean), `saved` (alias, same value), `pinnedAt` (ISO datetime or null) |
| Group chat sender | `senderUserId`, `senderDisplay`, `senderName` (same as display), `senderRole` (`owner` \| `admin` \| `member`) |
| Share invite (public) | `supported: true`, `visibility: "public"`, `shareUrl`, `joinPayload`, `communityId` |
| Share invite (private) | `inviteCode`, `inviteToken`, `shareUrl`, `joinPayload` |
| Direct invite | `POST /communities/{id}/invite` with **either** `email` **or** `username` |

---

## 1. P0 — `isPinned` on memberships ✅

### `GET /user-communities`

Each row now includes:

```json
{
  "id": "0f782082-5f09-410c-9fab-cb2095b2d974",
  "userId": "022d11a7-f176-4b05-96e7-5ca884e9b54a",
  "communityId": "ea4f8958-b9cf-463f-8e30-6aec43037d4c",
  "role": "owner",
  "isPinned": true,
  "saved": true,
  "pinnedAt": "2026-06-02T14:30:00.000Z",
  "community": { ... }
}
```

- `isPinned` / `saved` are `true` when a row exists in `user_saved_communities` for that user + community.
- `pinnedAt` is the bookmark `createdAt` (ordering saved list: sort by `pinnedAt` desc client-side).

### `POST /communities/{id}/pin` / `DELETE .../pin`

- Pin upserts `user_saved_communities` and returns `isPinned: true`, `saved: true`, `pinnedAt`.
- Unpin deletes the bookmark; subsequent `GET /user-communities` shows `isPinned: false`.

### `GET /communities`

Each community card also includes `isPinned`, `saved`, `pinnedAt` for the **current user** (when listed).

**You can remove the client-side pinned-id cache** once this build is deployed.

---

## 2. P1 — Public community invite ✅ (Option A + B hybrid)

We chose **Option A** with explicit `supported` so public is never a 400.

### `GET /communities/{id}/invite` (owner/admin)

**Public community — `200`:**

```json
{
  "success": true,
  "data": {
    "supported": true,
    "visibility": "public",
    "communityId": "ea4f8958-b9cf-463f-8e30-6aec43037d4c",
    "inviteCode": null,
    "inviteToken": null,
    "shareUrl": "https://YOUR_BASE/communities/join?communityId=ea4f8958-b9cf-463f-8e30-6aec43037d4c",
    "joinPayload": { "communityId": "ea4f8958-b9cf-463f-8e30-6aec43037d4c" },
    "hint": "Public community: share communityId; recipients use POST /communities/join with { communityId }."
  }
}
```

**Private community — `200`:** same shape with `visibility: "private"`, non-null `inviteCode` / `inviteToken`, and `joinPayload` using token or code.

Set server env **`COMMUNITY_SHARE_BASE_URL`** (or `REPORT_EXPORT_BASE_URL`) to your ngrok/public URL so `shareUrl` is correct in emails and share sheets.

---

## 3. P1 — Group chat sender labels ✅

### `GET|POST /communities/{id}/channels/{channelId}/messages`

Each message:

```json
{
  "id": "uuid",
  "communityChannelId": "uuid",
  "userId": "uuid",
  "messageContent": "Hello",
  "inputType": "text",
  "createdAt": "2026-06-02T12:00:00.000Z",
  "senderUserId": "uuid",
  "senderDisplay": "norhan mohamed",
  "senderName": "norhan mohamed",
  "senderRole": "owner"
}
```

- `senderDisplay` and `senderName` are always the same (keep parsing either).
- `senderRole` is community-level (`user_communities.role`, with owner override from `ownerUserId`).
- No extra `GET /members` round-trip required for labels.

---

## 4. P2 — Email / username invite ✅

### Canonical endpoint

```http
POST /communities/{communityId}/invite
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (exactly one):**

```json
{ "email": "friend@example.com" }
```

or

```json
{ "username": "norhan_mohamed_6193f4" }
```

**Success — new member (`201`):**

```json
{
  "success": true,
  "data": {
    "status": "joined",
    "joined": true,
    "invited": true,
    "userId": "uuid",
    "membership": { "id": "...", "userId": "...", "communityId": "...", "role": "member" }
  }
}
```

**Already a member (`200`):**

```json
{
  "data": {
    "status": "already_member",
    "joined": true,
    "invited": false,
    "userId": "uuid",
    "membership": { ... }
  }
}
```

**Notes:**
- Immediate **join** (same as `POST /communities/{id}/members` with email).
- Owner/admin only.
- **`400`** with `error: "INVITE_SELF_NOT_ALLOWED"` if the email/username is **your own** account (not generic `VALIDATION_ERROR`).
- **`404`** with `error: "INVITE_USER_NOT_FOUND"` if no Mishka account matches (email match is case-insensitive; username may include or omit `@`).
- Do **not** treat this as a missing route — `GET /invite` on the same path confirms the endpoint exists.
- Legacy **`POST /communities/{id}/members`** with `{ "email" }` still works.

---

## Verification curls

```bash
TOKEN="<jwt>"
BASE="https://fleshy-lemon-persevere.ngrok-free.dev"
CID="<community-uuid>"
CHID="<channel-uuid>"

# 1) Pin + list memberships
curl -s -H "Authorization: Bearer $TOKEN" -X POST "$BASE/communities/$CID/pin"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/user-communities" \
  | jq '.data[] | {communityId, isPinned, saved, pinnedAt, role}'

# 2) Public invite (no longer 400)
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/communities/$CID/invite" | jq '.data'

# 3) Messages
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/communities/$CID/channels/$CHID/messages" \
  | jq '.data[0] | {senderUserId, senderDisplay, senderRole, messageContent}'

# 4) Invite by email
curl -s -H "Authorization: Bearer $TOKEN" -X POST "$BASE/communities/$CID/invite" \
  -H "Content-Type: application/json" \
  -d '{"email":"friend@example.com"}'
```

---

## Flutter parser checklist

- [ ] Parse `isPinned` or `saved` on `UserCommunity` model from `GET /user-communities`
- [ ] Parse `isPinned` on `GET /communities` for hub cards
- [ ] Remove local-only pinned cache after backend deploy
- [ ] `GET /invite` for public: use `data.shareUrl` + `data.joinPayload` (no fallback required)
- [ ] Chat bubble: `senderDisplay` + badge from `senderRole`
- [ ] Share menu: `POST /communities/{id}/invite` with email or username

---

## Related docs

- Discovery / recommendations: `docs/FLUTTER_COMMUNITY_DISCOVER_HANDOFF.md`
- Communities v2 (groups, chat): `README.md` § Communities
