# ML_INTEGRATION.md

**Owner:** Account 1. **Implemented by:** Account 3.
Everything here was derived from `backend.py`, `train_multi_subject.py`, the two `.joblib` files and `mock_eeg_stream.csv`. Where the files cannot establish a fact it is marked **❓ requires verification**. Measurements marked "(measured)" were run by Account 1 on the supplied files.

## 1. Artifacts

| File | Facts (✅ measured) |
|---|---|
| `vision_model.joblib` | `RandomForestClassifier`, 100 trees, `max_depth=12`, `min_samples_leaf=10`, classes `[0,1]`, pickled with scikit-learn 1.9.1 |
| `eeg_model.joblib` | `RandomForestClassifier`, 100 trees, `max_depth=12`, `min_samples_leaf=5`, classes `[0,1]`, scikit-learn 1.9.1 |
| `face_landmarker.task` | MediaPipe FaceLandmarker bundle (3.7 MB). Used with `num_faces=1`, detection/presence/tracking confidence 0.5, IMAGE running mode (`detect()`), blendshapes not requested. |
| `mock_eeg_stream.csv` | 1000 rows; columns `onset, theta_power, alpha_power, beta_power, alpha_theta_ratio, alpha_beta_ratio, target_state`. `target_state`: 635×0, 365×1. `onset` resets twice → 3 concatenated subject blocks of 374 / 508 / 118 rows. Row spacing 0.5 s; produced by `master_eeg_df.head(1000)`. |

**Requirement:** pin `scikit-learn==1.9.1` (the pickles' version). Loading under another version may warn or break.

## 2. Vision model

### 2.1 Input (exact, ordered — use `vision_model.feature_names_in_`)
`gaze_angle_x, gaze_angle_y, pose_Rx, pose_Ry, pose_Rz, AU45_r, AU45_c, gaze_stability, head_stability, rolling_blinks`
Build a one-row `pd.DataFrame` and index with `feature_names_in_` (as legacy does) so order can never drift.

### 2.2 How training data was built (✅ from `train_multi_subject.py`)
- Source: up to 80 subjects' `*_task-fer_run-0_recording-videostream_physio.tsv*` files with column names from the matching JSON; OpenFace-style columns (`gaze_angle_x/y`, `pose_Rx/Ry/Rz`, `AU45_r`, `AU45_c`, `success`). Only `success == 1` rows kept.
- Derived features: `gaze_stability` = rolling-40-sample std of `gaze_angle_x` + of `gaze_angle_y`; `head_stability` = same for `pose_Rx` + `pose_Ry`; `rolling_blinks` = rolling-120-sample sum of `AU45_c`.
- Label `target_state`: 1 if the sample's `onset` falls inside an event whose `flag ∈ {first_fix, second_fix, video, last_frame_video, scenario}`, else 0; **then forced to 0** where the subject's `gaze_stability` or `head_stability` exceeds that subject's own 75th percentile.
- Split 80/20 stratified (`random_state=42`); accuracy was only printed, **not stored** → test accuracy is ❓ unknown without the dataset (not supplied).

### 2.3 Live feature extraction (✅ from `backend.py::extract_vision_features`)
- From FaceLandmarker landmarks (mirrored frame): EAR from indices `[33,160,158,133,153,144]` and `[362,385,387,263,373,380]` (mean of both eyes).
- `raw_gx/raw_gy` = left-iris (landmark 468) offset from the eye centre (landmarks 133/33) divided by eye width, **× 0.35**.
- `raw_rx/ry/rz` = nose (1) vs forehead (10)/chin (152)/cheeks (234, 454) ratios **× 0.4**; `rz` = `atan2` of cheek line × 0.4.
- EMA smoothing (α = 0.25) on EAR, gaze x/y, pose Rx/Ry/Rz.
- Blink: `is_closed = raw_ear < 0.22`; `blink_event` on closed-transition; `AU45_c = 1.0 if closed else 0`; `AU45_r = clip((0.28 − raw_ear) × 18, 0, 5)`.
- Rolling buffers (deques): gaze x/y and pose Rx/Ry `maxlen=30`, blink `maxlen=90`. `gaze_stability = std(gx)+std(gy)` (needs > 4 samples), `head_stability` likewise, `rolling_blinks = sum(blink_buf)`.

### 2.4 Live scoring (✅)
```
rf_vis_prob        = vision_model.predict_proba(X)[0][1]
kinematic_stillness = exp(-35 * (gaze_stability + head_stability))
vision_score        = clip(0.45*rf_vis_prob + 0.55*kinematic_stillness, 0.02, 0.99)
```
**The displayed "vision confidence" is a blend, 55 % of which is a hand-written formula — not a model probability.** Return both parts in `components` (done in the API).

### 2.5 Static-image scoring (✅ `/analyze_image`)
Single frame, not mirrored. `is_closed = raw_ear < 0.21` (note: 0.21, not 0.22). `gaze_stability`/`head_stability` are replaced by deviation heuristics (`(|gx|+|gy|)*0.25`, `(|rx|+|ry|+0.5|rz|)*0.25`), `rolling_blinks = AU45_c`. Score: `clip(0.45*rf + 0.55*exp(-12*(gaze_dev+head_dev)) [×0.35 if closed], 0.02, 0.99)`. These inputs do **not** match what the model was trained on (rolling-window statistics) → label results as a "single-frame heuristic estimate" (`method_note` in the API).

### 2.6 Feature importances (✅ measured)
`pose_Rx 0.253, pose_Ry 0.173, gaze_stability 0.119, head_stability 0.127, pose_Rz 0.111, gaze_angle_y 0.073, gaze_angle_x 0.069, rolling_blinks 0.064, AU45_r 0.010, AU45_c 0.001`.

## 3. EEG model

### 3.1 Input (exact, ordered)
`theta_power, alpha_power, beta_power, alpha_theta_ratio, alpha_beta_ratio` (`eeg_model.feature_names_in_`).

### 3.2 Training data (✅)
- Source: `*_task-fer_run-0_eeg.edf`; first `min(10, n_channels)` channels; 1-second windows, 0.5-second step; Welch PSD (`nperseg = window`).
- Bands (PSD **mean over the 10 channels and over frequency bins**): theta 4–8 Hz (both inclusive), alpha (8, 12], beta (12, 30]. Ratios: `alpha/(theta+1e-12)`, `alpha/(beta+1e-12)`.
- Units are those returned by MNE `get_data` (volts) → powers ≈ 1e-12 (V²/Hz). Features are **unnormalised absolute powers**, so they are subject/hardware dependent.
- Label: same event flags as vision; forced to 0 where `beta_power` > the subject's 75th percentile.
- Test accuracy printed only; ❓ unknown.
- Importances (✅ measured): `alpha_beta_ratio 0.550, alpha_theta_ratio 0.388, theta_power 0.062, alpha_power ≈0, beta_power ≈0`.

### 3.3 Simulated EEG stream (✅ `backend.py`)
Per second of wall time one CSV row (index `i % len(df)`) is passed to the model → `raw_eeg_prob`. Each row spans a 0.5 s step, so playback runs at half real time. The `% len` wrap jumps between the three subject blocks and back (discontinuities). `alpha_theta_ratio` and `beta_power` of the current row are shown in telemetry.

### 3.4 Calibration (✅ `backend.py`) — **important finding**
```
calibrated = clip(raw*0.7 + (0.35 if alpha_theta_ratio > 0.20 else 0.05), 0.05, 0.98)
current    = round(0.6*current + 0.4*calibrated, 3)      # EMA, start 0.72
```
Measured on the supplied CSV:
- raw RF probability range **0.242 – 0.482; it is never ≥ 0.5** (0 of 1000 rows). AUC vs the CSV's own `target_state` = 0.733 (the CSV is part of the training distribution, so this is optimistic).
- `calibrated ≥ 0.5` is **identical to `alpha_theta_ratio > 0.20` on 100 % of the 1000 rows**; its correlation with `target_state` is ≈ 0.006.

Consequence: the EEG "focused / not focused" side of the fusion is effectively a **threshold rule on alpha/theta ratio**, not the Random Forest's decision, and the displayed "EEG confidence" is not a calibrated probability. **Preserve legacy behaviour** (the owner's design) **but expose `eeg_rf_prob_raw` and `eeg_calibrated_prob`** and make the UI copy honest. Whether to keep, replace, or re-train this is an owner decision (❓ Q3).

## 4. Fusion (✅ `evaluate_late_fusion`)
Threshold 0.50 on each score.

| vision ≥ .5 | eeg ≥ .5 | `fused_code` | legacy `fused_state` | alert |
|---|---|---|---|---|
| ✔ | ✔ | `both_high` | True Meditative Stillness | no |
| ✘ | ✘ | `both_low` | Attentional Drift (Restless) | no |
| ✔ | ✘ | `vision_high_eeg_low` | Unverified / Mismatch: Cognitive Wandering (Eyes Still, Mind Active) | **yes** |
| ✘ | ✔ | `vision_low_eeg_high` | Unverified / Mismatch: Physical Fidgeting (Body Moving, Mind Calm) | **yes** |

Keep the four legacy strings byte-for-byte. Semantic caveat: the label names (“meditative”, “cognitive wandering”) describe *interpretations* the model was never validated for; training labels are "within a stimulus phase" proxies. UI copy must say "estimated"/"model classification".

## 5. Critical limitations (must be reflected in the UI and README)

1. **Simulated EEG ≠ the user's brain.** The stream is replayed recordings of *other* people. A "mismatch" between the user's face and this stream is an artefact of simulation, not a finding about the user. Label `eeg_source: "simulated_csv"` everywhere; never call it "real-time EEG".
2. **Domain mismatch (vision).** The model was trained on OpenFace outputs (radian gaze/pose, AU45 intensity); live inputs are MediaPipe-derived approximations scaled by hand-picked constants (0.35, 0.4, 18…). No evidence in the files that these match the training distribution. ❓ Q4.
3. **Window/frame-rate mismatch.** Training windows: 40 / 120 *samples* (source sampling rate ❓ not stated in the files); live windows: 30 / 90 *frames* (the existing UI labels the 90-frame blink window "/ 3 s", i.e. assumes ~30 fps). A browser stream at ≤10 fps makes the same frame counts span ~3× more time. ❓ Q5.
4. **Label circularity.** Stability features are used both as inputs and (via the 75th-percentile rule) to create labels for the vision model; `beta_power` does likewise for EEG.
5. **Unknown generalisation.** Accuracy was never stored; evaluation data (AFFEC-style BIDS dataset; the name appears only in UI text, ❓ not verifiable) was not supplied.
6. No claim of clinical validity; scores are experimental.

## 6. Integration requirements for Account 3

1. **Load once** at startup (FastAPI lifespan): both RF models, the CSV (as a read-only DataFrame/array), the FaceLandmarker. Fail with `503 models_unavailable` if any is missing. **No random/fallback predictions.**
2. Paths relative to the module (`Path(__file__)`), not CWD. Never download models at runtime.
3. Refactor module globals into **per-session objects** held in `session_registry`:
   - `VisionFeatureExtractor` (EMA state, deques, `was_eye_closed`) — port `compute_raw_geometry`, `extract_vision_features`, `calculate_ear` verbatim;
   - `EEGSimulator` (cursor, `current_eeg_prob` starting at 0.72 as legacy — this is an EMA seed, but the *reported* `eeg_score` must stay `null` until the first calibrated update, see 4);
   - latest `Telemetry`, running aggregates (counts, sums, min/max, `fused_code` counters), `last_heartbeat_at`.
4. **No placeholder scores.** `vision_score`/`eeg_score` are `null` until computed. (Legacy `0.85`/`0.75` init values must not be emitted.)
5. EEG advances by **wall-clock seconds of *active* (non-paused) time**, once per second per session, as legacy.
6. Run MediaPipe/RF inference in a threadpool (`run_in_threadpool`/`asyncio.to_thread`); guard the shared `FaceLandmarker` with a lock until its thread safety is verified (❓).
7. Mirror frames in `/frame` (`cv2.flip(frame, 1)`) before detection; **do not** mirror in `/analyze-image`.
8. Overlay: return normalized coordinates for `FACE_OVAL_CONTOUR`, `LEFT_/RIGHT_EYE_CONTOUR`, iris rings (when ≥ 478 landmarks) and nose line (168→1), from the same index lists as legacy `draw_mesh_annotations`. `/analyze-image` keeps returning the server-annotated JPEG (legacy drawing code).
9. Window sizes are named constants (`GAZE_WINDOW_FRAMES=30`, `BLINK_WINDOW_FRAMES=90`) so Q5 can be resolved without refactoring.
10. `blinks_per_minute_mean` (session aggregate) = blinks counted over the session's active time ÷ active minutes, computed from blink *events*, not from `rolling_blinks` window sums.
11. **Golden equivalence tests:** with the same landmark sequence/feature dicts and the same CSV rows, the new `vision_score`, calibrated EEG values, `fused_state` strings must equal the legacy functions' outputs (import `legacy/backend.py` functions or reimplement their math in the test with the legacy file as the oracle). Tests must not need a webcam.
12. Pin: `scikit-learn==1.9.1`; use `opencv-python-headless`; choose a Python version for which `mediapipe` wheels exist (❓ confirm; recommend 3.12 and set `PYTHON_VERSION` on Render).
13. Do not log images, tokens, or secrets.

## 7. Missing components

- No `requirements.txt`, no tests, no model card/metrics file, no dataset, no stored evaluation results.
- No time-based (fps-independent) windowing.
- No per-user calibration/baseline.
- No real EEG ingestion path (simulation only).
- Re-training is not reproducible from this repo (dataset absent); `train_multi_subject.py` is retained for reference only.
