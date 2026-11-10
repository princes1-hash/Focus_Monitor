"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Camera,
  History,
  BarChart3,
  User,
  ArrowRight,
  Play,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiClient } from "@/lib/api/client";
import { AnalyticsOverview, Session, Moment } from "@/lib/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [recentMoments, setRecentMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [overviewData, momentsData] = await Promise.all([
          apiClient<AnalyticsOverview>("/api/analytics/overview"),
          apiClient<{ items: Moment[] }>("/api/moments?page=1&page_size=4"),
        ]);
        setOverview(overviewData);
        setRecentMoments(momentsData.items || []);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const totalSessions = overview?.total_sessions || 0;
  const totalMoments = overview?.total_moments || 0;
  const avgVision = overview?.avg_vision_score !== null && overview?.avg_vision_score !== undefined
    ? Math.round(overview.avg_vision_score * 100)
    : null;
  const avgEeg = overview?.avg_eeg_score !== null && overview?.avg_eeg_score !== undefined
    ? Math.round(overview.avg_eeg_score * 100)
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Orientation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E7E9EE] dark:border-white/10">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F07832] mb-1">
            // TELEMETRY COMMAND CENTER
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17191F] dark:text-white">
            WELCOME, {user?.name || "RESEARCHER"}
          </h1>
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE] mt-1">
            Real-time ocular micro-stability and simulated neural synchrony workspace.
          </p>
        </div>

        <Link href="/monitor">
          <Button
            variant="primary"
            size="md"
            icon={<Play className="w-4 h-4 fill-current" />}
          >
            Start Monitoring
          </Button>
        </Link>
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Live Monitor", href: "/monitor", icon: Eye, color: "text-[#F07832]" },
          { label: "My Moments", href: "/moments", icon: Camera, color: "text-[#17191F] dark:text-white" },
          { label: "History", href: "/history", icon: History, color: "text-[#17191F] dark:text-white" },
          { label: "Analytics", href: "/analytics", icon: BarChart3, color: "text-[#239B68]" },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href}>
              <div className="p-4 rounded-xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 hover:border-[#F07832]/30 hover:bg-[#FFF1E8]/30 dark:hover:bg-[#F07832]/10 transition-all shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-[#F0F2F5] dark:bg-[#242428] ${action.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
                    {action.label}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#9298A3] dark:text-[#85858D] group-hover:text-[#F07832] transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Metric Cards - Real Stored Data Only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] block mb-2">
            Completed Sessions
          </span>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black font-mono text-[#17191F] dark:text-white">
              {totalSessions}
            </span>
            <span className="text-xs text-[#9298A3] dark:text-[#85858D] font-mono">Sessions</span>
          </div>
          <p className="text-[11px] text-[#626873] dark:text-[#85858D]">
            Persisted in MongoDB Atlas
          </p>
        </GlassCard>

        <GlassCard>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] block mb-2">
            Captured Moments
          </span>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black font-mono text-[#17191F] dark:text-white">
              {totalMoments}
            </span>
            <span className="text-xs text-[#9298A3] dark:text-[#85858D] font-mono">Snapshots</span>
          </div>
          <p className="text-[11px] text-[#626873] dark:text-[#85858D]">
            Authoritative telemetry points
          </p>
        </GlassCard>

        <GlassCard>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] block mb-2">
            Avg Vision Score
          </span>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black font-mono text-[#17191F] dark:text-white">
              {avgVision !== null ? `${avgVision}%` : "--"}
            </span>
            <span className="text-xs text-[#9298A3] dark:text-[#85858D] font-mono">
              {overview?.avg_vision_score ? `(${overview.avg_vision_score})` : "No data"}
            </span>
          </div>
          <p className="text-[11px] text-[#626873] dark:text-[#85858D]">
            Frame-weighted ocular stillness
          </p>
        </GlassCard>

        <GlassCard>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] block mb-2">
            Avg EEG Score (Sim)
          </span>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black font-mono text-[#17191F] dark:text-white">
              {avgEeg !== null ? `${avgEeg}%` : "--"}
            </span>
            <span className="text-xs text-[#9298A3] dark:text-[#85858D] font-mono">
              {overview?.avg_eeg_score ? `(${overview.avg_eeg_score})` : "No data"}
            </span>
          </div>
          <p className="text-[11px] text-[#626873] dark:text-[#85858D]">
            Benchmark spectral power replay
          </p>
        </GlassCard>
      </div>

      {/* Latest Session & Recent Moments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Session Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
              Most Recent Session
            </h3>
            <Link
              href="/history"
              className="text-xs text-[#F07832] hover:text-[#E76520] transition-colors font-semibold"
            >
              View Full History →
            </Link>
          </div>

          {overview?.latest_session ? (
            <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-md p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E7E9EE] dark:border-white/10 gap-2 mb-4">
                <div>
                  <span className="text-xs text-[#9298A3] dark:text-[#85858D] font-mono block">
                    SESSION ID: {overview.latest_session.id}
                  </span>
                  <span className="text-sm font-bold uppercase text-[#17191F] dark:text-white">
                    {new Date(overview.latest_session.started_at).toLocaleDateString(undefined, {
                      dateStyle: "full",
                    })}
                  </span>
                </div>
                <Badge
                  variant={overview.latest_session.status === "completed" ? "success" : "warning"}
                  size="sm"
                >
                  {overview.latest_session.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs mb-4">
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                  <span className="text-[#626873] dark:text-[#85858D] block text-[10px]">ACTIVE TIME</span>
                  <span className="text-[#17191F] dark:text-white font-bold">
                    {overview.latest_session.active_duration_seconds
                      ? `${Math.floor(overview.latest_session.active_duration_seconds / 60)}m ${overview.latest_session.active_duration_seconds % 60}s`
                      : "0s"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                  <span className="text-[#626873] dark:text-[#85858D] block text-[10px]">FRAMES</span>
                  <span className="text-[#17191F] dark:text-white font-bold">
                    {overview.latest_session.aggregated_metrics?.frames_analyzed || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                  <span className="text-[#626873] dark:text-[#85858D] block text-[10px]">MOMENTS</span>
                  <span className="text-[#17191F] dark:text-white font-bold">
                    {overview.latest_session.moments_count || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5">
                  <span className="text-[#626873] dark:text-[#85858D] block text-[10px]">MISMATCH %</span>
                  <span className="text-[#17191F] dark:text-white font-bold">
                    {overview.latest_session.summary?.discrepancy_ratio != null
                      ? `${Math.round(overview.latest_session.summary.discrepancy_ratio * 100)}%`
                      : "--"}
                  </span>
                </div>
              </div>

              {overview.latest_session.summary?.dominant_fused_state && (
                <div className="p-3 rounded-xl bg-[#FFF1E8] dark:bg-[#F07832]/15 border border-[#F07832]/25 text-xs text-[#17191F] dark:text-white">
                  <span className="text-[#F07832] font-bold uppercase tracking-wider block text-[10px] mb-0.5">
                    DOMINANT CLASSIFICATION
                  </span>
                  {overview.latest_session.summary.dominant_fused_state}
                </div>
              )}
            </GlassCard>
          ) : (
            <EmptyState
              icon={Eye}
              title="No Monitoring Sessions Yet"
              description="Launch your webcam to begin logging ocular stability and simulated EEG telemetry."
              actionText="Start First Session"
              onAction={() => (window.location.href = "/monitor")}
            />
          )}
        </div>

        {/* Recent Captured Moments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
              Recent Moments
            </h3>
            <Link
              href="/moments"
              className="text-xs text-[#F07832] hover:text-[#E76520] transition-colors font-semibold"
            >
              View All →
            </Link>
          </div>

          {recentMoments.length > 0 ? (
            <div className="space-y-3">
              {recentMoments.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 hover:border-[#F07832]/30 shadow-sm transition-all flex items-center justify-between gap-3"
                >
                  <div className="overflow-hidden">
                    <span className="text-xs font-bold text-[#17191F] dark:text-white uppercase block truncate">
                      {m.fused_state}
                    </span>
                    <span className="text-[10px] text-[#626873] dark:text-[#85858D] font-mono block">
                      {new Date(m.timestamp).toLocaleTimeString()} · Vision:{" "}
                      {m.vision_score ? Math.round(m.vision_score * 100) : "--"}%
                    </span>
                    {m.note && (
                      <p className="text-[11px] text-[#626873] dark:text-[#B8B8BE] truncate mt-1">
                        "{m.note}"
                      </p>
                    )}
                  </div>
                  <Badge variant={m.discrepancy_alert ? "warning" : "success"} size="sm">
                    {m.fused_code}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Camera}
              title="No Moments Captured"
              description="Capture telemetry snapshots during monitoring to build your historical moment archive."
            />
          )}
        </div>
      </div>
    </div>
  );
}
