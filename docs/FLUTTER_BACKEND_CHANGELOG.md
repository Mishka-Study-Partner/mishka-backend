# Backend Update — For Flutter Team

**Date:** May 13–14, 2026  
**Version:** Profile, Tasks, Avatar + Study With Mishka fix  
**Deploy required:** Yes — redeploy on Railway + run `npx prisma migrate deploy`

**Study session 500 fix (detailed):** see [`STUDY_WITH_MISHKA_FIX_REPORT.md`](./STUDY_WITH_MISHKA_FIX_REPORT.md)

---

## What was blocking and is now fixed

| # | Issue | Status |
|---|-------|--------|
| 1 | Profile update returns 404 | Fixed — `PATCH /auth/me` |
| 2 | Tasks can't be updated/completed/deleted | Fixed — `PATCH /tasks/{id}`, `DELETE /tasks/{id}` |
| 3 | Tasks require a list (can't create standalone) | Fixed — `listId` is now optional |
| 4 | Todo lists can't be renamed/updated | Fixed — `PATCH /todo-lists/{id}` |
| 5 | No profile photo upload | Fixed — `POST /auth/me/avatar` |
| 6 | Icons endpoint missing | Was already working — `GET /icons` |

---

## 1. PATCH /auth/me — Update Profile

```
PATCH /auth/me
Authorization: Bearer <jwt>
Content-Type: application/json
```

Send **only the fields that changed**. At least one field is required.

### Accepted fields

| Field | Type | Notes |
|-------|------|-------|
| `firstName` | string 1–50 | |
| `lastName` | string 1–50 | |
| `fullName` | string ≤150 | Auto-derived if omitted but firstName/lastName sent |
| `email` | email | 409 if taken by another user |
| `phoneNumber` | string ≤20 | 409 if taken by another user |
| `countryCode` | string ≤5 | e.g. `"+20"` |
| `gender` | `male` \| `female` \| `prefer_not_to_say` \| `null` | |
| `profileImageUrl` | string \| `null` | Use avatar endpoint for file upload |
| `password` | string 8–20 | Same policy as registration |
| `educationStatus` | `school` \| `university` \| `other` | |
| `educationOtherDetail` | string \| `null` | |
| `schoolTrack` | `middle_school` \| `high_school` \| `null` | |
| `schoolGrade` | 1–3 \| `null` | |
| `universityYear` | 1–5 \| `null` | |

### Example request

```json
{
  "firstName": "Norhan",
  "lastName": "Mohamed",
  "gender": "female",
  "countryCode": "+20"
}
```

### Response (same shape as GET /auth/me)

```json
{
  "success": true,
  "message": "OK",
  "message_en": "OK",
  "message_ar": "تم",
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "Norhan",
      "lastName": "Mohamed",
      "fullName": "Norhan Mohamed",
      "username": "norhan_mohamed",
      "email": "norhan.moh99@gmail.com",
      "phoneNumber": "01065011881",
      "countryCode": "+20",
      "gender": "female",
      "profileImageUrl": null,
      "educationStatus": "university",
      "universityYear": 3,
      "role": "student",
      "isVerified": true,
      "createdAt": "2026-05-13T...",
      "updatedAt": "2026-05-13T..."
    },
    "preference": null
  },
  "error": null,
  "details": null
}
```

### Error codes

| HTTP | Code | When |
|------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid field value or empty body |
| 401 | `AUTH_MISSING_TOKEN` | No or invalid JWT |
| 409 | `UNIQUE_VIOLATION` | Email or phone already taken |

### Flutter action items

- Lock client to **`PATCH /auth/me`** — remove any fallback chain (`PUT /users/me`, etc.)
- Don't send `username` — it auto-regenerates when name fields change
- Don't send `role` or `isVerified` — they are rejected

---

## 2. POST/DELETE /auth/me/avatar — Profile Photo

### Upload

```
POST /auth/me/avatar
Authorization: Bearer <jwt>
Content-Type: multipart/form-data
```

- Field name: **`avatar`**
- Accepted: JPEG, PNG, WebP, GIF
- Max size: 20 MB
- Old photo is auto-deleted on re-upload

**Dart / Dio example:**

```dart
final formData = FormData.fromMap({
  'avatar': await MultipartFile.fromFile(
    pickedFile.path,
    filename: 'avatar.jpg',
  ),
});

final response = await dio.post(
  '/auth/me/avatar',
  data: formData,
  options: Options(headers: {'Authorization': 'Bearer $token'}),
);

final newUrl = response.data['data']['user']['profileImageUrl'];
```

### Delete

```
DELETE /auth/me/avatar
Authorization: Bearer <jwt>
```

Returns updated user with `profileImageUrl: null`.

### Response

Both endpoints return the same shape as `PATCH /auth/me` — full user object with `data.user.profileImageUrl` updated.

---

## 3. Tasks — PATCH, DELETE, and Standalone Creation

### Create a task (listId is now OPTIONAL)

```
POST /tasks
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Standalone task (no list):**

```json
{
  "title": "Buy groceries",
  "dueDate": "2026-06-01",
  "priority": "high"
}
```

**Task in a list (still works as before):**

```json
{
  "title": "Study chapter 5",
  "listId": "<todo-list-uuid>",
  "dueDate": "2026-06-01"
}
```

**Or via nested route:** `POST /todo-lists/{id}/tasks` — `listId` auto-set from URL.

### Update a task (partial)

```
PATCH /tasks/{id}
Authorization: Bearer <jwt>
Content-Type: application/json
```

Send only what changed:

```json
{ "status": "completed" }
```

```json
{ "title": "Updated title", "dueDate": "2026-07-01", "priority": "low" }
```

Both `PATCH` and `PUT` work — same handler, same behavior.

### Delete a task

```
DELETE /tasks/{id}
Authorization: Bearer <jwt>
```

### Task fields reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string ≤255 | Yes (on create) | |
| `listId` | uuid \| null | No | Omit for standalone tasks |
| `description` | string \| null | No | |
| `dueDate` | `YYYY-MM-DD` | No | UTC date |
| `dueTime` | `HH:mm:ss` | No | UTC time |
| `status` | `pending` \| `completed` \| `missed` | No | Default: `pending` |
| `priority` | `low` \| `medium` \| `high` | No | Default: `medium` |
| `taskType` | `online` \| `offline` \| null | No | |

### Querying tasks

```
GET /tasks
GET /tasks?status=pending
GET /tasks?listId=<uuid>
GET /tasks?upcomingOnly=true&withinDays=7&limit=10
GET /tasks?dueOn=2026-06-01
```

Standalone tasks have `listId: null` in the response.

---

## 4. PATCH /todo-lists/{id} — Update a List

```
PATCH /todo-lists/{id}
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{ "listName": "Midterm Prep" }
```

| Field | Type |
|-------|------|
| `listName` | string ≤100 |
| `listType` | `calendar` \| `college` \| `work` \| `personal` |
| `iconId` | integer (from `GET /icons`) \| null |

Both `PATCH` and `PUT` work. `DELETE /todo-lists/{id}` also available.

---

## 5. GET /icons — Icon Catalog (already existed)

```
GET /icons
Authorization: Bearer <jwt>
```

Returns array of icons:

```json
[
  { "id": 1, "iconName": "book", "iconPath": "/icons/book.svg" },
  { "id": 2, "iconName": "calendar", "iconPath": "/icons/calendar.svg" }
]
```

No changes needed in the app — `ApiEndpoints.icons = '/icons'` works.

---

## 6. Other Endpoints — Already Available

These were mentioned in the audit but already exist:

| Path | Methods | Notes |
|------|---------|-------|
| `/user-preferences` | GET, POST, PUT, DELETE | Language/theme/notifications |
| `/user-sessions` | GET, PUT, DELETE | Admin can list all |
| `/chat-sessions` | Full CRUD | |
| `/chat-messages` | Full CRUD | |
| `/ai-requests` | Full CRUD | |
| `/quiz-questions` | Full CRUD | |
| `/history-items` | Full CRUD | |
| `/daily-streaks` | GET | |
| `/study-with-mishka` | Full lifecycle | |
| `/password-reset-tokens` | Full CRUD (admin) | |

---

## Quick Reference — All New Routes

| Method | Path | Purpose |
|--------|------|---------|
| `PATCH` | `/auth/me` | Update own profile (partial) |
| `POST` | `/auth/me/avatar` | Upload profile photo |
| `DELETE` | `/auth/me/avatar` | Remove profile photo |
| `POST` | `/tasks` | Create task (listId now optional) |
| `PATCH` | `/tasks/{id}` | Update task (partial) |
| `DELETE` | `/tasks/{id}` | Delete task (already existed) |
| `PATCH` | `/todo-lists/{id}` | Update list (partial) |
| `DELETE` | `/todo-lists/{id}` | Delete list (already existed) |

---

## Deploy Checklist

1. Pull latest backend code
2. On Railway, redeploy the backend service
3. Run database migration: `npx prisma migrate deploy`  
   (This makes `list_id` nullable in the tasks table)
4. Verify in Swagger (`/api-docs`) that the new endpoints appear

---

## New Environment Variables (optional)

| Variable | Purpose | Default |
|----------|---------|---------|
| `AVATAR_BASE_URL` | Public URL prefix for uploaded avatars | Auto-detected from request host |

Set this on Railway if avatar URLs need a specific domain (e.g. `https://mishka-backend-production.up.railway.app`).

---

## Notes for Flutter

- `/auth/send-signup-otp` is hardcoded in `auth_remote_data_source.dart` — consider moving to `ApiEndpoints` for consistency
- The `taskActionsComingSoon` localized string can now be removed — task actions are fully functional
- All new endpoints are documented in Swagger (`/api-docs`) with full schemas and try-it-out
