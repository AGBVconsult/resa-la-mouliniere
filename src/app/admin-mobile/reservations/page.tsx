"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { OutcomeIndicator } from "@/components/admin/OutcomeIndicator";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ReservationStatus } from "../../../../spec/contracts.generated";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Moon,
  MoreHorizontal,
  Ghost,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { getFlag } from "@/lib/getFlag";
import { cn } from "@/lib/utils";
import { BRUME_GAUGE, BRUME_GAUGE_SOFT, STATUS_TONES, getGaugeLevel } from "@/lib/constants/brume";
import { getValidTransitions } from "../../../../convex/lib/stateMachine";
import { NAV_CLEARANCE } from "../components/MobileLayoutClient";
import { DaySettingsPopup } from "../../admin-tablette/components/DaySettingsPopup";

interface Reservation {
  _id: Id<"reservations">;
  dateKey: string;
  service: "lunch" | "dinner";
  timeKey: string;
  adults: number;
  childrenCount: number;
  babyCount: number;
  partySize: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  language: "fr" | "nl" | "en" | "de" | "it";
  note?: string;
  options?: string[];
  status: string;
  source: "online" | "admin" | "phone" | "walkin";
  tableIds: Id<"tables">[];
  primaryTableId?: Id<"tables">;
  version: number;
  totalVisits?: number;
  lastNoShowDateKey?: string | null;
  lastIncidentDateKey?: string | null;
}

interface Slot {
  timeKey: string;
  capacity: number;
  isOpen: boolean;
}

type Service = "lunch" | "dinner";
type ServiceView = "total" | Service;

/** Réservations sorties du service : regroupées en bas de liste, barrées */
const OUT_STATUSES = ["cancelled", "noshow"];

/** Trait de statut en début de ligne (confirmé + table = « table assignée ») */
const STATUS_STRIPE: Record<string, { color: string; label: string }> = {
  pending: { color: "#E9A271", label: "En attente" },
  confirmed: { color: "#D4A72C", label: "Confirmé, sans table" },
  assigned: { color: "#6C9BD0", label: "Table assignée" },
  cardPlaced: { color: "#3F6F9E", label: "Carton placé" },
  seated: { color: "#4F9A6B", label: "Installé" },
  completed: { color: "#C4C4C4", label: "Terminé" },
  noshow: { color: "#C98AA6", label: "No-show" },
  cancelled: { color: "#E5B4B4", label: "Annulé" },
  refused: { color: "#BDB6AE", label: "Refusé" },
  incident: { color: "#3E4C5A", label: "Incident" },
};

/** Menu « … » d'une réservation : seuls les statuts permis par la machine à états sont proposés */
const MENU_ACTIONS: { status: ReservationStatus; label: string; icon: typeof Ghost; tone: { bg: string; iconColor: string } }[] = [
  { status: "noshow", label: "No-show", icon: Ghost, tone: STATUS_TONES.noshow },
  { status: "cancelled", label: "Annulé", icon: XCircle, tone: STATUS_TONES.cancelled },
  { status: "incident", label: "Incident", icon: AlertTriangle, tone: STATUS_TONES.incident },
];

function getMenuActions(status: string) {
  const allowed = getValidTransitions(status as ReservationStatus);
  return MENU_ACTIONS.filter((a) => a.status !== status && allowed.includes(a.status));
}

const OPTION_LABELS: Record<string, string> = {
  stroller: "Poussette",
  highChair: "Chaise haute",
  wheelchair: "PMR",
  dogAccess: "Chien",
};

function countCovers(reservations: Reservation[] | undefined) {
  return (reservations ?? [])
    .filter((r) => !OUT_STATUSES.includes(r.status))
    .reduce((sum, r) => sum + r.partySize, 0);
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

  const [selectedService, setSelectedService] = useState<ServiceView>(() => {
    const serviceParam = searchParams.get("service");
    if (serviceParam === "lunch" || serviceParam === "dinner" || serviceParam === "total") {
      return serviceParam;
    }
    return "lunch";
  });

  const [expandedId, setExpandedId] = useState<Id<"reservations"> | null>(null);
  const [validatingId, setValidatingId] = useState<Id<"reservations"> | null>(null);
  const [menuFor, setMenuFor] = useState<Reservation | null>(null);
  const [showDaySettings, setShowDaySettings] = useState(false);

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const isToday = format(new Date(), "yyyy-MM-dd") === dateKey;

  // Ensure slots are synced from weekly templates for the selected date
  const ensureSlots = useMutation(api.weeklyTemplates.ensureSlotsForDate);
  useEffect(() => {
    ensureSlots({ dateKey }).catch((err) =>
      console.error("Error ensuring slots for date:", err)
    );
  }, [dateKey, ensureSlots]);

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

  const reservationsByService: Record<Service, Reservation[]> = {
    lunch: (lunchReservations as Reservation[]) ?? [],
    dinner: (dinnerReservations as Reservation[]) ?? [],
  };

  const lunchCovers = useMemo(() => countCovers(lunchReservations as Reservation[]), [lunchReservations]);
  const dinnerCovers = useMemo(() => countCovers(dinnerReservations as Reservation[]), [dinnerReservations]);

  const changeDate = (date: Date) => {
    setSelectedDate(date);
    setExpandedId(null);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    changeDate(parseISO(e.target.value));
  };

  const handleValidate = useCallback(
    async (res: Reservation) => {
      setValidatingId(res._id);
      try {
        await updateReservation({
          reservationId: res._id,
          expectedVersion: res.version,
          status: "confirmed" as ReservationStatus,
        });
        toast.success("Réservation validée");
      } catch (error) {
        toast.error(formatConvexError(error, "Erreur lors de la validation"));
      } finally {
        setValidatingId(null);
      }
    },
    [updateReservation, toast]
  );

  const handleStatusChange = useCallback(
    async (res: Reservation, status: ReservationStatus, label: string) => {
      setMenuFor(null);
      try {
        await updateReservation({ reservationId: res._id, expectedVersion: res.version, status });
        toast.success(`${res.lastName} : ${label}`);
      } catch (error) {
        toast.error(formatConvexError(error, "Erreur lors de la mise à jour"));
      }
    },
    [updateReservation, toast]
  );

  const getTableName = (res: Reservation) => {
    const tableId = res.primaryTableId || res.tableIds[0];
    if (!tableId || !tablesData) return null;
    return tablesData.find((t) => t._id === tableId)?.name ?? null;
  };

  const dayName = format(selectedDate, "EEEE", { locale: fr });
  const dayLabel = format(selectedDate, "d MMM", { locale: fr });

  const isLoading = lunchStatus === "LoadingFirstPage" || dinnerStatus === "LoadingFirstPage";
  const services: Service[] = selectedService === "total" ? ["lunch", "dinner"] : [selectedService];

  const renderRow = (res: Reservation) => {
    const isPending = res.status === "pending";
    const isOut = OUT_STATUSES.includes(res.status);
    const tableName = getTableName(res);
    const stripeKey = res.status === "confirmed" && tableName ? "assigned" : res.status;
    const stripe = STATUS_STRIPE[stripeKey] ?? { color: "#E5E5E5", label: res.status };
    const isExpanded = expandedId === res._id;
    const visits = res.totalVisits ?? 0;
    const hasMenu = getMenuActions(res.status).length > 0;

    return (
      <div key={res._id}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onClick={() => setExpandedId(isExpanded ? null : res._id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpandedId(isExpanded ? null : res._id);
            }
          }}
          className={cn(
            "flex items-center gap-2.5 h-9 px-4 cursor-pointer",
            isPending ? "bg-[#FBF4EE]" : isExpanded ? "bg-[#FAFAFA]" : "bg-white",
            isOut && "text-[#A3A3A3]"
          )}
        >
          <span
            role="img"
            aria-label={stripe.label}
            className="w-1 h-5 rounded-full shrink-0"
            style={{ backgroundColor: stripe.color }}
          />
          <span className={cn("w-5 text-right text-base font-bold shrink-0", isOut && "line-through")}>
            {res.partySize}
          </span>
          <span className="text-sm shrink-0">{getFlag(res.phone, res.language)}</span>
          <span className="flex-1 min-w-0 flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
            <span className={cn("text-[15px] truncate", isOut && "line-through")}>
              <span className={isOut ? "" : "text-slate-500"}>{res.firstName}</span>{" "}
              <span className={cn("font-semibold", !isOut && "text-[#0C0C0C]")}>{res.lastName}</span>
            </span>
            {!isOut && (
              <span
                className={cn(
                  "shrink-0 h-4 min-w-4 px-[5px] rounded-full inline-flex items-center justify-center text-[9px] font-semibold text-white",
                  visits === 0 ? "bg-[#3F8F6F]" : "bg-[#3884FF]"
                )}
              >
                {visits === 0 ? "New" : visits}
              </span>
            )}
            <OutcomeIndicator reservation={res} size={14} />
          </span>
          {res.note && (
            <MessageSquare size={15} strokeWidth={2} className="text-amber-700 shrink-0" aria-label="Note" />
          )}
          {isPending ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleValidate(res);
              }}
              disabled={validatingId === res._id}
              className="h-[26px] px-3 rounded-full bg-[#3884FF] text-white text-[13px] font-semibold shrink-0 active:scale-95 transition-transform disabled:opacity-60"
            >
              {validatingId === res._id ? <Loader2 size={14} className="animate-spin" /> : "Valider"}
            </button>
          ) : isOut ? (
            <span className="text-xs shrink-0">{stripe.label}</span>
          ) : null}
          {hasMenu && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuFor(res);
              }}
              aria-label={`Changer le statut de ${res.lastName}`}
              aria-haspopup="dialog"
              className="w-8 h-8 -mr-2 flex items-center justify-center rounded-full text-[#8E8E8E] active:bg-black/5 shrink-0"
            >
              <MoreHorizontal size={18} />
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="px-4 py-3 bg-[#FAFAFA] grid grid-cols-2 gap-x-4 gap-y-2 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col">
              <span className="text-xs text-[#6E6E6E]">Heure</span>
              <span className="font-medium">{res.timeKey}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#6E6E6E]">Couverts</span>
              <span className="font-medium">
                {res.adults} ad.{res.childrenCount > 0 && ` + ${res.childrenCount} enf.`}
                {res.babyCount > 0 && ` + ${res.babyCount} bb`}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-[#6E6E6E]">Téléphone</span>
              <a href={`tel:${res.phone}`} className="font-medium text-[#3884FF] truncate">{res.phone}</a>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-[#6E6E6E]">E-mail</span>
              <a href={`mailto:${res.email}`} className="font-medium text-[#3884FF] truncate">{res.email}</a>
            </div>
            {res.options && res.options.length > 0 && (
              <div className="col-span-2 flex flex-wrap gap-1.5">
                {res.options.map((opt) => (
                  <span key={opt} className="text-xs px-2 py-0.5 bg-[#EFEFEF] rounded-full text-[#464646]">
                    {OPTION_LABELS[opt] ?? opt}
                  </span>
                ))}
              </div>
            )}
            {res.note && (
              <p className="col-span-2 px-3 py-2 rounded-xl bg-[#F4EBCF] text-[#6B4E0C] leading-snug">{res.note}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderService = (service: Service) => {
    const reservations = reservationsByService[service]
      .slice()
      .sort((a, b) => a.timeKey.localeCompare(b.timeKey));
    const active = reservations.filter((r) => !OUT_STATUSES.includes(r.status));
    const out = reservations.filter((r) => OUT_STATUSES.includes(r.status));
    const slots = (slotsData?.[service] ?? []) as Slot[];
    const serviceCapacity = slots.reduce((sum, s) => sum + (s.isOpen ? s.capacity : 0), 0);
    const serviceCovers = service === "lunch" ? lunchCovers : dinnerCovers;

    const groups = active.reduce<Record<string, Reservation[]>>((acc, res) => {
      (acc[res.timeKey] ??= []).push(res);
      return acc;
    }, {});

    return (
      <section key={service}>
        {selectedService === "total" && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#F6F6F6] border-b border-[#E5E5E5]">
            {service === "lunch" ? (
              <Sun size={16} strokeWidth={1.5} className="text-[#D9A441]" />
            ) : (
              <Moon size={16} strokeWidth={1.5} className="text-[#6E6E6E]" />
            )}
            <span className="font-bold">{service === "lunch" ? "Midi" : "Soir"}</span>
            <span className="text-sm text-[#6E6E6E]">
              {serviceCovers} couverts{serviceCapacity > 0 && ` / ${serviceCapacity}`}
            </span>
          </div>
        )}

        {Object.keys(groups).sort().map((time) => {
          const groupReservations = groups[time];
          const covers = groupReservations.reduce((sum, r) => sum + r.partySize, 0);
          const capacity = slots.find((s) => s.timeKey === time)?.capacity ?? 0;
          const available = Math.max(0, capacity - covers);
          const level = getGaugeLevel(covers, capacity);
          const gauge = BRUME_GAUGE[level];

          return (
            <div key={time}>
              <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-[3px] bg-[#EDEDED] text-[#2D2D2D] text-[13px] font-extrabold">
                <span>{time}</span>
                {capacity > 0 && (
                  <>
                    <div className="w-14 h-[3px] rounded-full bg-black/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(1, covers / capacity) * 100}%`, backgroundColor: gauge.bar }}
                      />
                    </div>
                    <span className={cn("text-xs font-bold", BRUME_GAUGE_SOFT[level].text)}>
                      {available > 0 ? `${available} dispo` : "complet"}
                    </span>
                  </>
                )}
                <span className="ml-auto">
                  {covers}
                  {capacity > 0 && ` / ${capacity}`}
                </span>
              </div>
              {groupReservations.map(renderRow)}
            </div>
          );
        })}

        {active.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[#8E8E8E]">Aucune réservation</p>
        )}

        {out.length > 0 && out.map(renderRow)}
      </section>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-300">
      <header className="px-4 pt-2 pb-5 flex flex-col gap-3 border-b border-[#E5E5E5]">
        <div className="flex items-center">
          <div className="relative flex-1 min-w-0">
            <h1 className="text-[26px] leading-9 font-bold tracking-[-0.5px] whitespace-nowrap truncate pointer-events-none">
              <span className="capitalize">{dayName}</span>{" "}
              <span className="font-normal text-[#8E8E8E]">{dayLabel}</span>
            </h1>
            <input
              type="date"
              aria-label="Choisir une date"
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              value={dateKey}
              onChange={handleDateChange}
            />
          </div>
          {!isToday && (
            <>
              <button
                type="button"
                onClick={() => changeDate(new Date())}
                aria-label="Revenir à aujourd'hui"
                className="h-9 flex items-center gap-1 text-[15px] font-medium text-[#3884FF] active:scale-95 transition-transform"
              >
                <RotateCcw size={15} strokeWidth={2} />
                Auj.
              </button>
              <span aria-hidden className="w-px h-[18px] bg-black/10 ml-2 mr-0.5" />
            </>
          )}
          <button
            type="button"
            onClick={() => changeDate(subDays(selectedDate, 1))}
            aria-label="Jour précédent"
            className="w-9 h-9 flex items-center justify-center text-[#3884FF] active:scale-95 transition-transform"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => changeDate(addDays(selectedDate, 1))}
            aria-label="Jour suivant"
            className="w-9 h-9 -mr-2 flex items-center justify-center text-[#3884FF] active:scale-95 transition-transform"
          >
            <ChevronRight size={22} strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <SegmentedControl
            ariaLabel="Service"
            size="sm"
            fill
            className="flex-1"
            value={selectedService}
            onChange={setSelectedService}
            options={[
              { value: "total" as const, covers: lunchCovers + dinnerCovers, label: "Total" },
              { value: "lunch" as const, covers: lunchCovers, label: "Midi" },
              { value: "dinner" as const, covers: dinnerCovers, label: "Soir" },
            ].map(({ value, covers, label }) => ({
              value,
              ariaLabel: `${label} : ${covers} couverts`,
              label: (
                <>
                  <span>{label}</span>
                  <span className="font-bold">{covers}</span>
                </>
              ),
            }))}
          />
          <button
            type="button"
            onClick={() => setShowDaySettings(true)}
            aria-label="Gérer les créneaux du jour"
            className="w-9 h-9 -mr-1 flex items-center justify-center text-[#3884FF] active:scale-95 transition-transform"
          >
            <SlidersHorizontal size={22} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className={cn("flex-1 overflow-y-auto", NAV_CLEARANCE)}>{services.map(renderService)}</div>
      )}

      {menuFor && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setMenuFor(null)} />
          <div
            role="dialog"
            aria-label={`Statut de ${menuFor.firstName} ${menuFor.lastName}`}
            className="relative m-3 mb-[calc(0.75rem+env(safe-area-inset-bottom))] flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in duration-200"
          >
            <div className="bg-white rounded-3xl p-2 flex flex-col">
              <p className="px-3 pt-2 pb-2 text-sm text-center text-[#6E6E6E]">
                {menuFor.firstName} <span className="font-semibold text-[#0C0C0C]">{menuFor.lastName}</span> · {menuFor.timeKey} · {menuFor.partySize} pers.
              </p>
              {getMenuActions(menuFor.status).map(({ status, label, icon: Icon, tone }) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(menuFor, status, label)}
                  className="flex items-center gap-3 px-3 py-2 rounded-2xl active:bg-[#F6F6F6]"
                >
                  <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center", tone.bg)}>
                    <Icon size={18} strokeWidth={2} className={tone.iconColor} />
                  </span>
                  <span className="text-[15px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMenuFor(null)}
              className="h-12 rounded-3xl bg-white text-[15px] font-semibold text-[#3884FF]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showDaySettings && (
        <DaySettingsPopup dateKey={dateKey} onClose={() => setShowDaySettings(false)} />
      )}
    </div>
  );
}
