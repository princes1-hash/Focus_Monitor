"use client";

export const dynamic = "force-dynamic";

import React, { useState, useRef, useCallback } from "react";
import {
  CameraPreview,
  CameraPreviewHandle,
} from "@/components/monitor/CameraPreview";
import { ScoreCard } from "@/components/monitor/ScoreCard";
import { FusionBanner } from "@/components/monitor/FusionBanner";
import { Controls } from "@/components/monitor/Controls";
import { CaptureMomentButton } from "@/components/monitor/CaptureMomentButton";
import { SimulatedEegBadge } from "@/components/monitor/SimulatedEegBadge";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { apiClient } from "@/lib/api/client";
import {
  Telemetry,
  Overlay,
  StartMonitoringResponse,
  SessionResponse,
  AnalyzeImageResponse,
} from "@/lib/types/api";
import { Upload, Eye, Image as ImageIcon, CheckCircle2 } from "lucide-react";

export default function MonitorPage() {
  const { success, error } = useToast();
  const cameraRef = useRef<CameraPreviewHandle>(null);

  const [activeTab, setActiveTab] = useState<"live" | "static">("live");

  // Live session state
  const [sessionStatus, setSessionStatus] = useState<"idle" | "active" | "paused" | "completed">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Static image analysis state (preserving original upload feature)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageResult, setImageResult] = useState<AnalyzeImageResponse | null>(null);

  // Handler for frame telemetry updates
  const handleFrameResult = useCallback(
    (newTelemetry: Telemetry | null, faceDetected: boolean, newOverlay?: Overlay | null) => {
      if (newTelemetry) {
        setTelemetry(newTelemetry);
      }
      if (faceDetected && newOverlay) {
        setOverlay(newOverlay);
      } else if (!faceDetected) {
        setOverlay(null);
      }
    },
    []
  );

  // Controls actions
  const handleStart = async () => {
    setLoadingAction(true);
    try {
      const res = await apiClient<StartMonitoringResponse>("/api/monitoring/start", {
        method: "POST",
        body: JSON.stringify({
          source: "browser_camera",
          eeg_source: "simulated_csv",
        }),
      });
      setSessionId(res.session.id);
      setSessionStatus("active");
      success("Live monitoring session initiated.", "Monitoring Active");
    } catch (err: any) {
      if (err.details?.session_id) {
        setSessionId(err.details.session_id);
        setSessionStatus("active");
        success("Connected to active monitoring session.", "Monitoring Active");
      } else {
        error(err.message || "Failed to start monitoring session.");
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePause = async () => {
    if (!sessionId) return;
    setLoadingAction(true);
    try {
      await apiClient<SessionResponse>("/api/monitoring/pause", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      });
      setSessionStatus("paused");
      success("Session paused. Telemetry frozen.");
    } catch (err: any) {
      error(err.message || "Failed to pause session.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResume = async () => {
    if (!sessionId) return;
    setLoadingAction(true);
    try {
      await apiClient<SessionResponse>("/api/monitoring/resume", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      });
      setSessionStatus("active");
      success("Session resumed. Resuming telemetry stream.");
    } catch (err: any) {
      error(err.message || "Failed to resume session.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;
    setLoadingAction(true);
    try {
      await apiClient<SessionResponse>("/api/monitoring/stop", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      });
      setSessionStatus("completed");
      setOverlay(null);
      success("Session stopped and persisted to database history.", "Session Saved");
    } catch (err: any) {
      error(err.message || "Failed to stop session.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Static Image Upload Handler
  const handleStaticUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setAnalyzingImage(true);

    const formData = new FormData();
    formData.append("file", file);
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    try {
      const result = await apiClient<AnalyzeImageResponse>("/api/monitoring/analyze-image", {
        method: "POST",
        body: formData,
      });
      setImageResult(result);
      success("Image analyzed successfully.");
    } catch (err: any) {
      error(err.message || "Failed to analyze image.");
      setImageResult(null);
    } finally {
      setAnalyzingImage(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E9EE] dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F07832]">
              // TELEMETRY MONITOR
            </span>
            <SimulatedEegBadge />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17191F] dark:text-white">
            ACTIVE SESSION INTERFACE
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "live"
                ? "bg-[#F07832] text-white shadow-md shadow-[#F07832]/25"
                : "text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white"
            }`}
          >
            Live Camera
          </button>
          <button
            onClick={() => setActiveTab("static")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "static"
                ? "bg-[#F07832] text-white shadow-md shadow-[#F07832]/25"
                : "text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white"
            }`}
          >
            Static Photo
          </button>
        </div>
      </div>

      {activeTab === "live" ? (
        <>
          {/* Fusion Classification Banner */}
          <FusionBanner
            fusedState={telemetry?.fused_state || null}
            fusedCode={telemetry?.fused_code || null}
            discrepancyAlert={telemetry?.discrepancy_alert || false}
          />

          {/* Main Monitor Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Webcam & Controls */}
            <div className="lg:col-span-7 space-y-4">
              <CameraPreview
                ref={cameraRef}
                sessionId={sessionId}
                isActive={sessionStatus === "active"}
                onFrameResult={handleFrameResult}
                overlay={overlay}
              />

              {/* Action Controls & Capture Moment Bar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <Controls
                  status={sessionStatus}
                  onStart={handleStart}
                  onPause={handlePause}
                  onResume={handleResume}
                  onStop={handleStop}
                  loading={loadingAction}
                />

                <CaptureMomentButton
                  sessionId={sessionId}
                  isActive={sessionStatus === "active"}
                  getVideoFrame={() => cameraRef.current?.captureSnapshot() || null}
                />
              </div>
            </div>

            {/* Right 5 Columns: Metrics & Gauges */}
            <div className="lg:col-span-5 space-y-4">
              {/* Dual Confidence Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ScoreCard
                  title="Vision Score"
                  score={telemetry?.vision_score ?? null}
                  subtitle="Ocular & head stillness"
                  sourceLabel="MediaPipe RF"
                  componentsText={
                    telemetry?.components
                      ? `RF: ${Math.round((telemetry.components.vision_rf_prob || 0) * 100)}% · Stillness: ${Math.round((telemetry.components.vision_kinematic_stillness || 0) * 100)}%`
                      : undefined
                  }
                  accentColor="#F07832"
                />

                <ScoreCard
                  title="EEG Score"
                  score={telemetry?.eeg_score ?? null}
                  subtitle="Spectral power rhythm"
                  sourceLabel="Simulated CSV"
                  componentsText={
                    telemetry?.components
                      ? `Raw RF: ${telemetry.components.eeg_rf_prob_raw ?? "--"} · Cal: ${telemetry.components.eeg_calibrated_prob ?? "--"}`
                      : undefined
                  }
                  accentColor="#6875D9"
                />
              </div>

              {/* Telemetry Indicator Readouts */}
              <GlassCard className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] pb-2 border-b border-[#E7E9EE] dark:border-white/10">
                  Extracted Telemetry Features
                </h4>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">GAZE STABILITY</span>
                    <span className="text-[#17191F] dark:text-white font-bold">
                      {telemetry?.metrics.gaze_stability !== null && telemetry?.metrics.gaze_stability !== undefined
                        ? telemetry.metrics.gaze_stability.toFixed(4)
                        : "--"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">HEAD STABILITY</span>
                    <span className="text-[#17191F] dark:text-white font-bold">
                      {telemetry?.metrics.head_stability !== null && telemetry?.metrics.head_stability !== undefined
                        ? telemetry.metrics.head_stability.toFixed(4)
                        : "--"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">ROLLING BLINKS</span>
                    <span className="text-[#17191F] dark:text-white font-bold">
                      {telemetry?.metrics.rolling_blinks !== null && telemetry?.metrics.rolling_blinks !== undefined
                        ? telemetry.metrics.rolling_blinks
                        : "--"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">EYE ASPECT (EAR)</span>
                    <span className="text-[#17191F] dark:text-white font-bold">
                      {telemetry?.metrics.ear !== null && telemetry?.metrics.ear !== undefined
                        ? telemetry.metrics.ear.toFixed(3)
                        : "--"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">ALPHA / THETA</span>
                    <span className="text-[#17191F] dark:text-white font-bold">
                      {telemetry?.metrics.alpha_theta_ratio !== null && telemetry?.metrics.alpha_theta_ratio !== undefined
                        ? telemetry.metrics.alpha_theta_ratio.toFixed(3)
                        : "--"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">BETA POWER (V²/Hz)</span>
                    <span className="text-[#17191F] dark:text-white font-bold truncate">
                      {telemetry?.metrics.beta_power !== null && telemetry?.metrics.beta_power !== undefined
                        ? telemetry.metrics.beta_power.toExponential(2)
                        : "--"}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      ) : (
        /* Static Image Upload Section (Original Feature Preserved) */
        <div className="max-w-4xl mx-auto space-y-6">
          <GlassCard className="p-8 text-center border-dashed border-2 border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E]">
            <input
              type="file"
              id="static-upload"
              accept="image/jpeg,image/png"
              onChange={handleStaticUpload}
              className="hidden"
            />
            <label
              htmlFor="static-upload"
              className="flex flex-col items-center justify-center cursor-pointer space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFF1E8] dark:bg-[#F07832]/20 border border-[#F07832]/30 flex items-center justify-center text-[#F07832]">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
                Upload Static Snapshot
              </h3>
              <p className="text-xs text-[#626873] dark:text-[#B8B8BE] max-w-sm leading-relaxed">
                Evaluates ocular alignment, 3D head pose, and EAR directly from an uploaded JPEG or PNG image.
              </p>
              <Button
                variant="secondary"
                size="sm"
                loading={analyzingImage}
                type="button"
                onClick={() => document.getElementById("static-upload")?.click()}
              >
                Select Image File
              </Button>
            </label>
          </GlassCard>

          {imageResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="rounded-2xl overflow-hidden border border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm">
                <img
                  src={imageResult.annotated_image}
                  alt="Annotated static face analysis"
                  className="w-full h-auto object-cover"
                />
              </div>

              <GlassCard className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E9EE] dark:border-white/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
                    Static Analysis Result
                  </span>
                  <Badge variant="accent" size="sm">
                    {imageResult.metrics.eye_status}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono text-[#17191F] dark:text-white">
                    {Math.round(imageResult.vision_score * 100)}%
                  </span>
                  <span className="text-xs text-[#626873] dark:text-[#B8B8BE] font-mono">
                    Estimated Vision Score
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="p-2.5 rounded-lg bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">EAR</span>
                    <span className="text-[#17191F] dark:text-white font-bold">{imageResult.metrics.ear}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">GAZE DEV</span>
                    <span className="text-[#17191F] dark:text-white font-bold">{imageResult.metrics.gaze_deviation}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">HEAD DEV</span>
                    <span className="text-[#17191F] dark:text-white font-bold">{imageResult.metrics.head_deviation}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">POSE RX</span>
                    <span className="text-[#17191F] dark:text-white font-bold">{imageResult.metrics.pose_Rx}</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#9298A3] dark:text-[#85858D] italic pt-2">
                  Note: {imageResult.method_note}
                </p>
              </GlassCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
