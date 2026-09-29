"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, format, parseISO, subDays } from "date-fns";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Map as MapIcon, Moon, Plus, Search, Settings, Sun } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ReservationStatus } from "../../../../spec/contracts.generated";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { ServiceFloorPlan } from "@/components/admin/floor-plan/ServiceFloorPlan";
import { ClientModal } from "@/components/admin/ClientModal";
import { CalendarPopup } from "../components/CalendarPopup";
import { EditReservationPopup } from "../components/EditReservationPopup";
import { DaySettingsPopup } from "../components/DaySettingsPopup";
import { ClientSearchPopup } from "../components/ClientSearchPopup";
import { TabletNotificationBell } from "../components/TabletNotificationBell";
import { TabletCreateReservationPopup, type ReservationPrefill } from "../components/TabletCreateReservationPopup";
import { ReviewSuppressionButton } from "../components/ReviewSuppressionButton";
import { DateNavigator, ServiceSwitch, type ServiceTab } from "./_components/HeaderControls";
import { ReservationList } from "./_components/ReservationList";
import { ReservationRow } from "./_components/ReservationRow";
import { StatusMenu } from "./_components/StatusMenu";
import {
  INACTIVE_STATUSES,
  STATUS_STYLES,
  brusselsDefaultService,
  getDisplayStatus,
  isUnassigned,
  type DisplayStatus,
  type Reservation,
  type Service,
} from "./_components/status";

type Slot = { timeKey: string; isOpen: boolean; capacity: number };

function sumOpenCapacity(slots: Slot[] | undefined) {
  return (slots ?? []).reduce((sum, s) => sum + (s.isOpen ? s.capacity : 0), 0);
}

function countActive(list: Reservation[] | undefined) {
  return (list ?? []).filter((r) => !INACTIVE_STATUSES.includes(r.status)).reduce((sum, r) => sum + r.partySize, 0);
}

export default function TabletReservationsV2Page() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return parseISO(dateParam);
    return new Date();
  });
  const [selectedService, setSelectedService] = useState<ServiceTab>(brusselsDefaultService);
  const [showFloorPlan, setShowFloorPlan] = useState(true);
  const [selectedForAssignment, setSelectedForAssignment] = useState<Reservation | null>(null);
  const [highlightedReservationId, setHighlightedReservationId] = useState<Id<"reservations"> | null>(null);
  const [statusMenu, setStatusMenu] = useState<{ res: Reservation; anchor: DOMRect } | null>(null);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, ReservationStatus>>({});

  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<ReservationPrefill | undefined>(undefined);
  const [selectedClientModal, setSelectedClientModal] = useState<{ clientId: Id<"clients">; reservationId: Id<"reservations"> } | null>(null);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const isToday = format(new Date(), "yyyy-MM-dd") === dateKey;

  // Synchronise les créneaux depuis les modèles hebdomadaires pour la date affichée
  const ensureSlots = useMutation(api.weeklyTemplates.ensureSlotsForDate);
  useEffect(() => {
    ensureSlots({ dateKey }).catch((err) => console.error("Error ensuring slots for date:", err));
  }, [dateKey, ensureSlots]);

  const slotsData = useQuery(api.slots.listByDate, { dateKey }) as { lunch?: Slot[]; dinner?: Slot[] } | undefined;
  const tablesData = useQuery(api.tables.list, {});

  const { results: lunchResults, status: lunchStatus } = usePaginatedQuery(
    api.admin.listReservations,
    { dateKey, service: "lunch" },
    { initialNumItems: 50 },
  );
  const { results: dinnerResults, status: dinnerStatus } = usePaginatedQuery(
    api.admin.listReservations,
    { dateKey, service: "dinner" },
    { initialNumItems: 50 },
  );
  const lunchReservations = lunchResults as Reservation[] | undefined;
  const dinnerReservations = dinnerResults as Reservation[] | undefined;

  const updateReservation = useMutation(api.admin.updateReservation);

  // ---- Chiffres du header ------------------------------------------------
  const stats = useMemo(() => {
    const lunch = { covers: countActive(lunchReservations), capacity: sumOpenCapacity(slotsData?.lunch) };
    const dinner = { covers: countActive(dinnerReservations), capacity: sumOpenCapacity(slotsData?.dinner) };
    return {
      lunch,
      dinner,
      total: { covers: lunch.covers + dinner.covers, capacity: lunch.capacity + dinner.capacity },
    };
  }, [lunchReservations, dinnerReservations, slotsData]);

  const capacityByTime = useMemo(() => {
    const build = (slots: Slot[] | undefined) =>
      Object.fromEntries((slots ?? []).map((s) => [s.timeKey, s.capacity]));
    return { lunch: build(slotsData?.lunch), dinner: build(slotsData?.dinner) };
  }, [slotsData]);

  const tableNames = useMemo(() => {
    const byId = new Map<string, string>();
    for (const t of tablesData ?? []) byId.set(t._id, t.name);
    return byId;
  }, [tablesData]);

  const getTableName = useCallback(
    (res: Reservation) => {
      const primaryId = res.primaryTableId ?? res.tableIds[0];
      return primaryId ? tableNames.get(primaryId) ?? null : null;
    },
    [tableNames],
  );

  // ---- Navigation ----------------------------------------------------------
  const goToToday = () => {
    setSelectedDate(new Date());
    setSelectedService(brusselsDefaultService());
  };

  // La surbrillance est dérivée : elle ne s'applique que si la résa est affichée,
  // ce qui permet à la cloche de changer date + service + cible en un seul geste.
  const visibleReservations = useMemo(() => {
    if (selectedService === "total") return [...(lunchReservations ?? []), ...(dinnerReservations ?? [])];
    return (selectedService === "lunch" ? lunchReservations : dinnerReservations) ?? [];
  }, [selectedService, lunchReservations, dinnerReservations]);

  const effectiveHighlightedId = useMemo(() => {
    if (!highlightedReservationId) return null;
    return visibleReservations.some((r) => r._id === highlightedReservationId) ? highlightedReservationId : null;
  }, [highlightedReservationId, visibleReservations]);

  useEffect(() => {
    if (!effectiveHighlightedId) return;
    // Laisse le temps à une section repliée de s'ouvrir avant de défiler
    const id = requestAnimationFrame(() =>
      rowRefs.current[effectiveHighlightedId]?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
    return () => cancelAnimationFrame(id);
  }, [effectiveHighlightedId]);

  // ---- Statuts -------------------------------------------------------------
  const handleStatusChange = useCallback(
    async (res: Reservation, newStatus: ReservationStatus) => {
      setOptimisticStatuses((prev) => ({ ...prev, [res._id]: newStatus }));
      const clear = () =>
        setOptimisticStatuses((prev) => {
          const next = { ...prev };
          delete next[res._id];
          return next;
        });
      try {
        await updateReservation({ reservationId: res._id, status: newStatus, expectedVersion: res.version });
        clear();
        toast.success(`${res.lastName} · ${STATUS_STYLES[newStatus]?.label ?? newStatus}`);
      } catch (error) {
        clear();
        toast.error(formatConvexError(error));
      }
    },
    [updateReservation, toast],
  );

  const displayStatusOf = useCallback(
    (res: Reservation): DisplayStatus =>
      getDisplayStatus(optimisticStatuses[res._id] ?? res.status, !isUnassigned(res)),
    [optimisticStatuses],
  );

  const handleAdvance = useCallback(
    (res: Reservation) => {
      const next = STATUS_STYLES[displayStatusOf(res)]?.next;
      if (next) handleStatusChange(res, next);
    },
    [displayStatusOf, handleStatusChange],
  );

  const handleMenuSelect = (status: DisplayStatus) => {
    if (!statusMenu) return;
    const { res } = statusMenu;
    setStatusMenu(null);
    const target: ReservationStatus = status === "assigned" ? "confirmed" : status;
    if (target !== (optimisticStatuses[res._id] ?? res.status)) handleStatusChange(res, target);
  };

  // ---- Interactions de ligne ----------------------------------------------
  const handleOpen = useCallback((res: Reservation) => {
    if (res.clientId) setSelectedClientModal({ clientId: res.clientId, reservationId: res._id });
    else setEditingReservation(res);
  }, []);

  const handleToggleAssign = useCallback((res: Reservation) => {
    setSelectedForAssignment((prev) => (prev?._id === res._id ? null : res));
    setShowFloorPlan(true);
  }, []);

  const handleOpenMenu = useCallback((res: Reservation, anchor: DOMRect) => {
    setStatusMenu((prev) => (prev?.res._id === res._id ? null : { res, anchor }));
  }, []);

  const renderRow = (res: Reservation) => (
    <ReservationRow
      key={res._id}
      res={res}
      displayStatus={displayStatusOf(res)}
      tableName={getTableName(res)}
      isSelectedForAssignment={selectedForAssignment?._id === res._id}
      isHighlighted={effectiveHighlightedId === res._id}
      isMenuOpen={statusMenu?.res._id === res._id}
      onOpen={handleOpen}
      onToggleAssign={handleToggleAssign}
      onAdvance={handleAdvance}
      onOpenMenu={handleOpenMenu}
      rowRef={(el) => {
        rowRefs.current[res._id] = el;
      }}
    />
  );

  const openCreate = () => {
    setCreatePrefill(undefined);
    setShowCreatePopup(true);
  };

  const isLoadingLunch = lunchStatus === "LoadingFirstPage";
  const isLoadingDinner = dinnerStatus === "LoadingFirstPage";
  const activeService: Service | null = selectedService === "total" ? null : selectedService;

  return (
    <div
      className={cn(
        "flex h-dvh w-full flex-col bg-[#F4F2ED] text-stone-900",
        "[-webkit-tap-highlight-color:transparent] [touch-action:manipulation]",
        "selection:bg-[#334156]/15",
      )}
    >
      {/* ---------------------------------------------------------------- Header */}
      <header className="relative z-20 flex shrink-0 items-center gap-4 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <DateNavigator
          date={selectedDate}
          isToday={isToday}
          onPrev={() => setSelectedDate((d) => subDays(d, 1))}
          onNext={() => setSelectedDate((d) => addDays(d, 1))}
          onToday={goToToday}
          onOpenCalendar={() => setShowCalendarPopup(true)}
        />

        <div className="absolute left-1/2 -translate-x-1/2">
          <ServiceSwitch value={selectedService} onChange={setSelectedService} stats={stats} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <TabletNotificationBell
            onNavigateToReservation={(targetDateKey, service, reservationId) => {
              const [y, m, d] = targetDateKey.split("-").map(Number);
              setSelectedDate(new Date(y, m - 1, d));
              setSelectedService(service);
              setHighlightedReservationId(reservationId);
            }}
          />
          <RoundButton label="Rechercher un client" onClick={() => setShowClientSearch(true)}>
            <Search size={20} strokeWidth={1.75} />
          </RoundButton>
          <RoundButton label="Réglages du jour" onClick={() => setShowSettings(true)}>
            <Settings size={20} strokeWidth={1.75} />
          </RoundButton>
          {activeService && (
            <RoundButton
              label={showFloorPlan ? "Masquer le plan de salle" : "Afficher le plan de salle"}
              pressed={showFloorPlan}
              onClick={() => setShowFloorPlan((v) => !v)}
            >
              <MapIcon size={20} strokeWidth={1.75} />
            </RoundButton>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="ml-1 flex h-[52px] items-center gap-2 rounded-full bg-[#334156] pl-4 pr-5 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(51,65,86,0.5)] transition-[background-color,transform] duration-150 hover:bg-[#2A3647] active:scale-[0.97]"
          >
            <Plus size={18} strokeWidth={2.5} />
            Réservation
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------------ Body */}
      <main className="flex min-h-0 flex-1 gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {activeService ? (
          <>
            <Panel className={cn(showFloorPlan ? "w-1/2" : "w-full")}>
              <ReservationList
                reservations={activeService === "lunch" ? lunchReservations : dinnerReservations}
                isLoading={activeService === "lunch" ? isLoadingLunch : isLoadingDinner}
                capacityByTime={capacityByTime[activeService]}
                highlightedId={effectiveHighlightedId}
                renderRow={renderRow}
                onCreate={openCreate}
              />
            </Panel>

            <AnimatePresence initial={false}>
              {showFloorPlan && (
                <motion.section
                  key="floor-plan"
                  aria-label="Plan de salle"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  className="relative w-1/2 shrink-0 overflow-hidden rounded-2xl bg-[#E9E5DC] bg-[radial-gradient(circle,rgba(41,37,36,0.09)_1px,transparent_1.2px)] [background-size:22px_22px]"
                >
                  <ServiceFloorPlan
                    dateKey={dateKey}
                    service={activeService}
                    selectedReservationId={selectedForAssignment?._id}
                    selectedReservationVersion={selectedForAssignment?.version}
                    selectedPartySize={
                      selectedForAssignment ? selectedForAssignment.partySize - selectedForAssignment.babyCount : undefined
                    }
                    selectedReservationName={
                      selectedForAssignment ? `${selectedForAssignment.lastName} (${selectedForAssignment.partySize}p)` : undefined
                    }
                    onAssignmentComplete={() => setSelectedForAssignment(null)}
                    onTableClick={setHighlightedReservationId}
                    hideHeader
                    hideCapacity
                    nameDisplay="firstName"
                    tone="light"
                  />
                  <AssignHint reservation={selectedForAssignment} onCancel={() => setSelectedForAssignment(null)} />
                  <ReviewSuppressionButton dateKey={dateKey} service={activeService} />
                </motion.section>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            {(["lunch", "dinner"] as const).map((service) => (
              <Panel key={service} className="w-1/2" scroll={false}>
                <div className="flex h-11 shrink-0 items-center gap-2 border-b border-stone-200/70 px-4">
                  {service === "lunch" ? (
                    <Sun size={16} strokeWidth={2} className="text-amber-500" />
                  ) : (
                    <Moon size={16} strokeWidth={2} className="text-indigo-400" />
                  )}
                  <span className="text-sm font-bold">{service === "lunch" ? "Midi" : "Soir"}</span>
                  <span className="text-sm tabular-nums text-stone-500">
                    {stats[service].covers}
                    {stats[service].capacity > 0 && <span className="text-stone-400"> / {stats[service].capacity}</span>} couverts
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <ReservationList
                    reservations={service === "lunch" ? lunchReservations : dinnerReservations}
                    isLoading={service === "lunch" ? isLoadingLunch : isLoadingDinner}
                    capacityByTime={capacityByTime[service]}
                    highlightedId={effectiveHighlightedId}
                    renderRow={renderRow}
                    onCreate={openCreate}
                  />
                </div>
              </Panel>
            ))}
          </>
        )}
      </main>

      {statusMenu && (
        <StatusMenu
          anchor={statusMenu.anchor}
          current={displayStatusOf(statusMenu.res)}
          onSelect={handleMenuSelect}
          onClose={() => setStatusMenu(null)}
        />
      )}

      {/* ---------------------------------------------------------------- Popups */}
      <CalendarPopup
        isOpen={showCalendarPopup}
        onClose={() => setShowCalendarPopup(false)}
        onSelectDate={(newDateKey) => {
          const [year, month, day] = newDateKey.split("-").map(Number);
          setSelectedDate(new Date(year, month - 1, day));
        }}
        selectedDateKey={dateKey}
      />

      {editingReservation && (
        <EditReservationPopup
          reservation={editingReservation}
          onClose={() => setEditingReservation(null)}
          onSuccess={() => setEditingReservation(null)}
        />
      )}

      {showSettings && <DaySettingsPopup dateKey={dateKey} onClose={() => setShowSettings(false)} />}

      {showClientSearch && (
        <ClientSearchPopup
          onClose={() => setShowClientSearch(false)}
          onSelectClient={(clientId) => {
            setShowClientSearch(false);
            setSelectedClientModal({ clientId, reservationId: "" as Id<"reservations"> });
          }}
          onCreateReservation={(prefill) => {
            setShowClientSearch(false);
            setCreatePrefill(prefill);
            setShowCreatePopup(true);
          }}
        />
      )}

      {showCreatePopup && (
        <TabletCreateReservationPopup
          defaultDateKey={dateKey}
          defaultService={selectedService === "dinner" ? "dinner" : "lunch"}
          prefill={createPrefill}
          onClose={() => setShowCreatePopup(false)}
          onSuccess={() => setShowCreatePopup(false)}
        />
      )}

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

function Panel({ className, scroll = true, children }: { className?: string; scroll?: boolean; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(41,37,36,0.05),0_0_0_1px_rgba(41,37,36,0.05)]",
        "transition-[width] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
        className,
      )}
    >
      {scroll ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div> : children}
    </section>
  );
}

function RoundButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "flex size-[52px] items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-[0.94]",
        pressed
          ? "bg-stone-900 text-white"
          : "bg-white text-stone-500 shadow-[0_1px_2px_rgba(41,37,36,0.06),0_0_0_1px_rgba(41,37,36,0.06)] hover:text-stone-900",
      )}
    >
      {children}
    </button>
  );
}

function AssignHint({ reservation, onCancel }: { reservation: Reservation | null; onCancel: () => void }) {
  return (
    <AnimatePresence>
      {reservation && (
        <motion.div
          key={reservation._id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="absolute left-3 top-3 z-30 flex items-center gap-3 rounded-full bg-[#334156] py-1.5 pl-4 pr-1.5 text-sm text-white shadow-[0_6px_20px_-6px_rgba(51,65,86,0.6)]"
        >
          <span>
            Placer <strong className="font-semibold">{reservation.lastName}</strong>
            <span className="text-white/70"> · {reservation.partySize} p.</span>
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-full bg-white/15 px-3 text-xs font-semibold transition-colors hover:bg-white/25"
          >
            Annuler
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
