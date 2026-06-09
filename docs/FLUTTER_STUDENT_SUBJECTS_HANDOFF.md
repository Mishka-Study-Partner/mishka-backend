# Flutter handoff — Student subjects (courses)

**Date:** June 2026  
**Feature:** Personal course list + optional subject on study sessions + per-subject report breakdown

---

## Summary

Students manage their own subjects (Arabic, Physics, …). When starting a study session they **may** pick one. Your Report shows **total study time** (unchanged) plus **`study.bySubject`** with an **Unassigned** bucket for sessions with no subject.

---

## Endpoints

### Subject CRUD

```http
GET    /student-subjects
POST   /student-subjects
PATCH  /student-subjects/{id}
DELETE /student-subjects/{id}
```

**Create:**

```json
POST /student-subjects
{ "name": "Physics", "color": "#4E7DBA" }
```

**Response item:**

```json
{
  "id": "uuid",
  "name": "Physics",
  "color": "#4E7DBA",
  "sortOrder": 0,
  "createdAt": "...",
  "updatedAt": "..."
}
```

- Max **20** active subjects per user.
- Names unique per user (case-insensitive).
- `DELETE` is soft-delete (`deletedAt`); hidden from list/picker; past sessions keep history for reports.
- `409 SUBJECT_NAME_IN_USE` if duplicate name.

---

### Study session (optional subject)

**Start** — existing endpoint, new optional field:

```http
POST /study-with-mishka/sessions/start
```

```json
{
  "topLevelMode": "concentration",
  "concentrationPreset": "classic_pomodoro",
  "studentSubjectId": "uuid"
}
```

Omit `studentSubjectId` → session counts as **Unassigned** in reports.

**Patch** (before end):

```http
PATCH /study-with-mishka/sessions/{id}
{ "studentSubjectId": "uuid" }
```

Clear subject: `{ "studentSubjectId": null }`

**Session response** (start/get/list/end):

```json
{
  "studentSubjectId": "uuid",
  "studentSubjectName": "Physics",
  "studentSubjectColor": "#4E7DBA"
}
```

All null when no subject selected.

---

## Your Report

`GET /reports/your-report?period=weekly&date=YYYY-MM-DD&locale=en`

**New block** under `data.study`:

```json
{
  "study": {
    "buckets": [ /* unchanged — total over time */ ],
    "totals": { "sumStudyMinutes": 420, ... },
    "bySubject": [
      {
        "studentSubjectId": "uuid",
        "name": "Physics",
        "color": "#4E7DBA",
        "studyMinutes": 180,
        "sessionCount": 12,
        "percentOfTotal": 43
      },
      {
        "studentSubjectId": null,
        "name": "Unassigned",
        "color": null,
        "studyMinutes": 120,
        "sessionCount": 5,
        "percentOfTotal": 29
      }
    ]
  }
}
```

- `name` for unassigned is localized: **Unassigned** / **غير محدد**.
- PDF export includes a **Study by subject** card (horizontal bars).

Same shape on `format=payload` and in PDF HTML renderer.

---

## Flutter checklist

- [ ] Settings / profile: CRUD UI for `/student-subjects`
- [ ] Study session start: optional subject picker (from GET list)
- [ ] Parse `studentSubjectId`, `studentSubjectName` on session models
- [ ] Your Report screen: section from `study.bySubject` (bar list or chart)
- [ ] Handle empty `bySubject` (no study in period)
- [ ] `409 SUBJECT_NAME_IN_USE` on duplicate create/rename

---

## Migration

```bash
npx prisma migrate deploy
```

Migration: `20260604120000_student_subjects`

---

## Related

- [`FLUTTER_YOUR_REPORT_CHANGE_GUIDE.md`](./FLUTTER_YOUR_REPORT_CHANGE_GUIDE.md)
- Study sessions: `POST /study-with-mishka/sessions/start`
