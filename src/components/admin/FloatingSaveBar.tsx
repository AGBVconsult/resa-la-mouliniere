"use client";

/**
 * Barre « Annuler / Enregistrer » flottante (Liquid Glass), centrée en bas d'un
 * conteneur positionné (modal). Visible uniquement quand il y a des modifications.
 * Annuler ferme le modal sans enregistrer.
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./FloatingSaveBar.module.css";

interface FloatingSaveBarProps {
  visible: boolean;
  /** Nombre d'éléments modifiés, affiché à gauche des boutons. */
  changeCount: number;
  /** Remplace le libellé « x créneaux modifiés ». */
  label?: string;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function FloatingSaveBar({ visible, changeCount, label, isSaving, onCancel, onSave }: FloatingSaveBarProps) {
  return (
    <div
      inert={!visible}
      aria-hidden={!visible}
      data-visible={visible}
      className={cn(
        styles.bar,
        "absolute inset-x-0 bottom-5 z-10 mx-auto w-fit",
        "flex items-center gap-3 rounded-full py-2 pl-5 pr-2"
      )}
    >
      <span className={cn(styles.label, "whitespace-nowrap text-sm")}>
        {label ?? `${changeCount} créneau${changeCount > 1 ? "x" : ""} modifié${changeCount > 1 ? "s" : ""}`}
      </span>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className={cn(styles.button, styles.cancel, "h-11 rounded-full px-5 text-sm font-medium disabled:opacity-50")}
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className={cn(
          styles.button,
          styles.save,
          "flex h-11 min-w-[8.5rem] items-center justify-center rounded-full px-6 text-sm font-semibold disabled:opacity-60"
        )}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
      </button>
    </div>
  );
}
