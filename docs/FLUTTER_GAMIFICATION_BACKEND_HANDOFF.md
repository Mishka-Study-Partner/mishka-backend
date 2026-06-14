# Gamification — Backend handoff (all screens)

**Date:** 2026-06-14 (updated with product decisions)  
**Audience:** Backend team  
**Flutter status:** All gamification screens UI-complete; most data is mock/local except hub streak (`GET /daily-streaks`).

**Full screen map:** See also per-screen summary in §2.

---

## 1. Confirmed product decisions

| # | Decision | Value |
|---|----------|--------|
| 1 | AI badge counts | **Hub = this week** (Sat–Fri). **AI monthly screen = per week + total for calendar month.** Not all-time. |
| 2 | Weekly **task** goal | **30 completed tasks** per week (configurable in `gamification_goals`) |
| 3 | **Community** weekly score | **Action-based v1 (confirmed):** messages + shares + channel joins — see §1.1 |
| 4 | Week boundaries | **Saturday → Friday** (UTC), same as home streak display |
| 5 | **Mind map** on hub | **Yes — 7th tile** on AI Tools grid (+ monthly AI screen) |
| 6 | Tasks / study / community badges | **Auto-award** only — no Collect button |

### 1.1 Community score — time vs actions (answer for #3)

| Approach | Can backend do it today? | Notes |
|----------|--------------------------|-------|
| **Messages + shares + joins** | ✅ Yes | Data in `community_channel_messages`, `material_shares`, `user_community_channels` |
| **Time spent in community** | ⚠️ Partial | Needs Flutter to send **`POST /usage/batch`** with `featureKey: "community"` (or similar). Rollups in `user_usage_daily_rollup`. Not wired for gamification yet. |

**Recommendation (v1):** Use **action-based score** so badges work without new client telemetry:

| Action | Points |
|--------|--------|
| Text message posted in a community channel | 10 |
| Material share | 25 |
| New channel join this week | 15 |

- **Progress bar goal:** 700 (`community_weekly_display_goal`)
- **Auto badge** `community_weekly_active` when score **≥ 500** (`community_badge_threshold`)

Dashboard returns breakdown for optional UI:

```json
"community": {
  "currentScore": 425,
  "goalScore": 700,
  "remainingScore": 275,
  "progress": 0.607,
  "breakdown": {
    "messagesPosted": 12,
    "materialShares": 3,
    "channelJoins": 1
  }
}
```

**Future v2:** Blend in `usageDailyRollup.totalSeconds` for community if product wants time-weighted score.

### 1.2 AI badge counts — weekly vs monthly

Each collect (or auto chat badge) inserts one row in `user_badge_events` with `period_week` (Saturday start) and `period_month` (first day of calendar month).

| Screen | Field | Query |
|--------|-------|-------|
| **Hub — AI Tools grid** | `timesEarnedThisWeek` per badge | Count events where `period_week` = dashboard `weekStart` |
| **AI Tools monthly** | `timesEarnedInMonth` per group (header) | Count events where `period_month` = selected month |
| **AI Tools monthly** | `badgesEarned` per week row | Count events where `period_week` = that week's Saturday |

Hub does **not** show all-time totals. Collect API may still return `timesEarnedThisWeek` / `timesEarnedThisMonth` for toast/refresh (omit all-time unless needed internally).

**Chat on hub:** `chatPointsThisWeek` (points earned Sat–Fri) + `timesEarnedThisWeek` for `chat_points` badge count. Monthly AI group can show month totals similarly.

---

## 2. Screen map & backend needs

| # | Screen | Route | Primary API | Status |
|---|--------|-------|-------------|--------|
| 1 | Gamification Hub (weekly) | Category → Gamification | `GET /gamification/dashboard` | ✅ |
| 2 | Monthly Streak Calendar | Streak → monthly | `GET /gamification/sections/streak/monthly` or `/daily-streaks/history` | ✅ |
| 3 | To Do List Monthly | To Do → monthly | `GET /gamification/sections/tasks/monthly` | ✅ |
| 4 | AI Tools Monthly | AI Tools → monthly | `GET /gamification/sections/ai-tools/monthly` | ✅ |
| 5 | Study Monthly | Study → monthly | `GET /gamification/sections/study/monthly` | ✅ |
| 6 | Community Monthly | Community → monthly | `GET /gamification/sections/community/monthly` | ✅ |
| 7 | Collect Badge (result screens) | Quiz / flashcards / summary / mind map | `POST /gamification/badges/collect` | ✅ |
| 8 | Chat points (no screen) | Chat send | Hook on `POST /chat-sessions/{id}/messages` | ✅ |

---

## 3. Screen 1 — Gamification Hub (weekly)

**Flutter:** `gamification_hub_screen.dart`

### Sections

| Section | UI | Data source today |
|---------|-----|-------------------|
| Daily Streaks | Count, Sat–Fri row, freeze, monthly link | ✅ `GET /daily-streaks`, `POST /daily-streaks/freeze` |
| To Do List | Progress, hero badge, monthly count | ❌ placeholder (37/40) → **30 goal** |
| AI Tools | **7-badge grid**, **this week's** counts | ❌ SharedPreferences |
| Study | Hours vs 21 hr/week | ❌ placeholder |
| Community | Score vs 700% bar | ❌ placeholder |

### API

`GET /gamification/dashboard?period=weekly&weekStart=YYYY-MM-DD`

- `weekStart`: optional **Saturday** UTC; default current Sat–Fri week
- Embeds streak block **or** Flutter keeps separate `GET /daily-streaks` (recommend Saturday support on both)

### Response (key fields)

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

`timesEarnedThisWeek`: count of `user_badge_events` for that `badge_code` where `period_week` equals response `weekStart`.

**Rules:**

| Section | Goal | Badge | Award |
|---------|------|-------|-------|
| Tasks | **30**/week | `tasks_weekly_complete` | Auto |
| Study | 1260 min (21 hr)/week | `study_weekly_goal` | Auto |
| Community | bar → 700; badge ≥ **500** | `community_weekly_active` | Auto |
| AI tools | **Weekly** counts on hub; **monthly** on AI monthly screen | collect + chat auto | See §9 |

---

## 4. Screen 2 — Monthly Streak Calendar

**Flutter:** `gamification_streak_calendar_screen.dart`

### UI

- Month tabs (6 months)
- Total streak days in month
- Calendar: gold = opened app, red = missed

### API (pick one)

**Option A:** `GET /daily-streaks/history?from=YYYY-MM-01&to=YYYY-MM-last` (already exists)

**Option B:** `GET /gamification/sections/streak/monthly?month=YYYY-MM`

### Response (Option B shape)

```json
{
  "section": "streak",
  "month": "2026-04-01",
  "streakDaysInMonth": 26,
  "days": [
    { "date": "2026-04-01", "status": "opened" },
    { "date": "2026-04-03", "status": "missed" },
    { "date": "2026-03-31", "status": "outside_month" }
  ]
}
```

`status`: `opened` | `missed` | `outside_month`

Map from `user_streaks`: `completed`/`frozen` → opened; `missed` → missed.

---

## 5. Screen 3 — To Do List Monthly Badges

**Flutter:** `gamification_progress_monthly_screen.dart` (todo variant)

### API

`GET /gamification/sections/tasks/monthly?month=YYYY-MM`

### Response

```json
{
  "section": "tasks",
  "month": "2026-04-01",
  "goalSubtitle": "Finishing all tasks/week == 1 Badge",
  "heroBadgeCode": "tasks_weekly_complete",
  "badgesEarnedInMonth": 3,
  "weeks": [
    {
      "weekIndex": 1,
      "rangeStart": "2026-04-05",
      "rangeEnd": "2026-04-11",
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

- **4–5 week rows** per calendar month (Sat–Fri slices)
- `goalMet` when `current >= 30` and auto badge event exists for that week

---

## 6. Screen 4 — AI Tools Monthly Badges

**Flutter:** `gamification_ai_tools_monthly_screen.dart`

### API

`GET /gamification/sections/ai-tools/monthly?month=YYYY-MM`

### Response — **7 groups** (includes mind map)

```json
{
  "section": "ai-tools",
  "month": "2026-04-01",
  "groups": [
    {
      "badgeCode": "quiz_perfect",
      "title": "Get 10 / 10 in Quizzes",
      "timesEarnedInMonth": 5,
      "weeks": [
        {
          "weekIndex": 1,
          "rangeStart": "2026-04-05",
          "rangeEnd": "2026-04-11",
          "badgesEarned": 2,
          "detailSubtitle": "you got 10/10 in 2 quizzes"
        },
        {
          "weekIndex": 2,
          "rangeStart": "2026-04-12",
          "rangeEnd": "2026-04-18",
          "badgesEarned": 1,
          "detailSubtitle": "you got 10/10 in 1 quiz"
        }
      ]
    }
  ]
}
```

- **`timesEarnedInMonth`:** total collect/auto events for this badge in the calendar month.
- **`badgesEarned`** on each week row: events where `period_week` = that week's Saturday.
- **`detailSubtitle`:** human-readable; server may derive from event counts (e.g. quiz tiers → "N quizzes").

Groups: `quiz_perfect`, `quiz_score_80`, `quiz_keep_learning`, `flashcards_complete`, `summary_complete`, **`mindmap_complete`**, `chat_points`.

---

## 7. Screen 5 — Study Monthly Badges

**Flutter:** `gamification_progress_monthly_screen.dart` (study variant)

### API

`GET /gamification/sections/study/monthly?month=YYYY-MM`

Same week card shape as tasks; `current`/`goal` in **minutes** (1260 = 21 hr).

```json
{
  "section": "study",
  "month": "2026-04-01",
  "goalSubtitle": "3 hrs/Day == 21 hr/week",
  "heroBadgeCode": "study_weekly_goal",
  "badgesEarnedInMonth": 2,
  "weeks": [
    {
      "weekIndex": 1,
      "current": 1260,
      "goal": 1260,
      "goalMet": true,
      "progress": 1.0,
      "detailLine": "21 hours / week"
    }
  ]
}
```

Source: sum completed `study_concentration_sessions` focus minutes per Sat–Fri week.

---

## 8. Screen 6 — Community Monthly Badges

**Flutter:** `gamification_progress_monthly_screen.dart` (community variant)

### API

`GET /gamification/sections/community/monthly?month=YYYY-MM`

```json
{
  "section": "community",
  "month": "2026-04-01",
  "goalSubtitle": "1 Badge == >500%/week",
  "heroBadgeCode": "community_weekly_active",
  "badgesEarnedInMonth": 2,
  "weeks": [
    {
      "weekIndex": 1,
      "current": 425,
      "goal": 700,
      "goalMet": false,
      "remaining": 275,
      "progress": 0.607,
      "detailLine": "700% / week",
      "breakdown": { "messagesPosted": 8, "materialShares": 2, "channelJoins": 0 }
    }
  ]
}
```

`goalMet` = score ≥ **500** (badge threshold), not necessarily 700.

---

## 9. Screen 7 — Collect Badge (result screens)

| Tool | Flutter screen | `sourceType` | Badge codes |
|------|----------------|--------------|-------------|
| Quiz | `quiz_result_screen.dart` | `quiz` | `quiz_perfect`, `quiz_score_80`, `quiz_keep_learning` |
| Flashcards | `flashcards_result_screen.dart` | `flashcards` | `flashcards_complete` |
| Summary | `summary_result_screen.dart` | `summary` | `summary_complete` |
| Mind map | `mind_map_result_screen.dart` | `mindmap` | `mindmap_complete` |

### API

`POST /gamification/badges/collect`

```json
{
  "badgeCode": "quiz_perfect",
  "sourceType": "quiz",
  "sourceId": "attempt-uuid",
  "idempotencyKey": "quiz:attempt-uuid:quiz_perfect",
  "metadata": { "correctCount": 10, "totalCount": 10 }
}
```

**Quiz tier validation (server):**

```
if correctCount >= totalCount              → quiz_perfect
else if correctCount * 10 >= totalCount * 8 → quiz_score_80
else                                       → quiz_keep_learning
```

Use existing `POST /quizzes/{id}/submit` attempt row when possible.

**Response:**

```json
{
  "badgeCode": "quiz_perfect",
  "timesEarnedThisWeek": 2,
  "timesEarnedThisMonth": 3
}
```

Duplicate idempotency key → **200** with same weekly/monthly counts (safe retry).

---

## 10. Chat points (no dedicated screen)

- +1 point per **user** text message (`POST /chat-sessions/{id}/messages`)
- Every 10 points → auto `chat_points` badge event (scoped to current `period_week` / `period_month`)
- **Hub:** `chatPointsThisWeek` + `timesEarnedThisWeek` for chat badge
- **AI monthly:** `timesEarnedInMonth` on chat group + per-week `badgesEarned`

---

## 11. Database (new)

### Tables

- `badge_definitions` — seed catalog (10 codes)
- `user_badge_events` — ledger + idempotency
- `user_chat_points` + `user_chat_point_events`
- `gamification_goals` — config

### Config defaults

| code | value |
|------|-------|
| `tasks_weekly_goal` | **30** |
| `study_weekly_minutes` | 1260 |
| `community_weekly_display_goal` | 700 |
| `community_badge_threshold` | 500 |
| `community_points_per_message` | 10 |
| `community_points_per_share` | 25 |
| `community_points_per_channel_join` | 15 |

### Idempotency keys

| Source | Pattern |
|--------|---------|
| Quiz | `quiz:{attemptId}:{badgeCode}` |
| Flashcards | `flashcards:{setId}:complete` |
| Summary | `summary:{summaryId}:complete` |
| Mind map | `mindmap:{mindMapId}:complete` |
| Tasks auto | `tasks:{userId}:{weekStartSat}:weekly` |
| Study auto | `study:{userId}:{weekStartSat}:weekly` |
| Community auto | `community:{userId}:{weekStartSat}:weekly` |
| Chat badge | `chat:{userId}:badge:{floor(total/10)}` |

---

## 12. Existing backend to reuse

| Need | Existing |
|------|----------|
| Streak | `GET/POST /daily-streaks/*`, `GET /daily-streaks/history` |
| Quiz score | `POST /quizzes/{id}/submit`, `quizScoreService.js` |
| Study minutes | `study_concentration_sessions` |
| Task completions | `tasks.completedAt`, `taskCompletionsReportService.js` |
| Community events | `communityActivityReportService.js` |
| Usage time (future) | `POST /usage/batch`, `user_usage_daily_rollup` |

### Backend changes required

| Change | Why |
|--------|-----|
| Saturday `weekStart` on `/daily-streaks` | Match Sat–Fri UI |
| All gamification routes + tables | Not implemented |
| Auto weekly badge job or lazy award on dashboard read | Tasks / study / community |
| Chat hook | Chat points |

---

## 13. Build order

**Implemented (2026-06-14):** migration `20260614120000_gamification`, all P0 + P1 routes, Saturday streak default, chat points hook.

1. ~~**P0:** Prisma migration + seed badges/goals~~
2. ~~**P0:** `POST /gamification/badges/collect`~~
3. ~~**P0:** `GET /gamification/dashboard`~~
4. ~~**P0:** Saturday support on `GET /daily-streaks`~~
5. ~~**P1:** Streak/tasks/study/community/ai-tools monthly endpoints~~
6. ~~**P1:** Auto weekly badges + chat points hook~~
7. **Deploy:** run `npx prisma migrate deploy` on Railway
8. **P2:** Community time from usage rollups (optional)

---

## 14. Flutter `ApiEndpoints`

```dart
static const gamificationDashboard = '/gamification/dashboard';
static const gamificationBadgesCollect = '/gamification/badges/collect';
static String gamificationSectionMonthly(String section) =>
    '/gamification/sections/$section/monthly';
```

---

## 15. Related files

| Area | Path |
|------|------|
| Streak | `services/dailyStreakService.js` |
| Quiz | `services/quizScoreService.js` |
| Study | study-with-mishka services |
| Tasks | `services/taskCompletionsReportService.js` |
| Community | `services/communityActivityReportService.js` |
| Chat | `controllers/chatMessageController.js` |
| Usage (optional) | `routes/usage.js` |

---

**Sources:** `GAMIFICATION_BACKEND_REPORT.md`, `GAMIFICATION_SCREENS_BACKEND_SUMMARY.md`, product answers 2026-06-14 (AI counts: weekly hub + monthly drill-down; community: action-based).
