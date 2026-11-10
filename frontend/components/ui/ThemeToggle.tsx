"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      aria-label="Toggle theme"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer text-xs font-semibold uppercase tracking-wider ${
        theme === "dark"
          ? "bg-[#1A1A1E] border-white/15 text-[#E6B45C] hover:bg-[#242428] hover:border-white/25 hover:text-white"
          : "bg-white border-[#E7E9EE] text-[#F07832] hover:bg-[#F0F2F5] hover:border-[#D1D5DB] shadow-sm"
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
        {theme === "dark" ? (
          <Moon className="w-4 h-4 text-[#E6B45C]" />
        ) : (
          <Sun className="w-4 h-4 text-[#F07832]" />
        )}
      </div>
      {showLabel ? (
        <span className="font-mono text-[11px]">
          {theme === "dark" ? "Dark Theme" : "Light Theme"}
        </span>
      ) : (
        <span className="font-mono text-[11px] hidden sm:inline">
          {theme === "dark" ? "Dark" : "Light"}
        </span>
      )}
    </button>
  );
}

