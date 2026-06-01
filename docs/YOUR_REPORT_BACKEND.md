# Your Report — Backend Response (P0)

**Date:** May 30, 2026  
**Audience:** Flutter team (`mishka-app`)  
**Related:** Your Report gap report (May 24, 2026)

---

## Summary

P0 items from the gap report are implemented. Flutter can reduce parallel requests and stop scraping chat sessions / full task lists for the report screen.

| Priority | Gap item | Status |
|----------|----------|--------|
| P0 | Combined study report (`topLevelMode=all` or omit) | **Shipped** |
| P0 | `GET /study-with-mishka/reports/year` | **Shipped** |
| P0 | AI usage report with date range | **Shipped** |
| P0 | `completedAt` on tasks + completions report | **Shipped** |
| P1 | PDF / email export | **Shipped** — see §5 |
| P1 | Daily streak history (month/year charts) | **Shipped** — see §5 |
| P2 | Community activity report | **Shipped** — see §7 |
| P2 | Unified `GET /reports/your-report` | **Shipped** — see §8 (`format=bundle` default) |

**Deploy:** run `npx prisma migrate deploy` (adds `tasks.completed_at`).

---

## 1. Combined study report

**Before:** Two calls per period (`concentration` + `call_with_mishka`).  
**Now:** One call — omit `topLevelMode` or pass **`topLevelMode=all`**.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://mishka-backend-production.up.railway.app/study-with-mishka/reports/week?date=2026-05-19&topLevelMode=all"
```

Response `data.filters` is `{ "topLevelMode": "all" }` when `all` is sent; `{}` when omitted (same data).

Canonical fields (unchanged):

- `totals.sumApproximateMainStudySeconds`
- `sessionSummaries[].approximateMainStudySeconds`
- `sessionSummaries[].startedAt`
- `sessionSummaries[].topLevelMode`

---

## 2. Yearly study report

```
GET /study-with-mishka/reports/year?year=2026&topLevelMode=all
```

Returns 12 **`monthlyBuckets`** (Jan–Dec) with per-month `totals.sumApproximateMainStudySeconds` plus year-level `totals`. No `sessionSummaries` (use `GET …/reports/month` for session detail).

**Replaces:** 12× or 24× monthly requests from the client.

---

## 3. AI tools usage report

```
GET /user-ai-activity/report?from=2026-05-01&to=2026-05-31
```

**Response `data`:**

```json
{
  "quizzes": 12,
  "flashcards": 8,
  "summaries": 5,
  "mindMaps": 3,
  "periodStart": "2026-05-01T00:00:00.000Z",
  "periodEnd": "2026-06-01T00:00:00.000Z"
}
```

Counts are **material rows created** in the UTC range (`quizzes`, `flashcard_sets`, `summaries`, `mind_maps`), including upload explanations as summaries. This replaces scanning `GET /chat-sessions` for `tool_preview` messages.

---

## 4. Task `completedAt` + completions report

### Field on task responses

When **`PATCH` or `PUT /tasks/{id}`** sets `status: "completed"`, the server sets **`completedAt`** to now (unless you send an explicit `completedAt`). Reopening (`status` → `pending` or `missed`) clears **`completedAt`**.

Existing completed tasks are backfilled from **`updated_at`** on migration.

### Report endpoint

```
GET /tasks/report/completions?from=2026-05-19&to=2026-05-26&granularity=day
```

**Response `data`:**

```json
{
  "periodStart": "2026-05-19T00:00:00.000Z",
  "periodEnd": "2026-05-27T00:00:00.000Z",
  "granularity": "day",
  "buckets": [
    { "label": "2026-05-19", "completedCount": 2 },
    { "label": "2026-05-20", "completedCount": 0 }
  ],
  "totalCompleted": 2
}
```

Only tasks with **`status: completed`** and a non-null **`completedAt`** in range are counted.

---

## Flutter integration checklist

| Section | Old approach | New approach |
|---------|--------------|--------------|
| Study charts | 2× `reports/{day\|week\|month}` per mode | 1× with `topLevelMode=all` or omit |
| Study yearly | 12×2 monthly calls | `GET …/reports/year?year=YYYY` |
| AI tools rings | Scan chat sessions | `GET /user-ai-activity/report?from=&to=` |
| Tasks completed chart | `GET /tasks` + client bucketing | `GET /tasks/report/completions?from=&to=` |
| Complete task | Rely on `updatedAt` | Use `completedAt` from API after `status: completed` |

---

## Verification curls

```bash
# Combined week
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/study-with-mishka/reports/week?date=2026-05-19&topLevelMode=all"

# Year
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/study-with-mishka/reports/year?year=2026&topLevelMode=all"

# AI usage
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/user-ai-activity/report?from=2026-05-01&to=2026-05-31"

# Task completions
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE/tasks/report/completions?from=2026-05-19&to=2026-05-26"
```

---

## Session data (unchanged operational note)

Study minutes still depend on successful **`POST /study-with-mishka/sessions/start`** → **`…/end`**. See [`STUDY_WITH_MISHKA_FIX_REPORT.md`](./STUDY_WITH_MISHKA_FIX_REPORT.md).

---

## 5. Daily streak history (P1)

```
GET /daily-streaks/history?from=2026-05-01&to=2026-05-31
```

**Response `data`:**

```json
{
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-31",
  "currentStreak": 5,
  "longestStreak": 14,
  "freezesRemaining": 2,
  "days": [
    { "date": "2026-05-01", "status": "completed", "state": "past_done" },
    { "date": "2026-05-02", "status": null, "state": "past_missed" }
  ]
}
```

Max range **366** UTC days. Same `state` values as `GET /daily-streaks` week rows.

---

## 6. PDF export (P1)

```
POST /study-with-mishka/reports/export
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "period": "weekly",
  "date": "2026-05-19",
  "delivery": "download",
  "topLevelMode": "all"
}
```

| `period` | Required fields |
|----------|-----------------|
| `daily` | `date` |
| `weekly` | `date` (any day in the ISO week, UTC) |
| `monthly` | `year`, `month` |
| `yearly` | `year` |

**Response `data`:**

```json
{
  "exportId": "uuid",
  "pdfUrl": "https://…/study-with-mishka/reports/export/{id}?token=…",
  "expiresAt": "2026-06-06T12:00:00.000Z",
  "periodLabel": "Week of 2026-05-19 (UTC)",
  "delivery": "download",
  "emailedTo": null
}
```

- **`delivery: "email"`** — sends link to the user’s account email when SMTP is configured (`SMTP_HOST`, `SMTP_FROM`, …). Otherwise **503** `REPORT_EXPORT_EMAIL_NOT_CONFIGURED`.
- **Download:** `GET pdfUrl` (token in query works without Bearer). Default TTL **7 days** (`REPORT_EXPORT_TTL_HOURS`).

PDF includes study minutes, streak summary, AI tool counts, and task completions for the period.

---

## 7. Community activity report (P2)

```
GET /communities/activity/report?period=weekly&date=2026-05-19&locale=en
```

Also included in **`GET /reports/your-report`** bundle as `data.community`.

**Totals:** `messagesPosted`, `textMessages`, `materialMessages`, `materialShares`, `channelJoins`, `sharesByMaterialType` (quiz, flashcard_set, summary, mind_map).

**Buckets:** per day (weekly), per day-of-month (monthly), or per month (yearly) with `messagesPosted` and `materialShares`.

---

## 8. Unified Your Report bundle (P2)

One call for the whole screen (empty sections return zeros, not 422):

```
GET /reports/your-report?period=weekly&date=2026-05-24&locale=en&format=bundle
```

`format` defaults to **`bundle`**. Use **`format=payload`** for the detailed PDF renderer shape.

**Response `data`:**

```json
{
  "periodLabel": "May 19, 2026 – May 25, 2026",
  "period": "weekly",
  "study": { "buckets": [], "totals": { "sumApproximateMainStudySeconds": 0, "sumStudyMinutes": 0 } },
  "aiTools": { "quizzes": 0, "flashcards": 0, "summaries": 0, "mindMaps": 0, "rings": [] },
  "streak": { "currentStreak": 0, "longestStreak": 0, "freezesRemaining": 2, "week": [] },
  "tasksCompleted": { "buckets": [{ "label": "Mon", "completedCount": 1 }], "totalCompleted": 1 },
  "community": { "totals": { "messagesPosted": 0, "materialShares": 0 }, "buckets": [] }
}
```

`includeCommunity=false` omits community aggregation work (zeros only).
