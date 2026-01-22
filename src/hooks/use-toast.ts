"use client";

import { useState, useCallback, createContext, useContext } from "react";

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

  const addToast = useCallback(
    (message: string, variant: ToastVariant, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: Toast = { id, message, variant, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
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
