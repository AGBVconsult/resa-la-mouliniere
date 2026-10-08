"use client";

/**
 * Puces d'une ligne de créneau (tablette) : dispo, taille de groupe, tables restantes.
 * Chaque puce ouvre son réglage sous elle ; dispo et groupe partagent le même
 * panneau à curseur (`SliderPanel`).
 *
 * Partagé par `admin-tablette/DaySettingsPopup` et l'éditeur de période.
 */

import type { ReactNode } from "react";
import { AlertTriangle, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGaugeLevel, type GaugeLevel } from "@/lib/constants/brume";
import { MIN_GROUP_SIZE } from "@/lib/utils/slot-day-settings";
import type { CapacityShapeSummaryDto } from "@/components/admin/SlotCapacityShapeEditor";

// ── Puce de base ────────────────────────────────────────────────

const CHIP_BASE =
  "relative flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] text-[13.5px] tabular-nums touch-manipulation transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40";

function Chip({
  isOpen,
  onClick,
  disabled,
  isModified,
  className,
  label,
  children,
}: {
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
  isModified?: boolean;
  className: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={isOpen}
      aria-label={label}
      className={cn(CHIP_BASE, className, isOpen && "shadow-[inset_0_0_0_2px_currentColor]")}
    >
      {children}
      {isModified && (
        <span
          className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-emerald-500"
          aria-label="Modifié, non enregistré"
        />
      )}
    </button>
  );
}

// ── Puce dispo ──────────────────────────────────────────────────

const DISPO_TONE: Record<GaugeLevel, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  full: "bg-red-100 text-red-700",
};

/** « x dispo » / « complet », teintée selon le remplissage (réservés / capacité). */
export function CoverChip({
  available,
  reservedCovers,
  isOpen,
  onClick,
  disabled,
  isModified,
}: {
  available: number;
  reservedCovers: number;
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
  isModified?: boolean;
}) {
  const level = getGaugeLevel(reservedCovers, available + reservedCovers);
  return (
    <Chip
      isOpen={isOpen}
      onClick={onClick}
      disabled={disabled}
      isModified={isModified}
      label={available > 0 ? `${available} couverts disponibles` : "Complet"}
      className={cn("min-w-[96px] justify-center font-bold", DISPO_TONE[level])}
    >
      {available > 0 ? `${available} dispo` : "complet"}
    </Chip>
  );
}

// ── Puce groupe ─────────────────────────────────────────────────

/** « groupe libre » / « max N ». */
export function GroupSizeChip({
  value,
  isOpen,
  onClick,
  disabled,
  isModified,
}: {
  value: number | null;
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
  isModified?: boolean;
}) {
  const isLimited = value !== null;
  return (
    <Chip
      isOpen={isOpen}
      onClick={onClick}
      disabled={disabled}
      isModified={isModified}
      label={isLimited ? `Taille de groupe : ${value} personnes maximum` : "Taille de groupe : groupe libre"}
      className={cn(
        "min-w-[124px] font-semibold lg:min-w-[132px]",
        isLimited ? "bg-[#DEE7F0] text-[#2F5B86]" : "bg-[#F2F2F2] text-[#6E6E6E]"
      )}
    >
      <UsersRound size={17} strokeWidth={1.8} className="shrink-0" />
      {isLimited ? `max ${value}` : "groupe libre"}
    </Chip>
  );
}

// ── Puce tables ─────────────────────────────────────────────────

/** Table vue de dessus avec une chaise de chaque côté (même trait que lucide). */
function TableIcon() {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M2.5 10v4M21.5 10v4" />
    </svg>
  );
}

/**
 * « tables » (désactivé, gris), « N tables » (actif, vert) ou à revoir (orange).
 * Une typologie existante reste consultable même sur un créneau fermé.
 */
export function TablesChip({
  capacityShape,
  isOpen,
  onClick,
  disabled,
}: {
  capacityShape: CapacityShapeSummaryDto;
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const needsReview = capacityShape?.needsReview ?? false;
  const enabled = capacityShape?.enabled ?? false;
  const isActive = enabled || needsReview;
  const count = isActive ? (capacityShape?.buckets ?? []).reduce((sum, b) => sum + b.quantity, 0) : 0;
  const text = isActive ? `${count} table${count > 1 ? "s" : ""}` : "tables";
  return (
    <Chip
      isOpen={isOpen}
      onClick={onClick}
      disabled={disabled && !isActive}
      label={needsReview ? `Tables restantes à revoir : ${text}` : isActive ? `Tables restantes : ${text}` : "Définir les tables restantes"}
      className={cn(
        "min-w-[104px] font-semibold",
        needsReview
          ? "bg-amber-100 text-amber-700"
          : enabled
            ? "bg-green-100 text-green-700"
            : "bg-[#F2F2F2] text-[#6E6E6E]"
      )}
    >
      {needsReview ? <AlertTriangle size={15} strokeWidth={2.2} className="shrink-0" /> : <TableIcon />}
      {text}
    </Chip>
  );
}

// ── Panneau à curseur (dispo et groupe) ─────────────────────────

/**
 * Carte déployée sous une puce : titre, « Fermer », curseur et repères.
 * Elle occupe la largeur que lui donne le parent.
 */
export function SliderPanel({
  label,
  title,
  min,
  max,
  position,
  onPositionChange,
  marks,
  accentClassName,
  onClose,
}: {
  label: string;
  title: string;
  min: number;
  max: number;
  position: number;
  onPositionChange: (position: number) => void;
  marks: string[];
  accentClassName: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={label}
      className="mb-2.5 grid w-full gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
    >
      <div className="flex items-center justify-between text-[13px] font-extrabold text-slate-900">
        <span>{title}</span>
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
          min={min}
          max={max}
          step={1}
          value={position}
          onChange={(e) => onPositionChange(Number(e.target.value))}
          aria-label={label}
          aria-valuetext={title}
          className={cn("w-full cursor-pointer touch-manipulation", accentClassName)}
        />
        <div className="flex justify-between text-[11px] font-semibold text-slate-500">
          {marks.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Panneau dispo ───────────────────────────────────────────────

/** Borne haute par défaut du curseur des couverts. */
export const COVER_SLIDER_MAX = 30;

/**
 * Bornes et repères du curseur : 0 à 30 par pas de 5, étendu si la valeur dépasse 30
 * (pas de 10 au-delà). `fixedMax` impose la borne haute (capacité d'une période).
 */
export function coverSliderRange(min: number, currentValue: number, fixedMax?: number) {
  const max = fixedMax ?? (currentValue > COVER_SLIDER_MAX ? Math.ceil(currentValue / 10) * 10 : COVER_SLIDER_MAX);
  const step = max > 30 ? 10 : 5;
  const marks: string[] = [min === 0 ? "complet" : String(min)];
  for (let v = step; v <= max; v += step) marks.push(String(v));
  return { max, marks };
}

/**
 * Curseur des couverts : `min` = 0 (« complet ») dans les réglages du jour,
 * 1 dans l'éditeur de période où le chiffre est la capacité totale.
 */
export function CoverPanel({
  value,
  originalValue,
  min = 0,
  max: fixedMax,
  noun = "disponible",
  onChange,
  onClose,
}: {
  value: number;
  /** Valeur enregistrée : élargit le curseur si elle dépasse 30. */
  originalValue: number;
  min?: number;
  /** Borne haute imposée ; sinon 30, élargie si la valeur la dépasse. */
  max?: number;
  /** « disponible » (jour) ou « place » (période) pour le titre. */
  noun?: "disponible" | "place";
  onChange: (value: number) => void;
  onClose: () => void;
}) {
  const { max, marks } = coverSliderRange(min, Math.max(value, originalValue), fixedMax);
  const plural = value > 1 ? "s" : "";
  const title =
    value <= 0
      ? "Complet"
      : noun === "place"
        ? `${value} place${plural}`
        : `${value} couvert${plural} disponible${plural}`;
  return (
    <SliderPanel
      label={noun === "place" ? "Capacité du créneau" : "Couverts disponibles"}
      title={title}
      min={min}
      max={max}
      position={Math.min(max, Math.max(min, value))}
      onPositionChange={onChange}
      marks={marks}
      accentClassName="accent-slate-900"
      onClose={onClose}
    />
  );
}

// ── Panneau groupe ──────────────────────────────────────────────

/** Borne haute du curseur ; la position suivante correspond à « groupe libre ». */
export const GROUP_SLIDER_MAX = 20;
const FREE_POSITION = GROUP_SLIDER_MAX + 1;
const GROUP_MARKS = ["1", "5", "10", "15", "20", "libre"];

/**
 * Curseur de 1 à 20, « libre » en bout de course. Une valeur existante au-delà
 * de 20 reste affichée telle quelle tant qu'on ne touche pas au curseur.
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
  return (
    <SliderPanel
      label="Taille de groupe"
      title={value === null ? "Groupe libre" : `Max ${value} personnes`}
      min={MIN_GROUP_SIZE}
      max={FREE_POSITION}
      position={value === null ? FREE_POSITION : Math.min(GROUP_SLIDER_MAX, Math.max(MIN_GROUP_SIZE, value))}
      onPositionChange={(next) => onChange(next >= FREE_POSITION ? null : next)}
      marks={GROUP_MARKS}
      accentClassName="accent-[#2F5B86]"
      onClose={onClose}
    />
  );
}
