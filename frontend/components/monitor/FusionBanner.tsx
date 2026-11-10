import React from "react";
import { AlertTriangle, CheckCircle, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface FusionBannerProps {
  status?: "idle" | "active" | "paused" | "completed";
  fusedState: string | null;
  fusedCode: "both_high" | "both_low" | "vision_high_eeg_low" | "vision_low_eeg_high" | null;
  discrepancyAlert: boolean;
}

export function FusionBanner({
  status = "idle",
  fusedState,
  fusedCode,
  discrepancyAlert,
}: FusionBannerProps) {
  
  if (!fusedCode) {
    if (status === "active") {
      return (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1A1E] border border-[#F07832]/30 shadow-sm flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <BrainCircuit className="w-5 h-5 text-[#F07832] animate-spin" />
            <span className="text-xs uppercase font-bold tracking-wider text-[#F07832]">
              Analyzing video stream & computing initial neural telemetry...
            </span>
          </div>
        </div>
      );
    }

    if (status === "paused") {
      return (
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1A1E] border border-[#D99A27]/30 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#D99A27]" />
            <span className="text-xs uppercase font-bold tracking-wider text-[#D99A27]">
              Session Paused • Telemetry Stream Frozen
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-[#FFF9F5] dark:bg-[#1A1A1E] border border-[#F07832]/30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F07832] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F07832]"></span>
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-[#F07832] block">
              Standby Mode — Click &quot;START MONITORING&quot; Below
            </span>
            <span className="text-[11px] text-[#626873] dark:text-[#B8B8BE]">
              Camera is ready. Real-time ocular tracking and EEG inference will begin immediately when started.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const codeDescriptions: Record<string, { label: string; tone: "success" | "neutral" | "warning" }> = {
    both_high: {
      label: "Vision & EEG indicators both elevated",
      tone: "success",
    },
    both_low: {
      label: "Vision & EEG indicators both baseline / low",
      tone: "neutral",
    },
    vision_high_eeg_low: {
      label: "Modality Mismatch: Ocular stillness with lower EEG band power",
      tone: "warning",
    },
    vision_low_eeg_high: {
      label: "Modality Mismatch: Physical motion with higher EEG band power",
      tone: "warning",
    },
  };

  const desc = codeDescriptions[fusedCode] || {
    label: "Multimodal Fusion Active",
    tone: "neutral",
  };

  return (
    <div
      className={`p-5 rounded-2xl border transition-all ${
        discrepancyAlert
          ? "bg-[#FFF6E5] dark:bg-[#D99A27]/15 border-[#D99A27]/30 shadow-sm"
          : "bg-white dark:bg-[#1A1A1E] border-[#E7E9EE] dark:border-white/10 shadow-sm"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {discrepancyAlert ? (
            <div className="p-2 rounded-xl bg-[#FFF6E5] dark:bg-[#D99A27]/20 text-[#D99A27] border border-[#D99A27]/30">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-[#E9F7F0] dark:bg-[#239B68]/20 text-[#239B68] border border-[#239B68]/30">
              <CheckCircle className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
                {desc.label}
              </span>
              {discrepancyAlert && (
                <Badge variant="warning" size="sm" dot>
                  Mismatch Alert
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
              Model Estimate: <span className="text-[#17191F] dark:text-white font-semibold">{fusedState}</span>
            </p>
          </div>
        </div>

        <div className="text-[11px] text-[#9298A3] dark:text-[#85858D] font-mono shrink-0">
          LATE FUSION: DUAL 0.50 THRESHOLD
        </div>
      </div>
    </div>
  );
}

