# Your Report — Server PDF (implemented)

**Status:** Backend implementation in this repo (May 30, 2026).  
**Flutter:** Replace `ReportPdfService` with API calls below.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/reports/your-report?period=&date=&locale=` | JSON payload (`YourReportPayload`) |
| `POST` | `/reports/your-report/export` | Puppeteer PDF + optional email |
| `GET` | `/reports/your-report/export/{reportId}?token=` | Download PDF (public with token) |

### POST body

```json
{
  "period": "weekly",
  "anchorDate": "2026-05-24",
  "locale": "en",
  "delivery": "email",
  "timezone": "Africa/Cairo"
}
```

- `period`: `weekly` \| `monthly` \| `yearly` only (`daily` → 400)
- `delivery`: `email` \| `download` \| `both`
- `timezone`: accepted for future bucket TZ; aggregation uses **UTC** today

### Response

```json
{
  "reportId": "uuid",
  "periodLabel": "May 19, 2026 – May 25, 2026",
  "pdfUrl": "https://…/reports/your-report/export/{id}?token=…",
  "expiresAt": "…",
  "emailedTo": "user@example.com",
  "emailSentAt": "…"
}
```

## Design

- HTML/CSS matches Flutter tokens (§5 in original spec from Flutter team)
- **Pridi** via Google Fonts in PDF HTML
- **Layout:** full A4 width, cream `#FFFDFA` edge-to-edge (no white margins), **single page** whose height grows with content (no page breaks)
- Charts: vertical study bars, 3 AI rings, horizontal task bars, streak week row (weekly)
- Assets: copy `app-logo.png` / `streak_today.png` to `assets/reports/` (see README there)
- Optional: `REPORT_PDF_WIDTH_PX` (default `794`) for viewport width

## Ops

- **Puppeteer** required on deploy (`npm install` includes Chromium)
- **SMTP** for `delivery: email` (`SMTP_HOST`, `SMTP_FROM`, …)
- `REPORT_EXPORT_BASE_URL` for correct `pdfUrl` on Railway
- Optional: `PUPPETEER_EXECUTABLE_PATH` if using system Chrome

## Legacy

`POST /study-with-mishka/reports/export` — older plain pdfkit PDF; prefer `/reports/your-report/export` for visual parity.

## Automatic email (optional)

Users opt in via **`PATCH /user-preferences/me`**:

```json
{ "reportEmailAutoEnabled": true, "reportEmailFrequency": "weekly", "reportEmailLocale": "en" }
```

Disable:

```json
{ "reportEmailAutoEnabled": false }
```

**GET `/user-preferences/me`** returns `reportEmail` settings.

**Schedule (UTC):**
- `weekly` — every **Monday 08:00**, PDF for the **previous** Mon–Sun week
- `monthly` — every **1st** of month, PDF for the **previous** calendar month

**Trigger cron** (Railway scheduled HTTP):

```http
POST /internal/cron/scheduled-report-emails
X-Cron-Secret: <CRON_SECRET>
Content-Type: application/json

{}
```

Test without sending: `{ "dryRun": true }`. Force run: `{ "force": "weekly" }`.

Or set `ENABLE_IN_PROCESS_REPORT_CRON=true` to run the same check daily at 08:00 UTC inside the Node process.

Requires `SMTP_*` and `REPORT_EXPORT_BASE_URL`.

## Flutter integration

See original handoff §9: `ApiEndpoints.yourReportExport = '/reports/your-report/export'`.

Settings UI: call `PATCH /user-preferences/me` with `reportEmailAutoEnabled` / `reportEmailFrequency`.
