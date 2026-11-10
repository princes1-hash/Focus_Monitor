"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Eye, EyeOff, Lock, Mail, User, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password || !confirmPassword) {
      setErrorMsg("Please fill out all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 10) {
      setErrorMsg("Password must be at least 10 characters long.");
      return;
    }

    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setErrorMsg("Password must contain at least one letter and one number.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await register(name.trim(), email, password, confirmPassword);
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#101012] flex items-center justify-center p-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md mx-auto">
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
            Create Account
          </h2>
          <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
            Start real-time ocular and simulated EEG telemetry monitoring
          </p>
        </div>

        <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-xl p-8 rounded-3xl">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FDEEEE] dark:bg-[#DC5555]/15 border border-[#DC5555]/30 text-[#DC5555] text-xs mb-6">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9298A3] dark:text-[#85858D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Asha Rao"
                  required
                  maxLength={80}
                  className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 pl-10 pr-4 py-2.5 text-xs text-[#17191F] dark:text-white placeholder-[#9298A3] dark:placeholder-[#85858D] focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
                />
              </div>
            </div>

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
                  placeholder="asha@example.com"
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
                  placeholder="At least 10 chars with letter & digit"
                  required
                  minLength={10}
                  maxLength={128}
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9298A3] dark:text-[#85858D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE] dark:border-white/10 pl-10 pr-4 py-2.5 text-xs text-[#17191F] dark:text-white placeholder-[#9298A3] dark:placeholder-[#85858D] focus:outline-none focus:border-[#F07832] focus:bg-white dark:focus:bg-[#1A1A1E] transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
              className="w-full mt-3"
            >
              Create Account
            </Button>
          </form>

          <div className="pt-6 mt-6 border-t border-[#E7E9EE] dark:border-white/10 text-center">
            <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-[#F07832] hover:text-[#E76520] transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
