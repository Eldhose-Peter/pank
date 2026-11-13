'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message };

      setToasts((prev) => [...prev, newToast]);

      const timeoutMs = type === 'error' ? 5000 : 3500;
      setTimeout(() => {
        removeToast(id);
      }, timeoutMs);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast(message, 'success', title),
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string) => showToast(message, 'error', title),
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string) => showToast(message, 'info', title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast viewport with safe-area and sticky bar clearance */}
      <aside
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-5 inset-x-3 sm:inset-x-auto sm:right-5 sm:max-w-sm sm:w-full z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-white/95 text-emerald-950 dark:border-emerald-900/60 dark:bg-zinc-900/95 dark:text-emerald-100 shadow-emerald-500/10'
                : toast.type === 'error'
                ? 'border-red-200 bg-white/95 text-red-950 dark:border-red-900/60 dark:bg-zinc-900/95 dark:text-red-100 shadow-red-500/10'
                : 'border-zinc-200 bg-white/95 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-100 shadow-indigo-500/10'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 animate-scale-check" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
                  <Info className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <h4 className="text-xs font-bold tracking-tight text-zinc-900 dark:text-white">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs font-medium leading-relaxed opacity-90">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 -mr-1.5 -mt-1.5 rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
