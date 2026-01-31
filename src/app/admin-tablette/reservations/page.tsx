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
  UsersRound,
  MoreHorizontal,
  Loader2,
  X,
  UserX,
  Baby,
  Accessibility,
  PawPrint,
  Icon,
  CalendarCheck,
  Settings,
} from "lucide-react";
import { stroller } from "@lucide/lab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { getFlag } from "@/lib/getFlag";

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
  language: "fr" | "nl" | "en" | "de" | "it";
  note?: string;
  tableIds: Id<"tables">[];
  primaryTableId?: Id<"tables">;
  options?: string[];
  source: string;
  version: number;
  totalVisits?: number;
}

// Visit badge styles - New: 0 | Client: 1-4 | Regular: 5-9 | VIP: ≥10
function getVisitBadgeStyle(visits: number): { classes: string; fontWeight: string } {
  if (visits === 0) return { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", fontWeight: "font-medium" }; // New (vert)
  if (visits < 5) return { classes: "bg-blue-50 text-blue-700 border-blue-200", fontWeight: "font-medium" }; // Client (bleu)
  if (visits < 10) return { classes: "bg-orange-50 text-orange-700 border-orange-200", fontWeight: "font-medium" }; // Regular (orange)
  return { classes: "bg-slate-800 text-amber-400 border-amber-500", fontWeight: "font-bold" }; // VIP (noir & or)
}

const STATUS_COLORS: Record<string, { bg: string; animate?: boolean }> = {
  confirmed: { bg: "bg-emerald-500" },
  seated: { bg: "bg-emerald-500" },
  arrived: { bg: "bg-emerald-500" },
  pending: { bg: "bg-orange-500", animate: true },
  incident: { bg: "bg-black" },
  cancelled: { bg: "bg-red-500" },
  noshow: { bg: "bg-red-500" },
  refused: { bg: "bg-red-500" },
  completed: { bg: "bg-gray-300" },
  finished: { bg: "bg-gray-300" },
};

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
    if (!tablesData) return "-";
    const primaryId = res.primaryTableId || (res.tableIds?.length > 0 ? res.tableIds[0] : null);
    if (!primaryId) return "-";
    const table = tablesData.find((t) => t._id === primaryId);
    return table?.name || "-";
  };

  const getPrimaryAction = (status: string): { label: string; color: string; nextStatus: ReservationStatus } | null => {
    switch (status) {
      case "pending":
        return { label: "À valider", color: "bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100", nextStatus: "confirmed" };
      case "confirmed":
        return { label: "Arrivé", color: "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100", nextStatus: "seated" };
      case "seated":
        return { label: "Terminé", color: "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100", nextStatus: "completed" };
      default:
        return null;
    }
  };

  const getSecondaryAction = (status: string): { icon: React.ReactNode; color: string; nextStatus: ReservationStatus; tooltip: string } | null => {
    switch (status) {
      case "pending":
        return { icon: <X size={18} />, color: "bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600", nextStatus: "refused", tooltip: "Refuser" };
      case "confirmed":
        return { icon: <UserX size={18} />, color: "bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600", nextStatus: "noshow", tooltip: "No-show" };
      default:
        return null;
    }
  };

  const getMenuActions = (status: string): Array<{ label: string; nextStatus: ReservationStatus; textColor: string; hoverBg: string }> => {
    const actions: Array<{ label: string; nextStatus: ReservationStatus; textColor: string; hoverBg: string }> = [];
    switch (status) {
      case "pending":
        actions.push({ label: "Refuser", nextStatus: "refused", textColor: "text-red-600", hoverBg: "hover:bg-red-50" });
        break;
      case "confirmed":
        actions.push({ label: "No-show", nextStatus: "noshow", textColor: "text-red-600", hoverBg: "hover:bg-red-50" });
        actions.push({ label: "Annuler", nextStatus: "cancelled", textColor: "text-red-600", hoverBg: "hover:bg-red-50" });
        break;
      case "seated":
        actions.push({ label: "Signaler Incident", nextStatus: "incident", textColor: "text-orange-600", hoverBg: "hover:bg-orange-50" });
        break;
      case "noshow":
        actions.push({ label: "Marquer Arrivé", nextStatus: "seated", textColor: "text-emerald-600", hoverBg: "hover:bg-emerald-50" });
        actions.push({ label: "Restaurer", nextStatus: "confirmed", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        break;
      case "cancelled":
        actions.push({ label: "Marquer Arrivé", nextStatus: "seated", textColor: "text-emerald-600", hoverBg: "hover:bg-emerald-50" });
        actions.push({ label: "Restaurer", nextStatus: "confirmed", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        break;
      case "completed":
        actions.push({ label: "Rouvrir", nextStatus: "seated", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        break;
      case "incident":
        actions.push({ label: "Rouvrir", nextStatus: "seated", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        actions.push({ label: "Terminer", nextStatus: "completed", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        break;
    }
    return actions;
  };

  const isLoading = lunchStatus === "LoadingFirstPage" || dinnerStatus === "LoadingFirstPage";

  const currentReservations = selectedService === "lunch" ? lunchReservations : dinnerReservations;
  const currentCovers = selectedService === "lunch" ? lunchCovers : dinnerCovers;
  const currentCapacity = selectedService === "lunch" ? lunchCapacity : dinnerCapacity;

  const renderReservationRow = (res: Reservation) => {
    const isExpanded = expandedId === res._id;
    const statusStyle = STATUS_COLORS[res.status] || { bg: "bg-gray-400" };
    const primaryAction = getPrimaryAction(res.status);
    const secondaryAction = getSecondaryAction(res.status);
    const menuActions = getMenuActions(res.status);
    const hasOption = (opt: string) => res.options?.includes(opt);

    return (
      <div key={res._id} className="flex flex-col">
        <div
          onClick={() => toggleExpand(res._id)}
          className={cn(
            "flex items-center px-4 py-3 hover:bg-gray-50/50 cursor-pointer border-b border-gray-100 gap-4",
            isExpanded && "bg-gray-50"
          )}
        >
          {/* Status pill */}
          <div className="w-6 flex justify-center">
            <div className={cn("w-1 h-7 rounded-full", statusStyle.bg, statusStyle.animate && "animate-pulse")} />
          </div>

          {/* Time */}
          <span className="w-14 text-sm font-mono text-gray-600">{res.timeKey}</span>

          {/* Table */}
          <span className="w-14 text-sm px-2.5 py-1 bg-gray-100 rounded text-center">{getTableName(res)}</span>

          {/* Party size */}
          <div className="w-24 flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
            <UsersRound className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <span className="font-semibold">{res.partySize}</span>
            {(res.childrenCount > 0 || res.babyCount > 0) && (
              <span className="text-gray-400 text-xs">
                ({res.childrenCount > 0 ? `${res.childrenCount}e` : ""}
                {res.childrenCount > 0 && res.babyCount > 0 ? " + " : ""}
                {res.babyCount > 0 ? `${res.babyCount}b` : ""})
              </span>
            )}
          </div>

          {/* Visits badge - Hist */}
          {(() => {
            const visits = res.totalVisits ?? 0;
            const visitBadge = getVisitBadgeStyle(visits);
            return (
              <span className={`w-10 h-6 text-[10px] flex items-center justify-center rounded-full border ${visitBadge.classes} ${visitBadge.fontWeight}`}>
                {visits === 0 ? "NEW" : visits}
              </span>
            );
          })()}

          {/* Flag */}
          <span className="w-10 text-lg text-center">{getFlag(res.phone, res.language)}</span>

          {/* Name */}
          <div className="min-w-40 max-w-60 truncate">
            <span className="font-semibold">{res.lastName}</span>{" "}
            <span className="text-gray-600">{res.firstName}</span>
          </div>

          {/* Options */}
          <div className="w-32 flex items-center gap-1.5">
            <Icon iconNode={stroller} className={cn("h-4 w-4", hasOption("stroller") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
            <Baby className={cn("h-4 w-4", hasOption("highChair") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
            <Accessibility className={cn("h-4 w-4", hasOption("wheelchair") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
            <PawPrint className={cn("h-4 w-4", hasOption("dogAccess") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
          </div>

          {/* Note preview */}
          <span className="flex-1 text-sm text-gray-500 truncate">{res.note || "-"}</span>

          {/* Actions */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {primaryAction && (
              <Button
                size="sm"
                variant="ghost"
                className={cn("w-28 h-11 min-h-[44px] rounded-full text-[11px] font-medium uppercase tracking-wide", primaryAction.color)}
                onClick={() => handleStatusChange(res._id, primaryAction.nextStatus, res.version)}
              >
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                size="icon"
                variant="ghost"
                className={cn("w-11 min-w-[44px] h-11 min-h-[44px] rounded-full", secondaryAction.color)}
                onClick={() => handleStatusChange(res._id, secondaryAction.nextStatus, res.version)}
                title={secondaryAction.tooltip}
              >
                {secondaryAction.icon}
              </Button>
            )}
          </div>

          {/* Menu */}
          <div className="w-10 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Button
                size="icon"
                variant="ghost"
                className="w-10 h-10 rounded-full text-gray-400 hover:text-black hover:bg-gray-100"
                onClick={(e) => togglePopup(e, res._id)}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
              {openPopupId === res._id && (
                <>
                  <div className="fixed inset-0 z-[99]" onClick={() => setOpenPopupId(null)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 z-[100] min-w-[180px]">
                    {menuActions.map((action) => (
                      <button
                        key={action.nextStatus}
                        className={cn("w-full px-4 py-2 text-left text-xs", action.textColor, action.hoverBg)}
                        onClick={() => { handleStatusChange(res._id, action.nextStatus, res.version); setOpenPopupId(null); }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="bg-gray-50/50 px-4 py-4 ml-8 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Contact</p>
                <p className="text-sm">{res.phone}</p>
                <p className="text-sm text-gray-600">{res.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Note</p>
                <p className="text-sm text-gray-700">{res.note || "Aucune note"}</p>
              </div>
            </div>
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
              className="p-2.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-full transition-all"
              title="Aujourd'hui"
            >
              <CalendarCheck size={20} strokeWidth={1.5} />
            </button>
            <div className="flex bg-slate-50 rounded-full p-1 border border-slate-200">
              <button
                onClick={goToPreviousDay}
                className="p-2.5 text-slate-500 hover:text-slate-900 transition-colors rounded-full"
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
              <button
                onClick={goToNextDay}
                className="p-2.5 text-slate-500 hover:text-slate-900 transition-colors rounded-full"
              >
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Service Switch + Settings */}
        <div className="flex items-center gap-3">
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
        <button className="p-2.5 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
          <Settings size={20} strokeWidth={1.5} />
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
