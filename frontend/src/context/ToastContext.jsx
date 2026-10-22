"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message, { variant = "success", duration = 4000 } = {}) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({
      id: Date.now(),
      message,
      variant,
    });

    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        setToast(null);
      }, duration);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-20 lg:bottom-8 right-4 sm:right-8 z-50 pointer-events-none flex flex-col items-end gap-2 max-w-md w-full"
      >
        {toast && (
          <div
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-4 duration-200 ${
              toast.variant === "error"
                ? "bg-red-50 text-red-900 border-red-200"
                : "bg-slate-900 text-white border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.variant === "error" ? (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
              )}
              <span>{toast.message}</span>
            </div>

            <button
              type="button"
              onClick={hideToast}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
