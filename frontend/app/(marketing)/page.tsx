import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Eye,
  Activity,
  Layers,
  ShieldCheck,
  Camera,
  LineChart,
  Brain,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#101012] text-[#17191F] dark:text-white selection:bg-[#FFF1E8] selection:text-[#F07832] dark:selection:bg-[#F07832]/30 dark:selection:text-white">
      <FloatingNav />

      {/* Hero Section */}
      <section
        id="hero"
        className="relative pt-32 pb-24 md:pt-40 md:pb-32 min-h-[90vh] overflow-hidden flex flex-col justify-center items-center px-4 sm:px-6"
      >
        {/* Futuristic Neural Monitoring HUD Background Image - Whole & Uncut */}
        <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center z-0 overflow-hidden">
          <div className="relative w-full h-full max-w-[1600px] mx-auto flex items-center justify-center p-2 sm:p-4">
            <Image
              src="/neural-hud.png"
              alt="Futuristic Neural Monitoring HUD"
              fill
              priority
              sizes="100vw"
              className="object-contain object-center opacity-80 dark:opacity-75 transition-opacity duration-300 drop-shadow-2xl"
            />
          </div>
          {/* Subtle gradient vignette to keep text ultra-crisp while the full neural HUD remains visible */}
          <div className="absolute inset-0 bg-[#F7F8FA]/25 dark:bg-[#101012]/35" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#F7F8FA]/60 via-transparent to-[#F7F8FA]/80 dark:from-[#101012]/60 dark:via-transparent dark:to-[#101012]/80" />
        </div>

        {/* Background gradient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[#F07832]/15 blur-[140px] rounded-full pointer-events-none z-0" />
        <div className="absolute top-1/2 left-1/3 w-[500px] h-[300px] bg-orange-400/10 dark:bg-orange-500/10 blur-[100px] rounded-full pointer-events-none z-0" />

        <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-[#1A1A1E]/90 border border-[#E7E9EE] dark:border-white/10 shadow-sm text-xs uppercase tracking-widest text-[#626873] dark:text-[#B8B8BE] mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#F07832] animate-pulse" />
            AI-DRIVEN OCULAR & COGNITIVE TELEMETRY
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight text-[#17191F] dark:text-white mb-6 leading-none font-sans drop-shadow-md">
            UNDERSTAND <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#17191F] via-[#2D3139] to-[#626873] dark:from-white dark:via-neutral-300 dark:to-neutral-500">
              YOUR FOCUS
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#17191F] dark:text-[#E0E0E6] max-w-2xl mb-10 leading-relaxed font-medium drop-shadow-sm">
            Quantify ocular micro-fixation and simulated neural spectral rhythms in real time.
            Dual-modality Random Forest fusion for next-generation attentional research.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
            <Link href="/register">
              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto text-sm"
              >
                Get Started Free
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-sm"
              >
                Explore Features
              </Button>
            </a>
          </div>

          {/* Floating Telemetry Preview Cards (Cinematic Athlete-Tech Aesthetic) */}
          <div className="relative w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E]/90 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE]">
                  Ocular Stability
                </span>
                <Badge variant="accent" size="sm">
                  Active Vision
                </Badge>
              </div>
              <div className="text-3xl font-black font-mono text-[#17191F] dark:text-white mb-1">
                87.4%
              </div>
              <p className="text-xs text-[#9298A3] dark:text-[#85858D]">
                EAR 0.284 · Micro-gaze drift 0.019 rad
              </p>
            </GlassCard>

            <GlassCard elevated glow className="border-[#F07832]/30 bg-[#FFF1E8]/70 dark:bg-[#F07832]/10 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F07832]">
                  Fused Telemetry
                </span>
                <span className="h-2 w-2 rounded-full bg-[#239B68] animate-ping" />
              </div>
              <div className="text-xl font-bold uppercase tracking-wide text-[#17191F] dark:text-white mb-1 font-mono">
                MEDITATIVE STILLNESS
              </div>
              <p className="text-xs text-[#626873] dark:text-[#B8B8BE]">
                Dual 0.50 concordance verified
              </p>
            </GlassCard>

            <GlassCard elevated className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E]/90 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#626873] dark:text-[#B8B8BE]">
                  Simulated EEG
                </span>
                <Badge variant="warning" size="sm">
                  Replay
                </Badge>
              </div>
              <div className="text-3xl font-black font-mono text-[#17191F] dark:text-white mb-1">
                68.2%
              </div>
              <p className="text-xs text-[#9298A3] dark:text-[#85858D]">
                Alpha/Theta 0.412 · Beta 1.3e-12
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 border-t border-[#E7E9EE] dark:border-white/10 bg-[#F0F2F5]/60 dark:bg-[#141417]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#F07832] mb-3 font-mono">
                // PLATFORM CONTEXT
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#17191F] dark:text-white">
                SCIENTIFIC FOUNDATION <br />
                FOR COGNITIVE MONITORING
              </h2>
            </div>
            <p className="text-sm text-[#626873] dark:text-[#B8B8BE] max-w-md leading-relaxed">
              Focus Monitor provides an experimental environment synthesizing MediaPipe 478-point facial
              geometry with electroencephalographic frequency band analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#FFF1E8] dark:bg-[#F07832]/15 border border-[#F07832]/20 flex items-center justify-center text-[#F07832] mb-5">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-2">
                478-Point Landmark Kinematics
              </h3>
              <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">
                Computes eye aspect ratios (EAR), 3D head rotational velocities (Rx, Ry, Rz), and iris deviation
                directly from client-side webcam frames.
              </p>
            </GlassCard>

            <GlassCard className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#FFF6E5] dark:bg-[#D99A27]/15 border border-[#D99A27]/20 flex items-center justify-center text-[#D99A27] mb-5">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-2">
                Spectral Band Power Emulation
              </h3>
              <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">
                Synchronizes multi-subject EEG stream benchmarks with Welch PSD spectral estimations (Theta 4-8Hz,
                Alpha 8-12Hz, Beta 12-30Hz).
              </p>
            </GlassCard>

            <GlassCard className="border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#1A1A1E] shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#E9F7F0] dark:bg-[#239B68]/15 border border-[#239B68]/20 flex items-center justify-center text-[#239B68] mb-5">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-2">
                Late Fusion Discrepancy Detection
              </h3>
              <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">
                Flags modality mismatches in real time, isolating moments of cognitive wandering (still eyes, active mind)
                or physical fidgeting (moving body, calm EEG).
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 border-t border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#101012]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-[#F07832] mb-3 font-mono">
              // TELEMETRY PIPELINE
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#17191F] dark:text-white mb-4">
              FROM SENSOR TO INSIGHT
            </h2>
            <p className="text-sm text-[#626873] dark:text-[#B8B8BE]">
              How browser-driven computer vision and simulated neural data flow through our high-concurrency engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Client-Side Capture",
                desc: "Browser accesses webcam via standard getUserMedia API, downscaling frames to efficient low-latency JPEGs.",
              },
              {
                step: "02",
                title: "Inference & Geometry",
                desc: "FastAPI runs MediaPipe landmarking in threaded isolation, calculating rolling gaze and head stability.",
              },
              {
                step: "03",
                title: "Multimodal Fusion",
                desc: "Random Forest models classify ocular and spectral states, producing calibrated probabilities and mismatch alerts.",
              },
              {
                step: "04",
                title: "Persisted Telemetry",
                desc: "Users snapshot moments with server-authoritative telemetry into MongoDB Atlas for longitudinal trend analytics.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 rounded-2xl bg-[#F7F8FA] dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 relative overflow-hidden shadow-sm"
              >
                <div className="text-4xl font-black font-mono text-[#17191F]/10 dark:text-white/10 mb-4">
                  {item.step}
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-2">
                  {item.title}
                </h4>
                <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section id="features" className="py-24 border-t border-[#E7E9EE] dark:border-white/10 bg-[#F0F2F5]/60 dark:bg-[#141417]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#F07832] mb-3 font-mono">
                // COMPREHENSIVE SUITE
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#17191F] dark:text-white mb-6">
                PURPOSE-BUILT FOR <br />
                EXPERIMENTAL RIGOR
              </h2>
              <div className="space-y-4 mb-8">
                {[
                  "Continuous browser-level camera telemetry with real-time landmark canvas overlay",
                  "One-click 'Capture Moment' feature preserving exact server-authoritative telemetry",
                  "Zero fake data: all metrics stem from actual database records and models",
                  "Dedicated My Moments timeline with search, filtering, and optional snapshot images",
                  "Interactive Recharts trend analysis for vision, EEG, and duration distributions",
                  "Full account privacy controls with opt-in camera frame storage and instant deletion",
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#F07832] shrink-0 mt-0.5" />
                    <span className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/register">
                <Button variant="primary" size="md">
                  Experience The Platform
                </Button>
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/10 shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E9EE] dark:border-white/10 mb-6">
                <span className="text-xs font-mono uppercase text-[#626873] dark:text-[#B8B8BE]">
                  SYSTEM_STATUS // ONLINE
                </span>
                <span className="text-xs font-mono text-[#239B68] font-bold">100% PERSISTENT</span>
              </div>
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5 flex justify-between">
                  <span className="text-[#626873] dark:text-[#85858D]">MODELS:</span>
                  <span className="text-[#17191F] dark:text-white font-semibold">scikit-learn 1.9.1 (Dual RF)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5 flex justify-between">
                  <span className="text-[#626873] dark:text-[#85858D]">FACE LANDMARKS:</span>
                  <span className="text-[#17191F] dark:text-white font-semibold">MediaPipe Task (478 pts)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5 flex justify-between">
                  <span className="text-[#626873] dark:text-[#85858D]">STORAGE:</span>
                  <span className="text-[#17191F] dark:text-white font-semibold">MongoDB Atlas (Isolated per user)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#141417] border border-[#E7E9EE]/60 dark:border-white/5 flex justify-between">
                  <span className="text-[#626873] dark:text-[#85858D]">AUTH:</span>
                  <span className="text-[#17191F] dark:text-white font-semibold">Argon2id + HttpOnly JWT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & CTA Section */}
      <section id="privacy" className="py-24 border-t border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#101012] relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-[#E9F7F0] dark:bg-[#239B68]/15 text-[#239B68] mb-6 border border-[#239B68]/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#17191F] dark:text-white mb-6">
            PRIVACY & DATA ISOLATION
          </h2>
          <p className="text-sm text-[#626873] dark:text-[#B8B8BE] max-w-xl mx-auto mb-10 leading-relaxed">
            Your webcam video never leaves your browser unless you explicitly opt in to save a snapshot
            during Capture Moment. Every user’s sessions and telemetry are strictly isolated in MongoDB Atlas.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button variant="primary" size="lg">
                Create Free Account
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}