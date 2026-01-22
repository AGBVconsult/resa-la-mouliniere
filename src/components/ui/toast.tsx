"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Toast, ToastVariant } from "@/hooks/use-toast";

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; text: string; icon: typeof CheckCircle }
> = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    icon: CheckCircle,
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: XCircle,
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: Info,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: AlertTriangle,
  },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const style = VARIANT_STYLES[toast.variant];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg",
        "min-w-[280px] max-w-[400px]",
        style.bg,
        style.border
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", style.text)} />
      <p className={cn("flex-1 text-sm font-medium", style.text)}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={cn(
          "p-1 rounded-full hover:bg-black/5 transition-colors shrink-0",
          style.text
        )}
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
