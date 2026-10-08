"use client";

/**
 * Contrôles d'une ligne de créneau (tablette) : jauge et stepper des places aux
 * couleurs du bandeau des réservations, résumé des options et choix de la taille
 * de groupe. Partagé par `admin-tablette/DaySettingsPopup` et l'éditeur de période.
 */

import { useEffect, useRef } from "react";
import { AlertTriangle, Minus, MoreHorizontal, Plus, UsersRound } from "lucide-react";
import { triggerHaptic } from "@/lib/utils/haptics";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { BRUME_GAUGE, getGaugeLevel, type GaugeLevel } from "@/lib/constants/brume";
import type { CapacityShapeSummaryDto } from "@/components/admin/SlotCapacityShapeEditor";

// ── Fermeture au toucher extérieur ──────────────────────────────

/** Attribut posé sur le créneau ouvert et les boutons ⋯ : un toucher dedans ne referme pas. */
export const SLOT_POPOVER_ATTR = "data-slot-popover";

/** Referme les options ouvertes dès qu'on touche ailleurs que dans le créneau ou sur un bouton ⋯. */
export function useCloseOnOutsidePointer(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(`[${SLOT_POPOVER_ATTR}]`)) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);
}

// ── Jauge et stepper des places ─────────────────────────────────

/** Libellé sur fond clair, même teinte que la barre (vert, jaune, orange, rouge). */
const LEVEL_TEXT: Record<GaugeLevel, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-orange-600",
  full: "text-red-600",
};

const HOLD_DELAY_MS = 400;
const REPEAT_START_MS = 150;
const REPEAT_MIN_MS = 50;

/**
 * Comme le bandeau du service dans la liste des réservations :
 * barre de remplissage · « x dispo » | − +.
 * La barre montre les couverts réservés sur la capacité, à la couleur de la jauge ;
 * appui long sur − ou + = répétition accélérée. Tout passe en gris quand le créneau est fermé.
 */
export function SlotCoverStepper({
  value,
  reservedCovers,
  min,
  max,
  isOpen,
  onChange,
  unit,
  showBar = true,
  ariaLabel,
}: {
  value: number;
  /** Couverts réservés : avec `value`, ils déterminent la barre et la couleur (0 dans une période). */
  reservedCovers: number;
  min: number;
  max: number;
  /** Créneau ouvert (sinon tout est grisé et le libellé indique « fermé »). */
  isOpen: boolean;
  onChange: (value: number) => void;
  /** « dispo » (réglages du jour) ou « places » (période). */
  unit: "dispo" | "places";
  /** Masquée dans une période, où il n'y a pas encore de réservations. */
  showBar?: boolean;
  ariaLabel: string;
}) {
  const capacity = value + reservedCovers;
  const level: GaugeLevel = value <= 0 ? "full" : getGaugeLevel(reservedCovers, capacity);
  const fill = capacity > 0 ? Math.min(1, reservedCovers / capacity) : 1;
  const text = !isOpen ? "fermé" : unit === "places" ? `${value} places` : value > 0 ? `${value} dispo` : "complet";

  // Références à jour pour la répétition de l'appui long (évite les closures périmées).
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRepeat = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => stopRepeat, []);
  useEffect(() => {
    if (!isOpen) stopRepeat();
  }, [isOpen]);

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, valueRef.current + delta));
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
      if (!step(delta)) return stopRepeat();
      interval = Math.max(REPEAT_MIN_MS, interval * 0.85);
      timerRef.current = setTimeout(tick, interval);
    };
    timerRef.current = setTimeout(tick, HOLD_DELAY_MS);
  };

  const renderButton = (delta: number) => {
    const disabled = !isOpen || (delta < 0 ? value <= min : value >= max);
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={`${delta < 0 ? "Retirer" : "Ajouter"} une place — ${ariaLabel}`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          startRepeat(delta);
        }}
        onPointerUp={stopRepeat}
        onPointerCancel={stopRepeat}
        onLostPointerCapture={stopRepeat}
        // Clavier uniquement (detail === 0) : la souris et le tactile passent par onPointerDown.
        onClick={(e) => {
          if (e.detail === 0) step(delta);
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 touch-manipulation transition-colors active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:text-slate-300"
      >
        {delta < 0 ? <Minus size={20} strokeWidth={2.2} /> : <Plus size={20} strokeWidth={2.2} />}
      </button>
    );
  };

  return (
    <div className="flex items-center select-none">
      {showBar && (
        <span aria-hidden className="mx-2 h-1 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200">
          <span
            className="block h-full rounded-full transition-[width] duration-200"
            style={{ width: `${fill * 100}%`, backgroundColor: isOpen ? BRUME_GAUGE[level].bar : "#CBD5E1" }}
          />
        </span>
      )}
      <span
        aria-live="polite"
        className={cn(
          "w-[74px] shrink-0 whitespace-nowrap text-[15px] font-semibold tabular-nums",
          isOpen ? LEVEL_TEXT[level] : "text-slate-400"
        )}
      >
        {text}
      </span>
      <span aria-hidden className="mx-1.5 h-5 w-px bg-slate-200" />
      {renderButton(-1)}
      {renderButton(1)}
    </div>
  );
}

// ── Résumé des options ──────────────────────────────────────────

/** Table vue de dessus avec une chaise de chaque côté (même trait que lucide). */
function TableIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M2.5 10v4M21.5 10v4" />
    </svg>
  );
}

/**
 * Largeur fixe, même vide : les colonnes restent alignées d'une ligne à l'autre.
 * Groupe limité en bleu, tables actives en vert, à revoir en orange.
 */
export function SlotMeta({
  maxGroupSize,
  capacityShape,
}: {
  maxGroupSize: number | null;
  capacityShape?: CapacityShapeSummaryDto;
}) {
  const needsReview = capacityShape?.needsReview ?? false;
  const isActive = (capacityShape?.enabled ?? false) || needsReview;
  const tables = isActive ? (capacityShape?.buckets ?? []).reduce((sum, b) => sum + b.quantity, 0) : 0;
  return (
    <span className="flex w-[52px] shrink-0 items-center justify-end gap-1 text-xs font-bold tabular-nums">
      {maxGroupSize !== null && (
        <span className="flex items-center gap-0.5 text-[#2F5B86]" title={`Groupe de ${maxGroupSize} maximum`}>
          <UsersRound size={14} strokeWidth={1.8} aria-hidden />
          {maxGroupSize}
        </span>
      )}
      {(tables > 0 || needsReview) && (
        <span
          className={cn("flex items-center gap-0.5", needsReview ? "text-amber-700" : "text-green-700")}
          title={needsReview ? "Tables restantes à revoir" : "Tables restantes"}
        >
          {needsReview ? <AlertTriangle size={13} strokeWidth={2.2} aria-hidden /> : <TableIcon />}
          {tables}
        </span>
      )}
    </span>
  );
}

/** Bouton ⋯ qui ouvre les options sous la ligne. */
export function SlotOptionsButton({ isOpen, onClick, label }: { isOpen: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-label={label}
      {...{ [SLOT_POPOVER_ATTR]: "" }}
      className={cn(
        "flex h-11 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 touch-manipulation transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        isOpen && "bg-slate-100 text-slate-900"
      )}
    >
      <MoreHorizontal size={18} />
    </button>
  );
}

// ── Taille de groupe ────────────────────────────────────────────

const GROUP_CHOICES: (number | null)[] = [null, 2, 4, 6, 8];

/** Ligne « Groupe » : un toucher sur libre, 2, 4, 6 ou 8. Une autre valeur existante s'ajoute à la liste. */
export function GroupSizeRow({ value, onChange }: { value: number | null; onChange: (maxGroupSize: number | null) => void }) {
  const choices = value === null || GROUP_CHOICES.includes(value)
    ? GROUP_CHOICES
    : [...GROUP_CHOICES, value].sort((a, b) => (a ?? 0) - (b ?? 0));
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[54px] shrink-0 text-[12.5px] font-bold text-slate-600">Groupe</span>
      <SegmentedControl
        ariaLabel="Taille de groupe maximale"
        size="sm"
        fill
        className="flex-1"
        value={value === null ? "libre" : String(value)}
        onChange={(next) => onChange(next === "libre" ? null : Number(next))}
        options={choices.map((choice) => ({
          value: choice === null ? "libre" : String(choice),
          label: <span className="font-semibold tabular-nums">{choice === null ? "libre" : choice}</span>,
          ariaLabel: choice === null ? "Groupe libre" : `${choice} personnes maximum`,
        }))}
      />
    </div>
  );
}
