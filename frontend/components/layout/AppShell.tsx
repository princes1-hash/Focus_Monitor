"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Home,
  LayoutDashboard,
  Eye,
  Camera,
  History,
  BarChart3,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load persisted collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fm_sidebar_collapsed");
      if (saved === "true") {
        setSidebarCollapsed(true);
      }
    } catch (e) {}
  }, []);

  const toggleSidebar = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem("fm_sidebar_collapsed", String(collapsed));
    } catch (e) {}
  };

  const navigation = [
    { name: "Home", href: "/", icon: Home, exact: true },
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Live Monitor", href: "/monitor", icon: Eye },
    { name: "My Moments", href: "/moments", icon: Camera },
    { name: "Session History", href: "/history", icon: History },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Profile & Privacy", href: "/profile", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#101012] flex flex-col md:flex-row text-[#17191F] dark:text-white transition-colors duration-200">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white dark:bg-[#141417] border-b border-[#E7E9EE] dark:border-white/10 shadow-sm px-4 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#FFF1E8] dark:bg-[#F07832]/20 border border-[#F07832]/30 dark:border-[#F07832]/40 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-[#F07832]" />
          </div>
          <span className="text-xs font-black tracking-widest text-[#17191F] dark:text-white uppercase font-mono">
            FOCUS // MONITOR
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar for Desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#141417]/90 backdrop-blur-xl shrink-0 sticky top-0 h-screen justify-between shadow-sm transition-all duration-300 ease-in-out ${
          sidebarCollapsed
            ? "w-0 p-0 border-r-0 opacity-0 pointer-events-none -translate-x-full overflow-hidden"
            : "w-64 p-5 opacity-100 translate-x-0"
        }`}
      >
        <div className="flex flex-col">
          {/* Logo & Collapse Header */}
          <div className="flex items-center justify-between mb-8 px-2">
            <button
              onClick={() => toggleSidebar(true)}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
              title="Click to move sidebar aside"
            >
              <div className="w-8 h-8 rounded-full bg-[#FFF1E8] dark:bg-[#F07832]/20 border border-[#F07832]/30 dark:border-[#F07832]/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4 text-[#F07832]" />
              </div>
              <span className="text-sm font-black tracking-widest text-[#17191F] dark:text-white uppercase font-mono">
                FOCUS<span className="text-[#F07832]"> // </span>MONITOR
              </span>
            </button>
            <button
              onClick={() => toggleSidebar(true)}
              className="p-1.5 rounded-lg text-[#9298A3] hover:text-[#17191F] dark:hover:text-white hover:bg-[#F0F2F5] dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Move sidebar aside"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 group ${
                    active
                      ? "bg-[#FFF1E8] dark:bg-[#F07832]/15 text-[#F07832] border border-[#F07832]/30 font-bold shadow-sm"
                      : "text-[#626873] dark:text-[#B8B8BE] hover:text-[#17191F] dark:hover:text-white hover:bg-[#F0F2F5] dark:hover:bg-white/5"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active
                        ? "text-[#F07832]"
                        : "text-[#9298A3] dark:text-[#85858D] group-hover:text-[#17191F] dark:group-hover:text-white"
                    }`}
                  />
                  <span>{item.name}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#F07832]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card, Theme Toggle & Logout */}
        <div className="pt-4 border-t border-[#E7E9EE] dark:border-white/10 space-y-3">
          {/* Theme switcher row */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9298A3] dark:text-[#85858D]">
              Appearance
            </span>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F0F2F5] dark:bg-white/[0.03] border border-[#E7E9EE] dark:border-white/5">
            <div className="flex flex-col overflow-hidden mr-2">
              <span className="text-xs font-bold text-[#17191F] dark:text-white truncate">
                {user?.name || "Authenticated User"}
              </span>
              <span className="text-[10px] text-[#626873] dark:text-[#85858D] font-mono truncate">
                {user?.email || ""}
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-[#239B68] dark:bg-[#58B88A] animate-pulse shrink-0" />
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-[#DC5555] dark:text-[#E36A6A] hover:bg-[#FDEEEE] dark:hover:bg-[#E36A6A]/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-[#101012] flex flex-col p-6 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between pb-6 border-b border-[#E7E9EE] dark:border-white/10 mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#F07832]" />
              <span className="text-sm font-black tracking-widest text-[#17191F] dark:text-white uppercase font-mono">
                FOCUS // MONITOR
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-full text-[#626873] dark:text-[#B8B8BE]"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="space-y-2 flex-1">
            {navigation.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider ${
                    active
                      ? "bg-[#FFF1E8] dark:bg-[#F07832]/15 text-[#F07832] border border-[#F07832]/30"
                      : "text-[#626873] dark:text-[#B8B8BE]"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-[#E7E9EE] dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-mono uppercase text-[#626873] dark:text-[#85858D]">
                Theme Mode
              </span>
              <ThemeToggle showLabel />
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full py-3 rounded-xl bg-[#FDEEEE] dark:bg-[#E36A6A]/15 text-[#DC5555] dark:text-[#E36A6A] text-xs font-bold uppercase tracking-wider"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Page Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all duration-300">
        {/* Floating Expand Sidebar Trigger when sidebar is moved aside */}
        {sidebarCollapsed && (
          <div className="mb-6 hidden md:flex items-center">
            <button
              onClick={() => toggleSidebar(false)}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 shadow-sm hover:shadow-md hover:border-[#F07832]/40 transition-all text-xs font-mono font-bold tracking-wider uppercase text-[#17191F] dark:text-white group cursor-pointer"
              title="Click to bring back the sidebar"
            >
              <div className="w-7 h-7 rounded-full bg-[#FFF1E8] dark:bg-[#F07832]/20 border border-[#F07832]/30 dark:border-[#F07832]/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4 text-[#F07832]" />
              </div>
              <span>
                FOCUS<span className="text-[#F07832]"> // </span>MONITOR
              </span>
              <PanelLeftOpen className="w-4 h-4 text-[#9298A3] dark:text-[#85858D] group-hover:text-[#F07832] ml-1 transition-colors" />
            </button>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
