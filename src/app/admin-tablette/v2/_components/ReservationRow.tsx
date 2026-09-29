"use client";

import { memo } from "react";
import { Accessibility, Baby, Bookmark, ChevronDown, Coffee, Icon, LayoutGrid, PawPrint, Timer, UsersRound } from "lucide-react";
import { stroller } from "@lucide/lab";
import { cn } from "@/lib/utils";
import { getFlag } from "@/lib/getFlag";
import { STATUS_STYLES, type DisplayStatus, type Reservation } from "./status";

interface ReservationRowProps {
  res: Reservation;
  displayStatus: DisplayStatus;
  tableName: string | null;
  isSelectedForAssignment: boolean;
  isHighlighted: boolean;
  isMenuOpen: boolean;
  onOpen: (res: Reservation) => void;
  onToggleAssign: (res: Reservation) => void;
  onAdvance: (res: Reservation) => void;
  onOpenMenu: (res: Reservation, anchor: DOMRect) => void;
  rowRef: (el: HTMLDivElement | null) => void;
}

const OPTION_ICONS = [
  { key: "stroller", label: "Poussette" },
  { key: "highChair", label: "Chaise haute" },
  { key: "wheelchair", label: "Accès PMR" },
  { key: "dogAccess", label: "Chien" },
] as const;

function OptionIcon({ option }: { option: (typeof OPTION_ICONS)[number]["key"] }) {
  const cls = "size-4 text-stone-700";
  switch (option) {
    case "stroller":
      return <Icon iconNode={stroller} className={cls} strokeWidth={1.75} />;
    case "highChair":
      return <Baby className={cls} strokeWidth={1.75} />;
    case "wheelchair":
      return <Accessibility className={cls} strokeWidth={1.75} />;
    case "dogAccess":
      return <PawPrint className={cls} strokeWidth={1.75} />;
  }
}

export const ReservationRow = memo(function ReservationRow({
  res,
  displayStatus,
  tableName,
  isSelectedForAssignment,
  isHighlighted,
  isMenuOpen,
  onOpen,
  onToggleAssign,
  onAdvance,
  onOpenMenu,
  rowRef,
}: ReservationRowProps) {
  const style = STATUS_STYLES[displayStatus];
  const StatusIcon = style?.icon;
  const canAdvance = style?.next != null;
  const visits = res.totalVisits ?? 0;
  const options = OPTION_ICONS.filter((o) => res.options?.includes(o.key));
  const kids = [
    res.childrenCount > 0 ? `${res.childrenCount} enf.` : null,
    res.babyCount > 0 ? `${res.babyCount} bébé${res.babyCount > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(res)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(res);
      }}
      className={cn(
        "group relative flex min-h-[68px] items-stretch border-b border-stone-100 bg-white transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#334156]/40",
        "active:bg-stone-50",
        // Le contour est un calque au-dessus des tuiles, sinon leurs fonds le masquent
        "after:pointer-events-none after:absolute after:inset-0 after:z-[1] after:ring-2 after:ring-inset after:ring-transparent after:transition-shadow after:duration-200",
        isSelectedForAssignment && "bg-[#EEF2F7] after:ring-[#334156]",
        isHighlighted && !isSelectedForAssignment && "bg-amber-50 after:ring-amber-400 animate-highlight-pulse",
      )}
    >
      {/* Identité */}
      <div className="flex w-[15.5rem] shrink-0 flex-col justify-center gap-1 py-2.5 pl-4 pr-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[15px] leading-tight text-stone-900">
            <span className="font-semibold">{res.lastName}</span>{" "}
            <span className="text-stone-500">{res.firstName}</span>
          </span>
          <span
            className={cn(
              "inline-flex h-[18px] shrink-0 items-center rounded-[5px] px-1.5 text-[10px] font-bold tabular-nums tracking-wide",
              visits === 0 ? "bg-emerald-100 text-emerald-800" : "bg-[#E3E8EF] text-[#334156]",
            )}
            title={visits === 0 ? "Nouveau client" : `${visits} visite${visits > 1 ? "s" : ""}`}
          >
            {visits === 0 ? "NEW" : `${visits}×`}
          </span>
          {res.hasClientNotes && (
            <Bookmark size={14} strokeWidth={2} fill="currentColor" className="shrink-0 text-amber-500" aria-label="Notes client" />
          )}
          {res.isLateClient && <Timer size={15} strokeWidth={2} className="shrink-0 text-orange-500" aria-label="Souvent en retard" />}
          {res.isSlowClient && <Coffee size={15} strokeWidth={2} className="shrink-0 text-sky-600" aria-label="Client lent" />}
        </div>
        <div className="flex items-center gap-2.5 text-[13px] text-stone-600">
          <span className="text-sm leading-none">{getFlag(res.phone, res.language)}</span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <UsersRound size={14} strokeWidth={1.75} className="text-stone-400" />
            <span className="font-semibold tabular-nums text-stone-900">{res.partySize}</span>
            {kids.length > 0 && <span className="text-stone-500">· {kids.join(" + ")}</span>}
          </span>
          {options.length > 0 && (
            <span className="flex items-center gap-1">
              {options.map((o) => (
                <span key={o.key} title={o.label}>
                  <OptionIcon option={o.key} />
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      {/* Note */}
      <p
        className={cn(
          "line-clamp-2 min-w-0 flex-1 self-center pr-3 text-[13px] leading-snug",
          res.note ? "text-stone-600" : "text-stone-300",
        )}
      >
        {res.note || "—"}
      </p>

      {/* Table — tap pour assigner sur le plan */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleAssign(res);
        }}
        aria-pressed={isSelectedForAssignment}
        aria-label={tableName ? `Table ${tableName}, changer` : "Assigner une table"}
        className={cn(
          "flex w-[68px] shrink-0 flex-col items-center justify-center gap-0.5 border-l border-stone-100 transition-[background-color,color,transform] duration-150 active:scale-[0.97]",
          isSelectedForAssignment
            ? "bg-[#334156] text-white"
            : tableName
              ? "bg-stone-50 text-stone-900 hover:bg-stone-100"
              : "bg-white text-stone-400 hover:bg-stone-50",
        )}
      >
        {tableName ? (
          <>
            <span className={cn("text-[9px] font-semibold uppercase tracking-[0.08em]", isSelectedForAssignment ? "text-white/70" : "text-stone-400")}>
              Table
            </span>
            <span className="text-[22px] font-bold leading-none tabular-nums">{tableName}</span>
          </>
        ) : (
          <>
            <LayoutGrid size={20} strokeWidth={1.75} />
            <span className="text-[10px] font-semibold">Assigner</span>
          </>
        )}
      </button>

      {/* Statut — tap = étape suivante, chevron = toutes les options */}
      {style && StatusIcon && (
        <div className={cn("flex shrink-0 transition-colors duration-200", style.tile)} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => canAdvance && onAdvance(res)}
            disabled={!canAdvance}
            aria-label={canAdvance ? `${style.label} — passer à l'étape suivante` : style.label}
            className={cn(
              "flex w-[76px] flex-col items-center justify-center gap-1 transition-transform duration-150",
              canAdvance ? "active:scale-[0.94]" : "cursor-default",
            )}
          >
            <StatusIcon size={22} strokeWidth={2} className={style.ink} />
            <span className={cn("text-[10px] font-semibold leading-none", style.ink)}>{style.label}</span>
          </button>
          <button
            type="button"
            onClick={(e) => onOpenMenu(res, e.currentTarget.getBoundingClientRect())}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="Changer le statut"
            className="flex w-9 items-center justify-center border-l border-black/5 transition-colors duration-150 hover:bg-black/5 active:bg-black/10"
          >
            <ChevronDown
              size={16}
              strokeWidth={2.25}
              className={cn(style.ink, "transition-transform duration-200", isMenuOpen && "rotate-180")}
            />
          </button>
        </div>
      )}
    </div>
  );
});
