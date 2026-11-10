"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  Search,
  Filter,
  Trash2,
  Calendar,
  Clock,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Moment, PaginatedResponse } from "@/lib/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatIndiaDate, formatIndiaTime } from "@/lib/utils/date";

export default function MomentsPage() {
  const { success, error } = useToast();

  const [moments, setMoments] = useState<Moment[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [fusedCodeFilter, setFusedCodeFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detail modal state
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);

  const fetchMoments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: "12",
        sort: sortOrder,
      });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (fusedCodeFilter) params.set("fused_code", fusedCodeFilter);

      const res = await apiClient<PaginatedResponse<Moment>>(`/api/moments?${params.toString()}`);
      setMoments(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      error(err.message || "Failed to load moments.");
    } finally {
      setLoading(false);
    }
  }, [page, sortOrder, searchQuery, fusedCodeFilter, error]);

  useEffect(() => {
    fetchMoments();
  }, [fetchMoments]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiClient(`/api/moments/${deleteId}`, { method: "DELETE" });
      success("Moment deleted successfully.");
      setDeleteId(null);
      fetchMoments();
    } catch (err: any) {
      error(err.message || "Failed to delete moment.");
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
            // TELEMETRY REPOSITORY
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17191F] dark:text-white">
            MY MOMENTS
          </h1>
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE] mt-1">
            Persisted snapshots of ocular stability and spectral rhythm synchrony.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#626873] dark:text-[#B8B8BE]">{total} Total Snapshots</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-[#9298A3] dark:text-[#85858D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search notes or classification states..."
            className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 pl-9 pr-4 py-2 text-xs text-[#17191F] dark:text-white placeholder-[#9298A3] dark:placeholder-[#85858D] focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={fusedCodeFilter}
            onChange={(e) => {
              setFusedCodeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-3 py-2 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] uppercase font-mono"
          >
            <option value="">All States</option>
            <option value="both_high">Both High (Stillness)</option>
            <option value="both_low">Both Low (Drift)</option>
            <option value="vision_high_eeg_low">Mismatch: Eye Still, Mind Active</option>
            <option value="vision_low_eeg_high">Mismatch: Body Moving, Mind Calm</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as "newest" | "oldest");
              setPage(1);
            }}
            className="rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-3 py-2 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] uppercase font-mono"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Moments Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs font-mono text-[#626873] dark:text-[#B8B8BE]">
          Retrieving moments from MongoDB...
        </div>
      ) : moments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {moments.map((moment) => (
            <GlassCard
              key={moment.id}
              elevated
              className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Image Snapshot if present */}
                {moment.has_image && moment.image_url && (
                  <div className="w-full aspect-video rounded-xl overflow-hidden bg-[#17191F] mb-4 border border-[#E7E9EE] dark:border-white/10">
                    <img
                      src={moment.image_url}
                      alt="Moment webcam frame"
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                )}

                {/* Classification and Discrepancy Alert */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-black uppercase text-[#17191F] dark:text-white tracking-wider line-clamp-1">
                    {moment.fused_state}
                  </span>
                  <Badge variant={moment.discrepancy_alert ? "warning" : "success"} size="sm">
                    {moment.fused_code}
                  </Badge>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-3 text-[11px] text-[#626873] dark:text-[#85858D] font-mono mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatIndiaDate(moment.timestamp)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatIndiaTime(moment.timestamp)} IST
                  </span>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5 font-mono text-xs mb-3">
                  <div>
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">VISION SCORE</span>
                    <span className="text-[#17191F] dark:text-white font-bold">
                      {moment.vision_score !== null ? `${Math.round(moment.vision_score * 100)}%` : "--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">EEG (SIMULATED)</span>
                    <span className="text-[#17191F] dark:text-white font-bold">
                      {moment.eeg_score !== null ? `${Math.round(moment.eeg_score * 100)}%` : "--"}
                    </span>
                  </div>
                </div>

                {/* Note */}
                {moment.note && (
                  <p className="text-xs text-[#626873] dark:text-[#B8B8BE] bg-[#F0F2F5] dark:bg-[#141417] p-2.5 rounded-lg border border-[#E7E9EE]/60 dark:border-white/5 mb-3 italic">
                    "{moment.note}"
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E7E9EE] dark:border-white/10">
                <button
                  onClick={() => setSelectedMoment(moment)}
                  className="text-xs text-[#F07832] hover:text-[#E76520] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1"
                >
                  Inspect Telemetry
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/history/${moment.session_id}`}
                    title="View parent session"
                    className="p-1.5 rounded-lg text-[#9298A3] dark:text-[#85858D] hover:text-[#17191F] dark:hover:text-white hover:bg-[#F0F2F5] dark:hover:bg-[#242428] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => setDeleteId(moment.id)}
                    title="Delete moment"
                    className="p-1.5 rounded-lg text-[#9298A3] dark:text-[#85858D] hover:text-[#DC5555] hover:bg-[#FDEEEE] dark:hover:bg-[#DC5555]/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Camera}
          title="No Moments Match Your Criteria"
          description="Use 'Capture Moment' during live monitoring to save telemetry timestamps to this repository."
          actionText="Go to Live Monitor"
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

      {/* Inspect Detail Modal */}
      <Modal
        isOpen={!!selectedMoment}
        onClose={() => setSelectedMoment(null)}
        title="Moment Telemetry Inspection"
        maxWidth="lg"
      >
        {selectedMoment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9EE] dark:border-white/10">
              <span className="text-sm font-bold text-[#17191F] dark:text-white uppercase font-mono">
                {selectedMoment.fused_state}
              </span>
              <Badge variant={selectedMoment.discrepancy_alert ? "warning" : "success"} size="sm">
                {selectedMoment.fused_code}
              </Badge>
            </div>

            {selectedMoment.has_image && selectedMoment.image_url && (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-[#17191F] border border-[#E7E9EE] dark:border-white/10">
                <img
                  src={selectedMoment.image_url}
                  alt="Captured moment frame"
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">GAZE STABILITY</span>
                <span className="text-[#17191F] dark:text-white font-bold">{selectedMoment.metrics?.gaze_stability ?? "--"}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">HEAD STABILITY</span>
                <span className="text-[#17191F] dark:text-white font-bold">{selectedMoment.metrics?.head_stability ?? "--"}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">ROLLING BLINKS</span>
                <span className="text-[#17191F] dark:text-white font-bold">{selectedMoment.metrics?.rolling_blinks ?? "--"}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">EAR VALUE</span>
                <span className="text-[#17191F] dark:text-white font-bold">{selectedMoment.metrics?.ear ?? "--"}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">ALPHA/THETA</span>
                <span className="text-[#17191F] dark:text-white font-bold">{selectedMoment.metrics?.alpha_theta_ratio ?? "--"}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] text-[#626873] dark:text-[#85858D] block">BETA POWER</span>
                <span className="text-[#17191F] dark:text-white font-bold">{selectedMoment.metrics?.beta_power ?? "--"}</span>
              </div>
            </div>

            {selectedMoment.note && (
              <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] text-xs text-[#626873] dark:text-[#B8B8BE] border border-[#E7E9EE]/60 dark:border-white/5">
                <span className="text-[10px] uppercase font-bold text-[#626873] dark:text-[#85858D] block mb-1">
                  Recorded Note:
                </span>
                "{selectedMoment.note}"
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#E7E9EE] dark:border-white/10">
              <Button variant="outline" size="sm" onClick={() => setSelectedMoment(null)}>
                Close Inspection
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">
            Are you sure you want to delete this captured moment? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E9EE] dark:border-white/10">
            <Button variant="ghost" size="sm" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
