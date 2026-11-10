import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "neutral" | "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  className = "",
  dot = false,
}: BadgeProps) {
  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-[10px] font-semibold tracking-wider",
    md: "px-3 py-1 text-xs font-semibold tracking-wider",
  };

  const variantClasses = {
    neutral: "bg-[#F0F2F5] dark:bg-white/5 text-[#626873] dark:text-[#B8B8BE] border border-[#E7E9EE] dark:border-white/10",
    accent: "bg-[#FFF1E8] dark:bg-[#F07832]/15 text-[#F07832] border border-[#F07832]/30",
    success: "bg-[#E9F7F0] dark:bg-[#58B88A]/15 text-[#239B68] dark:text-[#58B88A] border border-[#239B68]/30 dark:border-[#58B88A]/30",
    warning: "bg-[#FFF6E5] dark:bg-[#E6B45C]/15 text-[#D99A27] dark:text-[#E6B45C] border border-[#D99A27]/30 dark:border-[#E6B45C]/30",
    danger: "bg-[#FDEEEE] dark:bg-[#E36A6A]/15 text-[#DC5555] dark:text-[#E36A6A] border border-[#DC5555]/30 dark:border-[#E36A6A]/30",
  };

  const dotColor = {
    neutral: "bg-[#9298A3]",
    accent: "bg-[#F07832]",
    success: "bg-[#239B68]",
    warning: "bg-[#D99A27]",
    danger: "bg-[#DC5555]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full uppercase ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full animate-pulse ${dotColor[variant]}`}
        />
      )}
      {children}
    </span>
  );
}

