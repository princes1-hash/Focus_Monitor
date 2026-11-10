"use client";

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Overlay } from "@/lib/types/api";

export interface CameraPreviewHandle {
  captureSnapshot: () => string | null;
}

interface CameraPreviewProps {
  sessionId: string | null;
  isActive: boolean;
  onFrameResult: (telemetry: any, faceDetected: boolean, overlay?: Overlay | null) => void;
  overlay: Overlay | null;
}

export const CameraPreview = forwardRef<CameraPreviewHandle, CameraPreviewProps>(
  function CameraPreview({ sessionId, isActive, onFrameResult, overlay }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Expose snapshot method
    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        if (!videoRef.current || !hasPermission) return null;
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.7);
      },
    }));

    // Start Webcam
    useEffect(() => {
      let stream: MediaStream | null = null;

      async function initCamera() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
            },
            audio: false,
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch((err: any) => {
                if (err.name !== "AbortError") {
                  console.warn("Camera play interrupted:", err);
                }
              });
            };
          }
          setHasPermission(true);
          setCameraError(null);
        } catch (err: any) {
          setHasPermission(false);
          setCameraError(
            err.name === "NotAllowedError"
              ? "Camera access denied. Please grant webcam permissions in your browser."
              : "Camera unavailable or in use by another application."
          );
        }
      }

      initCamera();

      return () => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
    }, []);

    // Draw Overlay Landmarks on Canvas
    const drawOverlay = useCallback(
      (overlayData: Overlay | null) => {
        const canvas = overlayCanvasRef.current;
        const video = videoRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (video && video.videoWidth && video.videoHeight) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
        }

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (!overlayData || !isActive) return;

        // Draw Helper Functions
        const drawPolyline = (
          points: [number, number][],
          color: string,
          closed: boolean = false,
          lineWidth: number = 1.5,
          glowColor?: string
        ) => {
          if (!points || points.length < 2) return;
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          if (glowColor) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 6;
          }
          ctx.moveTo(points[0][0] * w, points[0][1] * h);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0] * w, points[i][1] * h);
          }
          if (closed) ctx.closePath();
          ctx.stroke();
          ctx.restore();
        };

        const drawPoints = (
          points: [number, number][],
          fillColor: string,
          radius: number = 2,
          glowColor?: string
        ) => {
          if (!points) return;
          ctx.save();
          if (glowColor) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 4;
          }
          ctx.fillStyle = fillColor;
          for (const pt of points) {
            ctx.beginPath();
            ctx.arc(pt[0] * w, pt[1] * h, radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        };

        // 1. ATHLETIC-TECH HUD CORNER BRACKETS (Bounding Box around Face)
        if (overlayData.face_oval && overlayData.face_oval.length > 0) {
          let minX = 1,
            minY = 1,
            maxX = 0,
            maxY = 0;
          for (const [x, y] of overlayData.face_oval) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          const padX = 16 / w;
          const padY = 16 / h;
          const bx0 = Math.max(0, (minX - padX) * w);
          const by0 = Math.max(0, (minY - padY) * h);
          const bx1 = Math.min(w, (maxX + padX) * w);
          const by1 = Math.min(h, (maxY + padY) * h);
          const bracketLen = Math.min(22, (bx1 - bx0) * 0.2);

          ctx.save();
          ctx.strokeStyle = "#F07832";
          ctx.lineWidth = 2;
          ctx.shadowColor = "rgba(240, 120, 50, 0.6)";
          ctx.shadowBlur = 6;

          // Top-Left ┌
          ctx.beginPath();
          ctx.moveTo(bx0, by0 + bracketLen);
          ctx.lineTo(bx0, by0);
          ctx.lineTo(bx0 + bracketLen, by0);
          ctx.stroke();

          // Top-Right ┐
          ctx.beginPath();
          ctx.moveTo(bx1 - bracketLen, by0);
          ctx.lineTo(bx1, by0);
          ctx.lineTo(bx1, by0 + bracketLen);
          ctx.stroke();

          // Bottom-Left └
          ctx.beginPath();
          ctx.moveTo(bx0, by1 - bracketLen);
          ctx.lineTo(bx0, by1);
          ctx.lineTo(bx0 + bracketLen, by1);
          ctx.stroke();

          // Bottom-Right ┘
          ctx.beginPath();
          ctx.moveTo(bx1 - bracketLen, by1);
          ctx.lineTo(bx1, by1);
          ctx.lineTo(bx1, by1 - bracketLen);
          ctx.stroke();

          // HUD Tag
          ctx.fillStyle = "rgba(240, 120, 50, 0.95)";
          ctx.font = "bold 9px monospace";
          ctx.fillText("FACIAL TRACK // 478 PTS", bx0 + 4, Math.max(12, by0 - 4));
          ctx.restore();
        }

        // 2. FACIAL LANDMARKS (Face Oval, Jawline & Key Mesh Points)
        // Oval Contour
        drawPolyline(
          overlayData.face_oval,
          "rgba(0, 230, 160, 0.75)",
          true,
          1.8,
          "rgba(0, 230, 160, 0.5)"
        );
        // Anchor points along oval
        if (overlayData.face_oval) {
          const sparseOval = overlayData.face_oval.filter((_, idx) => idx % 2 === 0);
          drawPoints(sparseOval, "rgba(0, 230, 160, 0.9)", 2, "rgba(0, 230, 160, 0.6)");
        }

        // 3D Key Face Mesh Scatter Points (cheeks, forehead, chin)
        if (overlayData.mesh_points && overlayData.mesh_points.length > 0) {
          drawPoints(overlayData.mesh_points, "rgba(120, 240, 200, 0.75)", 1.5, "rgba(0, 255, 170, 0.5)");
        }

        // Eyebrows
        if (overlayData.left_eyebrow && overlayData.left_eyebrow.length > 0) {
          drawPolyline(overlayData.left_eyebrow, "rgba(200, 220, 240, 0.85)", false, 1.8);
          drawPoints(overlayData.left_eyebrow, "rgba(200, 220, 240, 0.9)", 1.5);
        }
        if (overlayData.right_eyebrow && overlayData.right_eyebrow.length > 0) {
          drawPolyline(overlayData.right_eyebrow, "rgba(200, 220, 240, 0.85)", false, 1.8);
          drawPoints(overlayData.right_eyebrow, "rgba(200, 220, 240, 0.9)", 1.5);
        }

        // Nose Bridge & Tip Reticle
        drawPolyline(overlayData.nose, "rgba(240, 120, 50, 0.85)", false, 1.6, "rgba(240, 120, 50, 0.5)");
        if (overlayData.nose && overlayData.nose.length > 0) {
          const noseTip = overlayData.nose[overlayData.nose.length - 1];
          ctx.save();
          ctx.strokeStyle = "#F07832";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(noseTip[0] * w, noseTip[1] * h, 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Lips Outer Contour
        if (overlayData.lips && overlayData.lips.length > 0) {
          drawPolyline(overlayData.lips, "rgba(240, 100, 80, 0.65)", true, 1.3);
        }

        // 3. EYES LANDMARKS (Ocular Eyelids, Iris Rings & Gaze Reticles)
        // Left & Right Eye Eyelid Contours (Primary Orange Highlight)
        drawPolyline(
          overlayData.left_eye,
          "#F07832",
          true,
          2.2,
          "rgba(240, 120, 50, 0.85)"
        );
        drawPolyline(
          overlayData.right_eye,
          "#F07832",
          true,
          2.2,
          "rgba(240, 120, 50, 0.85)"
        );

        // Highlight Eye Contour Vertices
        drawPoints(overlayData.left_eye, "#FFA040", 2, "rgba(240, 120, 50, 0.8)");
        drawPoints(overlayData.right_eye, "#FFA040", 2, "rgba(240, 120, 50, 0.8)");

        // Iris Rings (Glowing Neon Emerald)
        drawPolyline(
          overlayData.left_iris,
          "#00FFAA",
          true,
          2.0,
          "rgba(0, 255, 170, 0.9)"
        );
        drawPolyline(
          overlayData.right_iris,
          "#00FFAA",
          true,
          2.0,
          "rgba(0, 255, 170, 0.9)"
        );

        // Pupil / Iris Centers & Gaze Crosshairs
        const drawGazeReticle = (cx: number, cy: number) => {
          ctx.save();
          ctx.strokeStyle = "#00FFAA";
          ctx.fillStyle = "#00FFAA";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "rgba(0, 255, 170, 0.9)";
          ctx.shadowBlur = 6;

          // Center pupil point
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Reticle crosshair (+)
          ctx.beginPath();
          ctx.moveTo(cx - 7, cy);
          ctx.lineTo(cx + 7, cy);
          ctx.moveTo(cx, cy - 7);
          ctx.lineTo(cx, cy + 7);
          ctx.stroke();

          // Outer reticle circle
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 255, 170, 0.5)";
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.restore();
        };

        if (overlayData.iris_centers && overlayData.iris_centers.length >= 2) {
          drawGazeReticle(overlayData.iris_centers[0][0] * w, overlayData.iris_centers[0][1] * h);
          drawGazeReticle(overlayData.iris_centers[1][0] * w, overlayData.iris_centers[1][1] * h);
        } else {
          // Fallback: calculate centroid from iris rings if iris_centers not populated
          if (overlayData.left_iris && overlayData.left_iris.length > 0) {
            const avgX = overlayData.left_iris.reduce((acc, p) => acc + p[0], 0) / overlayData.left_iris.length;
            const avgY = overlayData.left_iris.reduce((acc, p) => acc + p[1], 0) / overlayData.left_iris.length;
            drawGazeReticle(avgX * w, avgY * h);
          }
          if (overlayData.right_iris && overlayData.right_iris.length > 0) {
            const avgX = overlayData.right_iris.reduce((acc, p) => acc + p[0], 0) / overlayData.right_iris.length;
            const avgY = overlayData.right_iris.reduce((acc, p) => acc + p[1], 0) / overlayData.right_iris.length;
            drawGazeReticle(avgX * w, avgY * h);
          }
        }
      },
      [isActive]
    );

    // Frame capture & POST loop
    useEffect(() => {
      if (!isActive || !sessionId || !hasPermission) return;

      let intervalId: any = null;
      let inFlight = false;

      const sendFrame = async () => {
        if (inFlight || !videoRef.current || !hiddenCanvasRef.current) return;
        const video = videoRef.current;
        if (video.readyState < 2) return;

        inFlight = true;
        try {
          const canvas = hiddenCanvasRef.current;
          const targetWidth = 320;
          const targetHeight = Math.round((video.videoHeight / (video.videoWidth || 1)) * targetWidth) || 240;
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          // Draw un-mirrored frame to canvas (server handles mirroring)
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                inFlight = false;
                return;
              }
              const formData = new FormData();
              formData.append("session_id", sessionId);
              formData.append("file", blob, "frame.jpg");

              try {
                const res = await fetch("/api/monitoring/frame", {
                  method: "POST",
                  body: formData,
                  credentials: "same-origin",
                });
                if (res.ok) {
                  const data = await res.json();
                  const currentOverlay = data.face_detected ? data.overlay : null;
                  // Immediately draw to canvas with zero delay
                  drawOverlay(currentOverlay);
                  onFrameResult(data.telemetry, data.face_detected, currentOverlay);
                }
              } catch {
                // Network glitch or server busy
              } finally {
                inFlight = false;
              }
            },
            "image/jpeg",
            0.65
          );
        } catch {
          inFlight = false;
        }
      };

      // 8 fps (~125 ms interval)
      intervalId = setInterval(sendFrame, 125);

      return () => {
        clearInterval(intervalId);
      };
    }, [isActive, sessionId, hasPermission, onFrameResult, drawOverlay]);

    // Clear canvas when inactive
    useEffect(() => {
      if (!isActive) {
        const canvas = overlayCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }, [isActive]);

    // Redraw if parent passes updated overlay prop
    useEffect(() => {
      if (overlay) {
        drawOverlay(overlay);
      }
    }, [overlay, drawOverlay]);

    return (
      <div className="relative w-full aspect-[4/3] max-w-xl mx-auto rounded-2xl overflow-hidden bg-[#17191F] border border-[#E7E9EE] dark:border-white/10 shadow-lg">
        {/* Mirrored Live Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />

        {/* Overlay Canvas (coordinates are already in mirrored space from server) */}
        <canvas
          ref={overlayCanvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Hidden downscaling canvas */}
        <canvas ref={hiddenCanvasRef} className="hidden" />

        {/* Permission / Error State */}
        {hasPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/95 dark:bg-[#1A1A1E]/95 backdrop-blur-md">
            <CameraOff className="w-12 h-12 text-[#DC5555] mb-3" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-1">
              Webcam Access Required
            </h4>
            <p className="text-xs text-[#626873] dark:text-[#B8B8BE] max-w-xs">{cameraError}</p>
          </div>
        )}

        {/* Live indicator overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-[#1A1A1E]/90 backdrop-blur-md border border-[#E7E9EE] dark:border-white/10 text-[10px] font-mono uppercase tracking-wider text-[#17191F] dark:text-white shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              isActive ? "bg-[#239B68] animate-pulse" : "bg-[#9298A3]"
            }`}
          />
          {isActive ? "Telemetry Active • Landmarks Tracking" : "Camera Ready"}
        </div>

        {/* Standby prompt when waiting for user to start */}
        {!isActive && hasPermission && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-[#F07832]/30 text-[11px] font-mono text-[#FFA040] flex items-center gap-2 pointer-events-none shadow-lg animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#F07832] inline-block animate-ping" />
            <span>Click &quot;START MONITORING&quot; below to launch AI face tracking</span>
          </div>
        )}
      </div>
    );
  }
);
