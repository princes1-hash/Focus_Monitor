import time
import datetime
from typing import Dict, Optional, List, Any, Tuple
from app.services.vision_service import VisionFeatureExtractor
from app.services.eeg_service import EEGSimulator

class LiveSessionState:
    def __init__(self, session_id: str, user_id: str):
        self.session_id = session_id
        self.user_id = user_id
        self.status = "active"
        self.started_at = datetime.datetime.now(datetime.timezone.utc)
        self.last_heartbeat_at = self.started_at
        self.paused_at: Optional[datetime.datetime] = None
        self.paused_total_seconds: float = 0.0

        self.vision_extractor = VisionFeatureExtractor()
        self.eeg_simulator = EEGSimulator()

        self.latest_telemetry: Optional[Dict[str, Any]] = None
        self.frames_analyzed: int = 0
        self.frames_without_face: int = 0

        self.vision_scores: List[float] = []
        self.eeg_scores: List[float] = []
        self.gaze_stabilities: List[float] = []
        self.head_stabilities: List[float] = []
        self.alpha_theta_ratios: List[float] = []
        self.beta_powers: List[float] = []

        self.fused_counts: Dict[str, int] = {
            "both_high": 0,
            "both_low": 0,
            "vision_high_eeg_low": 0,
            "vision_low_eeg_high": 0
        }
        self.discrepancy_count: int = 0

    def pause(self):
        if self.status == "active":
            self.status = "paused"
            self.paused_at = datetime.datetime.now(datetime.timezone.utc)

    def resume(self):
        if self.status == "paused":
            self.status = "active"
            if self.paused_at:
                now = datetime.datetime.now(datetime.timezone.utc)
                delta = (now - self.paused_at).total_seconds()
                self.paused_total_seconds += delta
                self.paused_at = None

    def record_frame(self, has_face: bool, telemetry: Optional[Dict[str, Any]] = None):
        self.last_heartbeat_at = datetime.datetime.now(datetime.timezone.utc)
        self.frames_analyzed += 1
        if not has_face:
            self.frames_without_face += 1
            return

        if telemetry:
            self.latest_telemetry = telemetry
            vis_score = telemetry.get("vision_score")
            eeg_score = telemetry.get("eeg_score")
            fused_code = telemetry.get("fused_code")
            discrepancy = telemetry.get("discrepancy_alert", False)
            metrics = telemetry.get("metrics", {})

            if vis_score is not None:
                self.vision_scores.append(vis_score)
            if eeg_score is not None:
                self.eeg_scores.append(eeg_score)
            if fused_code in self.fused_counts:
                self.fused_counts[fused_code] += 1
            if discrepancy:
                self.discrepancy_count += 1

            if "gaze_stability" in metrics and metrics["gaze_stability"] is not None:
                self.gaze_stabilities.append(metrics["gaze_stability"])
            if "head_stability" in metrics and metrics["head_stability"] is not None:
                self.head_stabilities.append(metrics["head_stability"])
            if "alpha_theta_ratio" in metrics and metrics["alpha_theta_ratio"] is not None:
                self.alpha_theta_ratios.append(metrics["alpha_theta_ratio"])
            if "beta_power" in metrics and metrics["beta_power"] is not None:
                self.beta_powers.append(metrics["beta_power"])

    def get_durations(self, end_time: Optional[datetime.datetime] = None) -> Tuple[int, int]:
        now = end_time or datetime.datetime.now(datetime.timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=datetime.timezone.utc)

        started = self.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=datetime.timezone.utc)

        total_seconds = int((now - started).total_seconds())

        current_paused = self.paused_total_seconds
        if self.status == "paused" and self.paused_at:
            p_at = self.paused_at
            if p_at.tzinfo is None:
                p_at = p_at.replace(tzinfo=datetime.timezone.utc)
            current_paused += (now - p_at).total_seconds()

        active_seconds = max(0, int(total_seconds - current_paused))
        return total_seconds, active_seconds

    def compute_summary_and_aggregates(self, end_time: Optional[datetime.datetime] = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        total_sec, active_sec = self.get_durations(end_time)

        # Dominant fused code
        dominant_code = None
        dominant_state = None
        max_fused = -1
        fused_labels = {
            "both_high": "True Meditative Stillness",
            "both_low": "Attentional Drift (Restless)",
            "vision_high_eeg_low": "Unverified / Mismatch: Cognitive Wandering (Eyes Still, Mind Active)",
            "vision_low_eeg_high": "Unverified / Mismatch: Physical Fidgeting (Body Moving, Mind Calm)"
        }
        for code, count in self.fused_counts.items():
            if count > max_fused and count > 0:
                max_fused = count
                dominant_code = code
                dominant_state = fused_labels.get(code)

        total_classified = sum(self.fused_counts.values())
        discrepancy_ratio = round(self.discrepancy_count / total_classified, 3) if total_classified > 0 else 0.0

        summary = {
            "dominant_fused_code": dominant_code,
            "dominant_fused_state": dominant_state,
            "discrepancy_ratio": discrepancy_ratio
        }

        # Aggregated metrics
        def dist(arr):
            if not arr:
                return None
            return {
                "mean": round(float(sum(arr) / len(arr)), 3),
                "min": round(float(min(arr)), 3),
                "max": round(float(max(arr)), 3)
            }

        def mean_val(arr, decimals=3):
            if not arr:
                return None
            return round(float(sum(arr) / len(arr)), decimals)

        fused_dist = {}
        for code, cnt in self.fused_counts.items():
            fused_dist[code] = round(cnt / total_classified, 3) if total_classified > 0 else 0.0

        # Blinks per minute mean: total counted blinks / (active_sec / 60)
        active_mins = active_sec / 60.0
        bpm_mean = round(self.vision_extractor.total_blink_events / active_mins, 1) if active_mins > 0 else None

        aggregated_metrics = {
            "frames_analyzed": self.frames_analyzed,
            "frames_without_face": self.frames_without_face,
            "vision_score": dist(self.vision_scores),
            "eeg_score": dist(self.eeg_scores),
            "gaze_stability_mean": mean_val(self.gaze_stabilities, 4),
            "head_stability_mean": mean_val(self.head_stabilities, 4),
            "blinks_per_minute_mean": bpm_mean,
            "alpha_theta_ratio_mean": mean_val(self.alpha_theta_ratios, 3),
            "beta_power_mean": mean_val(self.beta_powers, 14),
            "fused_code_distribution": fused_dist
        }

        return summary, aggregated_metrics

class SessionRegistry:
    def __init__(self):
        self._sessions: Dict[str, LiveSessionState] = {}

    def get(self, session_id: str) -> Optional[LiveSessionState]:
        return self._sessions.get(session_id)

    def create(self, session_id: str, user_id: str) -> LiveSessionState:
        state = LiveSessionState(session_id, user_id)
        self._sessions[session_id] = state
        return state

    def remove(self, session_id: str):
        if session_id in self._sessions:
            del self._sessions[session_id]

    def remove_for_user(self, user_id: str):
        to_del = [sid for sid, s in self._sessions.items() if s.user_id == user_id]
        for sid in to_del:
            del self._sessions[sid]

session_registry = SessionRegistry()
