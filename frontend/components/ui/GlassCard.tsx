import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  glow?: boolean;
}

export function GlassCard({
  children,
  className = "",
  elevated = false,
  glow = false,
  ...props
}: GlassCardProps) {
  const base = elevated
    ? "bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 shadow-[0_10px_30px_rgba(20,25,35,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
    : "bg-white/95 dark:bg-[#1A1A1E]/90 backdrop-blur-md border border-[#E7E9EE] dark:border-white/10 shadow-[0_4px_20px_rgba(20,25,35,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]";
  const glowClass = glow ? "ring-1 ring-[#F07832]/30 shadow-[0_8px_30px_rgba(240,120,50,0.15)] dark:shadow-[0_8px_32px_rgba(240,120,50,0.25)]" : "";

  return (
    <div
      className={`rounded-2xl p-6 transition-all duration-300 ${base} ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
