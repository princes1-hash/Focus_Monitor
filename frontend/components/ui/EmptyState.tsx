import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E]/30 shadow-sm ${className}`}
    >
      {Icon && (
        <div className="p-4 rounded-full bg-[#FFF1E8] dark:bg-white/5 border border-[#F07832]/20 dark:border-white/10 text-[#F07832] mb-4">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h4 className="text-base font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-2">
        {title}
      </h4>
      <p className="text-sm text-[#626873] dark:text-[#85858D] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

