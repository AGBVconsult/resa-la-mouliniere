"use client";

import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { format, parseISO, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ReservationStatus } from "../../../../spec/contracts.generated";
import {
  UsersRound,
  Minus,
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
  SlidersHorizontal,
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
  BookmarkCheck,
  Timer,
  Coffee,
  Plus,
  Menu,
} from "lucide-react";
import { stroller } from "@lucide/lab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OutcomeIndicator, getOutcome } from "@/components/admin/OutcomeIndicator";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { getFlag } from "@/lib/getFlag";
import { ServiceFloorPlan } from "@/components/admin/floor-plan/ServiceFloorPlan";
import { CalendarPopup } from "../components/CalendarPopup";
import { EditReservationPopup } from "../components/EditReservationPopup";
import { DaySettingsPopup } from "../components/DaySettingsPopup";
import { ClientSearchPopup } from "../components/ClientSearchPopup";
import { ClientModal } from "@/components/admin/ClientModal";
import { TabletNotificationBell } from "../components/TabletNotificationBell";
import { NavPill } from "../components/NavPill";
import { EmptyServiceState } from "../components/EmptyServiceState";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { TabletCreateReservationPopup, type ReservationPrefill } from "../components/TabletCreateReservationPopup";
import { ReviewSuppressionButton } from "../components/ReviewSuppressionButton";
import { TabletMenuPopup } from "../components/TabletMenuPopup";
import { isCreatedDuringService } from "@/lib/utils/service-window";
import { BRUME, BRUME_GAUGE, STATUS_TONES, getGaugeLevel } from "@/lib/constants/brume";

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
  lastNoShowDateKey?: string | null;
  lastIncidentDateKey?: string | null;
  createdAt?: number;
  acknowledgedAt?: number;
}

// Liste des réservations = une grille commune à toutes les lignes (nom | message | table | statut),
// comme un tableau : la colonne nom prend la largeur du nom le plus long, le message tout le reste.
// Chaque niveau entre la liste et les cellules doit relayer les colonnes via SUBGRID.
const LIST_GRID = "grid grid-cols-[max-content_minmax(0,1fr)_auto_auto]";
const SUBGRID = "col-span-full grid grid-cols-subgrid";

// Visit badge styles - New: 0 (vert sauge) | Autres: bleu + texte blanc
function getVisitBadgeStyle(visits: number): { classes: string; fontWeight: string } {
  if (visits === 0) return { classes: "bg-[#3F8F6F] text-white", fontWeight: "font-semibold" }; // New (vert)
  return { classes: "bg-[#3884FF] text-white", fontWeight: "font-semibold" }; // Autres (bleu)
}

const STATUS_COLORS: Record<string, { bg: string; animate?: boolean }> = {
  confirmed: { bg: "bg-emerald-500" },
  cardPlaced: { bg: "bg-blue-500" },
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
    ...STATUS_TONES.pending,
    icon: Clock,
    nextStatus: "confirmed",
    label: "En attente",
  },
  confirmed: {
    ...STATUS_TONES.confirmed,
    icon: ShieldQuestion,
    nextStatus: "cardPlaced",
    label: "Confirmé",
  },
  cardPlaced: {
    ...STATUS_TONES.cardPlaced,
    icon: CheckCheck,
    nextStatus: "seated",
    label: "Carton de réservation",
  },
  seated: {
    ...STATUS_TONES.seated,
    icon: UserRoundCheck,
    nextStatus: "completed",
    label: "Installé",
  },
  completed: {
    ...STATUS_TONES.completed,
    icon: BookmarkCheck,
    nextStatus: null,
    label: "Terminé",
  },
  noshow: {
    ...STATUS_TONES.noshow,
    icon: Ghost,
    nextStatus: null,
    label: "No-show",
  },
  cancelled: {
    ...STATUS_TONES.cancelled,
    icon: XCircle,
    nextStatus: null,
    label: "Annulé",
  },
  refused: {
    ...STATUS_TONES.refused,
    icon: Ban,
    nextStatus: null,
    label: "Refusé",
  },
  incident: {
    ...STATUS_TONES.incident,
    icon: AlertTriangle,
    nextStatus: null,
    label: "Incident",
  },
};

const MONTHS_SHORT = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];

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
  const statusPopupRef = useRef<HTMLDivElement>(null);
  const [statusPopupHeight, setStatusPopupHeight] = useState(0);
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
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Jour ciblé par l'engrenage du calendrier (sinon : jour affiché)
  const [settingsDateKey, setSettingsDateKey] = useState<string | null>(null);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<ReservationPrefill | undefined>(undefined);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, ReservationStatus>>({});
  const [selectedClientModal, setSelectedClientModal] = useState<{ clientId: Id<"clients">; reservationId: Id<"reservations"> } | null>(null);

  const dateKey = format(selectedDate, "yyyy-MM-dd");

  // Ensure slots are synced from weekly templates for the selected date
  const ensureSlots = useMutation(api.weeklyTemplates.ensureSlotsForDate);
  useEffect(() => {
    ensureSlots({ dateKey }).catch((err) =>
      console.error("Error ensuring slots for date:", err)
    );
  }, [dateKey, ensureSlots]);

  const slotsData = useQuery(api.slots.listByDate, { dateKey });
  const tablesData = useQuery(api.tables.list, {});

  // Horaires des créneaux par service (pour détecter les réservations prises pendant le service)
  const serviceSlotTimeKeys = useMemo(() => ({
    lunch: slotsData?.lunch.map((s: { timeKey: string }) => s.timeKey) ?? [],
    dinner: slotsData?.dinner.map((s: { timeKey: string }) => s.timeKey) ?? [],
  }), [slotsData]);

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
  const updateSlot = useMutation(api.slots.updateSlot);

  // Capacité d'un créneau ajustée depuis son bandeau (– / +) : valeur affichée tout de suite,
  // en attendant que le serveur la confirme (plusieurs appuis rapides s'enchaînent)
  const [pendingCapacity, setPendingCapacity] = useState<Record<string, number>>({});
  const adjustSlotCapacity = useCallback(
    async (slotId: Id<"slots">, current: number, delta: number) => {
      const next = Math.max(0, current + delta);
      if (next === current) return;
      setPendingCapacity((prev) => ({ ...prev, [slotId]: next }));
      try {
        await updateSlot({ slotId, capacity: next });
      } catch (error) {
        toast.error(formatConvexError(error));
      } finally {
        setPendingCapacity((prev) => {
          if (prev[slotId] !== next) return prev;
          const rest = { ...prev };
          delete rest[slotId];
          return rest;
        });
      }
    },
    [updateSlot, toast]
  );
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

  // Mesure la hauteur réelle du popup de statut avant affichage pour le garder dans l'écran
  useLayoutEffect(() => {
    if (openPopupId && statusPopupRef.current) {
      setStatusPopupHeight(statusPopupRef.current.offsetHeight);
    }
  }, [openPopupId]);

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
    // Format: "Sam 21 fév" (mois sur 3 lettres pour garder une largeur stable)
    const dayShort = format(selectedDate, "EEE", { locale: fr }).replace(".", "");
    const dayName = dayShort.charAt(0).toUpperCase() + dayShort.slice(1);
    const dayNum = format(selectedDate, "d", { locale: fr });
    const monthName = MONTHS_SHORT[selectedDate.getMonth()];
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
        return { label: "Carton placé", color: "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100", nextStatus: "cardPlaced" };
      case "cardPlaced":
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
      case "cardPlaced":
        actions.push({ label: "Annuler", nextStatus: "cancelled", textColor: "text-red-600", hoverBg: "hover:bg-red-50" });
        break;
      case "seated":
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
    // Un incident peut survenir à tout moment, quel que soit le statut
    if (status !== "incident") {
      actions.push({ label: "Signaler Incident", nextStatus: "incident", textColor: "text-orange-600", hoverBg: "hover:bg-orange-50" });
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
          { label: "incident", icon: <AlertTriangle size={28} strokeWidth={1.5} />, action: "incident", iconColor: "text-orange-500" },
        ];
      case "confirmed":
        return [
          { label: "installer", icon: <Armchair size={28} strokeWidth={1.5} />, action: "seated", iconColor: "text-blue-500" },
          { label: "no-show", icon: <Ghost size={28} strokeWidth={1.5} />, action: "noshow", iconColor: "text-amber-500" },
          { label: "annuler", icon: <Trash2 size={28} strokeWidth={1.5} />, action: "cancelled", iconColor: "text-red-500" },
          { label: "annuler client", icon: <UserX size={28} strokeWidth={1.5} />, action: "cancelled_by_client", iconColor: "text-orange-500" },
          { label: "incident", icon: <AlertTriangle size={28} strokeWidth={1.5} />, action: "incident", iconColor: "text-orange-500" },
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
          { label: "incident", icon: <AlertTriangle size={28} strokeWidth={1.5} />, action: "incident", iconColor: "text-orange-500" },
        ];
      case "refused":
        return [
          { label: "incident", icon: <AlertTriangle size={28} strokeWidth={1.5} />, action: "incident", iconColor: "text-orange-500" },
        ];
      case "completed":
        return [
          { label: "rouvrir", icon: <RotateCcw size={28} strokeWidth={1.5} />, action: "seated", iconColor: "text-slate-500" },
          { label: "terminer", icon: <Flag size={28} strokeWidth={1.5} />, action: "completed", iconColor: "text-emerald-500" },
          { label: "incident", icon: <AlertTriangle size={28} strokeWidth={1.5} />, action: "incident", iconColor: "text-orange-500" },
        ];
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

  // The highlight is *derived*, not reset on every dateKey/service change: it only
  // applies while the target reservation is part of the displayed service. This lets
  // TabletNotificationBell change date + service and set the highlight in one gesture,
  // and it self-clears when the user navigates elsewhere.
  const effectiveHighlightedId = useMemo(() => {
    if (!highlightedReservationId) return null;
    const isDisplayed = (currentReservations as Reservation[] | undefined)?.some(
      (r) => r._id === highlightedReservationId
    );
    return isDisplayed ? highlightedReservationId : null;
  }, [highlightedReservationId, currentReservations]);

  // Scroll the highlighted row into view once it is rendered
  useEffect(() => {
    if (!effectiveHighlightedId) return;
    rowRefs.current[effectiveHighlightedId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [effectiveHighlightedId]);

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
        <EmptyServiceState
          service={service}
          date={selectedDate}
          isToday={isToday}
          slots={slotsData?.[service]}
        />
      );
    }
    
    return (
      <div className={LIST_GRID}>
        {sortedTimes.map((time) => {
          const groupReservations = timeGroups[time];
          const groupCovers = groupReservations.reduce((sum, r) => sum + r.partySize, 0);
          const slot = slotsData?.[service]?.find((s: { timeKey: string }) => s.timeKey === time);
          const groupCapacity = slot ? (pendingCapacity[slot._id] ?? slot.capacity) || 0 : 0;
          // Jauge : vert < 50 %, jaune < 80 %, orange < 100 %, rouge à complet
          const availableCovers = Math.max(0, groupCapacity - groupCovers);
          const fillRatio = groupCapacity > 0 ? Math.min(1, groupCovers / groupCapacity) : 0;
          const gauge = BRUME_GAUGE[getGaugeLevel(groupCovers, groupCapacity)];

          return (
            <div key={time} className={SUBGRID}>
              <div className={cn(
                "col-span-full sticky top-0 z-10 flex items-center gap-3.5 bg-[#5E5E5E] text-white",
                showFloorPlan || selectedService === "total" ? "px-3 py-1" : "px-4 py-[5px]"
              )}>
                <span className="font-extrabold text-sm tabular-nums">{time}</span>
                {groupCapacity > 0 && (
                  <>
                    <div className="w-[72px] h-[3px] rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${fillRatio * 100}%`, backgroundColor: gauge.bar }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color: gauge.text }}>
                      {availableCovers > 0 ? `${availableCovers} dispo` : "complet"}
                    </span>
                  </>
                )}
                {/* Réglage de la capacité du créneau (ce jour uniquement) */}
                {slot && (
                  <div className="flex items-center gap-0.5">
                    <span aria-hidden className="w-px h-[18px] bg-white/25 mr-1.5" />
                    <button
                      type="button"
                      onClick={() => adjustSlotCapacity(slot._id, groupCapacity, -1)}
                      disabled={groupCapacity <= 0}
                      aria-label={`Retirer une place à ${time}`}
                      className="w-7 h-7 -my-1 flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 disabled:opacity-40 transition-colors"
                    >
                      <Minus size={18} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustSlotCapacity(slot._id, groupCapacity, 1)}
                      aria-label={`Ajouter une place à ${time}`}
                      className="w-7 h-7 -my-1 flex items-center justify-center rounded-full text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                    >
                      <Plus size={18} strokeWidth={2.2} />
                    </button>
                  </div>
                )}
                {/* Couverts réservés : dernière info du bandeau */}
                <div className="ml-auto flex items-center gap-1.5 text-sm font-extrabold tabular-nums">
                  <UsersRound size={16} strokeWidth={2} />
                  <span>{groupCovers}</span>
                </div>
              </div>
              <div className={cn(SUBGRID, "divide-y divide-slate-50")}>
                {groupReservations.map(renderReservationRow)}
              </div>
            </div>
          );
        })}
        
        {cancelledReservations.length > 0 && (
          <div className={cn(SUBGRID, "border-t-2 border-slate-200")}>
            <div className={cn(
              "col-span-full flex items-center gap-4 bg-slate-100 border-b border-slate-200",
              showFloorPlan || selectedService === "total" ? "px-3 py-1.5" : "px-4 py-2"
            )}>
              <div className="flex items-center gap-1.5 text-slate-500">
                <X size={12} strokeWidth={2} />
                <span className="font-semibold text-[11px]">
                  Annulations / No-show
                </span>
              </div>
              <span className="text-slate-400 text-[10px]">
                • {cancelledReservations.length} résa{cancelledReservations.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className={cn(SUBGRID, "divide-y divide-slate-50 opacity-60")}>
              {cancelledReservations.map(renderReservationRow)}
            </div>
          </div>
        )}
      </div>
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
    const isHighlighted = effectiveHighlightedId === res._id;
    // Un changement de statut optimiste vaut déjà prise de connaissance
    const isAddedDuringService = !optimisticStatuses[res._id] && isCreatedDuringService(res, serviceSlotTimeKeys[res.service]);

    const handleRowClick = () => {
      // Ouvrir le ClientModal au clic sur une réservation
      if (res.clientId) {
        setSelectedClientModal({ clientId: res.clientId, reservationId: res._id });
      } else {
        setEditingReservation(res);
      }
    };

    return (
      <div key={res._id} className={SUBGRID} ref={(el) => { rowRefs.current[res._id] = el; }}>
        <div
          onClick={handleRowClick}
          className={cn(
            SUBGRID,
            "items-center hover:bg-[#FAFAFA] cursor-pointer border-b border-[#EFEFEF] pl-4 py-1",
            isExpanded && "bg-[#F6F6F6]",
            isSelectedForAssignment && "bg-emerald-50 border-l-4 border-l-emerald-500",
            isHighlighted && !isSelectedForAssignment && "bg-amber-100 ring-2 ring-inset ring-amber-500 border-l-4 border-l-amber-500 shadow-sm animate-highlight-pulse",
            isAddedDuringService && !isSelectedForAssignment && !isHighlighted && "bg-[#F7F5FF] hover:bg-violet-100/60 border-l-4 border-l-[#C9BFFB]",
            isUnassigned && !isAddedDuringService && !isSelectedForAssignment && !isHighlighted && "bg-[#FAFAFA]"
          )}
          title={isAddedDuringService ? "Réservation enregistrée pendant le service" : undefined}
        >
          {/* Column: 2 lignes - largeur du nom le plus long (cf. LIST_GRID), au plus l'ancienne largeur fixe */}
          <div className="flex flex-col gap-[3px] mr-4 max-w-[300px]">
            {/* Ligne 1: Prénom + Nom + Badge + Notes indicator */}
            {(() => {
              const visits = res.totalVisits ?? 0;
              const visitBadge = getVisitBadgeStyle(visits);
              return (
                <div className="flex items-center gap-1.5 h-6">
                  <span className={cn("text-slate-500", isCompact ? "text-sm" : "text-base/6")}>{res.firstName}</span>
                  <span className={cn("font-semibold mr-1.5", isCompact ? "text-sm" : "text-base/6")}>{res.lastName}</span>
                  <span className={cn(
                    "h-[18px] flex items-center justify-center",
                    visits === 0 ? "px-1.5 rounded-full" : "min-w-[18px] rounded-full",
                    visitBadge.classes,
                    visitBadge.fontWeight,
                    "text-[9px]"
                  )}>
                    {visits === 0 ? "New" : visits}
                  </span>
                  {/* Seulement s'il y a un indicateur : vide, sa marge élargirait la colonne pour rien */}
                  {(getOutcome(res) || res.hasClientNotes || res.isLateClient || res.isSlowClient) && (
                    <div className="flex items-center gap-1 ml-1">
                      {/* No-show / incident (exclusifs) : cette réservation ou la précédente du client */}
                      <OutcomeIndicator reservation={res} size={18} />
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
                  )}
                </div>
              );
            })()}
            {/* Ligne 2: Drapeau + Couverts + Options */}
            <div className="flex items-center gap-3 h-6">
              <span className={cn("shrink-0", isCompact ? "text-sm" : "text-base/6")}>{getFlag(res.phone, res.language)}</span>
              <div className={cn("flex items-center gap-1 text-slate-500 whitespace-nowrap", isCompact ? "text-xs" : "text-sm")}>
                <UsersRound className={cn("text-slate-400", isCompact ? "h-3 w-3" : "h-4 w-4")} strokeWidth={1.5} />
                <span className="font-semibold">{res.partySize}</span>
                {(res.childrenCount > 0 || res.babyCount > 0) && (
                  <span className="text-slate-400">
                    ({res.childrenCount > 0 ? `${res.childrenCount}e` : ""}
                    {res.childrenCount > 0 && res.babyCount > 0 ? " + " : ""}
                    {res.babyCount > 0 ? `${res.babyCount}b` : ""})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Icon iconNode={stroller} className={cn(isCompact ? "h-3 w-3" : "h-4 w-4", hasOption("stroller") ? "text-slate-700" : "text-transparent")} strokeWidth={1.5} />
                <Baby className={cn(isCompact ? "h-3 w-3" : "h-4 w-4", hasOption("highChair") ? "text-slate-700" : "text-transparent")} strokeWidth={1.5} />
                <Accessibility className={cn(isCompact ? "h-3 w-3" : "h-4 w-4", hasOption("wheelchair") ? "text-slate-700" : "text-transparent")} strokeWidth={1.5} />
                <PawPrint className={cn(isCompact ? "h-3 w-3" : "h-4 w-4", hasOption("dogAccess") ? "text-slate-700" : "text-transparent")} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Note preview - 3 lignes max (3 × 17 px), occupe tout l'espace restant (cf. LIST_GRID) */}
          <span className={cn("text-slate-500 line-clamp-3 mr-4", isCompact ? "text-xs" : "text-[13.5px] leading-[17px]")}>{res.note || "-"}</span>

          {/* Table - Full Height - clic active l'assignation */}
          <div 
            className={cn(
              "self-stretch flex shrink-0 -my-1 cursor-pointer transition-all duration-300 border-l border-[#EFEFEF] w-16",
              isSelectedForAssignment 
                ? "bg-[#3884FF]" 
                : "bg-[#F6F6F6] hover:bg-[#EFEFEF]"
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
            <div className="flex flex-col items-center justify-center w-full">
              {isUnassigned ? (
                <>
                  <LayoutGrid size={24} className={cn(
                    isSelectedForAssignment ? "text-white" : "text-slate-500"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium mt-1",
                    isSelectedForAssignment ? "text-white" : "text-slate-500"
                  )}>Assig.</span>
                </>
              ) : (
                <>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isSelectedForAssignment ? "text-white" : "text-slate-400"
                  )}>Table</span>
                  <span className={cn(
                    "text-2xl font-bold leading-none",
                    isSelectedForAssignment ? "text-white" : "text-[#2D2D2D]"
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
              ? { ...STATUS_TONES.assigned, icon: Check, nextStatus: "cardPlaced", label: "Table assignée" }
              : baseConfig;
            
            const StatusIcon = statusConfig.icon;
            const hasNextStatus = statusConfig.nextStatus !== null;
            
            return (
              <div 
                className={cn(
                  "self-stretch flex shrink-0 -my-1 transition-all duration-300 border-l border-slate-900/[0.06]",
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
                  className="flex items-center justify-center w-8 h-full border-l border-slate-900/[0.06] hover:bg-black/5 transition-colors"
                >
                  <ChevronDown size={16} strokeWidth={2} className={statusConfig.iconColor} />
                </button>
              </div>
            );
          })()}

          {/* Popup menu contextuel - Changer le statut */}
          {/* Rendu dans <body> : sur iPad (Safari), les conteneurs scrollables créent un contexte
              d'empilement qui laissait le plan de salle et le bouton + au-dessus du voile */}
          {openPopupId === res._id && createPortal(
            <>
              <div className="fixed inset-0 backdrop-blur-[2px] z-[99999] bg-black/10" onClick={(e) => { e.stopPropagation(); setOpenPopupId(null); }} />
              <div 
                ref={statusPopupRef}
                className="fixed bg-white rounded-3xl shadow-2xl p-5 z-[100000] animate-in fade-in zoom-in-95 duration-200 w-[280px] max-h-[calc(100vh-20px)] overflow-y-auto"
                style={{
                  left: Math.min(Math.max(popupPosition.x - 280, 10), window.innerWidth - 300),
                  // Ne jamais dépasser le bas de l'écran : on remonte le popup selon sa hauteur réelle
                  top: Math.max(10, Math.min(popupPosition.y - 200, window.innerHeight - statusPopupHeight - 10)),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <p className="text-sm font-semibold text-[#6E6E6E] text-center mb-4">
                  Changer le statut
                </p>
                
                {/* Liste des statuts filtrée selon le statut actuel */}
                <div className="flex flex-col gap-1">
                  {(() => {
                    const allStatuses = [
                      { status: "pending", label: "En attente", desc: "Nécessite une validation", ...STATUS_TONES.pending, icon: Clock },
                      { status: "confirmed", label: "Confirmé", desc: "À assigner", ...STATUS_TONES.confirmed, icon: ShieldQuestion },
                      { status: "assigned", label: "Table assignée", desc: "Prêt pour accueil", ...STATUS_TONES.assigned, icon: Check },
                      { status: "cardPlaced", label: "Carton de réservation", desc: "Carton placé sur table", ...STATUS_TONES.cardPlaced, icon: CheckCheck },
                      { status: "seated", label: "Installé", desc: "Client à table", ...STATUS_TONES.seated, icon: UserRoundCheck },
                      { status: "completed", label: "Terminé", desc: "Table libérée", ...STATUS_TONES.completed, icon: BookmarkCheck },
                      { status: "noshow", label: "No-show", desc: "Absent", ...STATUS_TONES.noshow, icon: Ghost },
                      { status: "cancelled", label: "Annulé", desc: "Annulation client", ...STATUS_TONES.cancelled, icon: XCircle },
                      { status: "refused", label: "Refusé", desc: "Refus établissement", ...STATUS_TONES.refused, icon: Ban },
                      { status: "incident", label: "Incident", desc: "Problème majeur", ...STATUS_TONES.incident, icon: AlertTriangle },
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
                      if (status === "cardPlaced") return ["pending", "confirmed", "assigned"];
                      // Tous les autres statuts masquent pending, confirmed et cardPlaced
                      return ["pending", "confirmed", "cardPlaced"];
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
                              ? "bg-[#F6F6F6] border border-[#E5E5E5]" 
                              : "border border-transparent hover:bg-[#FAFAFA]"
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
            </>,
            document.body
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="col-span-full bg-gray-50/50 px-4 py-4 ml-8 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-[#6E6E6E] mb-1">Contact</p>
                <p className="text-sm">{res.phone}</p>
                <p className="text-sm text-gray-600">{res.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-[#6E6E6E] mb-1">Note</p>
                <p className="text-sm text-gray-700">{res.note || "Aucune note"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Notifications + menu : mêmes boutons, même place, dans le header du jour et du calendrier
  const headerActions = (
    <div className="flex items-center gap-1.5 ml-auto">
      <TabletNotificationBell
        onNavigateToReservation={(dateKey, service, reservationId) => {
          const [y, m, d] = dateKey.split("-").map(Number);
          setSelectedDate(new Date(y, m - 1, d));
          setSelectedService(service);
          setHighlightedReservationId(reservationId);
          setShowCalendarPopup(false);
        }}
      />
      <button
        onClick={() => setShowMenu(true)}
        aria-label="Menu"
        aria-haspopup="dialog"
        aria-expanded={showMenu}
        className={cn(
          "w-10 h-10 flex items-center justify-center transition-colors active:scale-95",
          showMenu ? "text-[#0C0C0C]" : "text-[#464646] hover:text-[#0C0C0C]"
        )}
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full animate-in slide-in-from-right-4 duration-300 bg-[#F6F6F6]">
      {showCalendarPopup ? (
        /* Calendrier : page plein écran à la place de la vue du jour (même header, même hauteur).
           Les fenêtres (menu, recherche client, fiche client…) restent rendues par-dessus. */
        <CalendarPopup
          isOpen
          onClose={() => setShowCalendarPopup(false)}
          onSelectDate={(newDateKey) => {
            const [year, month, day] = newDateKey.split("-").map(Number);
            setSelectedDate(new Date(year, month - 1, day));
          }}
          selectedDateKey={dateKey}
          headerActions={headerActions}
        />
      ) : (
      <>
      {/* Header */}
      <header className="relative flex items-center py-12 px-8 border-b border-[#E5E5E5] bg-white">
        {/* Left: Date navigation */}
        <NavPill
          label={formatDateLabel()}
          onPrevious={goToPreviousDay}
          onNext={goToNextDay}
          previousLabel="Jour précédent"
          nextLabel="Jour suivant"
          onLabelClick={() => setShowCalendarPopup(true)}
          reset={isToday ? undefined : { label: "Auj.", ariaLabel: "Revenir à aujourd'hui", onClick: goToToday }}
        />

        {/* Switch Total/Midi/Soir - centré, suivi du bouton des créneaux (curseurs) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <SegmentedControl
            ariaLabel="Service"
            value={selectedService}
            onChange={setSelectedService}
            options={[
              { value: "total", covers: totalCovers, label: "Total" },
              { value: "lunch", covers: lunchCovers, label: "Midi" },
              { value: "dinner", covers: dinnerCovers, label: "Soir" },
            ].map(({ value, covers, label }) => ({
              value: value as "total" | "lunch" | "dinner",
              ariaLabel: `${label} : ${covers} couverts`,
              label: (
                <>
                  <span>{label}</span>
                  <span className="font-bold tabular-nums">{covers}</span>
                </>
              ),
            }))}
          />
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label={selectedService === "total" ? "Créneaux du jour" : `Créneaux du ${selectedService === "lunch" ? "midi" : "soir"}`}
            className="w-10 h-10 flex items-center justify-center text-[#3884FF] hover:text-[#2F74E6] transition-colors active:scale-95"
          >
            <SlidersHorizontal size={24} strokeWidth={1.75} />
          </button>
        </div>

        {/* Notifications + Menu, alignés à droite (le « + » est en bas à droite de l'écran) */}
        {headerActions}
      </header>

      {/* Main content with floor plan */}
      <div className="flex-1 flex gap-0 min-h-0">
        {/* Vue Total: deux colonnes Midi | Soir */}
        {selectedService === "total" ? (
          <>
            {/* Colonne Midi */}
            <div className="w-[50%] flex flex-col border-r border-[#E5E5E5]">
              <div className="bg-[#F6F6F6] px-4 py-2 border-b border-[#E5E5E5] flex items-center gap-2">
                <Sun size={16} strokeWidth={1.5} className="text-[#D9A441]" />
                <span className="font-bold text-[#0C0C0C]">Midi</span>
                <span className="text-[#6E6E6E] text-sm">{lunchCovers} couverts</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-white">
                {renderReservationsList(lunchReservations as Reservation[], "lunch")}
              </div>
            </div>
            {/* Colonne Soir */}
            <div className="w-[50%] flex flex-col">
              <div className="bg-[#F6F6F6] px-4 py-2 border-b border-[#E5E5E5] flex items-center gap-2">
                <Moon size={16} strokeWidth={1.5} className="text-[#6E6E6E]" />
                <span className="font-bold text-[#0C0C0C]">Soir</span>
                <span className="text-[#6E6E6E] text-sm">{dinnerCovers} couverts</span>
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
              showFloorPlan ? "w-[55%]" : "w-full"
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
          <div
            className="w-[45%] shrink-0 h-full border-l border-[#E5E5E5] overflow-hidden relative"
            style={{ backgroundColor: BRUME.floor }}
          >
              <ServiceFloorPlan
              dateKey={dateKey}
              service={selectedService as "lunch" | "dinner"}
              selectedReservationId={selectedForAssignment?._id}
              selectedReservationVersion={selectedForAssignment?.version}
              selectedPartySize={selectedForAssignment ? selectedForAssignment.partySize - selectedForAssignment.babyCount : undefined}
              selectedReservationName={selectedForAssignment ? `${selectedForAssignment.lastName} (${selectedForAssignment.partySize}p)` : undefined}
              onAssignmentComplete={handleAssignmentComplete}
              onTableClick={setHighlightedReservationId}
              hideHeader
              hideCapacity
              nameDisplay="firstName"
              tone="brume"
            />
            <ReviewSuppressionButton
              dateKey={dateKey}
              service={selectedService as "lunch" | "dinner"}
            />
            {/* Même référence que le bouton avis (bottom-6) : les deux bas de bouton sont alignés */}
            <NewReservationFab
              className="absolute bottom-6 right-6"
              onClick={() => { setCreatePrefill(undefined); setShowCreatePopup(true); }}
            />
          </div>
        )}
          </>
        )}
      </div>
      </>
      )}


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
          dateKey={settingsDateKey ?? dateKey}
          focusService={!settingsDateKey && selectedService !== "total" ? selectedService : undefined}
          onClose={() => {
            setShowSettings(false);
            setSettingsDateKey(null);
          }}
        />
      )}

      {/* Menu (options peu utilisées) */}
      {/* Plan de salle masqué ou calendrier : le bouton « + » reste en bas à droite de l'écran */}
      {(!showFloorPlan || showCalendarPopup) && (
        <NewReservationFab
          className="fixed bottom-6 right-6"
          onClick={() => { setCreatePrefill(undefined); setShowCreatePopup(true); }}
        />
      )}

      {showMenu && (
        <TabletMenuPopup
          showFloorPlan={showFloorPlan}
          onSearchClient={() => {
            setShowMenu(false);
            setShowClientSearch(true);
          }}
          onToggleFloorPlan={() => setShowFloorPlan((v) => !v)}
          onClose={() => setShowMenu(false)}
        />
      )}

      {/* Client Search Popup */}
      {showClientSearch && (
        <ClientSearchPopup
          onClose={() => setShowClientSearch(false)}
          onSelectClient={(clientId) => {
            setShowClientSearch(false);
            setSelectedClientModal({ clientId, reservationId: "" as any });
          }}
          onCreateReservation={(prefill) => {
            setShowClientSearch(false);
            setCreatePrefill(prefill);
            setShowCreatePopup(true);
          }}
        />
      )}

      {/* Create Reservation Popup */}
      {showCreatePopup && (
        <TabletCreateReservationPopup
          defaultDateKey={dateKey}
          defaultService={selectedService === "dinner" ? "dinner" : "lunch"}
          prefill={createPrefill}
          onClose={() => setShowCreatePopup(false)}
          onSuccess={() => setShowCreatePopup(false)}
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

/** Bouton flottant « Nouvelle réservation » (bas droite) */
function NewReservationFab({ className, onClick }: { className: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Nouvelle réservation"
      className={cn(
        "z-40 w-14 h-14 bg-[#3884FF] hover:bg-[#2F74E6] rounded-full shadow-[0_8px_20px_-6px_rgba(56,132,255,0.7)] flex items-center justify-center text-white transition-all active:scale-95",
        className
      )}
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}
