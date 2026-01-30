"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO, addDays, subDays } from "date-fns";
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
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { getFlag } from "@/lib/getFlag";
import { StatusPill } from "../components/StatusPill";
import { ActionPopup } from "../components/ActionPopup";

interface Reservation {
  _id: Id<"reservations">;
  dateKey: string;
  timeKey: string;
  service: "lunch" | "dinner";
  status: ReservationStatus;
  partySize: number;
  adults: number;
  childrenCount: number;
  babyCount: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: string;
  note?: string;
  tableId?: Id<"tables">;
  options?: string[];
  source: string;
  version: number;
}

export default function TabletReservationsPage() {
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
  const [selectedService, setSelectedService] = useState<"lunch" | "dinner">("lunch");

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

  const goToPreviousDay = () => setSelectedDate((d) => subDays(d, 1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseISO(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const toggleExpand = (id: Id<"reservations">) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setOpenPopupId(null);
  };

  const togglePopup = (e: React.MouseEvent, id: Id<"reservations">) => {
    e.stopPropagation();
    setOpenPopupId((prev) => (prev === id ? null : id));
  };

  const handleStatusChange = async (
    id: Id<"reservations">,
    newStatus: ReservationStatus,
    version: number
  ) => {
    try {
      await updateReservation({ reservationId: id, status: newStatus, expectedVersion: version });
      toast.success(`Statut mis à jour: ${newStatus}`);
    } catch (error) {
      toast.error(formatConvexError(error));
    }
  };

  const formatDateLabel = () => {
    const today = new Date();
    const isToday = format(today, "yyyy-MM-dd") === dateKey;
    const formatted = format(selectedDate, "EEEE d MMMM", { locale: fr });
    return isToday ? `Aujourd'hui` : formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const lunchCapacity = useMemo(() => {
    if (!slotsData?.lunch) return 0;
    return slotsData.lunch.reduce((sum: number, s: { isOpen: boolean; capacity: number }) => sum + (s.isOpen ? s.capacity : 0), 0);
  }, [slotsData]);

  const dinnerCapacity = useMemo(() => {
    if (!slotsData?.dinner) return 0;
    return slotsData.dinner.reduce((sum: number, s: { isOpen: boolean; capacity: number }) => sum + (s.isOpen ? s.capacity : 0), 0);
  }, [slotsData]);

  const lunchCovers = useMemo(() => {
    if (!lunchReservations) return 0;
    return (lunchReservations as Reservation[])
      .filter((r) => !["cancelled", "noshow"].includes(r.status))
      .reduce((sum, r) => sum + r.partySize, 0);
  }, [lunchReservations]);

  const dinnerCovers = useMemo(() => {
    if (!dinnerReservations) return 0;
    return (dinnerReservations as Reservation[])
      .filter((r) => !["cancelled", "noshow"].includes(r.status))
      .reduce((sum, r) => sum + r.partySize, 0);
  }, [dinnerReservations]);

  const getTableName = (res: Reservation) => {
    if (!res.tableId || !tablesData) return "-";
    const table = tablesData.find((t) => t._id === res.tableId);
    return table?.name || "-";
  };

  const isLoading = lunchStatus === "LoadingFirstPage" || dinnerStatus === "LoadingFirstPage";

  const currentReservations = selectedService === "lunch" ? lunchReservations : dinnerReservations;
  const currentCovers = selectedService === "lunch" ? lunchCovers : dinnerCovers;
  const currentCapacity = selectedService === "lunch" ? lunchCapacity : dinnerCapacity;

  const renderReservationRow = (res: Reservation) => {
    const isExpanded = expandedId === res._id;

    return (
      <div key={res._id} className="flex flex-col">
        <div
          onClick={() => toggleExpand(res._id)}
          className={`group flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-all cursor-pointer ${
            isExpanded ? "bg-slate-50/70" : ""
          }`}
        >
          <StatusPill status={res.status} />

          <span className="w-14 text-sm font-mono text-slate-500 font-medium shrink-0 tracking-tight">
            {res.timeKey}
          </span>

          <div className="flex items-center justify-center w-12 shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
              T{getTableName(res)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-14 shrink-0">
            <Users size={16} className="text-slate-400" strokeWidth={2.5} />
            <span className="text-base font-bold text-slate-800">{res.partySize}</span>
          </div>

          <span className="text-base shrink-0">{getFlag(res.phone, res.language)}</span>

          <span
            className={`flex-1 text-base font-semibold truncate ${
              res.status === "cancelled" || res.status === "noshow"
                ? "text-slate-300 line-through"
                : "text-slate-700"
            }`}
          >
            {res.lastName} {res.firstName.charAt(0).toUpperCase()}.
          </span>

          <div className="flex items-center gap-3 shrink-0 relative">
            {res.note && (
              <div className="p-2 bg-amber-50 rounded-full">
                <MessageSquare size={14} className="text-amber-500" strokeWidth={2.5} />
              </div>
            )}

            <button
              onClick={(e) => togglePopup(e, res._id)}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
            >
              <MoreHorizontal size={20} />
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
          <div className="px-5 pb-5 pt-4 bg-slate-50/70 border-b border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</span>
                <span className="text-sm font-bold text-slate-700">{res.lastName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prénom</span>
                <span className="text-sm font-bold text-slate-700">{res.firstName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</span>
                <a href={`tel:${res.phone}`} className="text-sm font-bold text-slate-600 underline decoration-slate-200">
                  {res.phone}
                </a>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</span>
                <a href={`mailto:${res.email}`} className="text-sm font-bold text-slate-600 underline decoration-slate-200 truncate">
                  {res.email}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Couverts</span>
                <span className="text-sm font-bold text-slate-700">
                  {res.adults} ad.{res.childrenCount > 0 && ` + ${res.childrenCount} enf.`}{res.babyCount > 0 && ` + ${res.babyCount} bb`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Table</span>
                <span className="text-sm font-bold text-slate-700">{getTableName(res)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Heure</span>
                <span className="text-sm font-bold text-slate-700">{res.timeKey}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</span>
                <span className="text-sm font-bold text-slate-700 capitalize">{res.source}</span>
              </div>
            </div>

            {res.options && res.options.length > 0 && (
              <div className="flex flex-col mt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Options</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {res.options.map((opt) => (
                    <span key={opt} className="text-xs px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                      {opt === "stroller" && "Poussette"}
                      {opt === "highChair" && "Chaise haute"}
                      {opt === "wheelchair" && "PMR"}
                      {opt === "dogAccess" && "Chien"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {res.note && (
              <div className="flex flex-col mt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</span>
                <div className="p-3 bg-white rounded-xl border border-slate-100 text-sm text-slate-600 italic leading-relaxed mt-1">
                  {res.note}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300 p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="relative cursor-pointer group">
            <h2 className="text-2xl font-bold text-slate-800 group-hover:text-slate-600 transition-colors pointer-events-none">
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
              className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-full transition-all"
            >
              Aujourd&apos;hui
            </button>
            <div className="flex bg-slate-50 rounded-full p-1 border border-slate-200">
              <button
                onClick={goToPreviousDay}
                className="p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToNextDay}
                className="p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Service Switch + Settings */}
        <div className="flex items-center gap-4">
          <div className="flex bg-white rounded-full p-1 border border-slate-200">
            <button
              onClick={() => setSelectedService("lunch")}
              className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all ${
                selectedService === "lunch"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Déjeuner
            </button>
            <button
              onClick={() => setSelectedService("dinner")}
              className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all ${
                selectedService === "dinner"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Dîner
            </button>
          </div>
          <button className="p-3 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
            <Settings size={20} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Service stats bar */}
      <div
        className="px-5 py-3 flex justify-between items-center rounded-t-2xl border border-b-0 border-slate-100"
        style={{ backgroundColor: "#F8F6F1" }}
      >
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
          {selectedService === "lunch" ? "Service de Midi" : "Service du Soir"}
        </h3>
        <div className="flex items-center gap-2 text-slate-500">
          <UsersRound size={16} strokeWidth={2.5} />
          <span className="text-sm font-bold">{currentCovers}/{currentCapacity}</span>
        </div>
      </div>

      {/* Reservations list */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-b-2xl border border-t-0 border-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white rounded-b-2xl border border-t-0 border-slate-100">
          <div className="divide-y divide-slate-50">
            {(currentReservations as Reservation[])
              ?.slice()
              .sort((a, b) => a.timeKey.localeCompare(b.timeKey))
              .map(renderReservationRow)}
            {(!currentReservations || currentReservations.length === 0) && (
              <div className="px-5 py-12 text-center text-base text-slate-400">
                Aucune réservation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
