"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Activity, Menu, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function FloatingNav() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: "Overview", href: "#hero" },
    { label: "About", href: "#about" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Privacy", href: "#privacy" },
  ];

  return (
    <header className="fixed top-6 inset-x-0 z-40 max-w-6xl mx-auto px-4 sm:px-6">
      <nav className="bg-white/90 dark:bg-[#141417]/90 backdrop-blur-md rounded-full px-5 py-3 flex items-center justify-between border border-[#E7E9EE] dark:border-white/15 shadow-lg shadow-black/[0.04]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-[#FFF1E8] dark:bg-[#F07832]/20 border border-[#F07832]/30 dark:border-[#F07832]/40 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 text-[#F07832]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-widest text-[#17191F] dark:text-white uppercase font-mono">
              FOCUS<span className="text-[#F07832]"> // </span>MONITOR
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs font-semibold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#F07832] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#E76520] dark:hover:bg-[#fa8846] transition-all shadow-md shadow-[#F07832]/20"
            >
              Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#F07832] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#E76520] dark:hover:bg-[#fa8846] transition-all shadow-md shadow-[#F07832]/20"
              >
                Get Started
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white focus:outline-none"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden mt-3 p-5 rounded-2xl bg-white/95 dark:bg-[#141417]/95 backdrop-blur-md border border-[#E7E9EE] dark:border-white/15 shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-sm font-semibold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white py-1"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-[#E7E9EE] dark:border-white/10 flex flex-col gap-2">
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="text-center py-2.5 rounded-full bg-[#F07832] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#E76520]"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2 text-xs font-semibold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2.5 rounded-full bg-[#F07832] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#E76520]"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
