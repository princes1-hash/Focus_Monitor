# Focus Monitor // AI-Driven Ocular & Cognitive Focus Monitoring Platform

A production-ready full-stack web application for multimodal attentional telemetry. The platform estimates focus-related states from real-time ocular micro-fixation geometry (webcam) and spectral band-power synchrony (simulated EEG), performing late fusion classification backed by MongoDB Atlas persistence.

---

## 1. System Architecture

```
User's Browser (Next.js 16 / React 19)
  ├── Webcam Video (navigator.mediaDevices.getUserMedia)
  ├── Client-Side Downscaling (Canvas → JPEG ≤500 KB, ≤10 fps)
  ├── Landmark Contour Canvas (Mirrored overlay coordinates)
  └── Same-origin /api/* requests (Next.js rewrites → FastAPI backend)
           │
           ▼
FastAPI Backend (Python 3.11 / 3.13)
  ├── Auth & Security (Argon2id hashing, HttpOnly JWT access_token)
  ├── In-Memory Live Session Registry (buffers, EMA smoothing, EEG cursor)
  ├── ML Inference Engine:
  │     ├── Vision: MediaPipe FaceLandmarker (478 pts) → Random Forest (10 features)
  │     ├── EEG: Benchmark CSV replay → Welch PSD band power → Random Forest (5 features)
  │     └── Late Fusion: Dual 0.50 thresholding → 4-quadrant state & mismatch alert
  └── MongoDB Atlas Persistence:
        ├── users (Argon2id credentials, privacy preferences)
        ├── monitoring_sessions (durations, summaries, aggregated sensor metrics)
        └── captured_moments (server-authoritative telemetry snapshots, optional frame)
```

---

## 2. Machine Learning & Telemetry Pipeline

### Vision Modality
- **Feature Extraction:** 478 face landmarks from client video frame (mirrored on server).
  - Eye Aspect Ratio (EAR) across 6-point eye contours.
  - Gaze angles ($g_x, g_y$) computed from iris center (landmark 468) relative to eye bounds.
  - 3D Head Pose ($R_x, R_y, R_z$) derived from nose, forehead, chin, and cheek geometry.
  - Exponential Moving Average (EMA, $\alpha = 0.25$) smoothing.
  - Rolling stability buffers (30 frames) for gaze and head deviation.
  - AU45 blink detection buffer (90 frames).
- **Vision Confidence Score:** Blend of Random Forest probability and kinematic stillness:
  $$\text{Vision Score} = \text{clip}(0.45 \cdot P_{\text{RF}} + 0.55 \cdot e^{-35(\text{gaze\_stability} + \text{head\_stability})}, 0.02, 0.99)$$

### EEG Modality (Simulated)
- **Signal Source:** Synchronized benchmark stream (`mock_eeg_stream.csv`, 1,000 rows, 3 participant blocks).
- **Spectral Bands:** Theta (4–8 Hz), Alpha (8–12 Hz), Beta (12–30 Hz). Ratios: $\alpha/\theta$ and $\alpha/\beta$.
- **Heuristic Calibration & EMA:**
  $$\text{Calibrated} = \text{clip}(P_{\text{RF}} \cdot 0.7 + (0.35 \text{ if } \alpha/\theta > 0.20 \text{ else } 0.05), 0.05, 0.98)$$
  $$\text{Current EEG Score} = 0.6 \cdot \text{Score}_{t-1} + 0.4 \cdot \text{Calibrated}$$
- **Transparency Notice:** Marked with persistent `Simulated EEG` badge across all screens.

### Late Fusion Matrix (0.50 Thresholds)

| Vision $\ge 0.50$ | EEG $\ge 0.50$ | `fused_code` | Model Classification State | Mismatch Alert |
| :---: | :---: | :---: | :--- | :---: |
| **Yes** | **Yes** | `both_high` | **True Meditative Stillness** | No |
| **No** | **No** | `both_low` | **Attentional Drift (Restless)** | No |
| **Yes** | **No** | `vision_high_eeg_low` | **Mismatch: Cognitive Wandering** *(Eyes Still, Mind Active)* | **Yes** |
| **No** | **Yes** | `vision_low_eeg_high` | **Mismatch: Physical Fidgeting** *(Body Moving, Mind Calm)* | **Yes** |

---

## 3. Technology Stack

- **Frontend:** Next.js 16.4.3 (Turbopack, Next 16 `proxy.ts` guard), React 19.3.0, TypeScript 5, Tailwind CSS 4, Recharts, Lucide React.
- **Backend:** FastAPI 0.162.0, Uvicorn, Python 3.11 / 3.13, PyMongo Async (`AsyncMongoClient`), Pydantic Settings, Argon2id (`argon2-cffi`), PyJWT.
- **Machine Learning:** scikit-learn 1.9.1, MediaPipe 1.2.0, OpenCV Headless, NumPy, Pandas, Joblib.
- **Database:** MongoDB Atlas (or local MongoDB 7/8).

---

## 4. Local Development Setup

### Prerequisites
- Node.js 20+ and npm
- Python 3.11 or 3.13
- MongoDB running locally or a MongoDB Atlas cluster URI

### 1. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env to set MONGODB_URI and JWT_SECRET

# Run test suite
pytest tests/

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Health check endpoint: `http://127.0.0.1:8000/api/health`

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Configure environment
cp .env.example .env.local
# Set BACKEND_URL=http://127.0.0.1:8000

# Start development server
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 5. Deployment Guide

### Backend on Render
1. Create a **Web Service** connected to your repository.
2. Root directory: `backend`
3. Runtime: **Python 3**
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
6. Health Check Path: `/api/health`
7. Set Environment Variables:
   - `ENVIRONMENT=production`
   - `MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`
   - `MONGODB_DB_NAME=focus_monitor`
   - `JWT_SECRET=<random-32-byte-hex>`
   - `COOKIE_SECURE=true`
   - `COOKIE_SAMESITE=lax`
   - `CORS_ORIGINS=https://<your-vercel-domain>.vercel.app`

*(Note: Render blueprint `render.yaml` is provided in the repository root).*

### Frontend on Vercel
1. Import repository on Vercel.
2. Set Root Directory to `frontend`.
3. Set Environment Variable:
   - `BACKEND_URL=https://<your-render-service>.onrender.com`
4. Deploy! Next.js rewrites `/api/:path*` to the Render backend service, ensuring first-party HttpOnly cookies.

---

## 6. Privacy & Scientific Integrity

1. **Experimental Focus Estimates Only:** Outputs represent mathematical model classifications, **never medical diagnosis** or definitive cognitive state readings.
2. **Webcam Processing Boundary:** Video frames are analyzed in memory and immediately discarded. Stored frames only occur when a user explicitly opts in via profile settings and triggers **Capture Moment**.
3. **Data Isolation:** All database collections strictly filter by the authenticated `user_id` extracted from the cryptographically verified JWT.

