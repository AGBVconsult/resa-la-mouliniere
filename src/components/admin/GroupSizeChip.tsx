"use client";

import { UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { MIN_GROUP_SIZE } from "@/lib/utils/slot-day-settings";

/** Borne haute du curseur ; la position suivante correspond à « groupe libre ». */
export const GROUP_SLIDER_MAX = 20;
const FREE_POSITION = GROUP_SLIDER_MAX + 1;
const SLIDER_LABELS = ["1", "5", "10", "15", "20", "libre"];

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
        "relative flex h-[34px] min-w-[132px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] text-[13.5px] font-semibold touch-manipulation transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40",
        isLimited ? "bg-[#DEE7F0] text-[#2F5B86]" : "bg-[#F2F2F2] text-[#6E6E6E]",
        isOpen && "shadow-[inset_0_0_0_2px_#2F5B86]"
      )}
    >
      <UsersRound size={17} strokeWidth={1.8} className="shrink-0" />
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
 * Panneau déployé sous la puce (il occupe la largeur que lui donne le parent) : curseur de 1 à 20, « libre » en bout de course.
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
    <div
      role="dialog"
      aria-label="Taille de groupe"
      className="mb-2.5 grid w-full gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
    >
      <div className="flex items-center justify-between text-[13px] font-extrabold text-slate-900">
        <span>{value === null ? "Groupe libre" : `Max ${value} personnes`}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
        >
          Fermer
        </button>
      </div>
      <div className="grid gap-1.5">
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
          className="w-full cursor-pointer accent-[#2F5B86] touch-manipulation"
        />
        <div className="flex justify-between text-[11px] font-semibold text-slate-500">
          {SLIDER_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
