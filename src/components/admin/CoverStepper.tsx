"use client";

/**
 * Stepper tactile pour régler les couverts restants d'un créneau.
 *
 * Partagé entre la tablette (`admin-tablette/DaySettingsPopup`) et le desktop
 * (`admin/reservations/DayOverrideModal`).
 *
 * - boutons −/+ (cibles de 44 px), pas de 1 ;
 * - appui long = répétition accélérée ;
 * - appui sur le chiffre = valeurs rapides + saisie clavier en dernier recours.
 */

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/utils/haptics";
import {
  clampRemainingCovers,
  coverLevel,
  MAX_REMAINING_COVERS,
} from "@/lib/utils/slot-day-settings";

const QUICK_VALUES = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24];

const HOLD_DELAY_MS = 400;
const REPEAT_START_MS = 150;
const REPEAT_MIN_MS = 50;

interface CoverStepperProps {
  /** Couverts restants affichés. */
  value: number;
  /** Couverts déjà réservés sur le créneau. */
  reservedCovers: number;
  onChange: (remaining: number) => void;
  disabled?: boolean;
  /** Modification locale non enregistrée. */
  isModified?: boolean;
}

export function CoverStepper({
  value,
  reservedCovers,
  onChange,
  disabled,
  isModified,
}: CoverStepperProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [draft, setDraft] = useState("");

  // Références à jour pour la répétition de l'appui long (évite les closures périmées).
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRepeat = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => stopRepeat, []);
  useEffect(() => {
    if (disabled) stopRepeat();
  }, [disabled]);

  const step = (delta: number): boolean => {
    const next = clampRemainingCovers(valueRef.current + delta);
    if (next === valueRef.current) return false;
    valueRef.current = next;
    onChangeRef.current(next);
    triggerHaptic("tick");
    return true;
  };

  const startRepeat = (delta: number) => {
    stopRepeat();
    if (!step(delta)) return;
    let interval = REPEAT_START_MS;
    const tick = () => {
      if (!step(delta)) {
        stopRepeat();
        return;
      }
      interval = Math.max(REPEAT_MIN_MS, interval * 0.85);
      timerRef.current = setTimeout(tick, interval);
    };
    timerRef.current = setTimeout(tick, HOLD_DELAY_MS);
  };

  const isStepDisabled = (delta: number) =>
    disabled || (delta < 0 ? value <= 0 : value >= MAX_REMAINING_COVERS);

  const stepButtonProps = (delta: number) => ({
    type: "button" as const,
    disabled: isStepDisabled(delta),
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      startRepeat(delta);
    },
    onPointerUp: stopRepeat,
    onPointerCancel: stopRepeat,
    onLostPointerCapture: stopRepeat,
    // Clavier uniquement (detail === 0) : la souris et le tactile passent par onPointerDown.
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0) step(delta);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const commitDraft = () => {
    if (draft.trim() !== "") {
      onChange(clampRemainingCovers(parseInt(draft, 10)));
    }
    setDraft("");
    setIsPickerOpen(false);
  };

  const level = coverLevel(value, reservedCovers);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col items-start gap-0.5">
        <div
          className={cn(
            "flex items-center rounded-xl border bg-white select-none touch-manipulation",
            disabled ? "border-slate-100 opacity-50" : "border-slate-200"
          )}
        >
          <button
            {...stepButtonProps(-1)}
            aria-label="Retirer un couvert"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-l-xl",
              isStepDisabled(-1) ? "text-slate-300" : "text-slate-600 active:bg-slate-100"
            )}
          >
            <Minus size={18} />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsPickerOpen((open) => !open)}
            aria-label={`${value} couverts restants, choisir une valeur`}
            aria-expanded={isPickerOpen}
            className={cn(
              "relative flex h-11 min-w-[3rem] flex-col items-center justify-center px-1 tabular-nums",
              "border-x border-slate-100 active:bg-slate-50"
            )}
          >
            <span
              className={cn(
                "text-base font-semibold leading-none",
                level === "full" && "text-red-600",
                level === "low" && "text-amber-600",
                level === "ok" && "text-slate-900"
              )}
            >
              {value}
            </span>
            {isModified && (
              <span
                className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500"
                aria-label="Modifié, non enregistré"
              />
            )}
          </button>

          <button
            {...stepButtonProps(1)}
            aria-label="Ajouter un couvert"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-r-xl",
              isStepDisabled(1) ? "text-slate-300" : "text-slate-600 active:bg-slate-100"
            )}
          >
            <Plus size={18} />
          </button>
        </div>

        {reservedCovers > 0 && (
          <span className="pl-1 text-[11px] leading-tight text-slate-500">
            {reservedCovers} réservé{reservedCovers > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isPickerOpen && !disabled && (
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <div className="grid grid-cols-5 gap-1.5">
            {QUICK_VALUES.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => {
                  onChange(quick);
                  triggerHaptic("tick");
                  setIsPickerOpen(false);
                }}
                className={cn(
                  "h-10 rounded-lg text-sm font-medium tabular-nums touch-manipulation",
                  quick === value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 active:bg-slate-200"
                )}
              >
                {quick}
              </button>
            ))}
          </div>
          <form
            className="mt-2 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              commitDraft();
            }}
          >
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_REMAINING_COVERS}
              placeholder="Autre valeur"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={draft.trim() === ""}
              className="h-10 rounded-lg bg-emerald-500 px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              OK
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
