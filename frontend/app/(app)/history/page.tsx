"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  History,
  Calendar,
  Clock,
  Camera,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Session, PaginatedResponse } from "@/lib/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatIndiaDate, formatIndiaTime } from "@/lib/utils/date";

export default function HistoryPage() {
  const { success, error } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Delete modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: "10",
        sort: "newest",
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await apiClient<PaginatedResponse<Session>>(`/api/sessions?${params.toString()}`);
      setSessions(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      error(err.message || "Failed to load session history.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, error]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiClient(`/api/sessions/${deleteId}`, { method: "DELETE" });
      success("Session and related moments deleted successfully.");
      setDeleteId(null);
      fetchSessions();
    } catch (err: any) {
      error(err.message || "Failed to delete session.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E9EE] dark:border-white/10">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F07832] mb-1 block">
            // LONGITUDINAL LOG
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17191F] dark:text-white">
            SESSION HISTORY
          </h1>
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE] mt-1">
            Historical records of monitoring intervals, aggregated features, and moments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-3 py-2 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] uppercase font-mono"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Abandoned</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="p-16 text-center text-xs font-mono text-[#626873] dark:text-[#B8B8BE]">
          Loading session history from MongoDB...
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session) => (
            <GlassCard
              key={session.id}
              elevated
              className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm hover:shadow-md transition-all p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E7E9EE] dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[#9298A3] dark:text-[#85858D]">
                      ID: {session.id}
                    </span>
                    <Badge
                      variant={
                        session.status === "completed"
                          ? "success"
                          : session.status === "active"
                          ? "accent"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {session.status}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-[#17191F] dark:text-white uppercase tracking-wider">
                    {session.summary?.dominant_fused_state || "Monitoring Interval"}
                  </h3>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-[#626873] dark:text-[#85858D]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatIndiaDate(session.started_at)} • {formatIndiaTime(session.started_at)} IST
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {session.active_duration_seconds
                      ? `${Math.floor(session.active_duration_seconds / 60)}m ${session.active_duration_seconds % 60}s`
                      : "0s"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    {session.moments_count} Moments
                  </span>
                </div>
              </div>

              {/* Aggregates Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                  <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">MEAN VISION</span>
                  <span className="text-[#17191F] dark:text-white font-bold">
                    {session.aggregated_metrics?.vision_score?.mean !== undefined
                      ? `${Math.round(session.aggregated_metrics.vision_score.mean * 100)}%`
                      : "--"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                  <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">MEAN EEG (SIM)</span>
                  <span className="text-[#17191F] dark:text-white font-bold">
                    {session.aggregated_metrics?.eeg_score?.mean !== undefined
                      ? `${Math.round(session.aggregated_metrics.eeg_score.mean * 100)}%`
                      : "--"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                  <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">ANALYZED FRAMES</span>
                  <span className="text-[#17191F] dark:text-white font-bold">
                    {session.aggregated_metrics?.frames_analyzed || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                  <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">MISMATCH RATIO</span>
                  <span className="text-[#17191F] dark:text-white font-bold">
                    {session.summary?.discrepancy_ratio != null
                      ? `${Math.round(session.summary.discrepancy_ratio * 100)}%`
                      : "--"}
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E7E9EE] dark:border-white/10">
                <Link
                  href={`/history/${session.id}`}
                  className="text-xs text-[#F07832] hover:text-[#E76520] font-semibold uppercase tracking-wider flex items-center gap-1"
                >
                  View Details & Related Moments <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => setDeleteId(session.id)}
                  disabled={session.status === "active" || session.status === "paused"}
                  title={
                    session.status === "active" || session.status === "paused"
                      ? "Cannot delete a live session"
                      : "Delete session"
                  }
                  className="p-1.5 rounded-lg text-[#9298A3] dark:text-[#85858D] hover:text-[#DC5555] hover:bg-[#FDEEEE] dark:hover:bg-[#DC5555]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="No Sessions Recorded"
          description="When you start and stop monitoring, your session durations and metrics will be saved here."
          actionText="Go to Monitor"
          onAction={() => (window.location.href = "/monitor")}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6 border-t border-[#E7E9EE] dark:border-white/10">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-xs font-mono text-[#626873] dark:text-[#B8B8BE]">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Session and Associated Moments"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">
            Are you sure you want to delete this session? All moments captured during this session will also be permanently deleted.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E9EE] dark:border-white/10">
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(null)}>
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
