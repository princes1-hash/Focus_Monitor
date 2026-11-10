import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-xs font-semibold tracking-wider",
    md: "px-5 py-2.5 text-sm font-semibold tracking-wider",
    lg: "px-7 py-3.5 text-base font-bold tracking-wider",
  };

  const variantClasses = {
    primary:
      "bg-[#F07832] text-white hover:bg-[#E76520] dark:hover:bg-[#fa8846] shadow-md shadow-[#F07832]/20 dark:shadow-[#F07832]/25 active:scale-[0.98]",
    secondary:
      "bg-white dark:bg-[#1A1A1E] text-[#17191F] dark:text-[#F5F5F5] border border-[#E7E9EE] dark:border-white/10 hover:bg-[#F0F2F5] dark:hover:bg-[#242428] hover:border-[#D1D5DB] dark:hover:border-white/25 active:scale-[0.98] shadow-sm",
    danger:
      "bg-[#FDEEEE] dark:bg-[#E36A6A]/15 text-[#DC5555] dark:text-[#E36A6A] border border-[#DC5555]/30 dark:border-[#E36A6A]/30 hover:bg-[#FDEEEE]/80 dark:hover:bg-[#E36A6A]/25 active:scale-[0.98]",
    outline:
      "bg-transparent text-[#17191F] dark:text-[#F5F5F5] border border-[#E7E9EE] dark:border-white/20 hover:border-[#F07832] dark:hover:border-white/40 hover:bg-[#FFF1E8]/50 dark:hover:bg-white/5 active:scale-[0.98]",
    ghost:
      "bg-transparent text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white hover:bg-[#F0F2F5] dark:hover:bg-white/5 active:scale-[0.98]",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full uppercase transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

