"use client";

interface LoadingSpinnerProps {
  visible: boolean;
}

export function LoadingSpinner({ visible }: LoadingSpinnerProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-50"
      role="status"
      aria-label="Chargement en cours"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <span className="sr-only">Chargement...</span>
      </div>
    </div>
  );
}
