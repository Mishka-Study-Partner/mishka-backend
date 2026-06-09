# Flutter — Your Report change guide

**For:** `mishka-app` · **Screen:** Your Report  
**Date:** June 2026  
**Full reference:** [`FLUTTER_YOUR_REPORT_HANDOFF.md`](./FLUTTER_YOUR_REPORT_HANDOFF.md)

---

## Summary

| Before (Flutter) | After (backend) |
|------------------|-----------------|
| Many parallel API calls + client merge | **One call:** `GET /reports/your-report` |
| Local Syncfusion PDF | **`POST /reports/your-report/export`** (server PDF, matches UI) |
| `POST /study-with-mishka/reports/export` | **Deprecated** — do not use |
| Task completion guessed from `updatedAt` | **`completedAt`** on tasks + bundle buckets |
| Chat scan for AI counts | **`aiTools`** in bundle |

---

## Endpoints (add to `ApiEndpoints`)

```dart
static const yourReport = '/reports/your-report';
static const yourReportExport = '/reports/your-report/export';
static const userPreferencesMe = '/user-preferences/me';
```

---

## 1. Load the screen — one request

```http
GET /reports/your-report?period=weekly&date=2026-06-01&locale=en
Authorization: Bearer <token>
```

| Query | Values |
|-------|--------|
| `period` | `daily` \| `weekly` \| `monthly` \| `yearly` |
| `date` | Anchor day `YYYY-MM-DD` (any day in week/month/year) |
| `locale` | `en` \| `ar` |
| `format` | Omit or `bundle` (default) |
| `includeCommunity` | `false` to skip community block |

**Use from `data`:**

- `periodLabel`, `study.buckets`, `study.totals`
- `aiTools.rings` (3 rings) + `mindMaps` count
- `streak` (+ `streak.week` when `period == weekly`)
- `tasksCompleted.buckets`
- `community` (optional section)

**Important:** Empty sections return **zeros**, not `422`. Only `format=payload` can return `422 REPORT_NO_DATA`.

### Period mapping (UI tab → query)

| Tab | `period` | `date` |
|-----|----------|--------|
| Daily | `daily` | Selected day |
| Weekly | `weekly` | Any day in that week |
| Monthly | `monthly` | Any day in that month |
| Yearly | `yearly` | Any day in that year |

Backend buckets are **UTC** today (`timezone` on export is accepted but not applied yet).

---

## 2. PDF export — replace `ReportPdfService`

```http
POST /reports/your-report/export
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "period": "weekly",
  "anchorDate": "2026-06-01",
  "locale": "en",
  "delivery": "download",
  "emailRecipient": "account",
  "emailTo": null
}
```

| Field | Notes |
|-------|--------|
| `period` | **`weekly` \| `monthly` \| `yearly` only** (no daily PDF) |
| `delivery` | `download` \| `email` \| `both` |
| `emailRecipient` | `account` (signup email) or `custom` |
| `emailTo` | Required when `emailRecipient` is `custom` |

**Response:**

```json
{
  "reportId": "uuid",
  "periodLabel": "Jun 1, 2026 – Jun 7, 2026",
  "pdfUrl": "https://…/reports/your-report/export/{id}?token=…",
  "expiresAt": "…",
  "emailedTo": "user@example.com",
  "emailSentAt": "…",
  "delivery": "email"
}
```

- Open or download via **`pdfUrl`** (token in URL works **without** Bearer).
- PDF layout: **full width**, cream background, **single page** (height grows with content).

**Download route:**

```http
GET /reports/your-report/export/{reportId}?token=…
```

### Suggested UX flow

1. User taps **Create PDF** or **Email my report**.
2. `POST /reports/your-report/export` with matching `delivery`.
3. Success: show *“Sent to {emailedTo}”* or share/download from `pdfUrl`.
4. **Remove** local Syncfusion PDF builder for this screen.

---

## 3. Custom report email address

**Read** `GET /user-preferences/me` → `data.reportEmail`:

```json
{
  "accountEmail": "user@signup.com",
  "reportEmailRecipient": "other@email.com",
  "usingCustomRecipient": true,
  "effectiveRecipientEmail": "other@email.com"
}
```

**Write:**

```http
PATCH /user-preferences/me
{ "reportEmailRecipient": "other@email.com" }
```

On export, pass `emailRecipient: "account"` or `"custom"` (+ `emailTo` if custom).

---

## 4. Automatic scheduled email (settings toggle)

**Enable:**

```http
PATCH /user-preferences/me
{
  "reportEmailAutoEnabled": true,
  "reportEmailFrequency": "weekly",
  "reportEmailLocale": "en"
}
```

**Disable:** `{ "reportEmailAutoEnabled": false }`

Schedule is server-side (UTC): weekly = previous Mon–Sun; monthly = previous calendar month. Flutter only needs the toggle + frequency picker.

---

## 5. Tasks (if not using bundle only)

- **`completedAt`** on `Task` from `PATCH /tasks/{id}` when marking done.
- Completions chart: `tasksCompleted.buckets` from bundle, or  
  `GET /tasks/report/completions?from=&to=&granularity=day|week|month`

Do **not** infer completion from `updatedAt` / `deadline` alone.

---

## 6. Remove / stop doing

| Stop | Use instead |
|------|-------------|
| `GET /study-with-mishka/reports/...` ×2 (`concentration` + `call_with_mishka`) on this screen | Bundle or `topLevelMode=all` |
| 12×2 monthly calls for yearly chart | Bundle `period=yearly` or `GET …/reports/year` |
| Scan `GET /chat-sessions` for `tool_preview` | `bundle.aiTools` |
| `POST /study-with-mishka/reports/export` | `POST /reports/your-report/export` |
| Local Syncfusion Your Report PDF | Server `pdfUrl` |

---

## 7. Error codes

| HTTP | `error` | When |
|------|---------|------|
| 400 | `VALIDATION_ERROR` | Bad period/date; daily PDF export |
| 401 | `AUTH_*` | Missing/invalid JWT |
| 422 | `REPORT_NO_DATA` | `format=payload` only, no data |
| 503 | `REPORT_EXPORT_EMAIL_NOT_CONFIGURED` | `delivery: email` but SMTP not configured |

---

## 8. PR checklist (`lib/features/report/`)

- [ ] `GET /reports/your-report?format=bundle` drives the screen
- [ ] PDF via `POST /reports/your-report/export`
- [ ] Parse `completedAt` on tasks
- [ ] Parse `study.bySubject` (per-course minutes + **Unassigned**)
- [ ] Handle `REPORT_NO_DATA` on export (empty period)
- [ ] Email UI: `delivery`, `emailRecipient`, preferences `reportEmail`
- [ ] Optional: auto-email toggle → `PATCH /user-preferences/me`
- [ ] Remove legacy study-with-mishka PDF export + local PDF service
- [ ] Re-enable community section from `bundle.community` when product-ready

---

## 9. Study minutes caveat

Report study time only includes sessions saved via:

`POST /study-with-mishka/sessions/start` → … → `POST …/end`

If start fails, the app timer may run locally but **minutes won’t appear** in reports.

---

## Related docs

| Doc | Use for |
|-----|---------|
| [`FLUTTER_STUDENT_SUBJECTS_HANDOFF.md`](./FLUTTER_STUDENT_SUBJECTS_HANDOFF.md) | Course list + session subject + `bySubject` |
| [`FLUTTER_YOUR_REPORT_HANDOFF.md`](./FLUTTER_YOUR_REPORT_HANDOFF.md) | Full bundle JSON, curls, architecture |
| [`YOUR_REPORT_BACKEND.md`](./YOUR_REPORT_BACKEND.md) | API reference |
| [`YOUR_REPORT_PDF_SERVER_SPEC.md`](./YOUR_REPORT_PDF_SERVER_SPEC.md) | PDF layout & ops |
| [`STUDY_WITH_MISHKA_FIX_REPORT.md`](./STUDY_WITH_MISHKA_FIX_REPORT.md) | Session start/end 500 fix |

**Verify backend:** `node scripts/verify-your-report.js` (optional `SMOKE_BASE_URL` for ngrok)
