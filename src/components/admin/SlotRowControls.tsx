"use client";

/**
 * Contrôles d'une ligne de créneau (tablette) : curseur de places aux couleurs de
 * la jauge du bandeau des réservations, résumé des options et choix de la taille
 * de groupe. Partagé par `admin-tablette/DaySettingsPopup` et l'éditeur de période.
 */

import { useEffect, type CSSProperties } from "react";
import { AlertTriangle, MoreHorizontal, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
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

// ── Curseur ─────────────────────────────────────────────────────

/** Borne haute du curseur des places disponibles (élargie si la valeur la dépasse). */
export const COVER_SLIDER_MAX = 30;

/** Libellé sur fond clair, même teinte que la barre (vert, jaune, orange, rouge). */
const LEVEL_TEXT: Record<GaugeLevel, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-orange-600",
  full: "text-red-600",
};

/**
 * Curseur des places + libellé « x dispo » (ou « x places » dans une période).
 * La piste fine et le rond plein prennent la couleur de la jauge du bandeau ;
 * tout passe en gris quand le créneau est fermé.
 */
export function SlotSlider({
  value,
  reservedCovers,
  min,
  max,
  isOpen,
  onChange,
  unit,
  ariaLabel,
}: {
  value: number;
  /** Couverts réservés : avec `value`, ils déterminent la couleur (0 dans une période). */
  reservedCovers: number;
  min: number;
  max: number;
  /** Créneau ouvert (sinon curseur grisé et libellé « fermé »). */
  isOpen: boolean;
  onChange: (value: number) => void;
  /** « dispo » (réglages du jour) ou « places » (période). */
  unit: "dispo" | "places";
  ariaLabel: string;
}) {
  const level: GaugeLevel = value <= 0 ? "full" : getGaugeLevel(reservedCovers, value + reservedCovers);
  const upper = Math.max(max, value);
  const percent = ((Math.min(upper, Math.max(min, value)) - min) / (upper - min)) * 100;
  const text = !isOpen ? "fermé" : unit === "places" ? `${value} places` : value > 0 ? `${value} dispo` : "complet";
  const style = {
    "--slot-range-color": isOpen ? BRUME_GAUGE[level].bar : "#CBD5E1",
    "--slot-range-percent": `${percent}%`,
  } as CSSProperties;
  return (
    <>
      <input
        type="range"
        min={min}
        max={upper}
        step={1}
        value={value}
        disabled={!isOpen}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        aria-valuetext={text}
        // Largeur plafonnée (220 px) et marges de part et d'autre : le curseur reste court
        // même sur grand écran ; l'espace restant va avant les options (voir les lignes).
        className="slot-range mx-3 min-w-[120px] max-w-[220px] flex-1"
        style={style}
      />
      <span
        className={cn(
          "w-[74px] shrink-0 whitespace-nowrap text-[15px] font-extrabold tabular-nums",
          isOpen ? LEVEL_TEXT[level] : "text-slate-400"
        )}
      >
        {text}
      </span>
    </>
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
 * Largeur fixe, même vide : tous les curseurs gardent la même longueur.
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
    <span className="flex w-[58px] shrink-0 items-center justify-end gap-1.5 text-xs font-bold tabular-nums">
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
        "flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 touch-manipulation transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        isOpen && "bg-slate-100 text-slate-900"
      )}
    >
      <MoreHorizontal size={18} />
    </button>
  );
}

// ── Taille de groupe ────────────────────────────────────────────

const GROUP_CHOICES: (number | null)[] = [null, 2, 4, 6, 8, 10, 12];

/** Ligne « Groupe » : un toucher sur libre, 2, 4… 12. Une autre valeur existante s'ajoute à la liste. */
export function GroupSizeRow({ value, onChange }: { value: number | null; onChange: (maxGroupSize: number | null) => void }) {
  const choices = value === null || GROUP_CHOICES.includes(value)
    ? GROUP_CHOICES
    : [...GROUP_CHOICES, value].sort((a, b) => (a ?? 0) - (b ?? 0));
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[54px] shrink-0 text-[12.5px] font-bold text-slate-600">Groupe</span>
      <div role="group" aria-label="Taille de groupe maximale" className="flex flex-1 gap-0.5 rounded-[10px] bg-slate-100 p-[3px]">
        {choices.map((choice) => (
          <button
            key={choice ?? "libre"}
            type="button"
            onClick={() => onChange(choice)}
            aria-pressed={value === choice}
            className={cn(
              "h-[30px] flex-1 rounded-lg text-[13px] font-bold tabular-nums touch-manipulation transition-colors",
              value === choice ? "bg-white text-[#2F5B86] shadow-[0_1px_3px_rgba(15,23,42,0.14)]" : "text-slate-600"
            )}
          >
            {choice === null ? "libre" : choice}
          </button>
        ))}
      </div>
    </div>
  );
}
