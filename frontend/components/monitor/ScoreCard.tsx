import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface ScoreCardProps {
  title: string;
  score: number | null;
  subtitle: string;
  sourceLabel: string;
  componentsText?: string;
  accentColor?: string;
}

export function ScoreCard({
  title,
  score,
  subtitle,
  sourceLabel,
  componentsText,
  accentColor = "#F07832",
}: ScoreCardProps) {
  const percentage = score !== null ? Math.round(score * 100) : null;

  return (
    <GlassCard className="flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE]">
            {title}
          </span>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 text-[#626873] dark:text-[#B8B8BE]">
            {sourceLabel}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-black font-mono tracking-tight text-[#17191F] dark:text-white">
            {percentage !== null ? `${percentage}%` : "--"}
          </span>
          <span className="text-xs text-[#9298A3] dark:text-[#85858D] font-mono">
            {score !== null ? `(${score.toFixed(3)})` : "Waiting"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#F0F2F5] dark:bg-[#141417] h-2 rounded-full overflow-hidden border border-[#E7E9EE] dark:border-white/10 mb-3">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percentage ?? 0}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
      </div>

      <div className="pt-3 border-t border-[#E7E9EE] dark:border-white/10">
        <p className="text-xs text-[#626873] dark:text-[#B8B8BE] mb-1">{subtitle}</p>
        {componentsText && (
          <p className="text-[10px] text-[#9298A3] dark:text-[#85858D] font-mono">{componentsText}</p>
        )}
      </div>
    </GlassCard>
  );
}

