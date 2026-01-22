"use client";

import { type ReactNode } from "react";
import { ToastContainer } from "./toast";
import { ToastContext, useToastState } from "@/hooks/use-toast";

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { toasts, addToast, removeToast } = useToastState();

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}
