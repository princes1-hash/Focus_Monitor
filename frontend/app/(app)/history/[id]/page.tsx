"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Camera,
  Trash2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Session, Moment } from "@/lib/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchSessionAndMoments() {
      if (!id) return;
      try {
        const [sessRes, momentsRes] = await Promise.all([
          apiClient<{ session: Session }>(`/api/sessions/${id}`),
          apiClient<{ items: Moment[] }>(`/api/moments?session_id=${id}`),
        ]);
        setSession(sessRes.session);
        setMoments(momentsRes.items || []);
      } catch (err: any) {
        error(err.message || "Failed to load session details.");
      } finally {
        setLoading(false);
      }
    }

    fetchSessionAndMoments();
  }, [id, error]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await apiClient(`/api/sessions/${id}`, { method: "DELETE" });
      success("Session and related moments deleted successfully.");
      router.push("/history");
    } catch (err: any) {
      error(err.message || "Failed to delete session.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs font-mono text-[#626873] dark:text-[#B8B8BE]">
        Loading session details...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-16 text-center text-xs text-[#626873] dark:text-[#B8B8BE]">
        Session not found.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-[#E7E9EE] dark:border-white/10">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>

        <Button
          variant="danger"
          size="sm"
          disabled={session.status === "active" || session.status === "paused"}
          icon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleteOpen(true)}
        >
          Delete Session
        </Button>
      </div>

      {/* Main Session Card */}
      <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-xl p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#E7E9EE] dark:border-white/10">
          <div>
            <span className="text-xs font-mono text-[#9298A3] dark:text-[#85858D] block mb-1">
              SESSION ID: {session.id}
            </span>
            <h1 className="text-2xl font-black uppercase text-[#17191F] dark:text-white tracking-tight">
              {session.summary?.dominant_fused_state || "Session Telemetry Record"}
            </h1>
          </div>
          <Badge
            variant={
              session.status === "completed"
                ? "success"
                : session.status === "active"
                ? "accent"
                : "neutral"
            }
            size="md"
          >
            {session.status}
          </Badge>
        </div>

        {/* High-level durations */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
            <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">STARTED AT</span>
            <span className="text-sm font-bold text-[#17191F] dark:text-white">
              {new Date(session.started_at).toLocaleTimeString()}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
            <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">ACTIVE DURATION</span>
            <span className="text-sm font-bold text-[#17191F] dark:text-white">
              {session.active_duration_seconds
                ? `${Math.floor(session.active_duration_seconds / 60)}m ${session.active_duration_seconds % 60}s`
                : "0s"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
            <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">ANALYZED FRAMES</span>
            <span className="text-sm font-bold text-[#17191F] dark:text-white">
              {session.aggregated_metrics?.frames_analyzed || 0}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
            <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">CAPTURED MOMENTS</span>
            <span className="text-sm font-bold text-[#17191F] dark:text-white">
              {session.moments_count}
            </span>
          </div>
        </div>

        {/* Aggregated Distributions */}
        {session.aggregated_metrics && (
          <div className="space-y-4 pt-4 border-t border-[#E7E9EE] dark:border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE]">
              Aggregated Sensor Metrics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">MEAN VISION SCORE</span>
                <span className="text-[#17191F] dark:text-white font-bold">
                  {session.aggregated_metrics.vision_score?.mean ?? "--"} (min:{" "}
                  {session.aggregated_metrics.vision_score?.min ?? "--"}, max:{" "}
                  {session.aggregated_metrics.vision_score?.max ?? "--"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">MEAN EEG SCORE (SIM)</span>
                <span className="text-[#17191F] dark:text-white font-bold">
                  {session.aggregated_metrics.eeg_score?.mean ?? "--"} (min:{" "}
                  {session.aggregated_metrics.eeg_score?.min ?? "--"}, max:{" "}
                  {session.aggregated_metrics.eeg_score?.max ?? "--"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">GAZE STABILITY MEAN</span>
                <span className="text-[#17191F] dark:text-white font-bold">
                  {session.aggregated_metrics.gaze_stability_mean ?? "--"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">HEAD STABILITY MEAN</span>
                <span className="text-[#17191F] dark:text-white font-bold">
                  {session.aggregated_metrics.head_stability_mean ?? "--"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">ALPHA/THETA RATIO MEAN</span>
                <span className="text-[#17191F] dark:text-white font-bold">
                  {session.aggregated_metrics.alpha_theta_ratio_mean ?? "--"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">BLINKS / MIN (ACTIVE)</span>
                <span className="text-[#17191F] dark:text-white font-bold">
                  {session.aggregated_metrics.blinks_per_minute_mean ?? "--"}
                </span>
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Associated Captured Moments */}
      <div className="space-y-4">
        <h3 className="text-base font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
          Moments Captured During This Session ({moments.length})
        </h3>

        {moments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {moments.map((m) => (
              <GlassCard key={m.id} className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-[#17191F] dark:text-white font-mono">
                      {m.fused_state}
                    </span>
                    <Badge variant={m.discrepancy_alert ? "warning" : "success"} size="sm">
                      {m.fused_code}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-[#626873] dark:text-[#85858D] font-mono block mb-3">
                    {new Date(m.timestamp).toLocaleTimeString()} · Vision:{" "}
                    {m.vision_score ? `${Math.round(m.vision_score * 100)}%` : "--"}
                  </span>
                  {m.note && (
                    <p className="text-xs text-[#626873] dark:text-[#B8B8BE] bg-[#F0F2F5] dark:bg-[#141417] p-2.5 rounded-lg border border-[#E7E9EE]/60 dark:border-white/5 mb-3 italic">
                      "{m.note}"
                    </p>
                  )}
                </div>
                <Link
                  href={`/moments/${m.id}`}
                  className="text-xs text-[#F07832] hover:text-[#E76520] font-semibold uppercase tracking-wider pt-3 border-t border-[#E7E9EE] dark:border-white/10 flex items-center justify-between"
                >
                  Inspect Moment <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </GlassCard>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 text-center text-xs text-[#626873] dark:text-[#B8B8BE]">
            No moments were snapshotted during this session interval.
          </div>
        )}
      </div>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirm Session Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
            Are you sure you want to delete this session and all its {moments.length} associated captured moments?
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E9EE] dark:border-white/10">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
