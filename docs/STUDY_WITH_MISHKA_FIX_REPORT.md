# Study With Mishka — Backend Fix Report

**Date:** May 14, 2026  
**API:** `https://mishka-backend-production.up.railway.app`  
**Affected route:** `POST /study-with-mishka/sessions/start` (and related session lifecycle routes)

---

## Summary

The Flutter app reported **500 Internal Server Error** on every attempt to start a study session, while other Study With Mishka routes (`GET /catalog`, custom timers, etc.) worked.

**Root cause:** A failed database migration left the `study_concentration_sessions` table without required columns (notably `platform`). The handler crashed when the client sent `"platform": "ios"`.

**Status after fix:** Migrations repaired and redeployed; session start should return **201 Created** with the session object in `data`.

---

## Symptom (from Flutter / QA)

| Request | Body | Result |
|---------|------|--------|
| `POST …/sessions/start` | `{ "topLevelMode": "call_with_mishka", "platform": "ios" }` | **500** `INTERNAL_ERROR` |
| `POST …/sessions/start` | `{ "topLevelMode": "concentration", "concentrationPreset": "ultradian", "platform": "ios" }` | **500** |
| `POST …/sessions/start` | `{ "topLevelMode": "concentration", "concentrationPreset": "classic_pomodoro", "platform": "ios" }` | **500** |
| `GET …/catalog` | — | **200** ✓ |
| `GET/POST/DELETE …/custom-timers` | — | **200/201** ✓ |

Validation was passing (no **400**); failure happened inside the handler during DB insert.

---

## Root cause

### Failed migration: `20260508140000_study_reports_meta_ml_version`

This migration adds metadata columns to `study_concentration_sessions`:

- `tags`
- `linked_task_id`
- `outcome_notes`
- `client_app_version`
- `platform`

**Bug:** `linked_task_id` was defined as PostgreSQL type **`UUID`**, but `tasks.task_id` is **`TEXT`**. The foreign key step failed:

```
foreign key constraint "study_concentration_sessions_linked_task_id_fkey" cannot be implemented
DETAIL: Key columns "linked_task_id" and "task_id" are of incompatible types: uuid and text.
```

On Railway, Prisma recorded this migration as **failed**. Depending on transaction boundaries, columns such as `platform` may never have been created. Inserts that set `platform` then failed at the database layer → unhandled Prisma error → **500**.

### Prisma schema mismatch

`linkedTaskId` in `schema.prisma` used `@db.Uuid`, which did not match the `Task.id` column type.

---

## Fixes applied (codebase)

### 1. Migration SQL corrected

**File:** `prisma/migrations/20260508140000_study_reports_meta_ml_version/migration.sql`

- Changed `linked_task_id` from `UUID` to **`TEXT`**
- FK to `tasks(task_id)` now valid

### 2. Prisma schema aligned

**File:** `prisma/schema.prisma`

- Removed `@db.Uuid` from `StudyConcentrationSession.linkedTaskId`
- Relation remains `Task?` with `String?` id (same as other UUID string PKs in this project)

### 3. Idempotent repair migration (production safety)

**File:** `prisma/migrations/20260514210000_repair_study_session_columns/migration.sql`

- Adds missing columns with `IF NOT EXISTS`
- Converts `linked_task_id` from `uuid` → `text` if an old broken column exists
- Adds FK and index only if missing
- Adds `schema_version` on `study_session_ml_reports` if missing

Safe to run even when `20260508140000` already succeeded.

### 4. Clearer API errors on session start

**Files:** `controllers/studyWithMishkaController.js`, `middleware/errorHandler.js`, `utils/errorMessages.js`

- Prisma failures on create return stable code **`STUDY_SESSION_START_FAILED`** (instead of generic 500 only)
- With env **`SHOW_ERROR_DETAILS=true`**, response includes:
  - `details.step`: `studyConcentrationSession.create`
  - `details.prismaCode`
  - `details.developerMessage`
  - `details.failureHint` (e.g. schema out of date → run `prisma migrate deploy`)

### 5. Error handler improvement

**File:** `middleware/errorHandler.js`

- `SHOW_ERROR_DETAILS` accepts `true` case-insensitively
- Prisma errors surface `prismaCode` and `meta` in `details` when enabled

---

## Production deployment steps (already done / reference)

Run from local machine with Railway **public** Postgres URL (`DATABASE_PUBLIC_URL`, not `.railway.internal`):

```powershell
cd c:\flutter_projects\backend
$env:DATABASE_URL="<DATABASE_PUBLIC_URL from Railway Postgres service>"

# If migration was marked failed:
npx prisma migrate resolve --rolled-back 20260508140000_study_reports_meta_ml_version

# Apply all pending migrations (including repair):
npx prisma migrate deploy

# Verify:
npx prisma migrate status
```

Expected: no **failed** or **pending** migrations.

Then:

1. Push latest backend code to the branch Railway deploys from  
2. **Redeploy** backend service on Railway  
3. Optional: set `SHOW_ERROR_DETAILS=true` on backend (debug only; remove or set `false` in production long-term)

---

## Expected behavior after fix

### Start session — Call With Mishka

```http
POST /study-with-mishka/sessions/start
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "topLevelMode": "call_with_mishka",
  "platform": "ios"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Created",
  "message_en": "Created",
  "message_ar": "تم الإنشاء",
  "data": {
    "id": "<session-uuid>",
    "topLevelMode": "call_with_mishka",
    "status": "active",
    "phase": "focus",
    "platform": "ios",
    "timerState": { ... },
    ...
  },
  "error": null,
  "details": null
}
```

### Start session — Concentration

```json
{
  "topLevelMode": "concentration",
  "concentrationPreset": "classic_pomodoro",
  "platform": "ios"
}
```

Same **201** shape; `concentrationPreset` and planned minute fields populated per preset.

### Conflict (not 500)

If the user already has an **active** or **paused** session:

**400** `VALIDATION_ERROR` — `"Pause or end your current session before starting another"`

This is expected; end the old session via `POST …/sessions/{id}/end` or clear stuck rows in DB if needed.

---

## Related routes (unblocked once start works)

These require a valid `session id` from a successful start:

| Method | Path |
|--------|------|
| `POST` | `/study-with-mishka/sessions/{id}/pause` |
| `POST` | `/study-with-mishka/sessions/{id}/resume` |
| `POST` | `/study-with-mishka/sessions/{id}/end` |
| `POST` | `/study-with-mishka/sessions/{id}/advance-phase` |
| `POST` | `/study-with-mishka/sessions/{id}/check-ins` |
| `POST` | `/study-with-mishka/sessions/{id}/telemetry` |
| `POST` | `/study-with-mishka/sessions/{id}/ml-reports` |
| `POST` | `/study-with-mishka/sessions/{id}/call-break/start` |
| `POST` | `/study-with-mishka/sessions/{id}/call-break/end` |
| `GET` | `/study-with-mishka/sessions/{id}` |
| `GET` | `/study-with-mishka/sessions/{id}/full-report` |

No contract changes on these routes — only the DB layer blocking **start** was broken.

---

## Flutter integration notes

### `POST /study-with-mishka/sessions/start` — request body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `topLevelMode` | string | **Yes** | `call_with_mishka` \| `concentration` |
| `concentrationPreset` | string | If concentration | `classic_pomodoro` \| `flowtime` \| `ultradian` \| `quick_sprint` \| `task_based` \| `custom` — **omit** for `call_with_mishka` |
| `platform` | string ≤40 | No | e.g. `"ios"`, `"android"` — was failing before DB fix |
| `clientAppVersion` | string ≤40 | No | App build label |
| `title` | string ≤200 | No | Required for `task_based` preset |
| `taskEstimatedMinutes` | int 1–720 | No | |
| `customPresetId` | uuid | No | Saved custom timer id; use with `concentrationPreset: "custom"` |
| `customOverrides` | object | No | `{ focusMinutes, shortBreakMinutes, longBreakMinutes, … }` for custom mode |
| `tags` | string[] max 20 | No | |
| `linkedTaskId` | uuid | No | Must be the user's own task |

**Do not send** undocumented top-level fields (`modeId`, `focusMinutes` at root, etc.) — they return **400** `VALIDATION_ERROR`.

### Other notes

1. OpenAPI: `GET /api-docs` or `GET /openapi.json` — tag **Study With Mishka**.

2. **Timer UX** — Server does not tick; poll `GET …/sessions/{id}` for `timerState` + `serverNow` while active.

3. **Local fallback** — App may keep running the timer locally on failure; after migrate + redeploy, sessions should persist for reports and daily streak.

4. **Stuck session** — If start returns **400** “Pause or end your current session…”, call `POST …/sessions/{id}/end` for the active session or list sessions via `GET /study-with-mishka/sessions`.

---

## Files changed (reference)

| Area | Files |
|------|--------|
| Migrations | `20260508140000_study_reports_meta_ml_version/migration.sql`, `20260514210000_repair_study_session_columns/migration.sql` |
| Schema | `prisma/schema.prisma` |
| Controller | `controllers/studyWithMishkaController.js` |
| Errors | `middleware/errorHandler.js`, `utils/errorMessages.js` |

---

## Verification checklist

- [ ] `npx prisma migrate status` — all migrations applied, none failed  
- [ ] `POST /study-with-mishka/sessions/start` with `call_with_mishka` → **201**  
- [ ] `POST /study-with-mishka/sessions/start` with `concentration` + preset → **201**  
- [ ] `POST …/sessions/{id}/end` → **200**  
- [ ] Flutter hot restart / full test on production URL  

---

## Contact / follow-up

If **500** persists after migrate + redeploy, capture the response body with `SHOW_ERROR_DETAILS=true` and share `details.prismaCode` and `details.developerMessage` for the next fix.
