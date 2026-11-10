# API_DOCUMENTATION.md — API contract v1.0

**Owner:** Account 1. **This file is the single contract** between frontend (Account 2) and backend (Account 3). Do not deviate; report problems to Account 1.

## 0. Conventions

| Item | Rule |
|---|---|
| Base path | All endpoints are under `/api`. The browser calls **relative** URLs (`fetch("/api/auth/me")`). Next.js rewrites `/api/:path*` → `${BACKEND_URL}/api/:path*`. |
| Format | JSON (`application/json`) unless stated (multipart for image/frame upload). |
| Field naming | `snake_case` everywhere. |
| IDs | 24-char hex strings. Always exposed as `id` (never `_id`). Malformed id → `404 not_found`. |
| Timestamps | ISO-8601 UTC, e.g. `"2026-11-09T16:14:03.512Z"`. |
| Scores | Floats in `[0,1]` or `null` when no real inference exists yet. **Never** a placeholder number. |
| Auth | HttpOnly cookie `access_token` (JWT). `Authorization: Bearer <jwt>` is also accepted (tools/tests). Frontend must send `credentials: "same-origin"` (the default) and never read/store the token. |
| Cookie attrs | `HttpOnly; Secure (prod); SameSite=Lax; Path=/; Max-Age=604800` (7 days). Cleared on logout/account deletion. |
| CSRF | `SameSite=Lax` + all state-changing routes require `Content-Type: application/json` or multipart; backend additionally rejects state-changing requests whose `Origin` header is present and not in `CORS_ORIGINS` (`403 forbidden_origin`). |
| Pagination | Query `page` (default 1, ≥1), `page_size` (default 20, 1–100). Response `{ "items": [...], "page", "page_size", "total", "total_pages" }`. |
| Date filters | `from`, `to` = ISO-8601 dates or datetimes, inclusive; UTC. |
| Ownership | Every query is filtered by the authenticated user. Another user's resource → **`404 not_found`** (never 403) so existence is not leaked. |
| Error envelope | `{ "error": { "code": "string", "message": "human readable", "details": <object|array|null> } }` |

### Standard error codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `bad_request` | Malformed body / unreadable image. |
| 401 | `not_authenticated` | No/invalid cookie. |
| 401 | `token_expired` | JWT expired → frontend clears auth state and redirects to `/login?reason=expired`. |
| 403 | `forbidden_origin` | Origin check failed. |
| 403 | `image_storage_disabled` | Moment image sent but user preference `store_frames` is false. |
| 404 | `not_found` | Missing or not owned. |
| 409 | `email_taken` · `session_already_live` · `session_not_active` · `session_live` · `no_telemetry_yet` | See endpoints. |
| 413 | `payload_too_large` | Frame > 500 KB, image > 4 MB, moment image > 300 KB. |
| 415 | `unsupported_media_type` | Not JPEG/PNG. |
| 422 | `validation_error` | Field errors in `details: [{ "field": "email", "message": "..." }]`. Also `no_face_detected` (see analyze-image). |
| 429 | `rate_limited` | Too many frames/logins. Header `Retry-After`. |
| 503 | `models_unavailable` | A required ML artifact failed to load. **No fallback predictions.** |

---

## 1. Shared object shapes

### 1.1 `User`
```json
{
  "id": "6730f1c2a1b2c3d4e5f60718",
  "name": "Asha Rao",
  "email": "asha@example.com",
  "preferences": { "store_frames": false },
  "created_at": "2026-11-09T16:14:03.512Z",
  "updated_at": "2026-11-09T16:14:03.512Z"
}
```

### 1.2 `Telemetry`
Preserves the existing `/telemetry` keys; adds `fused_code`, `eeg_source`, `timestamp`, `components`.
```json
{
  "timestamp": "2026-11-09T16:20:41.120Z",
  "vision_score": 0.812,
  "eeg_score": 0.597,
  "fused_state": "True Meditative Stillness",
  "fused_code": "both_high",
  "discrepancy_alert": false,
  "eeg_source": "simulated_csv",
  "metrics": {
    "gaze_stability": 0.0214,
    "head_stability": 0.0031,
    "rolling_blinks": 4,
    "ear": 0.287,
    "alpha_theta_ratio": 0.412,
    "beta_power": 1.33e-12
  },
  "components": {
    "vision_rf_prob": 0.74,
    "vision_kinematic_stillness": 0.87,
    "eeg_rf_prob_raw": 0.31,
    "eeg_calibrated_prob": 0.597
  }
}
```
- `fused_state` strings are **exactly** the legacy ones from `backend.py`:
  - `both_high` → `"True Meditative Stillness"`
  - `both_low` → `"Attentional Drift (Restless)"`
  - `vision_high_eeg_low` → `"Unverified / Mismatch: Cognitive Wandering (Eyes Still, Mind Active)"` (alert)
  - `vision_low_eeg_high` → `"Unverified / Mismatch: Physical Fidgeting (Body Moving, Mind Calm)"` (alert)
- The frontend **renders from `fused_code`** using its own responsible-wording copy (e.g. "Vision & EEG indicators both high") and may show the legacy `fused_state` string as a secondary "model label".
- `components` exposes the raw pieces so the UI can state honestly that scores are blended/heuristic (see `ML_INTEGRATION.md`).
- Any numeric field may be `null` before the first processed frame; the whole `Telemetry` is `null` until then.

### 1.3 `Overlay` (normalized landmark polylines, mirrored space — see §4.3)
```json
{
  "face_oval": [[0.51,0.12],[0.55,0.13]],
  "left_eye": [[0.40,0.40]],
  "right_eye": [[0.60,0.40]],
  "left_iris": [[0.41,0.40]],
  "right_iris": [[0.61,0.40]],
  "nose": [[0.50,0.45],[0.50,0.55]]
}
```
All coordinates are `[x, y]` in `[0,1]` relative to the **mirrored** frame. Iris arrays may be empty.

### 1.4 `Session`
```json
{
  "id": "6730f3aaa1b2c3d4e5f60999",
  "status": "completed",
  "source": "browser_camera",
  "eeg_source": "simulated_csv",
  "started_at": "2026-11-09T16:20:00.000Z",
  "ended_at": "2026-11-09T16:35:10.000Z",
  "duration_seconds": 910,
  "active_duration_seconds": 840,
  "moments_count": 3,
  "summary": {
    "dominant_fused_code": "both_high",
    "dominant_fused_state": "True Meditative Stillness",
    "discrepancy_ratio": 0.18
  },
  "aggregated_metrics": {
    "frames_analyzed": 5210,
    "frames_without_face": 140,
    "vision_score": { "mean": 0.71, "min": 0.12, "max": 0.97 },
    "eeg_score": { "mean": 0.52, "min": 0.29, "max": 0.60 },
    "gaze_stability_mean": 0.031,
    "head_stability_mean": 0.012,
    "blinks_per_minute_mean": 14.2,
    "alpha_theta_ratio_mean": 0.31,
    "beta_power_mean": 1.1e-12,
    "fused_code_distribution": {
      "both_high": 0.46, "both_low": 0.22,
      "vision_high_eeg_low": 0.11, "vision_low_eeg_high": 0.21
    }
  },
  "created_at": "2026-11-09T16:20:00.000Z"
}
```
- `status`: `active | paused | completed | abandoned`.
- `ended_at`, `summary`, `aggregated_metrics` are `null` while `active/paused`. For `abandoned`, they are computed from the last heartbeat.
- `fused_code_distribution` values are fractions of analyzed frames and sum to ≈1.
- `blinks_per_minute_mean` is derived from the `rolling_blinks` window **and the window's real duration**; see ML doc (❓ window definition pending decision). Frontend must not label it as a clinical measure.

### 1.5 `Moment`
```json
{
  "id": "6730f4b1a1b2c3d4e5f60aaa",
  "session_id": "6730f3aaa1b2c3d4e5f60999",
  "timestamp": "2026-11-09T16:27:44.900Z",
  "fused_state": "True Meditative Stillness",
  "fused_code": "both_high",
  "vision_score": 0.812,
  "eeg_score": 0.597,
  "discrepancy_alert": false,
  "eeg_source": "simulated_csv",
  "metrics": {
    "gaze_stability": 0.0214,
    "head_stability": 0.0031,
    "rolling_blinks": 4,
    "ear": 0.287,
    "alpha_theta_ratio": 0.412,
    "beta_power": 1.33e-12
  },
  "note": "Right after the break",
  "has_image": true,
  "image_url": "/api/moments/6730f4b1a1b2c3d4e5f60aaa/image",
  "created_at": "2026-11-09T16:27:44.912Z"
}
```
`image_url` is `null` and `has_image` is `false` when no image was stored.

---

## 2. Health

### `GET /api/health`
Auth: none. Used by Render health check.
200:
```json
{ "status": "ok", "db": "ok", "models_loaded": true, "version": "1.0.0" }
```
`status` is `"degraded"` (still HTTP 200) if the DB ping fails; `503` only if models failed to load.

---

## 3. Authentication

### `POST /api/auth/register`
Auth: none. Creates the account **and logs the user in** (sets cookie).

Request:
```json
{ "name": "Asha Rao", "email": "asha@example.com", "password": "Str0ngPassw0rd", "confirm_password": "Str0ngPassw0rd" }
```
Validation: `name` 1–80 chars (trimmed); `email` valid, stored lower-cased; `password` 10–128 chars with ≥1 letter and ≥1 digit; `confirm_password` must equal `password`.

201: `{ "user": User }` + `Set-Cookie: access_token=...`
Errors: `409 email_taken`, `422 validation_error` (`details` lists fields).

### `POST /api/auth/login`
Auth: none.
Request: `{ "email": "asha@example.com", "password": "Str0ngPassw0rd" }`
200: `{ "user": User }` + `Set-Cookie`.
Errors: `401 invalid_credentials` (same message for unknown email and wrong password), `429 rate_limited`, `422 validation_error`.

### `POST /api/auth/logout`
Auth: optional (always succeeds). 204, clears cookie.

### `GET /api/auth/me`
Auth: required. 200: `{ "user": User }`. Errors: `401 not_authenticated | token_expired`.
This is the **only** way the frontend learns whether it is logged in.

---

## 4. Monitoring

A user has at most one *live* (`active`/`paused`) session. Monitoring flow: `start` → repeated `frame` → (`pause` ⇄ `resume`) → `stop`.

### `POST /api/monitoring/start`
Auth: required.
Request:
```json
{ "source": "browser_camera", "eeg_source": "simulated_csv" }
```
Only these values are accepted in v1 (`422` otherwise).
201:
```json
{
  "session": Session,
  "limits": { "max_fps": 10, "max_frame_bytes": 512000, "recommended_frame_width": 320 }
}
```
Errors: `409 session_already_live` with `details: { "session_id": "..." }` (frontend offers Resume / Stop), `503 models_unavailable`.

### `POST /api/monitoring/frame`
Auth: required. `multipart/form-data`:
| Field | Type | Notes |
|---|---|---|
| `session_id` | string | required |
| `file` | JPEG | required, ≤ 500 KB, **not mirrored** by the client |

200:
```json
{
  "session_id": "6730f3aaa1b2c3d4e5f60999",
  "face_detected": true,
  "telemetry": Telemetry,
  "overlay": Overlay
}
```
If no face: `face_detected: false`, `overlay: null`, `telemetry` = the previous telemetry (or `null` if none yet); the server counts it in `frames_without_face`. Not an error.
Errors: `404 not_found` (session not yours), `409 session_not_active` (paused/completed/abandoned), `413`, `415`, `400 bad_request` (undecodable), `429 rate_limited` (> ~12 fps sustained), `503 models_unavailable`.
Heartbeat: every accepted frame refreshes `last_heartbeat_at`.

### `GET /api/monitoring/telemetry?session_id=<id>`
Auth: required. Preserves the legacy `/telemetry` role (read latest state without sending a frame, e.g. after a page refresh or from a second tab).
200: `{ "session_id": "...", "status": "active", "telemetry": Telemetry | null }`
Errors: `404 not_found`.

### `POST /api/monitoring/pause` · `POST /api/monitoring/resume`
Auth: required. Request: `{ "session_id": "..." }`. 200: `{ "session": Session }`.
Pause freezes the EEG cursor and rolling buffers, and stops accepting frames (`409 session_not_active`). Paused time is excluded from `active_duration_seconds`.
Errors: `404`, `409 session_not_active` (e.g. pausing a completed session).

### `POST /api/monitoring/stop`
Auth: required. Request: `{ "session_id": "..." }`.
200: `{ "session": Session }` with `status: "completed"`, `ended_at`, durations, `summary`, `aggregated_metrics` populated and persisted. Idempotent for an already-completed session (returns it).
Errors: `404`.

### `POST /api/monitoring/analyze-image`
Auth: required. Static-photo analysis (existing feature, preserved). `multipart/form-data`: `file` (JPEG/PNG ≤ 4 MB), optional `session_id`.
**Not mirrored. Not persisted. Does not affect any session aggregate.**

200:
```json
{
  "annotated_image": "data:image/jpeg;base64,/9j/4AAQ...",
  "vision_score": 0.64,
  "eeg_score": 0.597,
  "eeg_source": "simulated_csv",
  "fused_state": "True Meditative Stillness",
  "fused_code": "both_high",
  "discrepancy_alert": false,
  "metrics": {
    "ear": 0.281, "gaze_angle_x": 0.012, "gaze_angle_y": -0.004,
    "pose_Rx": 0.021, "pose_Ry": -0.013, "pose_Rz": 0.003,
    "gaze_deviation": 0.004, "head_deviation": 0.006,
    "eye_status": "Open & Fixated"
  },
  "method_note": "Single-frame heuristic estimate; rolling-window features are approximated."
}
```
`eeg_score`, `fused_state`, `fused_code` and `discrepancy_alert` are `null` when `session_id` is omitted or the session has no EEG value yet (vision-only result). Never substitute a placeholder EEG number.
Errors: `400 bad_request` (invalid image), `422 no_face_detected` (message: "No face detected in the uploaded image."), `413`, `415`, `404` (bad `session_id`).

---

## 5. Captured moments

### `POST /api/moments`
Auth: required. Headers: `Idempotency-Key: <uuid>` (**required**, prevents duplicates on retry/double-click).
Request:
```json
{
  "session_id": "6730f3aaa1b2c3d4e5f60999",
  "note": "Right after the break",
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```
- `note`: optional, ≤ 280 chars.
- `image_base64`: optional. Allowed **only** if the user's `preferences.store_frames` is true (else `403 image_storage_disabled`). JPEG only, decoded size ≤ 300 KB.
- **No telemetry values are accepted from the client.** The server snapshots its latest telemetry for the session.

201: `{ "moment": Moment }`
Repeat with the same `Idempotency-Key` → `200 { "moment": Moment }` (the original).
Errors: `404 not_found` (session not yours), `409 session_not_active`, `409 no_telemetry_yet`, `403 image_storage_disabled`, `413`, `422`.

### `GET /api/moments`
Auth: required. Query:
| Param | Meaning |
|---|---|
| `page`, `page_size` | pagination |
| `sort` | `newest` (default) \| `oldest` |
| `session_id` | only this session |
| `from`, `to` | date filter on `timestamp` |
| `q` | case-insensitive search over `fused_state` and `note` (literal text, regex-escaped server-side) |
| `fused_code` | exact filter |

200: `{ "items": [Moment], "page": 1, "page_size": 20, "total": 1, "total_pages": 1 }`

### `GET /api/moments/{id}`
200: `{ "moment": Moment }`. 404 if missing/not owned.

### `GET /api/moments/{id}/image`
Returns `image/jpeg` bytes (cookie auth, so `<img src>` works same-origin). `404` if no image or not owned. Header `Cache-Control: private, max-age=3600`.

### `DELETE /api/moments/{id}`
204. Decrements the parent session's `moments_count`. 404 if missing/not owned.

---

## 6. Sessions

### `GET /api/sessions`
Auth: required. Query: `page`, `page_size`, `status` (optional), `from`, `to` (on `started_at`), `sort` (`newest` default | `oldest`).
200: `{ "items": [Session], "page", "page_size", "total", "total_pages" }`
Side effect: sessions whose `last_heartbeat_at` is older than 120 s and are still `active/paused` are lazily marked `abandoned` before listing.

### `GET /api/sessions/{id}`
200: `{ "session": Session }`. Moments of the session: `GET /api/moments?session_id={id}`.

### `DELETE /api/sessions/{id}`
204. Deletes the session **and all its captured moments**. `409 session_live` if `active/paused` (stop it first).

---

## 7. Analytics (all computed from stored records; no synthetic data)

Only `completed` and `abandoned` sessions with `aggregated_metrics` are included.

### `GET /api/analytics/overview?from=&to=`
200:
```json
{
  "total_sessions": 12,
  "total_moments": 37,
  "total_active_duration_seconds": 10320,
  "avg_vision_score": 0.68,
  "avg_eeg_score": 0.51,
  "discrepancy_ratio": 0.19,
  "latest_session": Session
}
```
For a user with no data: counts are `0`, averages and `latest_session` are `null`. Averages are **duration/frame-weighted** (`frames_analyzed`), not a plain mean of means.

### `GET /api/analytics/trends?from=&to=`
200:
```json
{
  "sessions": [
    {
      "session_id": "6730f3aaa1b2c3d4e5f60999",
      "started_at": "2026-11-09T16:20:00.000Z",
      "active_duration_seconds": 840,
      "avg_vision_score": 0.71,
      "avg_eeg_score": 0.52,
      "avg_gaze_stability": 0.031,
      "avg_head_stability": 0.012,
      "avg_alpha_theta_ratio": 0.31,
      "avg_beta_power": 1.1e-12,
      "discrepancy_ratio": 0.18,
      "moments_count": 3
    }
  ],
  "moments_per_day": [ { "date": "2026-11-09", "count": 3 } ]
}
```
`sessions` ascending by `started_at`. `moments_per_day` uses UTC dates.

---

## 8. User profile & account

### `GET /api/users/profile`
200: `{ "user": User }`

### `PUT /api/users/profile`
Request (any subset, at least one field):
```json
{ "name": "Asha R.", "preferences": { "store_frames": true } }
```
200: `{ "user": User }`. Email is **not** changeable in v1. Turning `store_frames` off does not delete existing images.

### `PUT /api/users/change-password`
Request: `{ "current_password": "...", "new_password": "...", "confirm_new_password": "..." }` (same strength rules as registration).
204. Errors: `401 invalid_credentials` (wrong current password), `422 validation_error`.

### `DELETE /api/users/account`
Request body: `{ "password": "..." }`.
204, clears cookie. Deletes the user, all sessions, all moments (including images), and clears any in-memory session state.
Errors: `401 invalid_credentials`.

---

## 9. Endpoint summary

| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | – |
| POST | `/api/auth/register` | – |
| POST | `/api/auth/login` | – |
| POST | `/api/auth/logout` | – |
| GET | `/api/auth/me` | ✔ |
| POST | `/api/monitoring/start` | ✔ |
| POST | `/api/monitoring/frame` | ✔ |
| GET | `/api/monitoring/telemetry` | ✔ |
| POST | `/api/monitoring/pause` | ✔ |
| POST | `/api/monitoring/resume` | ✔ |
| POST | `/api/monitoring/stop` | ✔ |
| POST | `/api/monitoring/analyze-image` | ✔ |
| POST | `/api/moments` | ✔ |
| GET | `/api/moments` | ✔ |
| GET | `/api/moments/{id}` | ✔ |
| GET | `/api/moments/{id}/image` | ✔ |
| DELETE | `/api/moments/{id}` | ✔ |
| GET | `/api/sessions` | ✔ |
| GET | `/api/sessions/{id}` | ✔ |
| DELETE | `/api/sessions/{id}` | ✔ |
| GET | `/api/analytics/overview` | ✔ |
| GET | `/api/analytics/trends` | ✔ |
| GET | `/api/users/profile` | ✔ |
| PUT | `/api/users/profile` | ✔ |
| PUT | `/api/users/change-password` | ✔ |
| DELETE | `/api/users/account` | ✔ |

### Mapping from legacy endpoints

| Legacy (`backend.py`) | New |
|---|---|
| `GET /telemetry` | `GET /api/monitoring/telemetry?session_id=` (and embedded in every `/frame` response) |
| `GET /video_feed` | **Removed.** Replaced by browser camera + `POST /api/monitoring/frame` + canvas overlay. |
| `POST /analyze_image` | `POST /api/monitoring/analyze-image` |
| `GET /` | `GET /api/health` |

## 10. Frame / overlay coordinate convention (binding)

Legacy code does `cv2.flip(frame, 1)` **before** landmark detection in the live path, and the gaze/pose formulas are computed on that mirrored image. To preserve identical behaviour:
- The **client sends the un-mirrored** JPEG.
- The **server mirrors** it (`cv2.flip(frame, 1)`) before detection in `/frame`.
- Overlay coordinates are therefore in mirrored space; the client must display its `<video>` mirrored (`transform: scaleX(-1)`) so overlay and preview align.
- `/analyze-image` does **not** mirror (legacy behaviour).
