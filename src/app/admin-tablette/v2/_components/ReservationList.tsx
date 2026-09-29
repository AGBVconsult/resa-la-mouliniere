"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { INACTIVE_STATUSES, type Reservation } from "./status";

interface ReservationListProps {
  reservations: Reservation[] | undefined;
  isLoading: boolean;
  capacityByTime: Record<string, number>;
  highlightedId: Id<"reservations"> | null;
  renderRow: (res: Reservation) => React.ReactNode;
  onCreate: () => void;
}

export function ReservationList({
  reservations,
  isLoading,
  capacityByTime,
  highlightedId,
  renderRow,
  onCreate,
}: ReservationListProps) {
  const [showInactive, setShowInactive] = useState(false);

  const { groups, inactive } = useMemo(() => {
    const sorted = (reservations ?? []).slice().sort((a, b) => a.timeKey.localeCompare(b.timeKey));
    const active = sorted.filter((r) => !INACTIVE_STATUSES.includes(r.status));
    const byTime = new Map<string, Reservation[]>();
    for (const r of active) {
      const list = byTime.get(r.timeKey);
      if (list) list.push(r);
      else byTime.set(r.timeKey, [r]);
    }
    return {
      groups: [...byTime.entries()],
      inactive: sorted.filter((r) => INACTIVE_STATUSES.includes(r.status)),
    };
  }, [reservations]);

  // Une notification peut pointer vers une résa annulée : on déplie la section pour la montrer.
  const inactiveOpen = showInactive || (highlightedId != null && inactive.some((r) => r._id === highlightedId));

  if (isLoading) return <ListSkeleton />;

  if (groups.length === 0 && inactive.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 pb-16 text-center">
        <div>
          <p className="text-[15px] font-semibold text-stone-800">Aucune réservation pour ce service</p>
          <p className="mt-1 text-sm text-stone-500">Les réservations en ligne apparaîtront ici en temps réel.</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex h-11 items-center gap-2 rounded-full bg-stone-100 px-5 text-sm font-semibold text-stone-800 transition-[background-color,transform] duration-150 hover:bg-stone-200 active:scale-[0.97]"
        >
          <Plus size={16} strokeWidth={2.25} />
          Ajouter une réservation
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {groups.map(([time, list]) => {
        const covers = list.reduce((sum, r) => sum + r.partySize, 0);
        const capacity = capacityByTime[time] ?? 0;
        const over = capacity > 0 && covers > capacity;
        return (
          <section key={time} aria-label={`Service de ${time}`}>
            <header className="sticky top-0 z-10 flex h-9 items-center gap-3 border-b border-stone-200/70 bg-[#FAF9F6] px-4">
              <span className="text-[15px] font-bold tabular-nums text-stone-900">{time}</span>
              <span className={cn("text-xs tabular-nums", over ? "font-semibold text-red-700" : "text-stone-500")}>
                {covers}
                {capacity > 0 && <span className={over ? "" : "text-stone-400"}> / {capacity}</span>} couv.
              </span>
              <span className="text-xs text-stone-400">
                {list.length} résa{list.length > 1 ? "s" : ""}
              </span>
            </header>
            {list.map(renderRow)}
          </section>
        );
      })}

      {inactive.length > 0 && (
        <section aria-label="Annulations et no-show" className="mt-3">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            aria-expanded={inactiveOpen}
            className="flex h-10 w-full items-center gap-2 border-y border-stone-200/70 bg-stone-50 px-4 text-left text-xs font-semibold text-stone-500 transition-colors hover:bg-stone-100"
          >
            <ChevronRight size={14} strokeWidth={2.25} className={cn("transition-transform duration-200", inactiveOpen && "rotate-90")} />
            Annulations et no-show
            <span className="tabular-nums text-stone-400">{inactive.length}</span>
          </button>
          {inactiveOpen && <div className="opacity-60 saturate-50">{inactive.map(renderRow)}</div>}
        </section>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement des réservations">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="flex h-9 items-center gap-3 border-b border-stone-200/70 bg-[#FAF9F6] px-4">
            <div className="h-3.5 w-11 rounded bg-stone-200" />
            <div className="h-3 w-16 rounded bg-stone-200/70" />
          </div>
          {[0, 1, 2].map((r) => (
            <div key={r} className="flex h-[68px] items-center gap-4 border-b border-stone-100 px-4">
              <div className="flex w-[14rem] flex-col gap-2">
                <div className="h-3.5 w-36 animate-pulse rounded bg-stone-100" />
                <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="h-3 flex-1 animate-pulse rounded bg-stone-100" />
              <div className="h-full w-[180px] animate-pulse bg-stone-50" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
