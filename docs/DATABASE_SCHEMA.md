# DATABASE_SCHEMA.md

**Owner:** Account 1. **Implemented by:** Account 3.
Database: MongoDB Atlas. Driver: PyMongo Async (`AsyncMongoClient`). Database name from `MONGODB_DB_NAME` (default `focus_monitor`).
Field naming: `snake_case` (decision D3). Dates: BSON `Date` (UTC). References: `ObjectId`. API exposes `_id` as string `id`.

Pydantic models are the primary validation layer. Optional: also apply Mongo `$jsonSchema` validators (`validationLevel: moderate`) at index-creation time.

## 1. `users`

| Field | Type | Req | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✔ | |
| `name` | string | ✔ | 1–80 chars, trimmed |
| `email` | string | ✔ | lower-cased, unique |
| `password_hash` | string | ✔ | Argon2id encoded hash. Never returned by any API, never logged. |
| `preferences` | object | ✔ | `{ "store_frames": bool }`, default `{ "store_frames": false }` |
| `created_at` | Date | ✔ | |
| `updated_at` | Date | ✔ | set on every update |

Indexes:
- `{ email: 1 }` **unique** (name `uniq_email`).

## 2. `monitoring_sessions`

| Field | Type | Req | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✔ | |
| `user_id` | ObjectId → `users._id` | ✔ | ownership key |
| `status` | string | ✔ | `active` \| `paused` \| `completed` \| `abandoned` |
| `is_live` | bool | ✔ | `true` iff status ∈ {active, paused}; used by partial unique index |
| `source` | string | ✔ | `browser_camera` |
| `eeg_source` | string | ✔ | `simulated_csv` |
| `started_at` | Date | ✔ | |
| `ended_at` | Date \| null | | null while live |
| `paused_total_seconds` | double | ✔ | default 0 |
| `paused_at` | Date \| null | | set while paused |
| `duration_seconds` | int \| null | | wall-clock `ended_at − started_at` |
| `active_duration_seconds` | int \| null | | duration minus paused time |
| `moments_count` | int | ✔ | denormalized counter; `$inc` on moment create/delete |
| `summary` | object \| null | | `{ dominant_fused_code, dominant_fused_state, discrepancy_ratio }` |
| `aggregated_metrics` | object \| null | | exact shape of API `Session.aggregated_metrics` |
| `last_heartbeat_at` | Date | ✔ | refreshed on every accepted frame (throttle writes: persist at most every ~15 s; registry holds the exact value) |
| `created_at` | Date | ✔ | |
| `updated_at` | Date | ✔ | |

Indexes:
- `{ user_id: 1, started_at: -1 }` — history listing (name `user_started`).
- `{ user_id: 1 }` **unique, partial** `{ is_live: true }` — enforces one live session per user (name `uniq_live_session_per_user`).
- `{ user_id: 1, status: 1, started_at: -1 }` — filtered listing.

Lifecycle: `active ⇄ paused → completed`; or `active|paused → abandoned` when `last_heartbeat_at` is > 120 s old (lazy sweep on `start`, `GET /sessions`, `GET /analytics/*`; plus an optional periodic task). For `abandoned`, durations/aggregates are computed from the last known registry/persisted values; if the server restarted and aggregates were lost, `aggregated_metrics` is `null` and the analytics endpoints skip that session.
Aggregates are accumulated in memory per session and flushed to this document periodically (e.g. every 30 s) and at stop, so a restart loses at most the last interval.

## 3. `captured_moments`

| Field | Type | Req | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✔ | |
| `user_id` | ObjectId → `users._id` | ✔ | ownership key (duplicated from session on purpose: every query filters by it) |
| `session_id` | ObjectId → `monitoring_sessions._id` | ✔ | |
| `timestamp` | Date | ✔ | server capture time (authoritative) |
| `fused_state` | string | ✔ | legacy label string |
| `fused_code` | string | ✔ | `both_high` \| `both_low` \| `vision_high_eeg_low` \| `vision_low_eeg_high` |
| `vision_score` | double \| null | ✔ | 0–1 |
| `eeg_score` | double \| null | ✔ | 0–1 |
| `discrepancy_alert` | bool | ✔ | |
| `eeg_source` | string | ✔ | `simulated_csv` |
| `metrics` | object | ✔ | `{ gaze_stability, head_stability, rolling_blinks, ear, alpha_theta_ratio, beta_power }` |
| `note` | string \| null | | ≤ 280 chars |
| `image` | object \| null | | `{ content_type: "image/jpeg", size_bytes: int, data: BinData }`, ≤ 300 KB. **Excluded by projection from every list/get query**; served only by `/image`. |
| `idempotency_key` | string | ✔ | from header; ≤ 64 chars |
| `created_at` | Date | ✔ | |

Indexes:
- `{ user_id: 1, timestamp: -1 }` — My Moments listing (name `user_time`).
- `{ user_id: 1, session_id: 1, timestamp: -1 }` — moments of a session.
- `{ user_id: 1, idempotency_key: 1 }` **unique** — duplicate prevention.
- `{ session_id: 1 }` — cascade deletes.

Storage note: images stored in-document keep the project dependency-free. Atlas free tier has a small storage cap (❓ verify current limit); the 300 KB per-image cap and the opt-in `store_frames` preference bound growth. Object storage is a documented future option, `image_url` is already an API abstraction.

## 4. Relationships

```
users 1 ──< monitoring_sessions 1 ──< captured_moments
users 1 ─────────────────────────────< captured_moments   (user_id also stored directly)
```

## 5. Ownership rules (mandatory)

1. `user_id` is taken **only** from the verified JWT — never from request bodies or query strings.
2. Every read/update/delete on sessions and moments includes `user_id` in the filter (`{"_id": oid, "user_id": uid}`).
3. A miss returns `404 not_found` regardless of whether the id exists for another user.
4. When creating a moment, the referenced session must satisfy `{_id: session_id, user_id: uid}`.
5. Aggregation pipelines (analytics) start with `$match: { user_id: uid }`.
6. No endpoint returns `password_hash`.

## 6. Deletion behaviour

| Action | Effect |
|---|---|
| Delete moment | Delete document; `$inc` parent session `moments_count: -1` (floor 0). |
| Delete session | Reject with `409 session_live` if live. Otherwise delete all moments with `{session_id, user_id}`, then the session. |
| Delete account | Delete all moments for `user_id`, all sessions for `user_id`, then the user; drop in-memory registry entries for the user. |
Use a multi-document transaction where available (Atlas replica sets support it); otherwise order the operations as above so a partial failure never leaves moments pointing at a deleted *user*.

## 7. Index creation

Account 3 creates all indexes idempotently at application startup (`create_index` is idempotent), inside the FastAPI lifespan, after connecting. Startup must fail loudly if the DB is unreachable in production, but `/api/health` must still respond (`db: "error"`).

## 8. Data validation summary

| Rule | Where |
|---|---|
| Email format/uniqueness | Pydantic + unique index |
| Password strength | Pydantic (10–128, ≥1 letter, ≥1 digit) |
| Score range 0–1 | Pydantic on moment creation (server-generated) |
| Enumerations (`status`, `fused_code`, sources) | Pydantic `Literal`/enum |
| Image type/size | Route validation (JPEG magic bytes `FF D8 FF`, ≤ 300 KB) |

## 9. Data privacy

- Collect only what is listed above. No raw video, no per-frame telemetry stored.
- Camera frames are processed in memory and discarded; only an explicitly opted-in Capture Moment image is persisted.
- Do not log request bodies, passwords, tokens, images, or the Mongo URI.
