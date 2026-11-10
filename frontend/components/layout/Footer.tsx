import React from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#E7E9EE] dark:border-white/10 bg-white dark:bg-[#0C0C0E] pt-16 pb-12 text-[#626873] dark:text-[#85858D] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#FFF1E8] dark:bg-[#F07832]/20 border border-[#F07832]/30 dark:border-[#F07832]/40 flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#F07832]" />
              </div>
              <span className="text-sm font-black tracking-widest text-[#17191F] dark:text-white uppercase font-mono">
                FOCUS<span className="text-[#F07832]"> // </span>MONITOR
              </span>
            </div>
            <p className="text-xs text-[#626873] dark:text-[#85858D] leading-relaxed max-w-sm mb-4">
              AI-driven ocular and simulated EEG telemetry platform evaluating ocular stability,
              gaze velocity, head pose, and spectral indicators for attentional research.
            </p>
            <div className="p-3.5 rounded-xl bg-[#FFF6E5] dark:bg-white/[0.03] border border-[#D99A27]/20 dark:border-white/5 text-[11px] leading-relaxed text-[#626873] dark:text-[#B8B8BE]">
              <span className="text-[#D99A27] dark:text-[#E6B45C] font-semibold uppercase tracking-wider block mb-1">
                Notice & Disclaimer
              </span>
              This system is an experimental focus estimation platform and does not provide medical diagnoses,
              neurological evaluations, or direct measurement of mental states.
            </div>
          </div>

          {/* Platform */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-4">
              Platform
            </h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/monitor" className="hover:text-[#17191F] dark:hover:text-white transition-colors">
                  Live Monitoring
                </Link>
              </li>
              <li>
                <Link href="/moments" className="hover:text-[#17191F] dark:hover:text-white transition-colors">
                  Captured Moments
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-[#17191F] dark:hover:text-white transition-colors">
                  Session History
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-[#17191F] dark:hover:text-white transition-colors">
                  Telemetry Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Privacy & Legal */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-4">
              Security & Privacy
            </h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <span className="text-[#626873] dark:text-[#B8B8BE]">Browser Camera Processing</span>
              </li>
              <li>
                <span className="text-[#626873] dark:text-[#B8B8BE]">Consent-Based Frame Storage</span>
              </li>
              <li>
                <span className="text-[#626873] dark:text-[#B8B8BE]">Strict User Isolation</span>
              </li>
              <li>
                <span className="text-[#626873] dark:text-[#B8B8BE]">Simulated EEG Transparency</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E7E9EE] dark:border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#9298A3] dark:text-[#85858D] gap-4">
          <p>© 2026 Focus Monitor Platform. All rights reserved.</p>
          <p className="font-mono text-[11px]">VERSION 1.0.0 // ML PIPELINE ACTIVE</p>
        </div>
      </div>
    </footer>
  );
}
