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
  Check,
  UserRoundCheck,
  CheckCircle,
  XCircle,
  Armchair,
  Flag,
  Ghost,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Pencil,
  Phone,
  Mail,
  Hourglass,
  ShieldQuestion,
  CheckCheck,
  Ban,
  ChevronDown,
  LayoutGrid,
  Bookmark,
  Timer,
  Coffee,
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
import { ClientModal } from "@/components/admin/ClientModal";

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
  clientId?: Id<"clients">;
  hasClientNotes?: boolean;
  isLateClient?: boolean;
  isSlowClient?: boolean;
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

// Smart Status Button - Charte graphique pastel
const SMART_STATUS_CONFIG: Record<string, {
  bg: string;
  iconColor: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  nextStatus: string | null;
  label: string;
}> = {
  pending: {
    bg: "bg-[#FFEDD5]", // Pêche
    iconColor: "text-orange-700",
    icon: Clock,
    nextStatus: "confirmed",
    label: "En attente",
  },
  confirmed: {
    bg: "bg-[#FEF3C7]", // Jaune crème
    iconColor: "text-amber-700",
    icon: ShieldQuestion,
    nextStatus: "seated",
    label: "Confirmé",
  },
  seated: {
    bg: "bg-[#91BDA0]", // Vert sauge
    iconColor: "text-green-900",
    icon: UserRoundCheck,
    nextStatus: "completed",
    label: "Installé",
  },
  completed: {
    bg: "bg-[#F1F5F9]", // Gris nuage
    iconColor: "text-slate-600",
    icon: CheckCheck,
    nextStatus: null,
    label: "Terminé",
  },
  noshow: {
    bg: "bg-[#FCE7F3]", // Rose poudré
    iconColor: "text-pink-700",
    icon: Ghost,
    nextStatus: null,
    label: "No-show",
  },
  cancelled: {
    bg: "bg-[#FEE2E2]", // Rouge pastel
    iconColor: "text-red-700",
    icon: XCircle,
    nextStatus: null,
    label: "Annulé",
  },
  refused: {
    bg: "bg-[#E7E5E4]", // Pierre
    iconColor: "text-stone-700",
    icon: Ban,
    nextStatus: null,
    label: "Refusé",
  },
  incident: {
    bg: "bg-[#E2E8F0]", // Ardoise claire
    iconColor: "text-slate-700",
    icon: AlertTriangle,
    nextStatus: null,
    label: "Incident",
  },
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
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedService, setSelectedService] = useState<"total" | "lunch" | "dinner">(() => {
    // Sélectionner automatiquement le service selon l'heure au chargement
    const now = new Date();
    const brusselsTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
    const hour = brusselsTime.getHours();
    return hour >= 16 ? "dinner" : "lunch";
  });
  const [showFloorPlan, setShowFloorPlan] = useState(true);
  const [selectedForAssignment, setSelectedForAssignment] = useState<Reservation | null>(null);
  const [highlightedReservationId, setHighlightedReservationId] = useState<Id<"reservations"> | null>(null);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, ReservationStatus>>({});
  const [selectedClientModal, setSelectedClientModal] = useState<{ clientId: Id<"clients">; reservationId: Id<"reservations"> } | null>(null);

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
    setPopupPosition({ x: e.clientX, y: e.clientY });
    setOpenPopupId((prev) => (prev === id ? null : id));
  };

  const handleStatusChange = async (
    id: Id<"reservations">,
    newStatus: ReservationStatus,
    version: number
  ) => {
    // Optimistic update - affichage immédiat
    setOptimisticStatuses((prev) => ({ ...prev, [id]: newStatus }));
    
    try {
      await updateReservation({ reservationId: id, status: newStatus, expectedVersion: version });
      // Supprimer l'état optimiste une fois la mutation réussie
      setOptimisticStatuses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success(`Statut mis à jour: ${newStatus}`);
    } catch (error) {
      // Rollback en cas d'erreur
      setOptimisticStatuses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
    // Format: "SAM 21 FÉVR" (toujours ce format, même pour aujourd'hui)
    const dayName = format(selectedDate, "EEE", { locale: fr }).toUpperCase().replace(".", "");
    const dayNum = format(selectedDate, "d", { locale: fr });
    const monthName = format(selectedDate, "MMM", { locale: fr }).toUpperCase().replace(".", "");
    return `${dayName} ${dayNum} ${monthName}`;
  };
  
  const isToday = format(new Date(), "yyyy-MM-dd") === dateKey;

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

  // Get all available actions for iOS-style popup menu with colors
  const getAllActions = (status: string): Array<{ label: string; icon: React.ReactNode; action: string; iconColor: string }> => {
    switch (status) {
      case "pending":
        return [
          { label: "confirmer", icon: <CheckCircle size={28} strokeWidth={1.5} />, action: "confirmed", iconColor: "text-emerald-500" },
          { label: "refuser", icon: <XCircle size={28} strokeWidth={1.5} />, action: "refused", iconColor: "text-red-500" },
          { label: "annuler client", icon: <UserX size={28} strokeWidth={1.5} />, action: "cancelled_by_client", iconColor: "text-orange-500" },
        ];
      case "confirmed":
        return [
          { label: "installer", icon: <Armchair size={28} strokeWidth={1.5} />, action: "seated", iconColor: "text-blue-500" },
          { label: "no-show", icon: <Ghost size={28} strokeWidth={1.5} />, action: "noshow", iconColor: "text-amber-500" },
          { label: "annuler", icon: <Trash2 size={28} strokeWidth={1.5} />, action: "cancelled", iconColor: "text-red-500" },
          { label: "annuler client", icon: <UserX size={28} strokeWidth={1.5} />, action: "cancelled_by_client", iconColor: "text-orange-500" },
        ];
      case "seated":
        return [
          { label: "terminer", icon: <Flag size={28} strokeWidth={1.5} />, action: "completed", iconColor: "text-emerald-500" },
          { label: "no-show", icon: <Ghost size={28} strokeWidth={1.5} />, action: "noshow", iconColor: "text-amber-500" },
          { label: "incident", icon: <AlertTriangle size={28} strokeWidth={1.5} />, action: "incident", iconColor: "text-orange-500" },
        ];
      case "noshow":
      case "cancelled":
        return [
          { label: "installer", icon: <Armchair size={28} strokeWidth={1.5} />, action: "seated", iconColor: "text-blue-500" },
          { label: "rouvrir", icon: <RotateCcw size={28} strokeWidth={1.5} />, action: "confirmed", iconColor: "text-slate-500" },
        ];
      case "completed":
      case "incident":
        return [
          { label: "rouvrir", icon: <RotateCcw size={28} strokeWidth={1.5} />, action: "seated", iconColor: "text-slate-500" },
          { label: "terminer", icon: <Flag size={28} strokeWidth={1.5} />, action: "completed", iconColor: "text-emerald-500" },
        ];
      default:
        return [];
    }
  };

  const isLoading = lunchStatus === "LoadingFirstPage" || dinnerStatus === "LoadingFirstPage";

  const currentReservations = selectedService === "total" 
    ? [...(lunchReservations || []), ...(dinnerReservations || [])]
    : selectedService === "lunch" ? lunchReservations : dinnerReservations;
  const currentCovers = selectedService === "total" ? totalCovers : selectedService === "lunch" ? lunchCovers : dinnerCovers;
  const currentCapacity = selectedService === "total" ? (lunchCapacity + dinnerCapacity) : selectedService === "lunch" ? lunchCapacity : dinnerCapacity;
  const currentReservationsCount = selectedService === "total" ? (lunchReservationsCount + dinnerReservationsCount) : selectedService === "lunch" ? lunchReservationsCount : dinnerReservationsCount;

  const renderReservationsList = (reservations: Reservation[], service: "lunch" | "dinner") => {
    const allReservations = reservations?.slice().sort((a, b) => a.timeKey.localeCompare(b.timeKey)) || [];
    
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
          const groupCapacity = slotsData?.[service]?.find((s: { timeKey: string; capacity: number }) => s.timeKey === time)?.capacity || 0;
          const resaCount = groupReservations.length;
          
          return (
            <div key={time}>
              <div className={cn(
                "flex items-center gap-4 bg-[#334156] text-white border-b border-slate-600",
                showFloorPlan || selectedService === "total" ? "px-3 py-1.5" : "px-4 py-2"
              )}>
                <div className="flex items-center gap-1.5 text-white">
                  <Clock size={12} strokeWidth={2} />
                  <span className="font-bold text-xs">{time}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <UsersRound size={12} strokeWidth={2} />
                  <span className="text-[10px]">{groupCovers} / {groupCapacity}</span>
                </div>
                <span className="text-white/60 text-[10px]">• {resaCount} résa{resaCount > 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {groupReservations.map(renderReservationRow)}
              </div>
            </div>
          );
        })}
        
        {cancelledReservations.length > 0 && (
          <div className="border-t-2 border-slate-200">
            <div className={cn(
              "flex items-center gap-4 bg-slate-100 border-b border-slate-200",
              showFloorPlan || selectedService === "total" ? "px-3 py-1.5" : "px-4 py-2"
            )}>
              <div className="flex items-center gap-1.5 text-slate-500">
                <X size={12} strokeWidth={2} />
                <span className="font-semibold uppercase tracking-wide text-[10px]">
                  Annulations / No-show
                </span>
              </div>
              <span className="text-slate-400 text-[10px]">
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
  };

  const renderReservationRow = (res: Reservation) => {
    const isExpanded = expandedId === res._id;
    // Utiliser le statut optimiste s'il existe, sinon le statut réel
    const displayStatus = optimisticStatuses[res._id] || res.status;
    const statusStyle = STATUS_COLORS[displayStatus] || { bg: "bg-gray-400" };
    const primaryAction = getPrimaryAction(displayStatus);
    const secondaryAction = getSecondaryAction(displayStatus);
    const menuActions = getMenuActions(displayStatus);
    const hasOption = (opt: string) => res.options?.includes(opt);
    const isCompact = false; // Always show full info
    const isSelectedForAssignment = selectedForAssignment?._id === res._id;
    const isUnassigned = !res.primaryTableId && res.tableIds.length === 0;
    const isHighlighted = highlightedReservationId === res._id;

    const handleRowClick = () => {
      // Ouvrir le ClientModal au clic sur une réservation
      if (res.clientId) {
        setSelectedClientModal({ clientId: res.clientId, reservationId: res._id });
      }
    };

    return (
      <div key={res._id} className="flex flex-col">
        <div
          onClick={handleRowClick}
          className={cn(
            "flex items-center hover:bg-gray-50/50 cursor-pointer border-b border-gray-100 pl-4 py-3",
            isExpanded && "bg-gray-50",
            isSelectedForAssignment && "bg-emerald-50 border-l-4 border-l-emerald-500",
            isHighlighted && !isSelectedForAssignment && "bg-cyan-50 border-l-4 border-l-cyan-500",
            isUnassigned && !isSelectedForAssignment && !isHighlighted && "bg-amber-50/50"
          )}
        >
          {/* Column: 2 lignes */}
          <div className="flex flex-col gap-1 shrink-0 mr-4" style={{ width: isCompact ? "180px" : "300px" }}>
            {/* Ligne 1: Prénom + Nom + Badge + Notes indicator */}
            {(() => {
              const visits = res.totalVisits ?? 0;
              const visitBadge = getVisitBadgeStyle(visits);
              return (
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-gray-600", isCompact ? "text-sm" : "text-base")}>{res.firstName}</span>
                  <span className={cn("font-semibold mr-1.5", isCompact ? "text-sm" : "text-base")}>{res.lastName}</span>
                  <span className={cn(
                    "h-[18px] flex items-center justify-center",
                    visits === 0 ? "px-1.5 rounded-full" : "min-w-[18px] rounded-full",
                    visitBadge.classes,
                    visitBadge.fontWeight,
                    "text-[9px]"
                  )}>
                    {visits === 0 ? "NEW" : visits}
                  </span>
                  <div className="flex items-center gap-1 ml-4">
                    {res.hasClientNotes && (
                      <Bookmark size={16} className="text-amber-500" strokeWidth={2} fill="currentColor" />
                    )}
                    {res.isLateClient && (
                      <Timer size={18} className="text-orange-400" strokeWidth={2} />
                    )}
                    {res.isSlowClient && (
                      <Coffee size={18} className="text-blue-400" strokeWidth={2} />
                    )}
                  </div>
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

          {/* Note preview - 3 lignes max */}
          <span className={cn("flex-1 text-gray-500 line-clamp-3 mr-4", isCompact ? "text-xs" : "text-sm")}>{res.note || "-"}</span>

          {/* Table - Full Height - clic active l'assignation */}
          <div 
            className={cn(
              "self-stretch flex shrink-0 -my-3 cursor-pointer transition-all duration-300 border-l border-black/10 w-16",
              isSelectedForAssignment 
                ? "bg-blue-500" 
                : "bg-slate-50 hover:bg-slate-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (isSelectedForAssignment) {
                setSelectedForAssignment(null);
              } else {
                setSelectedForAssignment(res);
              }
            }}
          >
            <div className="flex flex-col items-center justify-center w-full py-2">
              {isUnassigned ? (
                <>
                  <LayoutGrid size={24} className={cn(
                    isSelectedForAssignment ? "text-white" : "text-slate-400"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium mt-1 tracking-wide",
                    isSelectedForAssignment ? "text-white" : "text-slate-400"
                  )}>ASSIG.</span>
                </>
              ) : (
                <>
                  <span className={cn(
                    "text-[10px] font-medium tracking-wide",
                    isSelectedForAssignment ? "text-white" : "text-slate-400"
                  )}>TABLE</span>
                  <span className={cn(
                    "text-2xl font-bold leading-none",
                    isSelectedForAssignment ? "text-white" : "text-slate-700"
                  )}>{getTableName(res)}</span>
                </>
              )}
            </div>
          </div>

          {/* Smart Status Button - Full Height */}
          {(() => {
            const baseConfig = SMART_STATUS_CONFIG[displayStatus];
            if (!baseConfig) return null;
            
            // Cas spécial: confirmed + table assignée = Bleu glacier avec Check
            const hasTable = !isUnassigned;
            const isConfirmedWithTable = displayStatus === "confirmed" && hasTable;
            
            const statusConfig = isConfirmedWithTable 
              ? { bg: "bg-[#D0E1F9]", iconColor: "text-blue-700", icon: Check, nextStatus: "seated", label: "Table assignée" }
              : baseConfig;
            
            const StatusIcon = statusConfig.icon;
            const hasNextStatus = statusConfig.nextStatus !== null;
            
            return (
              <div 
                className={cn(
                  "self-stretch flex shrink-0 -my-3 transition-all duration-300 border-l border-black/10",
                  statusConfig.bg
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Action principale - Icône */}
                <button
                  onClick={() => {
                    if (hasNextStatus) {
                      updateReservation({ 
                        reservationId: res._id, 
                        status: statusConfig.nextStatus as ReservationStatus, 
                        expectedVersion: res.version 
                      });
                    }
                  }}
                  disabled={!hasNextStatus}
                  className={cn(
                    "flex items-center justify-center w-16 h-full transition-all active:scale-95",
                    hasNextStatus ? "cursor-pointer hover:brightness-95" : "cursor-default"
                  )}
                >
                  <StatusIcon size={24} strokeWidth={2} className={statusConfig.iconColor} />
                </button>
                
                {/* Action secondaire - Chevron menu */}
                <button
                  onClick={(e) => togglePopup(e, res._id)}
                  className="flex items-center justify-center w-8 h-full border-l border-black/10 hover:bg-black/5 transition-colors"
                >
                  <ChevronDown size={16} strokeWidth={2} className={statusConfig.iconColor} />
                </button>
              </div>
            );
          })()}

          {/* Popup menu contextuel - Changer le statut */}
          {openPopupId === res._id && (
            <>
              <div className="fixed inset-0 z-[99999] bg-black/10" onClick={(e) => { e.stopPropagation(); setOpenPopupId(null); }} />
              <div 
                className="fixed bg-white rounded-3xl shadow-2xl p-5 z-[100000] animate-in fade-in zoom-in-95 duration-200 w-[280px] max-h-[80vh] overflow-y-auto"
                style={{
                  left: Math.min(Math.max(popupPosition.x - 280, 10), window.innerWidth - 300),
                  top: Math.min(Math.max(popupPosition.y - 200, 60), window.innerHeight - 450),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
                  Changer le statut
                </p>
                
                {/* Liste des statuts filtrée selon le statut actuel */}
                <div className="flex flex-col gap-1">
                  {(() => {
                    const allStatuses = [
                      { status: "pending", label: "En attente", desc: "Nécessite une validation", bg: "bg-[#FFEDD5]", iconColor: "text-orange-600", icon: Clock },
                      { status: "confirmed", label: "Confirmé", desc: "À assigner", bg: "bg-[#FEF3C7]", iconColor: "text-amber-600", icon: ShieldQuestion },
                      { status: "assigned", label: "Table assignée", desc: "Prêt pour accueil", bg: "bg-[#D0E1F9]", iconColor: "text-blue-600", icon: Check },
                      { status: "seated", label: "Installé", desc: "Client à table", bg: "bg-[#91BDA0]", iconColor: "text-green-900", icon: UserRoundCheck },
                      { status: "completed", label: "Terminé", desc: "Table libérée", bg: "bg-[#F1F5F9]", iconColor: "text-slate-600", icon: CheckCheck },
                      { status: "noshow", label: "No-show", desc: "Absent", bg: "bg-[#FCE7F3]", iconColor: "text-pink-600", icon: Ghost },
                      { status: "cancelled", label: "Annulé", desc: "Annulation client", bg: "bg-[#FEE2E2]", iconColor: "text-red-600", icon: XCircle },
                      { status: "refused", label: "Refusé", desc: "Refus établissement", bg: "bg-[#E7E5E4]", iconColor: "text-stone-600", icon: Ban },
                      { status: "incident", label: "Incident", desc: "Problème majeur", bg: "bg-[#E2E8F0]", iconColor: "text-slate-600", icon: AlertTriangle },
                    ];
                    
                    // Filtrer selon le statut actuel (utiliser le statut optimiste)
                    const currentStatus = displayStatus;
                    const hasTable = !isUnassigned;
                    
                    // Statuts à masquer selon le statut actuel
                    // Confirmed -> masque Pending
                    // Assigned/Seated -> masque Pending, Confirmed
                    // Completed/Noshow/Cancelled/Refused/Incident -> masque Pending, Confirmed
                    const getHiddenStatuses = (status: string, hasTableAssigned: boolean): string[] => {
                      if (status === "pending") return [];
                      if (status === "confirmed" && !hasTableAssigned) return ["pending"];
                      if (status === "confirmed" && hasTableAssigned) return ["pending", "confirmed"];
                      // Tous les autres statuts masquent pending et confirmed
                      return ["pending", "confirmed"];
                    };
                    
                    const hiddenStatuses = getHiddenStatuses(currentStatus, hasTable);
                    
                    // Pour "assigned" (confirmed + table), on considère que c'est le statut actuel
                    const effectiveStatus = (currentStatus === "confirmed" && hasTable) ? "assigned" : currentStatus;
                    
                    return allStatuses.filter((item) => {
                      // Toujours afficher le statut actuel effectif
                      if (item.status === effectiveStatus) return true;
                      
                      // Masquer les statuts selon les règles
                      if (hiddenStatuses.includes(item.status)) return false;
                      
                      return true;
                    }).map((item) => {
                      const IconComponent = item.icon;
                      const isCurrentStatus = item.status === effectiveStatus;
                      
                      return (
                        <button
                          key={item.status}
                          onClick={async () => {
                            setOpenPopupId(null);
                            // Pour "assigned", on passe à "confirmed" (le statut réel)
                            const targetStatus = item.status === "assigned" ? "confirmed" : item.status;
                            if (targetStatus !== res.status) {
                              handleStatusChange(res._id, targetStatus as ReservationStatus, res.version);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                            isCurrentStatus 
                              ? "bg-orange-50 border border-orange-200" 
                              : "hover:bg-slate-50"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            item.bg
                          )}>
                            <IconComponent size={20} strokeWidth={2} className={item.iconColor} />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                            <span className="text-xs text-slate-400">{item.desc}</span>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}
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
      <header className="relative flex items-center py-12 px-4 border-b border-slate-200 bg-[#E4E4E4]">
        {/* Left: Date navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center h-[52px] bg-[#334156] rounded-full overflow-hidden shadow-lg">
            {/* Bouton précédent */}
            <button
              onClick={goToPreviousDay}
              className="w-[52px] h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
            
            {/* Séparateur */}
            <div className="w-px h-6 bg-white/20" />
            
            {/* Date au centre */}
            <button
              onClick={() => setShowCalendarPopup(true)}
              className="px-6 h-full flex items-center justify-center cursor-pointer group"
            >
              <span className="text-sm font-bold text-white tracking-wide">
                {formatDateLabel()}
              </span>
            </button>
            
            {/* Séparateur */}
            <div className="w-px h-6 bg-white/20" />
            
            {/* Bouton suivant */}
            <button
              onClick={goToNextDay}
              className="w-[52px] h-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            >
              <ChevronRight size={20} strokeWidth={2} />
            </button>
          </div>
          
          {/* Bouton Aujourd'hui (visible seulement si pas aujourd'hui) */}
          {!isToday && (
            <button
              onClick={goToToday}
              className="flex items-center gap-2 h-[52px] px-5 bg-blue-500 hover:bg-blue-600 rounded-full text-white font-semibold text-sm transition-all active:scale-95 shadow-lg"
            >
              <CalendarCheck size={18} strokeWidth={2} />
              <span className="uppercase tracking-wide">Aujourd&apos;hui</span>
            </button>
          )}
        </div>

        {/* Switch Total/Midi/Soir - centré */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-[52px] bg-white/80 backdrop-blur-xl rounded-full px-1 border border-slate-200/60 shadow-sm">
          {/* Fond animé */}
          <div 
            className="absolute top-1 bottom-1 bg-slate-700 rounded-full transition-transform duration-300 ease-out shadow-md"
            style={{
              width: 'calc(33.33% - 2px)',
              left: '4px',
              transform: selectedService === "lunch" ? 'translateX(100%)' : selectedService === "dinner" ? 'translateX(200%)' : 'translateX(0)'
            }}
          />
          
          {/* Bouton Total */}
          <button
            onClick={() => setSelectedService("total")}
            className={cn(
              "relative z-10 flex items-center justify-center h-full rounded-full transition-all duration-300 w-24 gap-1.5",
              selectedService === "total" ? "text-white" : "text-slate-500"
            )}
          >
            <UsersRound size={14} strokeWidth={1.5} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-opacity", selectedService === "total" ? "opacity-100" : "opacity-60")}>Total</span>
            <span className="font-bold text-base">{totalCovers}</span>
          </button>
          
          {/* Bouton Midi */}
          <button
            onClick={() => setSelectedService("lunch")}
            className={cn(
              "relative z-10 flex items-center justify-center h-full rounded-full transition-all duration-300 w-24 gap-1.5",
              selectedService === "lunch" ? "text-white" : "text-slate-500"
            )}
          >
            <Sun size={14} strokeWidth={1.5} className="text-amber-400" />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-opacity", selectedService === "lunch" ? "opacity-100" : "opacity-60")}>Midi</span>
            <span className="font-bold text-base">{lunchCovers}</span>
          </button>
          
          {/* Bouton Soir */}
          <button
            onClick={() => setSelectedService("dinner")}
            className={cn(
              "relative z-10 flex items-center justify-center h-full rounded-full transition-all duration-300 w-24 gap-1.5",
              selectedService === "dinner" ? "text-white" : "text-slate-500"
            )}
          >
            <Moon size={14} strokeWidth={1.5} className="text-indigo-400" />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-opacity", selectedService === "dinner" ? "opacity-100" : "opacity-60")}>Soir</span>
            <span className="font-bold text-base">{dinnerCovers}</span>
          </button>
        </div>

        {/* Settings + Map - aligné à droite */}
        <div className="flex items-center gap-2 ml-auto">
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
      <div className="flex-1 flex gap-0 min-h-0">
        {/* Vue Total: deux colonnes Midi | Soir */}
        {selectedService === "total" ? (
          <>
            {/* Colonne Midi */}
            <div className="w-[50%] flex flex-col border-r border-slate-200">
              <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center gap-2">
                <Sun size={16} strokeWidth={1.5} className="text-amber-500" />
                <span className="font-bold text-amber-700">MIDI</span>
                <span className="text-amber-600 text-sm">{lunchCovers} couverts</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-white">
                {renderReservationsList(lunchReservations as Reservation[], "lunch")}
              </div>
            </div>
            {/* Colonne Soir */}
            <div className="w-[50%] flex flex-col">
              <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200 flex items-center gap-2">
                <Moon size={16} strokeWidth={1.5} className="text-indigo-500" />
                <span className="font-bold text-indigo-700">SOIR</span>
                <span className="text-indigo-600 text-sm">{dinnerCovers} couverts</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-white">
                {renderReservationsList(dinnerReservations as Reservation[], "dinner")}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Reservations list with header */}
            <div className={cn(
              "flex flex-col transition-all duration-300",
              showFloorPlan ? "w-[50%]" : "w-full"
            )}>
              {/* Reservations list grouped by time */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {renderReservationsList(currentReservations as Reservation[], selectedService as "lunch" | "dinner")}
                  </div>
                )}
              </div>
            </div>

            {/* Floor Plan */}
            {showFloorPlan && (
          <div className="w-[50%] shrink-0 h-full bg-[#4F4F50] border-l-2 border-white overflow-hidden relative">
              <ServiceFloorPlan
              dateKey={dateKey}
              service={selectedService as "lunch" | "dinner"}
              selectedReservationId={selectedForAssignment?._id}
              selectedReservationVersion={selectedForAssignment?.version}
              selectedPartySize={selectedForAssignment?.partySize}
              selectedReservationName={selectedForAssignment ? `${selectedForAssignment.lastName} (${selectedForAssignment.partySize}p)` : undefined}
              onAssignmentComplete={handleAssignmentComplete}
              onTableClick={setHighlightedReservationId}
              hideHeader
            />
          </div>
        )}
          </>
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

      {/* Client Modal */}
      {selectedClientModal && (
        <ClientModal
          clientId={selectedClientModal.clientId}
          currentReservationId={selectedClientModal.reservationId}
          onClose={() => setSelectedClientModal(null)}
        />
      )}
    </div>
  );
}
