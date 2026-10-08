"use client";

/**
 * Stepper tactile pour régler les couverts restants d'un créneau.
 *
 * Partagé entre la tablette (`admin-tablette/DaySettingsPopup`) et le desktop
 * (`admin/reservations/DayOverrideModal`).
 *
 * - boutons −/+ ronds (zone tactile de 36×44 px), pas de 1 ;
 * - appui long = répétition accélérée.
 *
 * `layout="inline"` reprend l'en-tête de créneau de la liste des réservations :
 * « x dispo » coloré selon le remplissage, séparateur, puis −/+ sans bordure.
 */

import { useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRUME_GAUGE, getGaugeLevel } from "@/lib/constants/brume";
import { triggerHaptic } from "@/lib/utils/haptics";
import {
  clampRemainingCovers,
  coverLevel,
  MAX_REMAINING_COVERS,
} from "@/lib/utils/slot-day-settings";

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
  /** Typographie du chiffre, alignée sur celle de l'heure du créneau. */
  valueClassName?: string;
  /**
   * Agrandit boutons et icônes à partir de `lg` (≥ 1024 px, iPad mini paysage)
   * sans dépasser la zone tactile de 44 px de haut.
   */
  large?: boolean;
  /** `stepper` : − valeur + (défaut) ; `inline` : « x dispo » | − + (style en-tête de créneau). */
  layout?: "stepper" | "inline";
  /** Bornes de saisie (défaut : 0 à MAX_REMAINING_COVERS). */
  min?: number;
  max?: number;
}

export function CoverStepper({
  value,
  reservedCovers,
  onChange,
  disabled,
  isModified,
  valueClassName,
  large,
  layout = "stepper",
  min = 0,
  max = MAX_REMAINING_COVERS,
}: CoverStepperProps) {

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
    const next = Math.max(min, clampRemainingCovers(valueRef.current + delta, max));
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
    disabled || (delta < 0 ? value <= min : value >= max);

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

  const level = coverLevel(value, reservedCovers);

  const renderStepButton = (delta: number) => {
    const isDisabled = isStepDisabled(delta);
    if (layout === "inline") {
      return (
        <button
          {...stepButtonProps(delta)}
          aria-label={delta < 0 ? "Retirer un couvert" : "Ajouter un couvert"}
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 touch-manipulation transition-colors active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:text-slate-300"
        >
          {delta < 0 ? <Minus size={20} strokeWidth={2.2} /> : <Plus size={20} strokeWidth={2.2} />}
        </button>
      );
    }
    return (
      <button
        {...stepButtonProps(delta)}
        aria-label={delta < 0 ? "Retirer un couvert" : "Ajouter un couvert"}
        className={cn(
          "group flex h-11 w-9 shrink-0 items-center justify-center touch-manipulation focus:outline-none",
          large && "lg:w-11"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border bg-white transition-colors",
            large && "lg:h-10 lg:w-10",
            "group-focus-visible:ring-2 group-focus-visible:ring-emerald-500",
            isDisabled
              ? "border-slate-100 text-slate-300"
              : "border-slate-200 text-slate-600 group-active:bg-slate-100"
          )}
        >
          {delta < 0 ? (
            <Minus size={14} className={cn(large && "lg:h-[18px] lg:w-[18px]")} />
          ) : (
            <Plus size={14} className={cn(large && "lg:h-[18px] lg:w-[18px]")} />
          )}
        </span>
      </button>
    );
  };

  const modifiedDot = isModified && (
    <span
      className="absolute -right-0.5 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-500"
      aria-label="Modifié, non enregistré"
    />
  );

  if (layout === "inline") {
    const gauge = BRUME_GAUGE[getGaugeLevel(reservedCovers, value + reservedCovers)];
    return (
      <div
        className={cn("flex items-center select-none", disabled && "opacity-50")}
        title={reservedCovers > 0 ? `${reservedCovers} réservé${reservedCovers > 1 ? "s" : ""}` : undefined}
      >
        <span
          className={cn("relative min-w-[4.5rem] tabular-nums lg:min-w-[4.75rem]", valueClassName)}
          style={{ color: gauge.ink }}
          aria-live="polite"
        >
          {value > 0 ? `${value} dispo` : "complet"}
          {modifiedDot}
        </span>
        <span aria-hidden className="mr-0.5 h-5 w-px bg-slate-200" />
        {renderStepButton(-1)}
        {renderStepButton(1)}
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center select-none", disabled && "opacity-50")}
      title={reservedCovers > 0 ? `${reservedCovers} réservé${reservedCovers > 1 ? "s" : ""}` : undefined}
    >
      {renderStepButton(-1)}
      <span
        className={cn(
          "relative min-w-[2rem] text-center tabular-nums",
          large && "lg:min-w-[2.5rem]",
          valueClassName,
          level === "full" && "text-red-600",
          level === "low" && "text-amber-600"
        )}
        aria-live="polite"
      >
        {value}
        {modifiedDot}
      </span>
      {renderStepButton(1)}
    </div>
  );
}
