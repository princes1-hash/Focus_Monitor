"use client";

import React, { useState } from "react";
import { Camera, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthContext";

interface CaptureMomentButtonProps {
  sessionId: string | null;
  isActive: boolean;
  getVideoFrame?: () => string | null;
  onSuccess?: () => void;
}

export function CaptureMomentButton({
  sessionId,
  isActive,
  getVideoFrame,
  onSuccess,
}: CaptureMomentButtonProps) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCapture = async () => {
    if (!sessionId || !isActive) return;

    setLoading(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      let imageBase64: string | null = null;

      // Only capture webcam frame if user opted in
      if (user?.preferences?.store_frames && getVideoFrame) {
        imageBase64 = getVideoFrame();
      }

      const payload: { session_id: string; note?: string; image_base64?: string } = {
        session_id: sessionId,
      };
      if (note.trim()) {
        payload.note = note.trim();
      }
      if (imageBase64) {
        payload.image_base64 = imageBase64;
      }

      await apiClient("/api/moments", {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      success("Moment snapshot securely saved to database.", "Moment Captured");
      setNote("");
      setModalOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      error(err.message || "Failed to capture moment.", "Capture Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        size="md"
        disabled={!isActive || !sessionId}
        onClick={() => setModalOpen(true)}
        icon={<Camera className="w-4 h-4" />}
        className="shadow-md shadow-[#F07832]/25"
      >
        Capture Moment
      </Button>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Capture Telemetry Moment"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">
            Record a timestamped snapshot of current ocular features, EEG spectral metrics,
            and model classifications to your database timeline.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-1.5">
              Snapshot Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Deep focus while reviewing documentation..."
              maxLength={280}
              rows={3}
              className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 p-3 text-xs text-[#17191F] dark:text-white placeholder-[#9298A3] dark:placeholder-[#85858D] focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors resize-none"
            />
            <div className="flex justify-end text-[10px] text-[#9298A3] dark:text-[#85858D] mt-1 font-mono">
              {note.length} / 280
            </div>
          </div>

          {user?.preferences?.store_frames ? (
            <div className="p-3 rounded-xl bg-[#E9F7F0] dark:bg-[#239B68]/15 border border-[#239B68]/30 text-[11px] text-[#239B68] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Camera snapshot will be saved according to your preferences.</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#FFF6E5] dark:bg-[#D99A27]/15 border border-[#D99A27]/30 text-[11px] text-[#626873] dark:text-[#B8B8BE] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D99A27]" />
              <span>Telemetry only (frame capture disabled in profile settings).</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E9EE] dark:border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handleCapture}
            >
              Save Snapshot
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
