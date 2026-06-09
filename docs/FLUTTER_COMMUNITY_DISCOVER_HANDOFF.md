# Flutter handoff — Community discovery & recommendations

Backend implements **profile-aware community recommendations**, **browse/filter discovery**, and **structured taxonomy** (subjects, education level, purpose). Private communities never appear in discover/recommended feeds.

**Base URL:** same as rest of app (`ApiClient` / ngrok / Railway).  
**Auth:** `Authorization: Bearer <accessToken>` on all routes below.

---

## Quick endpoint map

| Method | Path | Use in UI |
|--------|------|-----------|
| `GET` | `/communities/recommended` | Home “For you”, “Popular”, “New” carousels |
| `GET` | `/communities/discover/categories` | Subject / purpose / education filter chips + top category titles |
| `GET` | `/communities/category-titles` | Searchable list of existing category titles (create community picker) |
| `GET` | `/communities/discover` | Full browse grid with filters + search |
| `GET` | `/communities` | My communities + all visible (legacy list) |
| `POST` | `/communities` | Create community (include discovery fields) |
| `POST` | `/communities/join` | Join from discover card |

Add to `ApiEndpoints` (example):

```dart
static const String communitiesRecommended = '/communities/recommended';
static const String communitiesDiscover = '/communities/discover';
static const String communitiesDiscoverCategories = '/communities/discover/categories';
static const String communitiesCategoryTitles = '/communities/category-titles';
```

---

## Response envelope

Same as entire Mishka API:

```json
{
  "success": true,
  "message": "OK",
  "message_en": "OK",
  "message_ar": "تم",
  "data": { },
  "error": null,
  "details": null
}
```

Parse `data` only when `success == true`.

---

## 1. Recommended — `GET /communities/recommended`

Personalized ranking for **public** communities the user has **not** joined.

### Query

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `section` | `for_you` \| `popular` \| `new` | `for_you` | Which list algorithm |
| `limit` | int 1–50 | `20` | Max items |
| `locale` | `en` \| `ar` | `en` | Labels on `primarySubjectLabel` |

### Example

```http
GET /communities/recommended?section=for_you&limit=20&locale=en
Authorization: Bearer <token>
Accept-Language: ar
```

### `data` shape

```json
{
  "section": "for_you",
  "profileHints": {
    "educationStatus": "university",
    "schoolTrack": null,
    "schoolGrade": null,
    "universityYear": 2
  },
  "items": [
    {
      "community": {
        "id": "uuid",
        "name": "Year 2 Physics Study",
        "description": "...",
        "imageUrl": "https://...",
        "visibility": "public",
        "category": "Physics",
        "educationStatus": "university",
        "schoolTrack": null,
        "schoolGrade": null,
        "universityYear": 2,
        "subjectKeys": ["physics"],
        "purpose": "study_group",
        "locale": "en",
        "createdAt": "2026-06-01T12:00:00.000Z",
        "memberCount": 42,
        "channelCount": 3,
        "primarySubjectLabel": "Physics"
      },
      "score": 72,
      "matchReason": "Because of your profile",
      "matchReasonCode": "education_match",
      "matchTags": ["education_match", "year_match", "popular"]
    }
  ]
}
```

### `matchReason` strings (display as subtitle)

| `matchReasonCode` | Typical `matchReason` text |
|-------------------|----------------------------|
| `education_match` | Because of your profile |
| `grade_match` / `year_match` | Because of your profile |
| `interest_match` | Matches your interests |
| `similar_communities` | Similar to communities you joined |
| `new` | New this week |
| `popular` | Popular in Mishka |

### Sections

- **`for_you`** — weighted score: education + grade/year + saved app categories + subjects from joined communities + popularity + recency.
- **`popular`** — sorted by `memberCount` descending.
- **`new`** — sorted by `createdAt` descending (recent public communities).

### Flutter UI suggestion

```text
Discover screen
├── Tab / chip: For you     → GET ?section=for_you
├── Tab / chip: Popular     → GET ?section=popular
├── Tab / chip: New         → GET ?section=new
└── Horizontal cards → CommunityDetail → POST /communities/join
```

Empty state when `profileHints.educationStatus` is null:

> Complete your education in Profile to get better recommendations.

Link to profile / onboarding education step.

---

## 2. Taxonomy — `GET /communities/discover/categories`

Load once per screen (cache 5–15 min). Powers filter chips.

### Query

| Param | Description |
|-------|-------------|
| `locale` | `en` \| `ar` — localized `label` on each chip |

### `data` shape

```json
{
  "subjects": [
    {
      "key": "physics",
      "label": "Physics",
      "labelEn": "Physics",
      "labelAr": "الفيزياء",
      "communityCount": 12
    }
  ],
  "purposes": [
    {
      "key": "study_group",
      "label": "Study group",
      "communityCount": 8
    }
  ],
  "educationLevels": [
    { "key": "school", "label": "School", "communityCount": 5 },
    { "key": "university", "label": "University", "communityCount": 20 },
    { "key": "other", "label": "Other", "communityCount": 1 }
  ],
  "categoryTitles": [
    { "title": "Physics", "communityCount": 12 },
    { "title": "Exam prep Cairo", "communityCount": 3 }
  ]
}
```

`categoryTitles` — user-defined display strings already used on communities (not subject taxonomy keys). Use for create-community autocomplete; for full search use `GET /communities/category-titles?q=…`.

Hide chips where `communityCount == 0` (optional).

### Subject keys (stable API enums)

Use `key` in discover filter query — do not hardcode only labels.

`math`, `physics`, `chemistry`, `biology`, `computer_science`, `english`, `arabic`, `french`, `history`, `geography`, `philosophy`, `economics`, `medicine`, `engineering`, `exam_prep`, `thanaweya`, `igcse`, `programming`, `languages`, `general`

### Purpose keys

`study_group`, `material_sharing`, `accountability`, `exam_cohort`, `university_program`, `language_practice`, `general`

---

## 3. Browse — `GET /communities/discover`

Paginated catalog with filters. Excludes communities user already joined.

### Query

| Param | Description |
|-------|-------------|
| `subject` | Subject key, e.g. `physics` |
| `educationStatus` | `school` \| `university` \| `other` |
| `schoolTrack` | `middle_school` \| `high_school` |
| `schoolGrade` | 1–12 |
| `universityYear` | 1–8 |
| `purpose` | Purpose key |
| `localeFilter` | Community content language `en` \| `ar` |
| `q` | Search name / description / category |
| `limit` | Default 20, max 100 |
| `offset` | Pagination |
| `locale` | Localized `primarySubjectLabel` on cards |

### Example

```http
GET /communities/discover?subject=physics&educationStatus=university&universityYear=2&limit=20&offset=0
```

### `data` shape

```json
{
  "total": 45,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": "uuid",
      "name": "...",
      "memberCount": 42,
      "channelCount": 3,
      "subjectKeys": ["physics"],
      "primarySubjectLabel": "Physics",
      ...
    }
  ]
}
```

Infinite scroll: increase `offset` by `limit` until `offset + items.length >= total`.

---

## 4. Create community — `POST /communities`

Include discovery fields so new communities appear in recommendations.

### Body

Pick **one** category mode (all optional — if omitted, backend derives from first `subjectKeys`):

```json
{
  "name": "Year 2 Physics Cairo",
  "description": "Weekly problem solving",
  "imageUrl": "https://...",
  "visibility": "public",
  "subjectKeys": ["physics"],
  "category": "Physics",
  "educationStatus": "university",
  "universityYear": 2,
  "purpose": "study_group",
  "locale": "en"
}
```

Or create a new title:

```json
{
  "name": "Thanaweya Amma 2026",
  "visibility": "public",
  "subjectKeys": ["exam_prep"],
  "newCategoryTitle": "Thanaweya cohort 2026"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | |
| `visibility` | yes | `public` discoverable; `private` invite-only |
| `subjectKeys` | recommended | 1–8 keys from taxonomy; if omitted, inferred from category text |
| `category` | optional | **Existing** title — send exact `title` from `GET /communities/category-titles` or `categoryTitles[]` |
| `newCategoryTitle` | optional | **New** display title (max 100 chars). Do **not** send with `category` |
| `educationStatus` | optional | Target audience; if set, send matching grade/year per auth rules |
| `schoolTrack` / `schoolGrade` | when school | |
| `universityYear` | when university | |
| `purpose` | optional | Default `general` |
| `locale` | optional | `en` \| `ar`, default `en` |

Response: community card shape with `memberCount: 1`, `channelCount: 0`.

---

## 5. Join from discover

Public:

```json
POST /communities/join
{ "communityId": "<uuid>" }
```

Private: use invite flow (unchanged) — not listed in discover.

After join, remove community from local discover lists (or refresh).

---

## 6. Community card model (Dart)

```dart
class CommunityDiscoverCard {
  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String visibility;
  final String category;
  final String? educationStatus;
  final String? schoolTrack;
  final int? schoolGrade;
  final int? universityYear;
  final List<String> subjectKeys;
  final String? purpose;
  final String locale;
  final DateTime? createdAt;
  final int memberCount;
  final int channelCount;
  final String primarySubjectLabel;

  factory CommunityDiscoverCard.fromJson(Map<String, dynamic> j) { ... }
}

class RecommendedCommunityItem {
  final CommunityDiscoverCard community;
  final int score;
  final String matchReason;
  final String matchReasonCode;
  final List<String> matchTags;

  factory RecommendedCommunityItem.fromJson(Map<String, dynamic> j) {
    return RecommendedCommunityItem(
      community: CommunityDiscoverCard.fromJson(j['community'] as Map<String, dynamic>),
      score: j['score'] as int? ?? 0,
      matchReason: j['matchReason'] as String? ?? '',
      matchReasonCode: j['matchReasonCode'] as String? ?? '',
      matchTags: (j['matchTags'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }
}
```

---

## 7. Repository sketch

```dart
class CommunityDiscoverRepository {
  CommunityDiscoverRepository(this._api);
  final ApiClient _api;

  Future<RecommendedFeed> loadRecommended({
    String section = 'for_you',
    int limit = 20,
    String locale = 'en',
  }) async {
    final res = await _api.get(
      ApiEndpoints.communitiesRecommended,
      queryParameters: {'section': section, 'limit': limit, 'locale': locale},
    );
    final data = envelopeData(res);
    return RecommendedFeed.fromJson(data);
  }

  Future<DiscoverCategories> loadCategories({String locale = 'en'}) async { ... }

  Future<DiscoverPage> browse({
    String? subject,
    String? educationStatus,
    int? universityYear,
    String? q,
    int limit = 20,
    int offset = 0,
  }) async { ... }
}
```

---

## 8. Scoring logic (for product / QA)

Backend scores **for_you** roughly as:

| Signal | Points |
|--------|--------|
| Same `educationStatus` | +40 |
| Same `schoolGrade` or `universityYear` | +20 |
| Subject matches saved app categories | +30 |
| Subject overlaps joined communities | +15 |
| Member count (log scale) | up to +15 |
| Channel count | up to +5 |
| Created in last 7 days | +8 |

Private communities and already-joined communities are **never** returned.

---

## 9. Link to user profile & saved categories

Recommendations read:

- `GET /auth/me` education fields (`educationStatus`, `schoolGrade`, `universityYear`, …)
- User’s **saved categories** (`user_saved_categories` → `categories.routeKey` / title) as interest hints

Encourage users to save subjects in the home category picker for better `interest_match` results.

---

## 10. Migration / deploy checklist

**Backend (Railway / local):**

```bash
npx prisma migrate deploy
npx prisma generate
# restart server
```

Migration: `20260602140000_community_discovery` adds `subject_keys`, `education_status`, `purpose`, `locale`, `created_at`, etc.

**Flutter:**

- [ ] Add endpoints constants
- [ ] Models: `CommunityDiscoverCard`, `RecommendedCommunityItem`, `DiscoverCategories`
- [ ] Discover screen: 3 sections + chip filters + search
- [ ] Create community form: subject multi-select + education target + purpose
- [ ] Show `matchReason` on recommended cards
- [ ] Pull-to-refresh on discover
- [ ] After join, refresh lists

---

## 11. curl smoke tests

```bash
TOKEN="<jwt>"
BASE="https://your-ngrok.ngrok-free.dev"

curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/communities/discover/categories?locale=en"

curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/communities/recommended?section=for_you&limit=10"

curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/communities/discover?subject=physics&limit=10"
```

---

## 12. Related docs

- Communities v2 (groups, chat, shares): `README.md` § Communities
- OpenAPI: `/api-docs` → **Communities** tag
- Your Report community stats: `docs/FLUTTER_YOUR_REPORT_HANDOFF.md`

---

## 13. Future (not in v1)

- `POST /communities/{id}/dismiss` — “Not interested”
- Behavioral boosts from AI tutor subjects
- “Friends joined” social graph
- Semantic search embeddings

---

## 14. Group chat messages (`senderName` + `senderRole`)

`GET` / `POST` `/communities/{communityId}/channels/{channelId}/messages`

Each message in `data` (array or single on create):

```json
{
  "id": "uuid",
  "communityChannelId": "uuid",
  "userId": "uuid",
  "messageContent": "Hello",
  "inputType": "text",
  "createdAt": "2026-06-02T12:00:00.000Z",
  "senderName": "Norhan Mohamed",
  "senderRole": "admin"
}
```

| `senderRole` | UI suggestion |
|--------------|----------------|
| `owner` | Owner badge (crown / distinct color) |
| `admin` | Admin badge |
| `member` | No badge or default |

Role is **community-level** (from `user_communities.role`), not per-channel. Community owner always returns `owner` even if the row were stale.

```dart
// Example bubble header
Text('${message.senderName} · ${_roleLabel(message.senderRole)}')

String _roleLabel(String role) => switch (role) {
  'owner' => l10n.communityOwner,
  'admin' => l10n.communityAdmin,
  _ => '',
};
```
