"use client";

import { Minus, Plus, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampGroupSize,
  DEFAULT_LIMITED_GROUP_SIZE,
  MIN_GROUP_SIZE,
  MAX_GROUP_SIZE,
} from "@/lib/utils/slot-day-settings";

/**
 * Puce « groupe libre » / « max N » d'un créneau, partagée par les réglages du jour et l'éditeur de période.
 * Un toucher bascule entre groupe libre et limité ; − + règlent la taille une fois limitée.
 * Largeur fixe : basculer ne déplace ni ne fait passer à la ligne le reste du créneau.
 */
export function GroupSizeChip({
  value,
  onChange,
  disabled,
  isModified,
}: {
  value: number | null;
  onChange: (maxGroupSize: number | null) => void;
  disabled?: boolean;
  isModified?: boolean;
}) {
  const isLimited = value !== null;
  return (
    <div
      className={cn(
        "relative flex h-8 w-[7.5rem] shrink-0 items-center rounded-full text-xs font-medium lg:w-[8.5rem] lg:text-sm",
        isLimited ? "bg-[#DEE7F0] text-[#2F5B86]" : "bg-[#F2F2F2] text-[#6E6E6E]",
        disabled && "opacity-40"
      )}
    >
      <button
        type="button"
        onClick={() => onChange(isLimited ? null : DEFAULT_LIMITED_GROUP_SIZE)}
        disabled={disabled}
        aria-pressed={isLimited}
        aria-label={isLimited ? `Groupe limité à ${value} : rendre libre` : "Groupe libre : limiter la taille"}
        title={isLimited ? `Groupe de ${value} personnes maximum` : "Groupe libre"}
        className="flex h-full min-w-0 flex-1 items-center gap-1 whitespace-nowrap rounded-full px-2.5 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <UsersRound size={14} strokeWidth={1.75} />
        <span className="tabular-nums">{isLimited ? `max ${value}` : "groupe libre"}</span>
      </button>
      {isLimited && (
        <>
          <button
            type="button"
            onClick={() => onChange(clampGroupSize(value - 1))}
            disabled={disabled || value <= MIN_GROUP_SIZE}
            aria-label="Réduire la taille de groupe maximale"
            className="flex h-full w-6 items-center justify-center touch-manipulation disabled:opacity-40"
          >
            <Minus size={14} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => onChange(clampGroupSize(value + 1))}
            disabled={disabled || value >= MAX_GROUP_SIZE}
            aria-label="Augmenter la taille de groupe maximale"
            className="flex h-full w-6 items-center justify-center pr-1 touch-manipulation disabled:opacity-40"
          >
            <Plus size={14} strokeWidth={2.2} />
          </button>
        </>
      )}
      {isModified && (
        <span
          className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500"
          aria-label="Modifié, non enregistré"
        />
      )}
    </div>
  );
}
