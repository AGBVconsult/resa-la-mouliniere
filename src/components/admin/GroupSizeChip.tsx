"use client";

import { UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MIN_GROUP_SIZE } from "@/lib/utils/slot-day-settings";

/** Borne haute du curseur ; la position suivante correspond à « groupe libre ». */
export const GROUP_SLIDER_MAX = 20;
const FREE_POSITION = GROUP_SLIDER_MAX + 1;
// Repères placés à leur position réelle sur le curseur (1 → 21).
const SLIDER_MARKS = [
  { position: 1, label: "1" },
  { position: 5, label: "5" },
  { position: 10, label: "10" },
  { position: 15, label: "15" },
  { position: 20, label: "20" },
  { position: 21, label: "libre" },
];

/**
 * Puce « groupe libre » / « max N » d'un créneau, partagée par les réglages du jour
 * et l'éditeur de période. Elle ouvre `GroupSizePanel` sous la ligne.
 * Largeur fixe : changer la valeur ne déplace pas le reste du créneau.
 */
export function GroupSizeChip({
  value,
  isOpen,
  onClick,
  disabled,
  isModified,
}: {
  value: number | null;
  /** true si le panneau est ouvert sous la ligne du créneau. */
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
  isModified?: boolean;
}) {
  const isLimited = value !== null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={isOpen}
      aria-label={isLimited ? `Taille de groupe : ${value} personnes maximum` : "Taille de groupe : groupe libre"}
      className={cn(
        "relative flex h-8 w-[7.5rem] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-medium touch-manipulation transition-colors lg:w-[8.5rem] lg:text-sm",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40",
        isLimited ? "bg-[#DEE7F0] text-[#2F5B86]" : "bg-[#F2F2F2] text-[#6E6E6E]",
        isOpen && "ring-2 ring-[#2F5B86]/50"
      )}
    >
      <UsersRound size={14} strokeWidth={1.75} className="shrink-0" />
      <span className="tabular-nums">{isLimited ? `max ${value}` : "groupe libre"}</span>
      {isModified && (
        <span
          className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500"
          aria-label="Modifié, non enregistré"
        />
      )}
    </button>
  );
}

/**
 * Panneau déployé sous la ligne : curseur de 1 à 20, « groupe libre » en bout de course.
 * Une valeur existante au-delà de 20 reste affichée telle quelle tant qu'on ne touche pas au curseur.
 */
export function GroupSizePanel({
  value,
  onChange,
  onClose,
}: {
  value: number | null;
  onChange: (maxGroupSize: number | null) => void;
  onClose: () => void;
}) {
  const position = value === null ? FREE_POSITION : Math.min(GROUP_SLIDER_MAX, Math.max(MIN_GROUP_SIZE, value));
  return (
    <div className="w-full mt-1 mb-1.5 px-3 py-2.5 rounded-xl border border-[#C9D6E4] bg-[#F3F7FB] space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#2F5B86] lg:text-sm">
          {value === null ? "Groupe libre" : `${value} personnes maximum`}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <input
        type="range"
        min={MIN_GROUP_SIZE}
        max={FREE_POSITION}
        step={1}
        value={position}
        onChange={(e) => {
          const next = Number(e.target.value);
          onChange(next >= FREE_POSITION ? null : next);
        }}
        aria-label="Taille de groupe maximale"
        aria-valuetext={value === null ? "Groupe libre" : `${value} personnes maximum`}
        className="h-8 w-full cursor-pointer accent-[#2F5B86] touch-manipulation"
      />
      <div className="relative h-4 mx-2 text-[11px] font-medium text-slate-500">
        {SLIDER_MARKS.map(({ position, label }) => (
          <span
            key={label}
            className={cn(
              "absolute top-0",
              position === FREE_POSITION ? "-translate-x-3/4 text-[#2F5B86]" : "-translate-x-1/2"
            )}
            style={{ left: `${((position - MIN_GROUP_SIZE) / (FREE_POSITION - MIN_GROUP_SIZE)) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
