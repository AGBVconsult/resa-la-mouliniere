"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ReservationStatus } from "../../../../spec/contracts.generated";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  UsersRound,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { getFlag } from "@/lib/getFlag";
import { SegmentedBar } from "../components/SegmentedBar";
import { StatusPill } from "../components/StatusPill";
import { ActionPopup } from "../components/ActionPopup";

interface Reservation {
  _id: Id<"reservations">;
  dateKey: string;
  service: "lunch" | "dinner";
  timeKey: string;
  partySize: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  language: "fr" | "nl" | "en" | "de" | "it";
  note?: string;
  status: string;
  tableIds: Id<"tables">[];
  primaryTableId?: Id<"tables">;
  version: number;
}

export default function MobileReservationsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return parseISO(dateParam);
    }
    return new Date();
  });

  const [expandedId, setExpandedId] = useState<Id<"reservations"> | null>(null);
  const [openPopupId, setOpenPopupId] = useState<Id<"reservations"> | null>(null);

  const dateKey = format(selectedDate, "yyyy-MM-dd");

  const slotsData = useQuery(api.slots.listByDate, { dateKey });
  const tablesData = useQuery(api.tables.list, {});

  const { results: lunchReservations, status: lunchStatus } = usePaginatedQuery(
    api.admin.listReservations,
    { dateKey, service: "lunch" },
    { initialNumItems: 50 }
  );

  const { results: dinnerReservations, status: dinnerStatus } = usePaginatedQuery(
    api.admin.listReservations,
    { dateKey, service: "dinner" },
    { initialNumItems: 50 }
  );

  const updateReservation = useMutation(api.admin.updateReservation);

  const lunchPercent = useMemo(() => {
    if (!slotsData?.lunch) return 0;
    const totalCapacity = slotsData.lunch.reduce((sum, s) => sum + (s.isOpen ? s.capacity : 0), 0);
    const totalCovers = (lunchReservations as Reservation[])?.reduce((sum, r) => 
      ["confirmed", "seated", "arrived", "pending"].includes(r.status) ? sum + r.partySize : sum, 0) || 0;
    return totalCapacity > 0 ? Math.min((totalCovers / totalCapacity) * 100, 100) : 0;
  }, [slotsData, lunchReservations]);

  const { dinnerCovers, dinnerCapacity } = useMemo(() => {
    if (!slotsData?.dinner) return { dinnerCovers: 0, dinnerCapacity: 0 };
    const totalCapacity = slotsData.dinner.reduce((sum, s) => sum + (s.isOpen ? s.capacity : 0), 0);
    const totalCovers = (dinnerReservations as Reservation[])?.reduce((sum, r) => 
      ["confirmed", "seated", "arrived", "pending"].includes(r.status) ? sum + r.partySize : sum, 0) || 0;
    return { dinnerCovers: totalCovers, dinnerCapacity: totalCapacity };
  }, [slotsData, dinnerReservations]);

  const { lunchCovers, lunchCapacity } = useMemo(() => {
    if (!slotsData?.lunch) return { lunchCovers: 0, lunchCapacity: 0 };
    const totalCapacity = slotsData.lunch.reduce((sum, s) => sum + (s.isOpen ? s.capacity : 0), 0);
    const totalCovers = (lunchReservations as Reservation[])?.reduce((sum, r) => 
      ["confirmed", "seated", "arrived", "pending"].includes(r.status) ? sum + r.partySize : sum, 0) || 0;
    return { lunchCovers: totalCovers, lunchCapacity: totalCapacity };
  }, [slotsData, lunchReservations]);

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
    setExpandedId(null);
    setOpenPopupId(null);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
    setExpandedId(null);
    setOpenPopupId(null);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setExpandedId(null);
    setOpenPopupId(null);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (!dateValue) return;
    setSelectedDate(parseISO(dateValue));
    setExpandedId(null);
    setOpenPopupId(null);
  };

  const toggleExpand = (id: Id<"reservations">) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const togglePopup = (e: React.MouseEvent, id: Id<"reservations">) => {
    e.stopPropagation();
    setOpenPopupId(openPopupId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenPopupId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleStatusChange = useCallback(
    async (id: Id<"reservations">, status: ReservationStatus, version: number) => {
      try {
        await updateReservation({
          reservationId: id,
          expectedVersion: version,
          status,
        });
        toast.success("Statut mis à jour");
      } catch (error) {
        toast.error(formatConvexError(error, "Erreur lors de la mise à jour"));
      }
    },
    [updateReservation, toast]
  );

  const getTableName = (reservation: Reservation) => {
    if (!tablesData) return "-";
    const tableId = reservation.primaryTableId || reservation.tableIds[0];
    if (!tableId) return "-";
    const table = tablesData.find((t) => t._id === tableId);
    return table?.name || "-";
  };

  const formatDateLabel = () => {
    const day = format(selectedDate, "d", { locale: fr });
    const month = format(selectedDate, "MMMM", { locale: fr });
    const year = format(selectedDate, "yyyy");
    return (
      <>
        {day} {month.charAt(0).toUpperCase() + month.slice(1)}{" "}
        <span className="text-slate-300 font-light">{year}</span>
      </>
    );
  };

  const isLoading = lunchStatus === "LoadingFirstPage" || dinnerStatus === "LoadingFirstPage";

  const renderReservationRow = (res: Reservation) => {
    const isExpanded = expandedId === res._id;

    return (
      <div key={res._id} className="flex flex-col">
        <div
          onClick={() => toggleExpand(res._id)}
          className={`group flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/30 transition-all cursor-pointer ${
            isExpanded ? "bg-slate-50/50" : ""
          }`}
        >
          <StatusPill status={res.status} />

          <span className="w-11 text-xs font-mono text-slate-400 font-medium shrink-0 tracking-tighter uppercase">
            {res.timeKey}
          </span>

          <div className="flex items-center justify-center w-8 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
              T{getTableName(res)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 w-10 shrink-0">
            <Users size={14} className="text-slate-300" strokeWidth={2.5} />
            <span className="text-sm font-bold text-slate-800">{res.partySize}</span>
          </div>

          <span className="text-sm shrink-0">{getFlag(res.phone, res.language)}</span>

          <span
            className={`flex-1 text-sm font-semibold truncate ${
              res.status === "cancelled" || res.status === "noshow"
                ? "text-slate-300 line-through"
                : "text-slate-700"
            }`}
          >
            {res.lastName} {res.firstName.charAt(0).toUpperCase()}.
          </span>

          <div className="flex items-center gap-3 shrink-0 relative">
            {res.note && (
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <MessageSquare size={12} className="text-amber-500" strokeWidth={2.5} />
              </div>
            )}

            <button
              onClick={(e) => togglePopup(e, res._id)}
              className="p-1.5 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              <MoreHorizontal size={18} />
            </button>

            {openPopupId === res._id && (
              <ActionPopup
                status={res.status}
                onAction={(action, nextStatus) => {
                  if (action === "status" && nextStatus) {
                    handleStatusChange(res._id, nextStatus, res.version);
                  }
                }}
                onClose={() => setOpenPopupId(null)}
              />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-6 pt-2 bg-slate-50/50 border-b border-slate-100/50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-4 pl-4 border-l-2 border-slate-100 ml-0.5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <Phone size={14} className="text-slate-400" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      Téléphone
                    </span>
                    <a
                      href={`tel:${res.phone}`}
                      className="text-xs font-bold text-slate-600 underline decoration-slate-200"
                    >
                      {res.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl border border-slate-100">
                    <Mail size={14} className="text-slate-400" strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      Email
                    </span>
                    <a
                      href={`mailto:${res.email}`}
                      className="text-xs font-bold text-slate-600 underline decoration-slate-200"
                    >
                      {res.email}
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  Message & Notes
                </span>
                <div className="p-3 bg-white rounded-2xl border border-slate-100 text-xs text-slate-600 italic leading-relaxed">
                  {res.note || "Aucune note particulière."}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
      <header className="px-4 pt-6 pb-4">
        <div className="flex justify-between items-center w-full">
          <div className="relative cursor-pointer group">
            <h2 className="text-xl font-bold text-slate-800 group-hover:text-slate-600 transition-colors pointer-events-none">
              {formatDateLabel()}
            </h2>
            <input
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={dateKey}
              onChange={handleDateChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 border border-slate-100 px-3 py-1.5 rounded-lg transition-all"
            >
              Aujourd&apos;hui
            </button>
            <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-100/50">
              <button
                onClick={goToPreviousDay}
                className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goToNextDay}
                className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mb-4">
            <div
              className="px-4 py-2.5 flex justify-between items-center border-y border-slate-100/50"
              style={{ backgroundColor: "#F8F6F1" }}
            >
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                Service de Midi
              </h3>
              <div className="w-20">
                <SegmentedBar value={lunchPercent} />
              </div>
            </div>
            <div className="divide-y divide-slate-50/50">
              {(lunchReservations as Reservation[])?.map(renderReservationRow)}
              {(!lunchReservations || lunchReservations.length === 0) && (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  Aucune réservation
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div
              className="px-4 py-2.5 flex justify-between items-center border-y border-slate-100/50"
              style={{ backgroundColor: "#F8F6F1" }}
            >
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                Service du Soir
              </h3>
              <div className="flex items-center gap-1.5 text-slate-400">
                <UsersRound size={14} strokeWidth={2.5} />
                <span className="text-[11px] font-bold">{dinnerCovers}/{dinnerCapacity}</span>
              </div>
            </div>
            <div className="divide-y divide-slate-50/50">
              {(dinnerReservations as Reservation[])?.map(renderReservationRow)}
              {(!dinnerReservations || dinnerReservations.length === 0) && (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  Aucune réservation
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
