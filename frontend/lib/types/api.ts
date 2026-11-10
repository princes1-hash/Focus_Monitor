// Exact TypeScript types mirroring API_DOCUMENTATION.md

export interface UserPreferences {
  store_frames: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface TelemetryMetrics {
  gaze_stability: number | null;
  head_stability: number | null;
  rolling_blinks: number | null;
  ear: number | null;
  alpha_theta_ratio: number | null;
  beta_power: number | null;
}

export interface TelemetryComponents {
  vision_rf_prob?: number | null;
  vision_kinematic_stillness?: number | null;
  eeg_rf_prob_raw?: number | null;
  eeg_calibrated_prob?: number | null;
}

export interface Telemetry {
  timestamp: string;
  vision_score: number | null;
  eeg_score: number | null;
  fused_state: string | null;
  fused_code: "both_high" | "both_low" | "vision_high_eeg_low" | "vision_low_eeg_high" | null;
  discrepancy_alert: boolean;
  eeg_source: string;
  metrics: TelemetryMetrics;
  components?: TelemetryComponents;
}

export interface Overlay {
  face_oval: [number, number][];
  left_eye: [number, number][];
  right_eye: [number, number][];
  left_iris: [number, number][];
  right_iris: [number, number][];
  nose: [number, number][];
  left_eyebrow?: [number, number][];
  right_eyebrow?: [number, number][];
  lips?: [number, number][];
  iris_centers?: [number, number][];
  mesh_points?: [number, number][];
}

export interface FrameResponse {
  session_id: string;
  face_detected: boolean;
  telemetry: Telemetry | null;
  overlay: Overlay | null;
}

export interface AnalyzeImageMetrics {
  ear: number;
  gaze_angle_x: number;
  gaze_angle_y: number;
  pose_Rx: number;
  pose_Ry: number;
  pose_Rz: number;
  gaze_deviation: number;
  head_deviation: number;
  eye_status: string;
}

export interface AnalyzeImageResponse {
  annotated_image: string;
  vision_score: number;
  eeg_score: number | null;
  eeg_source?: string | null;
  fused_state: string | null;
  fused_code: string | null;
  discrepancy_alert: boolean;
  metrics: AnalyzeImageMetrics;
  method_note: string;
}

export interface ScoreDistribution {
  mean: number;
  min: number;
  max: number;
}

export interface FusedCodeDistribution {
  both_high: number;
  both_low: number;
  vision_high_eeg_low: number;
  vision_low_eeg_high: number;
}

export interface AggregatedMetrics {
  frames_analyzed: number;
  frames_without_face: number;
  vision_score: ScoreDistribution | null;
  eeg_score: ScoreDistribution | null;
  gaze_stability_mean: number | null;
  head_stability_mean: number | null;
  blinks_per_minute_mean: number | null;
  alpha_theta_ratio_mean: number | null;
  beta_power_mean: number | null;
  fused_code_distribution: FusedCodeDistribution | null;
}

export interface SessionSummary {
  dominant_fused_code: string | null;
  dominant_fused_state: string | null;
  discrepancy_ratio: number | null;
}

export interface Session {
  id: string;
  status: "active" | "paused" | "completed" | "abandoned";
  source: string;
  eeg_source: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  active_duration_seconds: number | null;
  moments_count: number;
  summary: SessionSummary | null;
  aggregated_metrics: AggregatedMetrics | null;
  created_at: string;
}

export interface StartMonitoringLimits {
  max_fps: number;
  max_frame_bytes: number;
  recommended_frame_width: number;
}

export interface StartMonitoringResponse {
  session: Session;
  limits: StartMonitoringLimits;
}

export interface SessionResponse {
  session: Session;
}

export interface Moment {
  id: string;
  session_id: string;
  timestamp: string;
  fused_state: string;
  fused_code: string;
  vision_score: number | null;
  eeg_score: number | null;
  discrepancy_alert: boolean;
  eeg_source: string;
  metrics: Record<string, any>;
  note: string | null;
  has_image: boolean;
  image_url: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AnalyticsOverview {
  total_sessions: number;
  total_moments: number;
  total_active_duration_seconds: number;
  avg_vision_score: number | null;
  avg_eeg_score: number | null;
  discrepancy_ratio: number | null;
  latest_session: Session | null;
}

export interface AnalyticsSessionTrend {
  session_id: string;
  started_at: string;
  active_duration_seconds: number;
  avg_vision_score: number | null;
  avg_eeg_score: number | null;
  avg_gaze_stability: number | null;
  avg_head_stability: number | null;
  avg_alpha_theta_ratio: number | null;
  avg_beta_power: number | null;
  discrepancy_ratio: number | null;
  moments_count: number;
}

export interface MomentsPerDay {
  date: string;
  count: number;
}

export interface AnalyticsTrends {
  sessions: AnalyticsSessionTrend[];
  moments_per_day: MomentsPerDay[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
