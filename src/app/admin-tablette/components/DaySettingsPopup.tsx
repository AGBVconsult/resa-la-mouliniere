"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Loader2, Clock, Users, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  mergeSlotStates,
  toRemainingCovers,
  capacityFromRemainingCovers,
  isSlotModified,
  buildSlotUpdate,
  DEFAULT_LIMITED_GROUP_SIZE,
  type SlotState,
} from "@/lib/utils/slot-day-settings";
import { CoverChip, CoverPanel, GroupSizeChip, GroupSizePanel, TablesChip } from "@/components/admin/SlotChips";
import { FloatingSaveBar } from "@/components/admin/FloatingSaveBar";
import {
  SlotCapacityShapeEditor,
  type CapacityShapeSummaryDto,
} from "@/components/admin/SlotCapacityShapeEditor";

type DaySlotState = SlotState<Id<"slots">>;

interface DaySettingsPopupProps {
  dateKey: string;
  onClose: () => void;
}

export function DaySettingsPopup({ dateKey, onClose }: DaySettingsPopupProps) {
  const slotsData = useQuery(api.slots.listByDate, { dateKey });
  const batchUpdateSlots = useMutation(api.slots.batchUpdateSlots);
  const addSlot = useMutation(api.slots.addSlot);
  const ensureSlots = useMutation(api.weeklyTemplates.ensureSlotsForDate);
  const hasSynced = useRef(false);

  // Sync slots from weekly templates on mount
  useEffect(() => {
    if (!hasSynced.current) {
      hasSynced.current = true;
      ensureSlots({ dateKey }).catch((err) =>
        console.error("Error ensuring slots for date:", err)
      );
    }
  }, [dateKey, ensureSlots]);

  const [lunchSlots, setLunchSlots] = useState<DaySlotState[]>([]);
  const [dinnerSlots, setDinnerSlots] = useState<DaySlotState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState<"lunch" | "dinner" | null>(null);
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotCapacity, setNewSlotCapacity] = useState(50);

  // Resynchronise l'état local à chaque mise à jour du serveur, en conservant
  // les modifications locales non enregistrées. Indispensable pour qu'un créneau
  // ajouté via (+) apparaisse tout de suite dans la liste.
  useEffect(() => {
    if (!slotsData) return;
    setLunchSlots((prev) => mergeSlotStates(slotsData.lunch, prev));
    setDinnerSlots((prev) => mergeSlotStates(slotsData.dinner, prev));
  }, [slotsData]);

  const isLunchOpen = useMemo(() => {
    return lunchSlots.some((s) => s.isOpen);
  }, [lunchSlots]);

  const isDinnerOpen = useMemo(() => {
    return dinnerSlots.some((s) => s.isOpen);
  }, [dinnerSlots]);

  const changeCount = useMemo(
    () => [...lunchSlots, ...dinnerSlots].filter(isSlotModified).length,
    [lunchSlots, dinnerSlots]
  );

  const hasChanges = changeCount > 0;

  // Barre flottante : elle doit se superposer au contenu, pas le pousser.
  // À son apparition, on fige la hauteur du modal puis on ajoute de la marge
  // basse : la marge sert uniquement à pouvoir faire défiler les derniers
  // créneaux au-dessus de la barre, sans agrandir le modal.
  // (Style appliqué directement : globals.css force `p-6` en !important.)
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoaded = !!slotsData;
  useLayoutEffect(() => {
    const modal = modalRef.current;
    const scroll = scrollRef.current;
    if (!modal || !scroll) return;
    if (hasChanges) {
      modal.style.height = `${modal.offsetHeight}px`;
      scroll.style.paddingBottom = "7rem";
    } else {
      modal.style.height = "";
      scroll.style.paddingBottom = "1.5rem";
    }
  }, [hasChanges, isLoaded]);

  const handleServiceToggle = (service: "lunch" | "dinner", open: boolean) => {
    if (service === "lunch") {
      setLunchSlots((prev) => prev.map((s) => ({ ...s, isOpen: open })));
    } else {
      setDinnerSlots((prev) => prev.map((s) => ({ ...s, isOpen: open })));
    }
  };

  const handleSlotToggle = (service: "lunch" | "dinner", slotId: Id<"slots">, open: boolean) => {
    if (service === "lunch") {
      setLunchSlots((prev) =>
        prev.map((s) => (s._id === slotId ? { ...s, isOpen: open } : s))
      );
    } else {
      setDinnerSlots((prev) =>
        prev.map((s) => (s._id === slotId ? { ...s, isOpen: open } : s))
      );
    }
  };

  const handleCapacityChange = (service: "lunch" | "dinner", slotId: Id<"slots">, capacity: number) => {
    if (service === "lunch") {
      setLunchSlots((prev) =>
        prev.map((s) => (s._id === slotId ? { ...s, capacity } : s))
      );
    } else {
      setDinnerSlots((prev) =>
        prev.map((s) => (s._id === slotId ? { ...s, capacity } : s))
      );
    }
  };

  const handleMaxGroupSizeChange = (
    service: "lunch" | "dinner",
    slotId: Id<"slots">,
    maxGroupSize: number | null
  ) => {
    const update = (prev: DaySlotState[]) =>
      prev.map((s) => (s._id === slotId ? { ...s, maxGroupSize } : s));
    if (service === "lunch") setLunchSlots(update);
    else setDinnerSlots(update);
  };

  const handleAddSlot = async (service: "lunch" | "dinner") => {
    if (!newSlotTime || !/^\d{2}:\d{2}$/.test(newSlotTime)) {
      return;
    }

    try {
      await addSlot({
        dateKey,
        service,
        timeKey: newSlotTime,
        capacity: newSlotCapacity,
      });
      setIsAddingSlot(null);
      setNewSlotTime("");
      setNewSlotCapacity(50);
    } catch (error) {
      console.error("Error adding slot:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allSlots = [...lunchSlots, ...dinnerSlots];
      // N'envoyer que ce qui a changé (voir buildSlotUpdate).
      const updates = allSlots.filter(isSlotModified).map(buildSlotUpdate);

      if (updates.length > 0) {
        await batchUpdateSlots({ updates });
      }

      onClose();
    } catch (error) {
      console.error("Error saving slots:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = format(new Date(dateKey), "EEEE d MMMM", { locale: fr });

  if (!slotsData) {
    return (
      <>
        <div className="fixed inset-0 backdrop-blur-[2px] bg-black/40 z-[200]" onClick={onClose} />
        <div className="fixed inset-4 top-[calc(1rem+env(safe-area-inset-top))] md:inset-6 md:top-[calc(1.5rem+env(safe-area-inset-top))] bg-white rounded-3xl shadow-2xl z-[201] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 backdrop-blur-[2px] bg-black/40 z-[200]" onClick={onClose} />
      {/* Même marge de chaque côté de l'écran (16 px sur mobile, 24 px dès la tablette). */}
      <div ref={modalRef} className="fixed inset-4 top-[calc(1rem+env(safe-area-inset-top))] md:inset-6 md:top-[calc(1.5rem+env(safe-area-inset-top))] bg-white rounded-3xl shadow-2xl z-[201] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 md:px-6 md:py-5">
          <h2 className="text-lg font-bold text-slate-900 capitalize">{formattedDate}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-2 pb-24 md:px-6 md:pt-6 md:pb-0 space-y-6">
          {/* Services : empilés sur mobile, côte à côte dès la tablette */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServiceSection
              title="Déjeuner"
              service="lunch"
              isOpen={isLunchOpen}
              onToggle={(open) => handleServiceToggle("lunch", open)}
              slots={lunchSlots}
              rawSlots={slotsData.lunch}
              onSlotToggle={(id, open) => handleSlotToggle("lunch", id, open)}
              onCapacityChange={(id, cap) => handleCapacityChange("lunch", id, cap)}
              onMaxGroupSizeChange={(id, size) => handleMaxGroupSizeChange("lunch", id, size)}
              isAddingSlot={isAddingSlot === "lunch"}
              onStartAddSlot={() => setIsAddingSlot("lunch")}
              onCancelAddSlot={() => setIsAddingSlot(null)}
              newSlotTime={newSlotTime}
              onNewSlotTimeChange={setNewSlotTime}
              newSlotCapacity={newSlotCapacity}
              onNewSlotCapacityChange={setNewSlotCapacity}
              onConfirmAddSlot={() => handleAddSlot("lunch")}
            />

            <ServiceSection
              title="Dîner"
              service="dinner"
              isOpen={isDinnerOpen}
              onToggle={(open) => handleServiceToggle("dinner", open)}
              slots={dinnerSlots}
              rawSlots={slotsData.dinner}
              onSlotToggle={(id, open) => handleSlotToggle("dinner", id, open)}
              onCapacityChange={(id, cap) => handleCapacityChange("dinner", id, cap)}
              onMaxGroupSizeChange={(id, size) => handleMaxGroupSizeChange("dinner", id, size)}
              isAddingSlot={isAddingSlot === "dinner"}
              onStartAddSlot={() => setIsAddingSlot("dinner")}
              onCancelAddSlot={() => setIsAddingSlot(null)}
              newSlotTime={newSlotTime}
              onNewSlotTimeChange={setNewSlotTime}
              newSlotCapacity={newSlotCapacity}
              onNewSlotCapacityChange={setNewSlotCapacity}
              onConfirmAddSlot={() => handleAddSlot("dinner")}
            />
          </div>
        </div>

        {/* Barre flottante : visible uniquement s'il y a des modifications */}
        <FloatingSaveBar
          visible={hasChanges}
          changeCount={changeCount}
          isSaving={isSaving}
          onCancel={onClose}
          onSave={handleSave}
        />
      </div>
    </>
  );
}

interface RawSlot {
  _id: Id<"slots">;
  remainingCapacity: number;
  reservedCovers: number;
  capacityShape: CapacityShapeSummaryDto;
}

interface ServiceSectionProps {
  title: string;
  service: "lunch" | "dinner";
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  slots: DaySlotState[];
  rawSlots: RawSlot[];
  onSlotToggle: (id: Id<"slots">, open: boolean) => void;
  onCapacityChange: (id: Id<"slots">, capacity: number) => void;
  onMaxGroupSizeChange: (id: Id<"slots">, maxGroupSize: number | null) => void;
  isAddingSlot: boolean;
  onStartAddSlot: () => void;
  onCancelAddSlot: () => void;
  newSlotTime: string;
  onNewSlotTimeChange: (time: string) => void;
  newSlotCapacity: number;
  onNewSlotCapacityChange: (capacity: number) => void;
  onConfirmAddSlot: () => void;
}

function ServiceSection({
  title,
  service,
  isOpen,
  onToggle,
  slots,
  rawSlots,
  onSlotToggle,
  onCapacityChange,
  onMaxGroupSizeChange,
  isAddingSlot,
  onStartAddSlot,
  onCancelAddSlot,
  newSlotTime,
  onNewSlotTimeChange,
  newSlotCapacity,
  onNewSlotCapacityChange,
  onConfirmAddSlot,
}: ServiceSectionProps) {
  const rawSlotById = new Map(rawSlots.map((s) => [s._id, s]));
  // Un seul panneau ouvert à la fois par service : taille de groupe ou tables restantes.
  const [openPanel, setOpenPanel] = useState<{ slotId: Id<"slots">; kind: "covers" | "group" | "tables" } | null>(null);
  const togglePanel = (slotId: Id<"slots">, kind: "covers" | "group" | "tables") =>
    setOpenPanel((current) => (current?.slotId === slotId && current.kind === kind ? null : { slotId, kind }));
  const isPanelOpen = (slotId: Id<"slots">, kind: "covers" | "group" | "tables") =>
    openPanel?.slotId === slotId && openPanel.kind === kind;
  return (
    <div className="bg-slate-50 rounded-3xl overflow-hidden">
      {/* Service Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
        <span className="font-semibold text-slate-900">{title}</span>
        <Switch checked={isOpen} onCheckedChange={onToggle} />
      </div>

      {/* Slots */}
      <div className="p-3 space-y-0 divide-y divide-slate-100">
        {/* Créneaux horaires header */}
        {/* px-3 + -mr-1 : l'icône (+) s'aligne sur le bord droit des switchs des créneaux */}
        <div className="flex items-center justify-between mb-2 px-3">
          <span className="text-sm text-slate-500">Créneaux horaires</span>
          <button
            onClick={onStartAddSlot}
            className="-mr-1 p-1 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Plus size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Add Slot Form */}
        {isAddingSlot && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-emerald-600" />
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => onNewSlotTimeChange(e.target.value)}
                className="w-24 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-emerald-600" />
              <input
                type="number"
                min={1}
                max={100}
                value={newSlotCapacity}
                onChange={(e) => onNewSlotCapacityChange(parseInt(e.target.value) || 50)}
                className="w-16 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={onCancelAddSlot}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} className="text-slate-500" />
              </button>
              <button
                onClick={onConfirmAddSlot}
                disabled={!newSlotTime}
                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Slots List */}
        {slots.length === 0 && !isAddingSlot ? (
          <p className="text-slate-400 text-sm text-center py-4">
            Aucun créneau configuré
          </p>
        ) : (
          slots.map((slot) => {
            const rawSlot = rawSlotById.get(slot._id);
            // Affiche les couverts encore disponibles (capacité - réservés) ;
            // la saisie est reconvertie en capacité totale avant enregistrement.
            const reservedCovers = rawSlot?.reservedCovers ?? 0;
            return (
              <div
                key={slot._id}
                className={cn(
                  "flex flex-col gap-1 px-3 transition-colors",
                  slot.isOpen ? "bg-transparent" : "bg-slate-100/50"
                )}
              >
                {/* Grille : heure | puce dispo | puce groupe | puce tables | — | interrupteur.
                    Chaque réglage s'ouvre en 2e rangée, à partir de la colonne de sa puce ;
                    les tables restantes occupent toute la largeur. */}
                <div className="grid grid-cols-[auto_auto_auto_auto_minmax(0,1fr)_auto] items-center gap-x-1.5">
                  <div className="flex h-[52px] items-center min-w-[46px] lg:min-w-[52px]">
                    <span className="text-sm font-extrabold tabular-nums text-slate-800 lg:text-base">{slot.timeKey}</span>
                  </div>

                  <CoverChip
                    available={toRemainingCovers(slot.capacity, reservedCovers)}
                    reservedCovers={reservedCovers}
                    isOpen={isPanelOpen(slot._id, "covers")}
                    onClick={() => togglePanel(slot._id, "covers")}
                    disabled={!slot.isOpen}
                    isModified={slot.capacity !== slot.originalCapacity}
                  />

                  <GroupSizeChip
                    value={slot.maxGroupSize}
                    isOpen={isPanelOpen(slot._id, "group")}
                    onClick={() => {
                      // Ouvrir la puce d'un créneau en groupe libre propose d'emblée max 6.
                      if (slot.maxGroupSize === null && !isPanelOpen(slot._id, "group")) {
                        onMaxGroupSizeChange(slot._id, DEFAULT_LIMITED_GROUP_SIZE);
                      }
                      togglePanel(slot._id, "group");
                    }}
                    disabled={!slot.isOpen}
                    isModified={slot.maxGroupSize !== slot.originalMaxGroupSize}
                  />

                  {rawSlot ? (
                    <TablesChip
                      capacityShape={rawSlot.capacityShape}
                      isOpen={isPanelOpen(slot._id, "tables")}
                      onClick={() => togglePanel(slot._id, "tables")}
                      disabled={!slot.isOpen}
                    />
                  ) : (
                    <span />
                  )}

                  <span />
                  <div className="flex h-11 items-center">
                    <Switch
                      checked={slot.isOpen}
                      onCheckedChange={(open) => onSlotToggle(slot._id, open)}
                      className="origin-right scale-75 lg:scale-90"
                    />
                  </div>

                  {slot.isOpen && isPanelOpen(slot._id, "covers") && (
                    <div className="col-start-2 col-end-[-1]">
                      <CoverPanel
                        value={toRemainingCovers(slot.capacity, reservedCovers)}
                        originalValue={toRemainingCovers(slot.originalCapacity, reservedCovers)}
                        onChange={(remaining) =>
                          onCapacityChange(slot._id, capacityFromRemainingCovers(remaining, reservedCovers))
                        }
                        onClose={() => setOpenPanel(null)}
                      />
                    </div>
                  )}

                  {slot.isOpen && isPanelOpen(slot._id, "group") && (
                    <div className="col-start-3 col-end-[-1]">
                      <GroupSizePanel
                        value={slot.maxGroupSize}
                        onChange={(size) => onMaxGroupSizeChange(slot._id, size)}
                        onClose={() => setOpenPanel(null)}
                      />
                    </div>
                  )}

                  {rawSlot && isPanelOpen(slot._id, "tables") && (
                    <div className="col-span-full mb-2.5">
                      <SlotCapacityShapeEditor
                        slotId={slot._id}
                        remainingCapacity={rawSlot.remainingCapacity}
                        capacityShape={rawSlot.capacityShape}
                        onClose={() => setOpenPanel(null)}
                        large
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
