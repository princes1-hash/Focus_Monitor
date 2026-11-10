"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info", title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((msg: string, title?: string) => addToast(msg, "success", title), [addToast]);
  const error = useCallback((msg: string, title?: string) => addToast(msg, "error", title), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-[#1A1A1E] border border-[#E7E9EE] dark:border-white/15 shadow-xl animate-in slide-in-from-bottom-5 duration-200"
          >
            {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-[#239B68] dark:text-[#58B88A] shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertCircle className="w-5 h-5 text-[#DC5555] dark:text-[#E36A6A] shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="w-5 h-5 text-[#F07832] shrink-0 mt-0.5" />}
            <div className="flex-1">
              {t.title && <h5 className="text-xs font-bold uppercase tracking-wider text-[#17191F] dark:text-white mb-0.5">{t.title}</h5>}
              <p className="text-xs text-[#626873] dark:text-[#B8B8BE] leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[#9298A3] dark:text-[#85858D] hover:text-[#17191F] dark:hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

