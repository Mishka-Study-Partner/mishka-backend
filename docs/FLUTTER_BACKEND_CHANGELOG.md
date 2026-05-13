# Backend Changes for Flutter Team

**Date:** May 13, 2026
**Deploy required:** Yes — redeploy on Railway after pulling these changes.

---

## 1. PATCH /auth/me — Profile Update (NEW, was blocking)

The app can now update the authenticated user's profile.

**Request:**

```
PATCH /auth/me
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Body** (all fields optional, send only what changed):

```json
{
  "firstName": "Norhan",
  "lastName": "Mohamed",
  "fullName": "Norhan Mohamed",
  "email": "norhan.moh99@gmail.com",
  "phoneNumber": "01065011881",
  "countryCode": "+20",
  "gender": "female",
  "profileImageUrl": "https://...",
  "educationStatus": "university",
  "universityYear": 3,
  "password": "NewPass1@"
}
```

**Validation rules:**
- At least one field must be present
- `gender`: `male` | `female` | `prefer_not_to_say` | `null`
- `educationStatus`: `school` | `university` | `other`
- `password`: same policy as registration (8-20 chars, upper + lower + special)
- `email` / `phoneNumber`: returns **409** `UNIQUE_VIOLATION` if already taken
- Admin-only fields (`role`, `isVerified`) are **not** accepted on this route

**Success response** (same envelope as GET /auth/me):

```json
{
  "success": true,
  "message": "OK",
  "message_en": "OK",
  "message_ar": "تم",
  "data": {
    "user": {
      "id": "...",
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
      "createdAt": "...",
      "updatedAt": "..."
    },
    "preference": null
  },
  "error": null,
  "details": null
}
```

**Error responses:**
- **400** `VALIDATION_ERROR` — invalid fields or empty body
- **401** `AUTH_MISSING_TOKEN` — no/invalid JWT
- **409** `UNIQUE_VIOLATION` — email or phone already taken by another user

**Flutter integration:**
- Lock the client to `PATCH /auth/me` — remove the fallback chain (`PUT /users/me`, `PATCH /users/me`, etc.)
- `username` auto-regenerates when firstName/lastName/fullName change — no need to send it

---

## 2. POST/DELETE /auth/me/avatar — Profile Photo (NEW)

### Upload

```
POST /auth/me/avatar
Authorization: Bearer <jwt>
Content-Type: multipart/form-data
```

Send a single field named **`avatar`** containing the image file.

- Accepted formats: JPEG, PNG, WebP, GIF
- Max size: 20 MB
- Old avatar is automatically deleted on re-upload
- Returns updated user object with new `profileImageUrl`

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
// response.data['data']['user']['profileImageUrl'] → new URL
```

### Delete

```
DELETE /auth/me/avatar
Authorization: Bearer <jwt>
```

Sets `profileImageUrl` to `null` and removes the file from the server.

---

## 3. PATCH /tasks/{id} — Task Partial Update (NEW)

Previously only `PUT` existed. Now `PATCH` is also accepted (same handler).

**Example — mark a task as completed:**

```
PATCH /tasks/{id}
Authorization: Bearer <jwt>
Content-Type: application/json

{ "status": "completed" }
```

**Example — update title and due date:**

```json
{ "title": "Buy groceries", "dueDate": "2026-06-01" }
```

Task status values: `pending` | `completed` | `missed`

Both `PUT /tasks/{id}` and `PATCH /tasks/{id}` work identically — send only what changed.

`DELETE /tasks/{id}` was already available.

---

## 4. PATCH /todo-lists/{id} — Todo List Partial Update (NEW)

Same pattern — `PATCH` is now accepted alongside `PUT`.

**Example — rename a list:**

```
PATCH /todo-lists/{id}
Authorization: Bearer <jwt>
Content-Type: application/json

{ "listName": "Midterm Prep" }
```

Accepted fields: `listName`, `listType` (`calendar` | `college` | `work` | `personal`), `iconId`.

`DELETE /todo-lists/{id}` was already available.

---

## 5. GET /icons — Already Existed (no change needed)

```
GET /icons
Authorization: Bearer <jwt>
```

Returns the full icon catalog. Each icon has `id` (integer), `iconName`, `iconPath`.

The app's `ApiEndpoints.icons = '/icons'` will work as-is.

---

## 6. Existing Endpoints — Already Available (no action needed)

These were listed as future features but already have full CRUD:

| Path | Status |
|------|--------|
| `/user-preferences` | GET, POST, PUT, DELETE |
| `/user-sessions` | GET, POST, PUT, DELETE (admin can list all) |
| `/chat-sessions` | Full CRUD |
| `/chat-messages` | Full CRUD |
| `/ai-requests` | Full CRUD |
| `/quiz-questions` | Full CRUD |
| `/history-items` | Full CRUD |
| `/password-reset-tokens` | Full CRUD (admin) |
| `/study-with-mishka` | Full session lifecycle |
| `/daily-streaks` | GET available |

---

## Summary of Routes Added / Changed

| Method | Path | Purpose |
|--------|------|---------|
| `PATCH` | `/auth/me` | Update own profile |
| `POST` | `/auth/me/avatar` | Upload profile photo (multipart) |
| `DELETE` | `/auth/me/avatar` | Remove profile photo |
| `PATCH` | `/tasks/{id}` | Partial update task |
| `PATCH` | `/todo-lists/{id}` | Partial update todo list |
| `POST` | `/tasks` | `listId` now optional — standalone tasks |

All documented in Swagger: open `/api-docs` after deploy to see full schemas, examples, and try-it-out.

---

## 7. POST /tasks — Standalone Tasks Without a List (CHANGED)

`listId` is now **optional** when creating a task. You can create tasks that are not attached to any todo list.

**Create a standalone task (no list):**

```
POST /tasks
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "title": "Buy groceries",
  "dueDate": "2026-06-01",
  "priority": "high"
}
```

**Create a task inside a list (still works, unchanged):**

```json
{
  "title": "Study chapter 5",
  "listId": "<uuid of the todo list>",
  "dueDate": "2026-06-01",
  "status": "pending"
}
```

Or via the nested route: `POST /todo-lists/{id}/tasks` (no `listId` needed in body — it's taken from the URL).

**Querying:**
- `GET /tasks` returns all tasks (both standalone and list-attached)
- `GET /tasks?listId=<uuid>` filters to a specific list
- Standalone tasks have `listId: null` in the response

**Migration required:** `prisma migrate deploy` must run on the production database (included in the migration files).

---

## Environment Variables (new, optional)

| Variable | Purpose | Default |
|----------|---------|---------|
| `AVATAR_BASE_URL` | Public base URL for avatar files (e.g. `https://mishka-backend-production.up.railway.app`) | Auto-detected from request |

---

## Minor Note

`/auth/send-signup-otp` is hardcoded as a string in `auth_remote_data_source.dart` instead of referencing `ApiEndpoints`. Not a backend issue — the route exists and works — but consider moving it to `ApiEndpoints` for consistency.
