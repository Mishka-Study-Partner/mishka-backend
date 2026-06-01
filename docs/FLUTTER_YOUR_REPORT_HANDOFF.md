# Flutter Team Handoff — Your Report & Related Backend Changes

**Date:** May 30, 2026  
**From:** Backend team  
**To:** `mishka-app` (Flutter)  
**Production base URL:** `https://mishka-backend-production.up.railway.app`  
**Swagger:** `/api-docs`

This document is the **single handoff** for everything shipped in response to the [Your Report gap report](YOUR_REPORT_BACKEND.md) (May 24, 2026), plus profile/tasks fixes from earlier in May.

**Related docs:**
- [`YOUR_REPORT_BACKEND.md`](./YOUR_REPORT_BACKEND.md) — API reference & curls  
- [`YOUR_REPORT_PDF_SERVER_SPEC.md`](./YOUR_REPORT_PDF_SERVER_SPEC.md) — server PDF layout & export  
- [`STUDY_WITH_MISHKA_FIX_REPORT.md`](./STUDY_WITH_MISHKA_FIX_REPORT.md) — session start/end 500 fix  
- [`FLUTTER_BACKEND_CHANGELOG.md`](./FLUTTER_BACKEND_CHANGELOG.md) — broader May changelog (auth, tasks, avatar)

---

## Executive summary

| Area | Before (Flutter) | After (backend) |
|------|------------------|-----------------|
| **Your Report data** | 4+ parallel API calls; merge study modes client-side; scrape chat for AI | **One call:** `GET /reports/your-report` |
| **Study yearly tab** | 24 HTTP calls (12 months × 2 modes) | **One call:** `GET /study-with-mishka/reports/year` |
| **Tasks completed chart** | `GET /tasks` + guess date from `updatedAt` / `deadline` | `GET /tasks/report/completions` + **`completedAt`** on tasks |
| **AI tools rings** | Scan all `GET /chat-sessions` for `tool_preview` | `GET /user-ai-activity/report` |
| **Streak (month/year)** | Only current week from `GET /daily-streaks` | `GET /daily-streaks/history?from=&to=` |
| **PDF export** | Local Syncfusion PDF (plain text, not matching UI) | **`POST /reports/your-report/export`** (server HTML→PDF) |
| **Email report** | Share sheet only | Optional **`delivery: "email"`** + **auto opt-in** via preferences |
| **Community section** | Removed (no API) | In bundle + `GET /communities/activity/report` |

All gap-report backend items are **shipped** (P0, P1, P2). Remaining work is **Flutter integration** and **Railway ops** (migrations, SMTP, cron, Puppeteer).

---

## Deploy checklist (do this first)

1. Pull latest backend and redeploy on Railway.  
2. Run migrations on production DB:

```bash
npx prisma migrate deploy
```

| Migration | What it adds |
|-----------|----------------|
| `20260530120000_task_completed_at` | `tasks.completed_at` |
| `20260530180000_report_email_auto_prefs` | Auto-email preference columns |

3. **Optional but required for email/PDF:** set env vars (see [Environment variables](#environment-variables-backend--not-flutter)).  
4. Smoke-test in Swagger (`/api-docs`) with a real JWT.

---

## Recommended Flutter architecture

### One screen load (primary path)

```dart
// lib/core/network/api_endpoints.dart
static const String yourReport = '/reports/your-report';
static const String yourReportExport = '/reports/your-report/export';
static const String userPreferencesMe = '/user-preferences/me';
```

```http
GET /reports/your-report?period=weekly&date=2026-05-24&locale=en
Authorization: Bearer <token>
```

- **`format`** — omit or `bundle` (default): full screen data in one response.  
- **`format=payload`** — only if you need the old detailed PDF-renderer JSON.  
- **`includeCommunity=false`** — skip community queries (zeros in `community`).

**Do not** call study reports twice for `concentration` + `call_with_mishka` when using the bundle.

### Period query mapping

| UI tab | `period` | `date` / anchor |
|--------|----------|-----------------|
| Daily | `daily` | User’s selected day `YYYY-MM-DD` |
| Weekly | `weekly` | Any day in that ISO week (UTC) |
| Monthly | `monthly` | Any day in that month |
| Yearly | `yearly` | Any day in that year |

Use the user’s local calendar day as `date` for now; backend buckets are **UTC** (`timezone` on export is accepted but not applied yet).

---

## API reference — Your Report

### 1. Unified bundle (use this for the screen)

```
GET /reports/your-report?period={daily|weekly|monthly|yearly}&date=YYYY-MM-DD&locale={en|ar}
```

**Response `data` (abbreviated):**

```json
{
  "periodLabel": "May 19, 2026 – May 25, 2026",
  "period": "weekly",
  "rangeStart": "2026-05-19T00:00:00.000Z",
  "rangeEnd": "2026-05-26T00:00:00.000Z",
  "locale": "en",
  "study": {
    "buckets": [{ "label": "Mon", "value": 45, "studyMinutes": 45 }],
    "totals": {
      "sumApproximateMainStudySeconds": 2700,
      "sumStudyMinutes": 45,
      "sessionsStarted": 3,
      "byTopLevelMode": { "concentration": 2, "call_with_mishka": 1 }
    }
  },
  "aiTools": {
    "quizzes": 3,
    "flashcards": 5,
    "summaries": 1,
    "mindMaps": 0,
    "rings": [
      { "key": "quizzes", "count": 3, "percent": 43, "label": "Total Quizzes" }
    ]
  },
  "streak": {
    "currentStreak": 5,
    "longestStreak": 14,
    "freezesRemaining": 2,
    "week": [
      { "date": "2026-05-19", "state": "past_done", "isCompleted": true, "isToday": false }
    ]
  },
  "tasksCompleted": {
    "buckets": [{ "label": "Mon", "completedCount": 2 }],
    "totalCompleted": 2
  },
  "community": {
    "totals": {
      "messagesPosted": 4,
      "materialShares": 2,
      "channelJoins": 1,
      "sharesByMaterialType": { "quiz": 1, "flashcard_set": 1, "summary": 0, "mind_map": 0 }
    },
    "buckets": [{ "label": "Mon", "messagesPosted": 2, "materialShares": 1 }]
  }
}
```

**Notes:**
- Empty sections return **zeros**, not HTTP 422.  
- `streak.week` has 7 items only when `period === weekly`.  
- `aiTools.rings` — 3 rings (quizzes, flashcards, summaries); `mindMaps` is counted but not in rings (same as current UI).  
- AI **percent** formula: `round(clamp(count / goal * 100, 0, 100))` where goal is `1` / `7` / `28` / `365` for daily/weekly/monthly/yearly.

---

### 2. Study reports (if not using bundle)

**Combined modes (required for correct totals):**

```
GET /study-with-mishka/reports/day?date=YYYY-MM-DD&topLevelMode=all
GET /study-with-mishka/reports/week?date=YYYY-MM-DD&topLevelMode=all
GET /study-with-mishka/reports/month?year=2026&month=5&topLevelMode=all
```

Omit `topLevelMode` or use `all` — **do not** fetch `concentration` and `call_with_mishka` separately.

**Yearly (replaces 12×2 monthly calls):**

```
GET /study-with-mishka/reports/year?year=2026&topLevelMode=all
```

Returns `monthlyBuckets[]` (Jan–Dec) + year `totals`.

**Canonical fields** (stop trying aliases first):

| Meaning | Field |
|---------|--------|
| Total study seconds | `totals.sumApproximateMainStudySeconds` |
| Per-session seconds | `sessionSummaries[].approximateMainStudySeconds` |
| Session start | `sessionSummaries[].startedAt` |
| Mode | `sessionSummaries[].topLevelMode` |

---

### 3. AI tools usage

```
GET /user-ai-activity/report?from=2026-05-01&to=2026-05-31
```

**Replaces:** iterating `GET /chat-sessions` and counting `tool_preview` messages.

Counts **tutor material created** in range (quizzes, flashcard sets, summaries, mind maps), not chat message JSON.

---

### 4. Tasks completed

**When user completes a task:**

```
PATCH /tasks/{id}
{ "status": "completed" }
```

Response includes **`completedAt`** (ISO UTC). Cleared when status reopened to `pending` / `missed`.

**Chart data:**

```
GET /tasks/report/completions?from=2026-05-19&to=2026-05-26&granularity=day
```

```json
{
  "buckets": [{ "label": "2026-05-19", "completedCount": 2 }],
  "totalCompleted": 2
}
```

**Stop using** `updatedAt`, `deadline`, or full `GET /tasks` for the report chart.

---

### 5. Daily streak

**Current week row (unchanged):**

```
GET /daily-streaks?weekStart=YYYY-MM-DD
```

**Month/year history:**

```
GET /daily-streaks/history?from=2026-05-01&to=2026-05-31
```

Max **366** days. Same `state` values: `past_done`, `past_missed`, `today_done`, `today_pending`, `upcoming`.

---

### 6. Community activity (re-enable section)

```
GET /communities/activity/report?period=weekly&date=2026-05-19&locale=en
```

Or use `data.community` from the bundle.

---

## PDF export — replace local `ReportPdfService`

### Preferred endpoint (matches on-screen design)

```
POST /reports/your-report/export
Content-Type: application/json
```

```json
{
  "period": "weekly",
  "anchorDate": "2026-05-24",
  "locale": "en",
  "delivery": "download"
}
```

| `delivery` | Behavior |
|------------|----------|
| `download` | Returns `pdfUrl` only |
| `email` | Sends PDF to account email + returns `pdfUrl` |
| `both` | Email + download link |

**Response:**

```json
{
  "reportId": "uuid",
  "periodLabel": "May 19, 2026 – May 25, 2026",
  "pdfUrl": "https://…/reports/your-report/export/{id}?token=…",
  "expiresAt": "2026-05-31T00:00:00.000Z",
  "emailedTo": "user@example.com",
  "emailSentAt": "2026-05-24T12:00:00.000Z",
  "delivery": "email"
}
```

- Open `pdfUrl` in browser / `url_launcher`, or download with Dio.  
- Token in URL works **without** Bearer.  
- **`period`:** only `weekly`, `monthly`, `yearly` (daily export rejected — same as UI hiding the button).

**Legacy (simple text PDF):** `POST /study-with-mishka/reports/export` — prefer the route above.

### Suggested Flutter flow

1. User taps **“Create PDF and share”** (or **“Email my report”**).  
2. `POST /reports/your-report/export` with `delivery: "email"` or `"download"`.  
3. Show success: *“Report sent to {emailedTo}”* or open share sheet with downloaded PDF from `pdfUrl`.  
4. Remove Syncfusion plain-text PDF builder for this screen.

---

## Automatic report email (settings toggle)

Users opt in; backend sends on a schedule (no button press).

### Read / write settings

```
GET /user-preferences/me
PATCH /user-preferences/me
```

**Enable weekly auto-email:**

```json
{
  "reportEmailAutoEnabled": true,
  "reportEmailFrequency": "weekly",
  "reportEmailLocale": "en"
}
```

**Disable:**

```json
{
  "reportEmailAutoEnabled": false
}
```

**Response includes `reportEmail`:**

```json
{
  "reportEmail": {
    "reportEmailAutoEnabled": true,
    "reportEmailFrequency": "weekly",
    "reportEmailLocale": "en",
    "reportEmailLastSentAt": "2026-05-24T08:00:00.000Z",
    "reportEmailLastPeriodKey": "week:2026-05-19"
  }
}
```

**Schedule (UTC, server-side):**
- `weekly` — Monday, report for **previous** Mon–Sun week  
- `monthly` — 1st of month, report for **previous** calendar month  

Flutter only needs the toggle + frequency picker; cron runs on backend.

---

## Flutter migration checklist

Use this as a PR checklist for `lib/features/report/`:

- [ ] Add `ApiEndpoints.yourReport`, `yourReportExport`, `userPreferencesMe`  
- [ ] Replace `ReportRepository.loadReport()` with `GET /reports/your-report?format=bundle`  
- [ ] Remove dual `topLevelMode` study fetches (or keep as fallback behind feature flag)  
- [ ] Remove `ReportAiActivityDataSource` chat-session scraping (use API counts / bundle rings)  
- [ ] Tasks chart: use `tasksCompleted.buckets` from bundle or completions endpoint  
- [ ] On task complete: read `completedAt` from `PATCH /tasks/{id}` response  
- [ ] Yearly study: `GET …/reports/year` or `bundle` with `period=yearly`  
- [ ] Monthly/yearly streak: `daily-streaks/history` or `bundle.streak`  
- [ ] PDF: `POST /reports/your-report/export` instead of `ReportPdfService`  
- [ ] Settings screen: auto-email toggle → `PATCH /user-preferences/me`  
- [ ] Re-enable **Community** section from `bundle.community` when product ready  
- [ ] Remove `taskActionsComingSoon` copy if still present  
- [ ] Update button strings: e.g. “Email my report” when using `delivery: "email"`

---

## What to remove / stop doing

| Old pattern | Why |
|-------------|-----|
| 2× study report per period | Backend merges modes with `topLevelMode=all` |
| 12×2 monthly calls for yearly | Use `reports/year` |
| `GET /tasks` + client date heuristics | Use `completedAt` + completions report |
| Chat session `tool_preview` scan | Use `user-ai-activity/report` |
| Local Syncfusion PDF for Your Report | Use server export for visual parity + email |
| `updatedAt` / `deadline` as completion date | Wrong for reporting |

---

## Error codes (Your Report)

| HTTP | Code | When |
|------|------|------|
| 400 | `VALIDATION_ERROR` | Bad period/date; daily PDF export |
| 401 | `AUTH_MISSING_TOKEN` | No JWT |
| 422 | `REPORT_NO_DATA` | Only on `format=payload`, not `bundle` |
| 503 | `REPORT_EXPORT_EMAIL_NOT_CONFIGURED` | `delivery: email` but SMTP not set on server |

---

## Study sessions (operational)

Report study minutes only include sessions persisted via:

`POST /study-with-mishka/sessions/start` → … → `POST …/end`

If start fails, the app timer runs locally but **minutes won’t appear** in reports. See [`STUDY_WITH_MISHKA_FIX_REPORT.md`](./STUDY_WITH_MISHKA_FIX_REPORT.md).

---

## Other May backend changes (non–Your Report)

Still relevant for the app:

| Feature | Endpoints |
|---------|-----------|
| Profile | `PATCH /auth/me`, `POST/DELETE /auth/me/avatar` |
| Tasks | `POST /tasks` (optional `listId`), `PATCH/DELETE /tasks/{id}` |
| Todo lists | `PATCH /todo-lists/{id}` |

Details in [`FLUTTER_BACKEND_CHANGELOG.md`](./FLUTTER_BACKEND_CHANGELOG.md).

---

## Environment variables (backend — not Flutter)

Backend/Railway must set these for full functionality:

| Variable | For |
|----------|-----|
| `SMTP_HOST`, `SMTP_FROM`, … | Email PDF + auto reports |
| `REPORT_EXPORT_BASE_URL` | Correct `pdfUrl` in emails |
| `CRON_SECRET` | Scheduled auto-email HTTP cron |
| `ENABLE_IN_PROCESS_REPORT_CRON` | Optional in-process scheduler |
| Puppeteer/Chromium | Server PDF generation |

---

## Verification (copy-paste)

Replace `$TOKEN` and `$BASE`:

```bash
# Unified screen load
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/reports/your-report?period=weekly&date=2026-05-24&locale=en"

# PDF + email
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"period":"weekly","anchorDate":"2026-05-24","locale":"en","delivery":"email"}' \
  "$BASE/reports/your-report/export"

# Auto-email prefs
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/user-preferences/me"
```

---

## Questions / contact

- **UTC vs local timezone:** Buckets are UTC today; `timezone` query is reserved for a future release.  
- **AI counts vs tool_preview:** Backend counts created materials; counts may differ slightly from old chat scraping.  
- **Community joins:** No `joinedAt` on community membership; we count channel joins + messages + shares in range.  

For bugs, include JWT user id, `period`, `date`, and response body from `GET /reports/your-report`.

---

**Backend gap report status: complete.** Flutter can integrate incrementally: bundle first → then PDF export → then auto-email settings.
