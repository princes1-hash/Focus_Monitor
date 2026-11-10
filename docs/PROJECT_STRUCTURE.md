# PROJECT_STRUCTURE.md

**Owner:** Account 1. Legend: **[A1]** Account 1 · **[A2]** Account 2 (frontend) · **[A3]** Account 3 (backend + ML). One owner per file; never edit a file you don't own.

The repository is a monorepo. The uploaded ZIP is flat (`backend.py`, models, CSV at the root; `frontend/` beside them); the final layout below moves the ML assets into `backend/`.

```
focus-monitor/
├── README.md                          [A1]  final README + deployment guide (written at integration)
├── render.yaml                        [A1]  Render blueprint (backend service)
├── .gitignore                         [A1]
├── docs/                              [A1]  all contract documents
│   ├── PROJECT_CONTEXT.md
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── PROJECT_STRUCTURE.md
│   ├── ML_INTEGRATION.md
│   ├── UI_DESIGN_GUIDELINES.md
│   ├── PROJECT_PROGRESS.md
│   └── HANDOFF_PROMPTS.md
│
├── frontend/                          [A2]  Next.js 16 / React 19 / TS / Tailwind 4 (existing project, kept)
│   ├── package.json                         add: lucide-react, recharts, framer-motion
│   ├── next.config.ts                       KEEP existing options; ADD rewrites() → BACKEND_URL
│   ├── proxy.ts                             optimistic guard (Next 16 "proxy", formerly middleware)
│   ├── .env.example                         BACKEND_URL only
│   ├── public/images/                       self-hosted hero/background assets
│   ├── app/
│   │   ├── layout.tsx                       fonts, metadata (replace "Create Next App"), providers
│   │   ├── globals.css                      design tokens (@theme), base styles
│   │   ├── (marketing)/page.tsx             landing page "/"
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   └── (app)/                           authenticated area (shared shell: nav, auth gate)
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── monitor/page.tsx             live monitoring + Capture Moment
│   │       ├── moments/page.tsx             "MY MOMENTS"
│   │       ├── moments/[id]/page.tsx
│   │       ├── history/page.tsx
│   │       ├── history/[id]/page.tsx
│   │       ├── analytics/page.tsx
│   │       └── profile/page.tsx
│   ├── components/
│   │   ├── ui/                              Button, GlassCard, Input, Modal, Toast, Badge, Skeleton, EmptyState, Pagination…
│   │   ├── layout/                          FloatingNav, AppShell, Footer
│   │   ├── landing/                         Hero, Sections…
│   │   ├── monitor/                         CameraPreview, OverlayCanvas, ScoreCard, FusionBanner, Controls, CaptureMomentButton, SimulatedEegBadge
│   │   ├── moments/ · history/ · analytics/ · profile/
│   ├── lib/
│   │   ├── api/                             client.ts (fetch wrapper, error envelope, 401 handling) + one module per resource
│   │   ├── types/api.ts                     TypeScript types mirroring API_DOCUMENTATION.md exactly
│   │   ├── auth/AuthContext.tsx
│   │   ├── hooks/                           useMonitoringSession, useCamera, useFrameLoop…
│   │   └── format.ts · validation.ts
│   └── (existing) eslint.config.mjs, tsconfig.json, next-env.d.ts, AGENTS.md (leave untouched)
│
├── backend/                           [A3]  FastAPI service
│   ├── requirements.txt                     pins incl. scikit-learn==1.9.1
│   ├── .env.example
│   ├── pytest.ini · tests/                  [A3] unit/integration tests (incl. legacy-equivalence golden tests)
│   ├── app/
│   │   ├── main.py                          app factory, lifespan (load models once, connect DB, create indexes), CORS, routers
│   │   ├── config.py                        pydantic-settings, env vars
│   │   ├── database.py                      AsyncMongoClient, collections, index creation
│   │   ├── models/{user,session,moment}.py  DB document models
│   │   ├── schemas/{auth,telemetry,session,moment,analytics,user}.py   request/response models = API_DOCUMENTATION.md
│   │   ├── routes/{auth,users,monitoring,sessions,moments,analytics,health}.py
│   │   ├── services/
│   │   │   ├── vision_service.py            FaceLandmarker singleton, VisionFeatureExtractor (per session), RF inference, overlay
│   │   │   ├── eeg_service.py               CSV loader (once), EEGSimulator (per session), RF inference + legacy calibration
│   │   │   ├── fusion_service.py            evaluate_late_fusion (legacy strings), fused_code
│   │   │   ├── session_registry.py          in-memory per-session state + idle expiry
│   │   │   └── analytics_service.py
│   │   ├── ml/                              vision_model.joblib · eeg_model.joblib · face_landmarker.task   (copied, unmodified)
│   │   ├── data/mock_eeg_stream.csv         (copied, unmodified)
│   │   └── utils/{security,dependencies,errors,rate_limit}.py
│   ├── ml_training/train_multi_subject.py   (copied, unmodified; reference only — dataset not in repo)
│   └── legacy/backend.py                    (copied, unmodified; reference for equivalence tests; not imported by the app)
```

## Ownership of cross-cutting files

| File | Owner | Rule |
|---|---|---|
| `frontend/next.config.ts` | A2 | Must keep `cacheComponents`, `partialPrefetching`, `turbopack.rules` as-is and add only `async rewrites()`. |
| `frontend/.env.example` | A2 | Contents prescribed in this doc (§Env). |
| `backend/.env.example` | A3 | Contents prescribed in this doc (§Env). |
| `render.yaml`, root `README.md`, `docs/*` | A1 | A2/A3 may *read only*. |
| Types in `frontend/lib/types/api.ts` vs `backend/app/schemas/*` | A2 / A3 | Both must match `API_DOCUMENTATION.md`; A1 diffs them at integration. |

## Environment variables (prescribed)

**`frontend/.env.example`**
```
# Server-side only. Used by next.config.ts rewrites. No NEXT_PUBLIC_ variable for the API.
# Local development example: http://127.0.0.1:8000   Production: https://<your-service>.onrender.com
BACKEND_URL=
```

**`backend/.env.example`**
```
ENVIRONMENT=development            # development | production
MONGODB_URI=                       # mongodb+srv://... (never commit)
MONGODB_DB_NAME=focus_monitor
JWT_SECRET=                        # >= 32 random bytes
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
COOKIE_SECURE=false                # true in production
COOKIE_SAMESITE=lax
CORS_ORIGINS=http://localhost:3000 # comma separated; never "*"
MAX_FRAME_BYTES=512000
MAX_IMAGE_BYTES=4194304
MAX_MOMENT_IMAGE_BYTES=307200
SESSION_IDLE_SECONDS=120
LOG_LEVEL=INFO
```
(Model/CSV paths are resolved relative to the module, not via env.)

## Authenticated route inventory (frontend)

| Route | Purpose | Main APIs |
|---|---|---|
| `/` | Landing | – |
| `/login`, `/register` | Auth | `/api/auth/*` |
| `/dashboard` | Welcome, stats, quick actions | `/api/analytics/overview`, `/api/sessions` |
| `/monitor` | Live monitoring + Capture Moment | `/api/monitoring/*`, `/api/moments` |
| `/moments`, `/moments/[id]` | MY MOMENTS | `/api/moments*` |
| `/history`, `/history/[id]` | Session history | `/api/sessions*`, `/api/moments?session_id=` |
| `/analytics` | Charts | `/api/analytics/*` |
| `/profile` | Settings, privacy, delete account | `/api/users/*` |
