"use client";

/**
 * Barre « Annuler / Enregistrer » flottante, centrée en bas d'un conteneur
 * positionné (modal). Visible uniquement quand il y a des modifications.
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingSaveBarProps {
  visible: boolean;
  /** Nombre d'éléments modifiés, affiché à gauche des boutons. */
  changeCount: number;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function FloatingSaveBar({ visible, changeCount, isSaving, onCancel, onSave }: FloatingSaveBarProps) {
  return (
    <div
      inert={!visible}
      aria-hidden={!visible}
      // transform/opacity en style inline : globals.css force plusieurs classes
      // utilitaires (translate, opacity…) en !important.
      style={{ transform: visible ? "translateY(0)" : "translateY(1rem)", opacity: visible ? 1 : 0 }}
      className={cn(
        "absolute inset-x-0 bottom-5 z-10 mx-auto w-fit",
        "flex items-center gap-3 rounded-full border border-slate-200 bg-white py-2 pl-5 pr-2 shadow-xl",
        "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
        !visible && "pointer-events-none"
      )}
    >
      <span className="whitespace-nowrap text-sm text-slate-600">
        {changeCount} créneau{changeCount > 1 ? "x" : ""} modifié{changeCount > 1 ? "s" : ""}
      </span>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="h-11 rounded-full px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="flex h-11 min-w-[8.5rem] items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
      </button>
    </div>
  );
}
