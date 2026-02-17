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
  CalendarDays,
  Settings,
  Map,
  Clock,
  Sun,
  Moon,
} from "lucide-react";
import { stroller } from "@lucide/lab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { getFlag } from "@/lib/getFlag";
import { ServiceFloorPlan } from "@/components/admin/floor-plan/ServiceFloorPlan";
import { CalendarPopup } from "../components/CalendarPopup";
import { EditReservationPopup } from "../components/EditReservationPopup";
import { DaySettingsPopup } from "../components/DaySettingsPopup";

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

// Visit badge styles - New: 0 (vert) | Autres: bleu foncé + texte blanc
function getVisitBadgeStyle(visits: number): { classes: string; fontWeight: string } {
  if (visits === 0) return { classes: "bg-emerald-500 text-white", fontWeight: "font-semibold" }; // New (vert)
  return { classes: "bg-blue-600 text-white", fontWeight: "font-semibold" }; // Autres (bleu foncé)
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
  const [selectedService, setSelectedService] = useState<"lunch" | "dinner">(() => {
    // Sélectionner automatiquement le service selon l'heure au chargement
    const now = new Date();
    const brusselsTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
    const hour = brusselsTime.getHours();
    return hour >= 16 ? "dinner" : "lunch";
  });
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<Reservation | null>(null);
  const [highlightedReservationId, setHighlightedReservationId] = useState<Id<"reservations"> | null>(null);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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
  const cancelByClient = useMutation(api.admin.cancelByClient);

  const goToPreviousDay = () => setSelectedDate((d) => subDays(d, 1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => {
    setSelectedDate(new Date());
    // Sélectionner automatiquement le service selon l'heure (16h = seuil)
    const now = new Date();
    const brusselsTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
    const hour = brusselsTime.getHours();
    setSelectedService(hour >= 16 ? "dinner" : "lunch");
  };

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

  const handleSelectForAssignment = useCallback((reservation: Reservation) => {
    setSelectedForAssignment(reservation);
    setShowFloorPlan(true);
  }, []);

  const handleAssignmentComplete = useCallback(() => {
    setSelectedForAssignment(null);
  }, []);

  const formatDateLabel = () => {
    const today = new Date();
    const isToday = format(today, "yyyy-MM-dd") === dateKey;
    if (isToday) return "Aujourd'hui";
    // Format: "Mer. 18 Fév."
    const dayName = format(selectedDate, "EEE", { locale: fr });
    const dayNum = format(selectedDate, "d", { locale: fr });
    const monthName = format(selectedDate, "MMM", { locale: fr });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `${capitalizedDay} ${dayNum} ${capitalizedMonth}`;
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

  const lunchReservationsCount = useMemo(() => {
    if (!lunchReservations) return 0;
    return (lunchReservations as Reservation[])
      .filter((r) => !["cancelled", "noshow"].includes(r.status)).length;
  }, [lunchReservations]);

  const dinnerReservationsCount = useMemo(() => {
    if (!dinnerReservations) return 0;
    return (dinnerReservations as Reservation[])
      .filter((r) => !["cancelled", "noshow"].includes(r.status)).length;
  }, [dinnerReservations]);

  // Total journalier
  const totalCovers = lunchCovers + dinnerCovers;

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
    
    // No-show is always available (except if already noshow)
    if (status !== "noshow") {
      actions.push({ label: "No-show", nextStatus: "noshow", textColor: "text-amber-600", hoverBg: "hover:bg-amber-50" });
    }
    
    switch (status) {
      case "pending":
        actions.push({ label: "Refuser", nextStatus: "refused", textColor: "text-red-600", hoverBg: "hover:bg-red-50" });
        actions.push({ label: "Annulation client", nextStatus: "cancelled_by_client" as ReservationStatus, textColor: "text-orange-600", hoverBg: "hover:bg-orange-50" });
        break;
      case "confirmed":
        actions.push({ label: "Annuler", nextStatus: "cancelled", textColor: "text-red-600", hoverBg: "hover:bg-red-50" });
        actions.push({ label: "Annulation client", nextStatus: "cancelled_by_client" as ReservationStatus, textColor: "text-orange-600", hoverBg: "hover:bg-orange-50" });
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
  const currentReservationsCount = selectedService === "lunch" ? lunchReservationsCount : dinnerReservationsCount;

  const renderReservationRow = (res: Reservation) => {
    const isExpanded = expandedId === res._id;
    const statusStyle = STATUS_COLORS[res.status] || { bg: "bg-gray-400" };
    const primaryAction = getPrimaryAction(res.status);
    const secondaryAction = getSecondaryAction(res.status);
    const menuActions = getMenuActions(res.status);
    const hasOption = (opt: string) => res.options?.includes(opt);
    const isCompact = showFloorPlan;
    const isSelectedForAssignment = selectedForAssignment?._id === res._id;
    const isUnassigned = !res.primaryTableId && res.tableIds.length === 0;
    const isHighlighted = highlightedReservationId === res._id;

    const handleRowClick = () => {
      if (isCompact) {
        // En mode compact (plan de salle visible), clic = sélection pour assignation
        if (isSelectedForAssignment) {
          setSelectedForAssignment(null);
        } else {
          setSelectedForAssignment(res);
        }
      } else {
        // En mode normal, clic = expand
        toggleExpand(res._id);
      }
    };

    return (
      <div key={res._id} className="flex flex-col">
        <div
          onClick={handleRowClick}
          className={cn(
            "flex items-center hover:bg-gray-50/50 cursor-pointer border-b border-gray-100 px-4 py-3 gap-4",
            isExpanded && "bg-gray-50",
            isSelectedForAssignment && "bg-emerald-50 border-l-4 border-l-emerald-500",
            isHighlighted && !isSelectedForAssignment && "bg-cyan-50 border-l-4 border-l-cyan-500",
            isUnassigned && !isSelectedForAssignment && !isHighlighted && "bg-amber-50/50"
          )}
        >
          {/* Status pill */}
          <div className="w-4 flex justify-center shrink-0 self-stretch">
            <div className={cn("w-1 rounded-full h-full", statusStyle.bg, statusStyle.animate && "animate-pulse")} />
          </div>

          {/* Column: 2 lignes */}
          <div className="flex flex-col gap-1 shrink-0" style={{ width: isCompact ? "180px" : "260px" }}>
            {/* Ligne 1: Prénom + Nom + Badge */}
            {(() => {
              const visits = res.totalVisits ?? 0;
              const visitBadge = getVisitBadgeStyle(visits);
              return (
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-gray-600", isCompact ? "text-sm" : "text-base")}>{res.firstName}</span>
                  <span className={cn("font-semibold", isCompact ? "text-sm" : "text-base")}>{res.lastName}</span>
                  <span className={cn(
                    "px-1 py-0.5 rounded-full",
                    visitBadge.classes,
                    visitBadge.fontWeight,
                    "text-[7px]"
                  )}>
                    {visits === 0 ? "NEW" : visits}
                  </span>
                </div>
              );
            })()}
            {/* Ligne 2: Drapeau + Couverts + Options */}
            <div className="flex items-center gap-3">
              <span className={cn("shrink-0", isCompact ? "text-sm" : "text-base")}>{getFlag(res.phone, res.language)}</span>
              <div className={cn("flex items-center gap-1 text-gray-600 whitespace-nowrap", isCompact ? "text-xs" : "text-sm")}>
                <UsersRound className={cn("text-gray-400", isCompact ? "h-3 w-3" : "h-4 w-4")} strokeWidth={1.5} />
                <span className="font-semibold">{res.partySize}</span>
                {(res.childrenCount > 0 || res.babyCount > 0) && (
                  <span className="text-gray-400">
                    ({res.childrenCount > 0 ? `${res.childrenCount}e` : ""}
                    {res.childrenCount > 0 && res.babyCount > 0 ? " + " : ""}
                    {res.babyCount > 0 ? `${res.babyCount}b` : ""})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Icon iconNode={stroller} className={cn(isCompact ? "h-3 w-3" : "h-4 w-4", hasOption("stroller") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
                <Baby className={cn(isCompact ? "h-3 w-3" : "h-4 w-4", hasOption("highChair") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
                <Accessibility className={cn(isCompact ? "h-3 w-3" : "h-4 w-4", hasOption("wheelchair") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
                <PawPrint className={cn(isCompact ? "h-3 w-3" : "h-4 w-4", hasOption("dogAccess") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Note preview - 2 lignes max */}
          <span className={cn("flex-1 text-gray-500 line-clamp-2", isCompact ? "text-xs" : "text-sm")}>{res.note || "-"}</span>

          {/* Table - largeur fixe */}
          <div className={cn("shrink-0", isCompact ? "w-12" : "w-16")}>
            <span className={cn(
              "block rounded text-center",
              isCompact ? "text-xs px-1.5 py-3" : "text-sm px-2.5 py-3",
              isUnassigned ? "bg-amber-100 text-amber-700" : "bg-gray-100"
            )}>{getTableName(res)}</span>
          </div>

          {/* Actions - largeur fixe, hidden in compact mode */}
          {!isCompact && (
            <div className="flex items-center gap-2 w-[180px] shrink-0" onClick={(e) => e.stopPropagation()}>
              {primaryAction ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("w-28 h-11 min-h-[44px] rounded-full text-[11px] font-medium uppercase tracking-wide", primaryAction.color)}
                  onClick={() => handleStatusChange(res._id, primaryAction.nextStatus, res.version)}
                >
                  {primaryAction.label}
                </Button>
              ) : (
                <div className="w-28 h-11" />
              )}
              {secondaryAction ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("w-11 min-w-[44px] h-11 min-h-[44px] rounded-full", secondaryAction.color)}
                  onClick={() => handleStatusChange(res._id, secondaryAction.nextStatus, res.version)}
                  title={secondaryAction.tooltip}
                >
                  {secondaryAction.icon}
                </Button>
              ) : (
                <div className="w-11 h-11" />
              )}
            </div>
          )}

          {/* Menu */}
          <div className={cn("flex items-center justify-end", isCompact ? "w-6" : "w-10")} onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Button
                size="icon"
                variant="ghost"
                className={cn("rounded-full text-gray-400 hover:text-black hover:bg-gray-100", isCompact ? "w-6 h-6" : "w-10 h-10")}
                onClick={(e) => togglePopup(e, res._id)}
              >
                <MoreHorizontal className={isCompact ? "h-4 w-4" : "h-5 w-5"} />
              </Button>
              {openPopupId === res._id && (
                <>
                  <div className="fixed inset-0 z-[99]" onClick={() => setOpenPopupId(null)} />
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 py-4 z-[100] min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Option Modifier */}
                    <button
                      className="w-full px-5 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setOpenPopupId(null);
                        setEditingReservation(res);
                      }}
                    >
                      Modifier
                    </button>
                    {menuActions.length > 0 && <div className="border-t border-slate-100 my-2 mx-3" />}
                    {menuActions.map((action) => (
                      <button
                        key={action.nextStatus}
                        className={cn("w-full px-5 py-3 text-left text-sm transition-colors", action.textColor, action.hoverBg)}
                        onClick={async () => {
                          setOpenPopupId(null);
                          if ((action.nextStatus as string) === "cancelled_by_client") {
                            try {
                              await cancelByClient({ reservationId: res._id, expectedVersion: res.version });
                              toast.success("Annulation client enregistrée");
                            } catch (error) {
                              toast.error(formatConvexError(error));
                            }
                          } else {
                            handleStatusChange(res._id, action.nextStatus, res.version);
                          }
                        }}
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
    <div className="flex flex-col h-full w-full animate-in slide-in-from-right-4 duration-300 bg-[#F2F2F2]">
      {/* Header */}
      <header className="flex justify-between items-center pt-6 pb-4 px-4">
        <div className="flex items-center h-[52px] bg-white/80 backdrop-blur-xl rounded-full p-1 border border-slate-200/60 shadow-sm">
          <button
            onClick={() => setShowCalendarPopup(true)}
            className="w-[120px] h-[44px] flex items-center justify-center cursor-pointer group"
          >
            <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-600 transition-colors text-center">
              {formatDateLabel()}
            </span>
          </button>
          <div className="w-px h-5 bg-slate-200/80" />
          <button
            onClick={goToToday}
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/50 transition-all active:scale-95"
            title="Aujourd'hui"
          >
            <CalendarCheck size={20} strokeWidth={1.5} />
          </button>
          <button
            onClick={goToPreviousDay}
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/50 transition-all active:scale-95"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <button
            onClick={goToNextDay}
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/50 transition-all active:scale-95"
          >
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Stats badge - total journalier + détail midi/soir */}
        <div className="flex items-center gap-3 h-[52px] bg-white/80 backdrop-blur-xl rounded-full px-5 border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-2">
            <UsersRound size={16} strokeWidth={1.5} className="text-slate-500" />
            <span className="font-bold text-slate-700">{totalCovers}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wide">Total</span>
          </div>
          <div className="w-px h-4 bg-slate-200/80" />
          <div className="flex items-center gap-1.5 text-xs tracking-wide">
            <span className="text-slate-400 uppercase">Midi</span>
            <Sun size={14} strokeWidth={1.5} className="text-amber-400" />
            <span className="font-bold text-slate-700">{lunchCovers}</span>
            <span className="text-slate-300 mx-1">-</span>
            <span className="text-slate-400 uppercase">Soir</span>
            <Moon size={14} strokeWidth={1.5} className="text-indigo-400" />
            <span className="font-bold text-slate-700">{dinnerCovers}</span>
          </div>
        </div>

        {/* Service Switch + Settings */}
        <div className="flex items-center gap-2">
          <div className="flex h-[52px] bg-white/80 backdrop-blur-xl rounded-full p-1 border border-slate-200/60 shadow-sm items-center">
            <button
              onClick={() => setSelectedService("lunch")}
              className={`px-5 h-[44px] flex items-center text-[11px] font-bold uppercase tracking-wider rounded-full transition-all ${
                selectedService === "lunch"
                  ? "bg-slate-800 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Déjeuner
            </button>
            <button
              onClick={() => setSelectedService("dinner")}
              className={`px-5 h-[44px] flex items-center text-[11px] font-bold uppercase tracking-wider rounded-full transition-all ${
                selectedService === "dinner"
                  ? "bg-slate-800 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Dîner
            </button>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-[52px] h-[52px] bg-white/80 backdrop-blur-xl rounded-full border border-slate-200/60 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-all active:scale-95"
          >
            <Settings size={20} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setShowFloorPlan(!showFloorPlan)}
            className={cn(
              "w-[52px] h-[52px] rounded-full border shadow-sm flex items-center justify-center transition-all active:scale-95",
              showFloorPlan
                ? "bg-slate-800 border-slate-800 text-white"
                : "bg-white/80 backdrop-blur-xl border-slate-200/60 text-slate-500 hover:text-slate-900 hover:bg-white"
            )}
          >
            <Map size={20} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Main content with floor plan */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Reservations list with header */}
        <div className={cn(
          "flex flex-col transition-all duration-300",
          showFloorPlan ? "flex-1 min-w-[300px]" : "w-full"
        )}>
          {/* Reservations list grouped by time */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {(() => {
                  const allReservations = (currentReservations as Reservation[])?.slice().sort((a, b) => a.timeKey.localeCompare(b.timeKey)) || [];
                  
                  // Séparer les réservations actives et annulées/noshow
                  const activeReservations = allReservations.filter(r => !["cancelled", "noshow"].includes(r.status));
                  const cancelledReservations = allReservations.filter(r => ["cancelled", "noshow"].includes(r.status));
                  
                  const timeGroups = activeReservations.reduce((groups, res) => {
                    const time = res.timeKey;
                    if (!groups[time]) groups[time] = [];
                    groups[time].push(res);
                    return groups;
                  }, {} as Record<string, Reservation[]>);
                  
                  const sortedTimes = Object.keys(timeGroups).sort();
                  
                  if (sortedTimes.length === 0 && cancelledReservations.length === 0) {
                    return (
                      <div className="px-5 py-12 text-center text-base text-slate-400">
                        Aucune réservation
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {sortedTimes.map((time) => {
                        const groupReservations = timeGroups[time];
                        const groupCovers = groupReservations.reduce((sum, r) => sum + r.partySize, 0);
                        const groupCapacity = slotsData?.[selectedService]?.find((s: { timeKey: string; capacity: number }) => s.timeKey === time)?.capacity || 0;
                        const resaCount = groupReservations.length;
                        
                        return (
                          <div key={time}>
                            {/* Time section header */}
                            <div className={cn(
                              "flex items-center gap-4 bg-slate-50/80 border-b border-slate-100",
                              showFloorPlan ? "px-3 py-1.5" : "px-4 py-2"
                            )}>
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Clock size={showFloorPlan ? 12 : 14} strokeWidth={2} />
                                <span className={cn("font-bold", showFloorPlan ? "text-xs" : "text-sm")}>{time}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <UsersRound size={showFloorPlan ? 12 : 14} strokeWidth={2} />
                                <span className={cn(showFloorPlan ? "text-[10px]" : "text-xs")}>{groupCovers} / {groupCapacity}</span>
                              </div>
                              <span className={cn("text-slate-400", showFloorPlan ? "text-[10px]" : "text-xs")}>• {resaCount} résa{resaCount > 1 ? "s" : ""}</span>
                            </div>
                            {/* Reservations in this time slot */}
                            <div className="divide-y divide-slate-50">
                              {groupReservations.map(renderReservationRow)}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Section Annulations / No-show */}
                      {cancelledReservations.length > 0 && (
                        <div className="mt-4 border-t-2 border-slate-200">
                          <div className={cn(
                            "flex items-center gap-4 bg-slate-100 border-b border-slate-200",
                            showFloorPlan ? "px-3 py-1.5" : "px-4 py-2"
                          )}>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <X size={showFloorPlan ? 12 : 14} strokeWidth={2} />
                              <span className={cn("font-semibold uppercase tracking-wide", showFloorPlan ? "text-[10px]" : "text-xs")}>
                                Annulations / No-show
                              </span>
                            </div>
                            <span className={cn("text-slate-400", showFloorPlan ? "text-[10px]" : "text-xs")}>
                              • {cancelledReservations.length} résa{cancelledReservations.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-50 opacity-60">
                            {cancelledReservations.map(renderReservationRow)}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Floor Plan */}
        {showFloorPlan && (
          <div className="w-[45%] shrink-0 bg-white border border-slate-100 rounded-2xl overflow-hidden relative h-full">
            <div className="absolute inset-2">
              <ServiceFloorPlan
              dateKey={dateKey}
              service={selectedService}
              selectedReservationId={selectedForAssignment?._id}
              selectedReservationVersion={selectedForAssignment?.version}
              selectedPartySize={selectedForAssignment?.partySize}
              selectedReservationName={selectedForAssignment ? `${selectedForAssignment.lastName} (${selectedForAssignment.partySize}p)` : undefined}
              onAssignmentComplete={handleAssignmentComplete}
              onTableClick={setHighlightedReservationId}
              hideHeader
            />
            </div>
          </div>
        )}
      </div>

      {/* Calendar Popup */}
      <CalendarPopup
        isOpen={showCalendarPopup}
        onClose={() => setShowCalendarPopup(false)}
        onSelectDate={(newDateKey) => {
          const [year, month, day] = newDateKey.split("-").map(Number);
          setSelectedDate(new Date(year, month - 1, day));
        }}
        selectedDateKey={dateKey}
      />

      {/* Edit Reservation Popup */}
      {editingReservation && (
        <EditReservationPopup
          reservation={editingReservation}
          onClose={() => setEditingReservation(null)}
          onSuccess={() => setEditingReservation(null)}
        />
      )}

      {/* Day Settings Popup */}
      {showSettings && (
        <DaySettingsPopup
          dateKey={dateKey}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
