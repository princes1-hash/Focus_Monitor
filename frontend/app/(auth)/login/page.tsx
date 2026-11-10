"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reason = searchParams.get("reason");
  const redirectTarget = searchParams.get("from") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await login(email, password);
      router.push(redirectTarget);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-9 h-9 rounded-full bg-[#FFF1E8] dark:bg-[#F07832]/20 border border-[#F07832]/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Activity className="w-4 h-4 text-[#F07832]" />
          </div>
          <span className="text-base font-black tracking-widest text-[#17191F] dark:text-white uppercase font-mono">
            FOCUS<span className="text-[#F07832]"> // </span>MONITOR
          </span>
        </Link>
        <h2 className="text-2xl font-black uppercase tracking-tight text-[#17191F] dark:text-white mb-2">
          Sign In
        </h2>
        <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
          Access your real-time ocular and cognitive monitoring dashboard
        </p>
      </div>

      <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-xl p-8 rounded-3xl">
        {reason === "expired" && (
          <div className="p-3 rounded-xl bg-[#FFF6E5] dark:bg-[#D99A27]/15 border border-[#D99A27]/30 text-[#D99A27] text-xs mb-6">
            Your previous session expired. Please sign in again.
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FDEEEE] dark:bg-[#DC5555]/15 border border-[#DC5555]/30 text-[#DC5555] text-xs mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9298A3] dark:text-[#85858D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 pl-10 pr-4 py-2.5 text-xs text-[#17191F] dark:text-white placeholder-[#9298A3] dark:placeholder-[#85858D] focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9298A3] dark:text-[#85858D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 pl-10 pr-10 py-2.5 text-xs text-[#17191F] dark:text-white placeholder-[#9298A3] dark:placeholder-[#85858D] focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-[#9298A3] hover:text-[#17191F] dark:hover:text-white absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            icon={<ArrowRight className="w-4 h-4" />}
            className="w-full mt-2"
          >
            Sign In
          </Button>
        </form>

        <div className="pt-6 mt-6 border-t border-[#E7E9EE] dark:border-white/10 text-center">
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-bold text-[#F07832] hover:text-[#E76520] transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#101012] flex items-center justify-center p-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <Suspense fallback={<div className="text-xs text-[#626873] dark:text-[#B8B8BE]">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
