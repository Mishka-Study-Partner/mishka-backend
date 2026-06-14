# Flutter handoff — Gamification API

**Date:** June 14, 2026  
**Scope:** Replace mocks / `SharedPreferences` on all gamification screens with live backend APIs.

Full backend spec: [`FLUTTER_GAMIFICATION_BACKEND_HANDOFF.md`](./FLUTTER_GAMIFICATION_BACKEND_HANDOFF.md)

**Auth:** `Authorization: Bearer <accessToken>`

Verify: `node scripts/verify-gamification.js <baseUrl> <token>`

---

## What changed (summary)

| Before (Flutter) | After (backend) |
|------------------|-----------------|
| Hub tasks/study/community placeholders | `GET /gamification/dashboard` |
| AI badge counts in `GamificationBadgeStore` (local) | Same API + `POST /gamification/badges/collect` |
| Monthly screens use `GamificationMonthlyMockData` | `GET /gamification/sections/{section}/monthly?month=YYYY-MM` |
| Chat points local only | Server awards on `POST /chat-sessions/{id}/messages` |
| Streak week Mon-based (optional) | **`GET /daily-streaks`** defaults to **Sat–Fri** UTC |

---

## ApiEndpoints (add)

```dart
static const gamificationDashboard = '/gamification/dashboard';
static const gamificationBadgesCollect = '/gamification/badges/collect';

static String gamificationSectionMonthly(String section) =>
    '/gamification/sections/$section/monthly';
```

`section`: `streak` | `tasks` | `study` | `community` | `ai-tools`

---

## Product rules (locked)

| Area | Rule |
|------|------|
| Week | **Saturday → Friday** (UTC). Display Sat–Fri on hub. |
| Tasks | **30** completions/week → auto badge (no Collect) |
| Study | **1260 min** (21 hr)/week → auto badge |
| Community | Score from messages (+10), shares (+25), channel joins (+15). Bar goal **700**; badge at **≥ 500** |
| AI hub | **7 tiles** — weekly counts only (`timesEarnedThisWeek`) |
| AI monthly | Per-week `badgesEarned` + group `timesEarnedInMonth` |
| Collect | Quiz (3 tiers), flashcards, summary, mind map — user taps **Collect Badge** on result screen |
| Chat | No collect UI — badge every 10 user messages (auto) |

---

## 1. Weekly hub — one call

```http
GET /gamification/dashboard?period=weekly
GET /gamification/dashboard?period=weekly&weekStart=2026-06-07
```

`weekStart` optional — must be a **Saturday** `YYYY-MM-DD` (UTC). Omit for current Sat–Fri week.

### Response (`data`)

```json
{
  "period": "weekly",
  "weekStart": "2026-06-07",
  "weekEnd": "2026-06-13",
  "streak": {
    "currentStreak": 3,
    "freezesRemaining": 1,
    "week": [{ "date": "2026-06-07", "state": "past_done", "status": "completed" }]
  },
  "tasks": {
    "current": 27,
    "goal": 30,
    "remaining": 3,
    "progress": 0.9,
    "badgesEarnedThisMonth": 3,
    "weeklyBadgeEarned": false
  },
  "study": {
    "currentMinutes": 420,
    "goalMinutes": 1260,
    "currentHours": 7,
    "goalHours": 21,
    "remainingHours": 14,
    "progress": 0.333,
    "badgesEarnedThisMonth": 2,
    "weeklyBadgeEarned": false
  },
  "community": {
    "currentScore": 425,
    "goalScore": 700,
    "remainingScore": 275,
    "progress": 0.607,
    "badgesEarnedThisMonth": 2,
    "weeklyBadgeEarned": false,
    "breakdown": { "messagesPosted": 12, "materialShares": 3, "channelJoins": 1 }
  },
  "aiToolBadges": [
    { "code": "quiz_perfect", "assetKey": "perfectScore", "timesEarnedThisWeek": 2 },
    { "code": "quiz_score_80", "assetKey": "score80", "timesEarnedThisWeek": 1 },
    { "code": "quiz_keep_learning", "assetKey": "keep-learning", "timesEarnedThisWeek": 0 },
    { "code": "flashcards_complete", "assetKey": "flashcards-reviewed", "timesEarnedThisWeek": 3 },
    { "code": "summary_complete", "assetKey": "summary-reviewed", "timesEarnedThisWeek": 1 },
    { "code": "mindmap_complete", "assetKey": "summary-reviewed", "timesEarnedThisWeek": 1 },
    { "code": "chat_points", "assetKey": "chat_with_mishka_badge", "timesEarnedThisWeek": 1, "chatPointsThisWeek": 7 }
  ]
}
```

### Flutter wiring

- Replace `GamificationRepository.loadWeeklyDashboard()` mock with this GET.
- **Streak:** use `data.streak` from dashboard **or** keep separate `GET /daily-streaks?weekStart=<saturday>` + `POST /daily-streaks/freeze` (same shape).
- Reorder `streak.week` Sat–Fri for UI if needed (backend returns Mon–Sun order within the week when `weekStart` is Saturday — verify dates and sort by `date` for display).
- Pull-to-refresh after collect badge.

---

## 2. Collect Badge (result screens)

Replace `GamificationBadgeStore.increment` / `GamificationBadgeCollector` local logic.

```http
POST /gamification/badges/collect
```

```json
{
  "badgeCode": "quiz_perfect",
  "sourceType": "quiz",
  "sourceId": "attempt-uuid",
  "idempotencyKey": "quiz:attempt-uuid:quiz_perfect",
  "metadata": { "correctCount": 10, "totalCount": 10 }
}
```

| Tool | `sourceType` | `sourceId` | `badgeCode` |
|------|--------------|------------|-------------|
| Quiz | `quiz` | `QuizAttempt.id` from submit | tier below |
| Flashcards | `flashcards` | flashcard set id | `flashcards_complete` |
| Summary | `summary` | summary id | `summary_complete` |
| Mind map | `mindmap` | mind map id | `mindmap_complete` |

### Quiz tier (must match result screen)

```dart
String quizBadgeCode(int correct, int total) {
  if (correct >= total) return 'quiz_perfect';
  if (correct * 10 >= total * 8) return 'quiz_score_80';
  return 'quiz_keep_learning';
}
```

Server validates tier from attempt row or `metadata` — wrong `badgeCode` → `400 VALIDATION_ERROR`.

### Idempotency keys

| Tool | Pattern |
|------|---------|
| Quiz | `quiz:{attemptId}:{badgeCode}` |
| Flashcards | `flashcards:{setId}:complete` |
| Summary | `summary:{summaryId}:complete` |
| Mind map | `mindmap:{mindMapId}:complete` |

### Response (`data`)

```json
{
  "success": true,
  "created": true,
  "badgeCode": "quiz_perfect",
  "timesEarnedThisWeek": 2,
  "timesEarnedThisMonth": 3
}
```

Duplicate key (retry/offline) → **200** with `"created": false` and same counts — safe to treat as success.

Then refresh hub or bump local weekly count optimistically.

---

## 3. Monthly screens

```http
GET /gamification/sections/streak/monthly?month=2026-06
GET /gamification/sections/tasks/monthly?month=2026-06
GET /gamification/sections/study/monthly?month=2026-06
GET /gamification/sections/community/monthly?month=2026-06
GET /gamification/sections/ai-tools/monthly?month=2026-06
```

Replace `GamificationMonthlyMockData` callbacks with API `weeks[]` / `groups[]`.

### Tasks / study / community (shared week card shape)

```json
{
  "section": "tasks",
  "month": "2026-06-01",
  "goalSubtitle": "Finishing all tasks/week == 1 Badge",
  "heroBadgeCode": "tasks_weekly_complete",
  "badgesEarnedInMonth": 3,
  "weeks": [
    {
      "weekIndex": 1,
      "rangeStart": "2026-06-07",
      "rangeEnd": "2026-06-13",
      "goalMet": true,
      "current": 30,
      "goal": 30,
      "remaining": 0,
      "progress": 1.0,
      "detailLine": "30 Tasks/ this week"
    }
  ]
}
```

Study uses `current` / `goal` in **minutes** (1260 = 21 hr). Community uses score fields + optional `breakdown`.

### Streak calendar

```json
{
  "section": "streak",
  "month": "2026-06-01",
  "streakDaysInMonth": 26,
  "days": [
    { "date": "2026-06-01", "status": "opened" },
    { "date": "2026-06-03", "status": "missed" },
    { "date": "2026-05-31", "status": "outside_month" }
  ]
}
```

`status`: `opened` | `missed` | `outside_month`

Alternative: `GET /daily-streaks/history?from=YYYY-MM-01&to=YYYY-MM-last` and map locally.

### AI tools monthly (7 groups)

```json
{
  "section": "ai-tools",
  "month": "2026-06-01",
  "groups": [
    {
      "badgeCode": "quiz_perfect",
      "assetKey": "perfectScore",
      "title": "Get 10 / 10 in Quizzes",
      "timesEarnedInMonth": 5,
      "weeks": [
        {
          "weekIndex": 1,
          "rangeStart": "2026-06-07",
          "rangeEnd": "2026-06-13",
          "badgesEarned": 2,
          "detailSubtitle": "you got 10/10 in 2 quizzes"
        }
      ]
    }
  ]
}
```

Map `badgeCode` → asset via existing `GamificationBadgeAssets`.

---

## 4. Chat points (no UI change required)

- Backend adds +1 point per **user** message on tutor chat POST.
- Every 10 points → auto `chat_points` badge event.
- Hub shows `chatPointsThisWeek` + `timesEarnedThisWeek` on the chat tile.
- Remove local chat point tracking once live.

---

## 5. Badge codes → assets

| `code` | Flutter asset key |
|--------|-------------------|
| `quiz_perfect` | `perfectScore` |
| `quiz_score_80` | `score80` |
| `quiz_keep_learning` | `keep-learning` |
| `flashcards_complete` | `flashcards-reviewed` |
| `summary_complete` | `summary-reviewed` |
| `mindmap_complete` | `summary-reviewed` (reuse) |
| `chat_points` | `chat_with_mishka_badge` |
| `tasks_weekly_complete` | `finishing_all_your_tasks` |
| `study_weekly_goal` | `miska_support1` |
| `community_weekly_active` | `mishka_support2` |

Response includes `assetKey` on hub AI tiles; monthly AI groups include it too.

---

## 6. Error codes

| Code | When |
|------|------|
| `VALIDATION_ERROR` | Bad body, wrong quiz tier, invalid `weekStart` |
| `NOT_FOUND` | Unknown section or missing source id |
| `FORBIDDEN` | Source not owned by user |

Standard envelope: `success`, `error`, `message`, `message_en`, `message_ar`, `data`.

---

## 7. Migration checklist

- [ ] Add `ApiEndpoints` constants above
- [ ] Hub: `GET /gamification/dashboard` → replace placeholders + local AI store for **display**
- [ ] Quiz result: `POST /collect` with attempt id + tier idempotency key
- [ ] Flashcards / summary / mind map result: collect with correct `sourceType` / `sourceId`
- [ ] Monthly screens: wire `month=YYYY-MM` on tab change
- [ ] Remove `GamificationMonthlyMockData` when API verified
- [ ] Offline collect queue: retry same `idempotencyKey`
- [ ] Optional: one-time migration of local badge counts (or accept fresh server totals)
- [ ] Pull-to-refresh on hub after collect

---

## 8. Files to touch (Flutter)

| File | Change |
|------|--------|
| `gamification_hub_screen.dart` | Dashboard API |
| `gamification_repository.dart` | Remove mocks |
| `gamification_badge_collector.dart` | POST collect |
| `gamification_progress_monthly_screen.dart` | Section monthly API |
| `gamification_ai_tools_monthly_screen.dart` | AI monthly API |
| `gamification_streak_calendar_screen.dart` | Streak monthly API |
| `quiz_result_screen.dart` | Collect after submit |
| Flashcards / summary / mind map result screens | Collect |

---

## 9. Deploy dependency

Backend migration **`20260614120000_gamification`** must be applied on the server:

```bash
npx prisma migrate deploy
```

Until deployed, endpoints return **404** or DB errors.
