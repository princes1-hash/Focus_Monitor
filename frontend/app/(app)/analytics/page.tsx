"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { BarChart3, Calendar, Layers, Activity } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { apiClient } from "@/lib/api/client";
import { AnalyticsTrends } from "@/lib/types/api";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatIndiaDate, formatIndiaTime, parseUtcDate } from "@/lib/utils/date";

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const { error } = useToast();
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
      if (dateTo) params.set("to", new Date(dateTo).toISOString());

      const data = await apiClient<AnalyticsTrends>(`/api/analytics/trends?${params.toString()}`);
      setTrends(data);
    } catch (err: any) {
      console.error("Failed to load analytics trends:", err);
      error(err.message || "Failed to load telemetry analytics.");
      setTrends(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Filter out 0-second empty test sessions when meaningful sessions exist
  const validSessions =
    trends?.sessions.filter((s) => (s.active_duration_seconds && s.active_duration_seconds > 0) || s.avg_vision_score !== null) || [];
  const sessionsToDisplay = validSessions.length > 0 ? validSessions : trends?.sessions || [];

  const sessionChartData = sessionsToDisplay.map((s, idx) => {
    const dateStr = formatIndiaDate(s.started_at, { month: "short", day: "numeric" });
    const timeStr = formatIndiaTime(s.started_at);
    const durationMins = Math.max(1, Math.round((s.active_duration_seconds || 0) / 60));

    return {
      id: s.session_id,
      session: `S#${idx + 1}`,
      displayLabel: `S#${idx + 1} (${timeStr})`,
      date: dateStr,
      time: timeStr,
      vision: s.avg_vision_score !== null && s.avg_vision_score !== undefined ? Math.round(s.avg_vision_score * 100) : null,
      eeg: s.avg_eeg_score !== null && s.avg_eeg_score !== undefined ? Math.round(s.avg_eeg_score * 100) : null,
      duration: durationMins,
      durationSeconds: s.active_duration_seconds || 0,
      moments: s.moments_count || 0,
    };
  });

  const momentsChartData =
    trends?.moments_per_day.map((m) => {
      const formatted = formatIndiaDate(m.date, { month: "short", day: "numeric" });
      return {
        date: formatted,
        rawDate: m.date,
        moments: m.count,
      };
    }) || [];

  const hasData = sessionChartData.length > 0;
  const isDark = theme === "dark";

  const gridStroke = isDark ? "rgba(255, 255, 255, 0.08)" : "#E7E9EE";
  const axisStroke = isDark ? "#85858D" : "#626873";

  // Dynamic Hover Tooltips for accurate point-by-point inspection
  const CustomScoreTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 shadow-2xl backdrop-blur-xl text-xs space-y-2.5 min-w-[200px] animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E9EE] dark:border-white/10">
          <span className="font-black text-[#17191F] dark:text-white uppercase font-mono tracking-wider">
            {data.session} • {data.date}
          </span>
          <span className="text-[10px] text-[#F07832] font-mono font-bold bg-[#FFF1E8] dark:bg-[#F07832]/15 px-2 py-0.5 rounded-md">
            {data.time} IST
          </span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-[#626873] dark:text-[#B8B8BE] text-[11px] font-medium">{entry.name}</span>
              </div>
              <span className="font-black font-mono text-[#17191F] dark:text-white">
                {entry.value !== null && entry.value !== undefined ? `${entry.value}%` : "N/A"}
              </span>
            </div>
          ))}
        </div>
        {data.durationSeconds > 0 && (
          <div className="pt-2 border-t border-[#E7E9EE] dark:border-white/10 flex items-center justify-between text-[10px] text-[#626873] dark:text-[#85858D] font-mono">
            <span>Duration:</span>
            <span className="text-[#17191F] dark:text-white font-bold">
              {data.duration} min ({data.durationSeconds}s)
            </span>
          </div>
        )}
      </div>
    );
  };

  const CustomDurationTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 shadow-2xl backdrop-blur-xl text-xs space-y-2 min-w-[190px] animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E9EE] dark:border-white/10">
          <span className="font-black text-[#17191F] dark:text-white uppercase font-mono tracking-wider">
            {data.session} • {data.date}
          </span>
          <span className="text-[10px] text-[#626873] dark:text-[#85858D] font-mono font-medium">
            {data.time} IST
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#626873] dark:text-[#B8B8BE]">Active Duration:</span>
          <span className="font-black font-mono text-[#F07832] text-sm">
            {data.duration} min <span className="text-xs font-normal text-[#9298A3]">({data.durationSeconds}s)</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] pt-1 border-t border-[#E7E9EE] dark:border-white/10">
          <span className="text-[#626873] dark:text-[#85858D]">Moments Captured:</span>
          <span className="font-bold font-mono text-[#17191F] dark:text-white">{data.moments}</span>
        </div>
      </div>
    );
  };

  const CustomMomentsTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 shadow-2xl backdrop-blur-xl text-xs space-y-2 min-w-[170px] animate-in fade-in-50 zoom-in-95 duration-150">
        <div className="font-black text-[#17191F] dark:text-white uppercase font-mono tracking-wider pb-1.5 border-b border-[#E7E9EE] dark:border-white/10">
          {data.date}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#626873] dark:text-[#B8B8BE]">Saved Moments:</span>
          <span className="font-black font-mono text-[#6875D9] text-sm">{data.moments}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E9EE] dark:border-white/10">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F07832] mb-1 block">
            // LONGITUDINAL TRENDS
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#17191F] dark:text-white">
            TELEMETRY ANALYTICS
          </h1>
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE] mt-1">
            Empirical trends across completed monitoring sessions and moment captures.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono text-[#626873] dark:text-[#85858D]">FROM</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-3 py-1.5 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono text-[#626873] dark:text-[#85858D]">TO</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 px-3 py-1.5 text-xs text-[#17191F] dark:text-white focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] font-mono"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={fetchAnalytics}>
            Apply Filter
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs font-mono text-[#626873] dark:text-[#B8B8BE]">
          Synthesizing historical telemetry charts...
        </div>
      ) : hasData ? (
        <div className="space-y-8">
          {/* Chart 1: Dual Modality Confidence Trends */}
          <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E9EE] dark:border-white/10">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
                  Vision vs. EEG Confidence Score Trends
                </h3>
                <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
                  Comparing mean ocular micro-fixation with simulated neural band power synchrony.
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase text-[#F07832] font-semibold">PERCENTAGE (%)</span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sessionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="displayLabel" stroke={axisStroke} fontSize={11} tickLine={false} />
                  <YAxis stroke={axisStroke} fontSize={11} domain={[0, 100]} tickLine={false} />
                  <Tooltip content={<CustomScoreTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Line
                    type="monotone"
                    dataKey="vision"
                    name="Vision Score"
                    stroke="#F07832"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#F07832" }}
                    activeDot={{ r: 7, fill: "#F07832", stroke: "#FFFFFF", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="eeg"
                    name="EEG Score (Simulated)"
                    stroke="#6875D9"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#6875D9" }}
                    activeDot={{ r: 7, fill: "#6875D9", stroke: "#FFFFFF", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Chart 2: Session Active Durations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-md p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E9EE] dark:border-white/10">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
                    Active Session Durations
                  </h3>
                  <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
                    Active monitoring duration in minutes per session.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#626873] dark:text-[#85858D]">MINUTES</span>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="displayLabel" stroke={axisStroke} fontSize={11} tickLine={false} />
                    <YAxis stroke={axisStroke} fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomDurationTooltip />} />
                    <Bar dataKey="duration" name="Minutes" fill="#F07832" opacity={0.85} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Chart 3: Moments Saved Per Day */}
            <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-md p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E9EE] dark:border-white/10">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white">
                    Moments Captured Over Time
                  </h3>
                  <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
                    Daily distribution of saved telemetry snapshots.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#F07832] font-semibold">DAILY COUNT</span>
              </div>

              <div className="h-64 w-full pt-4">
                {momentsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={momentsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="date" stroke={axisStroke} fontSize={11} tickLine={false} />
                      <YAxis stroke={axisStroke} fontSize={11} tickLine={false} />
                      <Tooltip content={<CustomMomentsTooltip />} />
                      <Bar dataKey="moments" name="Moments" fill="#6875D9" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#626873] dark:text-[#B8B8BE]">
                    No captured moments in this range.
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Insufficient Data For Trend Visualization"
          description="Complete at least one monitoring session to view longitudinal focus confidence scores and duration trends."
          actionText="Start Monitoring Session"
          onAction={() => (window.location.href = "/monitor")}
        />
      )}
    </div>
  );
}
