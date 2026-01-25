"use client";

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";

/** Default auto-dismiss duration in ms */
const DEFAULT_TOAST_DURATION = 4000;

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, variant: ToastVariant, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within ToastProvider");
  }
  return context;
}

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant, duration = DEFAULT_TOAST_DURATION) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: Toast = { id, message, variant, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          timersRef.current.delete(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    // Clear timer if toast is manually dismissed
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export function useToast() {
  const context = useToastContext();

  return {
    toast: {
      success: (message: string, duration?: number) =>
        context.addToast(message, "success", duration),
      error: (message: string, duration?: number) =>
        context.addToast(message, "error", duration),
      info: (message: string, duration?: number) =>
        context.addToast(message, "info", duration),
      warning: (message: string, duration?: number) =>
        context.addToast(message, "warning", duration),
    },
    dismiss: context.removeToast,
  };
}

export { ToastContext };
