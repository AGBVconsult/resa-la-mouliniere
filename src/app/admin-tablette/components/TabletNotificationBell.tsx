"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ReservationStatus } from "../../../../spec/contracts.generated";
import {
  Bell, X, Check, Clock, UsersRound, Sun, Moon, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { getFlag } from "@/lib/getFlag";

interface TabletNotificationBellProps {
  /** Ouvre la résa dans son contexte (change date + service + surbrillance) */
  onNavigateToReservation: (
    dateKey: string,
    service: "lunch" | "dinner",
    reservationId: Id<"reservations">,
  ) => void;
}

function getVisitBadgeStyle(visits: number) {
  if (visits === 0) return "bg-emerald-500 text-white";
  return "bg-blue-600 text-white";
}

export function TabletNotificationBell({ onNavigateToReservation }: TabletNotificationBellProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [processingId, setProcessingId] = useState<Id<"reservations"> | null>(null);
  const [confirmRefuseId, setConfirmRefuseId] = useState<Id<"reservations"> | null>(null);

  const pending = useQuery(api.admin.listPendingReservations, {});
  const updateReservation = useMutation(api.admin.updateReservation);

  const count = pending?.length ?? 0;

  // Tri chronologique croissant (par date puis heure)
  const sorted = useMemo(() => {
    if (!pending) return [];
    return [...pending].sort((a, b) => {
      const d = a.dateKey.localeCompare(b.dateKey);
      return d !== 0 ? d : a.timeKey.localeCompare(b.timeKey);
    });
  }, [pending]);

  // Groupement par jour
  const groups = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const r of sorted) {
      if (!map.has(r.dateKey)) map.set(r.dateKey, []);
      map.get(r.dateKey)!.push(r);
    }
    return Array.from(map.entries());
  }, [sorted]);

  const dayLabel = (dateKey: string) => {
    const d = parseISO(dateKey);
    if (isToday(d)) return "Aujourd'hui";
    if (isTomorrow(d)) return "Demain";
    return format(d, "EEEE d MMMM", { locale: fr });
  };

  const handleAction = async (
    id: Id<"reservations">,
    version: number,
    status: ReservationStatus,
  ) => {
    setProcessingId(id);
    try {
      await updateReservation({ reservationId: id, status, expectedVersion: version });
      toast.success(status === "confirmed" ? "Réservation validée" : "Réservation refusée");
    } catch (error) {
      toast.error(formatConvexError(error));
    } finally {
      setProcessingId(null);
      setConfirmRefuseId(null);
    }
  };

  return (
    <>
      {/* Bouton cloche */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative w-[52px] h-[52px] bg-white/80 backdrop-blur-xl rounded-full border border-slate-200/60 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-all active:scale-95"
      >
        <Bell size={20} strokeWidth={1.5} className={cn(count > 0 && "text-orange-500")} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[22px] h-[22px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1 ring-2 ring-[#E4E4E4] animate-pulse">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Panneau latéral */}
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex justify-end">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          {/* Panneau */}
          <div className="relative w-[440px] max-w-[90vw] h-full bg-[#F8F8F8] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-[#334156] text-white shrink-0">
              <div className="flex items-center gap-3">
                <Clock size={22} strokeWidth={2} />
                <div>
                  <h2 className="font-bold text-lg leading-tight">En attente de validation</h2>
                  <p className="text-white/60 text-sm">{count} réservation{count > 1 ? "s" : ""}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all"
              >
                <X size={22} />
              </button>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto">
              {pending === undefined ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : count === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Check className="h-12 w-12 mb-3 text-emerald-300" />
                  <p className="text-base">Aucune réservation en attente</p>
                </div>
              ) : (
                groups.map(([dateKey, items]) => (
                  <div key={dateKey}>
                    <div className="sticky top-0 z-10 px-6 py-2 bg-[#E4E4E4]/95 backdrop-blur text-xs font-bold uppercase tracking-wide text-slate-500">
                      {dayLabel(dateKey)}
                    </div>
                    {items.map((r) => {
                      const isProcessing = processingId === r._id;
                      const askConfirm = confirmRefuseId === r._id;
                      return (
                        <div key={r._id} className="mx-3 my-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                          {/* Infos (tap = voir en contexte) */}
                          <button
                            onClick={() => {
                              onNavigateToReservation(r.dateKey, r.service, r._id);
                              setIsOpen(false);
                            }}
                            className="w-full text-left px-4 pt-3 pb-2 active:bg-slate-50"
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-slate-500">{r.firstName}</span>
                              <span className="font-semibold">{r.lastName}</span>
                              <span className={cn(
                                "h-[18px] px-1.5 rounded-full text-[9px] font-semibold flex items-center",
                                getVisitBadgeStyle(r.totalVisits ?? 0),
                              )}>
                                {(r.totalVisits ?? 0) === 0 ? "NEW" : r.totalVisits}
                              </span>
                              <span className="ml-auto">{getFlag(r.phone, r.language)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                {r.service === "lunch"
                                  ? <Sun size={14} className="text-amber-400" />
                                  : <Moon size={14} className="text-indigo-400" />}
                                {r.timeKey}
                              </span>
                              <span className="flex items-center gap-1">
                                <UsersRound size={14} className="text-slate-400" />
                                {r.partySize}
                                {(r.childrenCount > 0 || r.babyCount > 0) && (
                                  <span className="text-slate-400">
                                    {" ("}{r.childrenCount > 0 ? `${r.childrenCount}e` : ""}
                                    {r.childrenCount > 0 && r.babyCount > 0 ? " + " : ""}
                                    {r.babyCount > 0 ? `${r.babyCount}b` : ""}{")"}
                                  </span>
                                )}
                              </span>
                            </div>
                            {r.note && (
                              <p className="mt-1.5 text-sm text-slate-500 italic line-clamp-2">{r.note}</p>
                            )}
                          </button>

                          {/* Actions */}
                          <div className="flex gap-px bg-slate-100 border-t border-slate-100">
                            {askConfirm ? (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleAction(r._id, r.version, "refused")}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white font-semibold active:scale-[0.98] disabled:opacity-50"
                              >
                                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                                Confirmer le refus
                              </button>
                            ) : (
                              <>
                                <button
                                  disabled={isProcessing}
                                  onClick={() => setConfirmRefuseId(r._id)}
                                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-red-600 font-medium active:bg-red-50 disabled:opacity-50"
                                >
                                  <X size={18} /> Refuser
                                </button>
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleAction(r._id, r.version, "confirmed")}
                                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-emerald-600 font-semibold active:bg-emerald-50 disabled:opacity-50"
                                >
                                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                  Valider
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
