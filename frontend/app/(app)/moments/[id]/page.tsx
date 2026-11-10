"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Calendar, Clock, ExternalLink } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Moment } from "@/lib/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatIndiaDateTime } from "@/lib/utils/date";

export default function MomentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error } = useToast();

  const [moment, setMoment] = useState<Moment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchMoment() {
      if (!id) return;
      try {
        const res = await apiClient<{ moment: Moment }>(`/api/moments/${id}`);
        setMoment(res.moment);
      } catch (err: any) {
        error(err.message || "Failed to load moment details.");
      } finally {
        setLoading(false);
      }
    }

    fetchMoment();
  }, [id, error]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await apiClient(`/api/moments/${id}`, { method: "DELETE" });
      success("Moment deleted successfully.");
      router.push("/moments");
    } catch (err: any) {
      error(err.message || "Failed to delete moment.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs font-mono text-[#626873] dark:text-[#B8B8BE]">
        Loading moment details...
      </div>
    );
  }

  if (!moment) {
    return (
      <div className="p-16 text-center text-xs text-[#626873] dark:text-[#B8B8BE]">
        Moment not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-[#E7E9EE] dark:border-white/10">
        <Link
          href="/moments"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Moments
        </Link>

        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-xl p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#E7E9EE] dark:border-white/10">
          <div>
            <span className="text-xs font-mono text-[#9298A3] dark:text-[#85858D] block mb-1">
              MOMENT ID: {moment.id}
            </span>
            <h1 className="text-2xl font-black uppercase text-[#17191F] dark:text-white tracking-tight">
              {moment.fused_state}
            </h1>
          </div>
          <Badge variant={moment.discrepancy_alert ? "warning" : "success"} size="md">
            {moment.fused_code}
          </Badge>
        </div>

        {moment.has_image && moment.image_url && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-[#17191F] border border-[#E7E9EE] dark:border-white/10">
            <img
              src={moment.image_url}
              alt="Moment frame"
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
            <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">VISION SCORE</span>
            <span className="text-xl font-bold text-[#17191F] dark:text-white">
              {moment.vision_score !== null ? `${Math.round(moment.vision_score * 100)}%` : "--"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
            <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">EEG SCORE (SIM)</span>
            <span className="text-xl font-bold text-[#17191F] dark:text-white">
              {moment.eeg_score !== null ? `${Math.round(moment.eeg_score * 100)}%` : "--"}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
            <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">GAZE STABILITY</span>
            <span className="text-[#17191F] dark:text-white font-bold">{moment.metrics?.gaze_stability ?? "--"}</span>
          </div>
          <div className="p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
            <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">HEAD STABILITY</span>
            <span className="text-[#17191F] dark:text-white font-bold">{moment.metrics?.head_stability ?? "--"}</span>
          </div>
        </div>

        {moment.note && (
          <div className="p-4 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#626873] dark:text-[#85858D] block mb-1">
              User Note
            </span>
            <p className="text-sm text-[#17191F] dark:text-white italic leading-relaxed">
              "{moment.note}"
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-[#E7E9EE] dark:border-white/10 text-xs text-[#626873] dark:text-[#B8B8BE]">
          <span>Captured: {formatIndiaDateTime(moment.timestamp)} IST</span>
          <Link
            href={`/history/${moment.session_id}`}
            className="text-[#F07832] hover:text-[#E76520] flex items-center gap-1 font-semibold"
          >
            Open Associated Session <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </GlassCard>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirm Moment Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
            Are you sure you want to permanently delete this captured moment?
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
