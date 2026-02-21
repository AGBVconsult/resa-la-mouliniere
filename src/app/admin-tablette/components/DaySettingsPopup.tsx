"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Loader2, Clock, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface DaySettingsPopupProps {
  dateKey: string;
  onClose: () => void;
}

interface SlotState {
  _id: Id<"slots">;
  timeKey: string;
  isOpen: boolean;
  capacity: number;
  originalIsOpen: boolean;
  originalCapacity: number;
}

export function DaySettingsPopup({ dateKey, onClose }: DaySettingsPopupProps) {
  const slotsData = useQuery(api.slots.listByDate, { dateKey });
  const batchUpdateSlots = useMutation(api.slots.batchUpdateSlots);
  const addSlot = useMutation(api.slots.addSlot);

  const [lunchSlots, setLunchSlots] = useState<SlotState[]>([]);
  const [dinnerSlots, setDinnerSlots] = useState<SlotState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState<"lunch" | "dinner" | null>(null);
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotCapacity, setNewSlotCapacity] = useState(50);

  useEffect(() => {
    if (slotsData) {
      setLunchSlots(
        slotsData.lunch.map((s) => ({
          _id: s._id,
          timeKey: s.timeKey,
          isOpen: s.isOpen,
          capacity: s.capacity,
          originalIsOpen: s.isOpen,
          originalCapacity: s.capacity,
        }))
      );
      setDinnerSlots(
        slotsData.dinner.map((s) => ({
          _id: s._id,
          timeKey: s.timeKey,
          isOpen: s.isOpen,
          capacity: s.capacity,
          originalIsOpen: s.isOpen,
          originalCapacity: s.capacity,
        }))
      );
    }
  }, [slotsData]);

  const isDayOpen = useMemo(() => {
    return [...lunchSlots, ...dinnerSlots].some((s) => s.isOpen);
  }, [lunchSlots, dinnerSlots]);

  const isLunchOpen = useMemo(() => {
    return lunchSlots.some((s) => s.isOpen);
  }, [lunchSlots]);

  const isDinnerOpen = useMemo(() => {
    return dinnerSlots.some((s) => s.isOpen);
  }, [dinnerSlots]);

  const hasChanges = useMemo(() => {
    const allSlots = [...lunchSlots, ...dinnerSlots];
    return allSlots.some(
      (s) => s.isOpen !== s.originalIsOpen || s.capacity !== s.originalCapacity
    );
  }, [lunchSlots, dinnerSlots]);

  const handleDayToggle = (open: boolean) => {
    setLunchSlots((prev) => prev.map((s) => ({ ...s, isOpen: open })));
    setDinnerSlots((prev) => prev.map((s) => ({ ...s, isOpen: open })));
  };

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
      const updates = allSlots
        .filter((s) => s.isOpen !== s.originalIsOpen || s.capacity !== s.originalCapacity)
        .map((s) => ({
          slotId: s._id,
          isOpen: s.isOpen,
          capacity: s.capacity,
        }));

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
        <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />
        <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[90vh] bg-white rounded-3xl shadow-2xl z-[201] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] md:max-h-[90vh] bg-white rounded-3xl shadow-2xl z-[201] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900 capitalize">{formattedDate}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Day Toggle */}
          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Jour complet</span>
              <Switch
                checked={isDayOpen}
                onCheckedChange={handleDayToggle}
              />
            </div>
          </div>

          {/* Services */}
          <div className="grid grid-cols-2 gap-4">
            <ServiceSection
              title="Déjeuner"
              service="lunch"
              isOpen={isLunchOpen}
              onToggle={(open) => handleServiceToggle("lunch", open)}
              slots={lunchSlots}
              onSlotToggle={(id, open) => handleSlotToggle("lunch", id, open)}
              onCapacityChange={(id, cap) => handleCapacityChange("lunch", id, cap)}
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
              onSlotToggle={(id, open) => handleSlotToggle("dinner", id, open)}
              onCapacityChange={(id, cap) => handleCapacityChange("dinner", id, cap)}
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

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 bg-white">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl"
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

interface ServiceSectionProps {
  title: string;
  service: "lunch" | "dinner";
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  slots: SlotState[];
  onSlotToggle: (id: Id<"slots">, open: boolean) => void;
  onCapacityChange: (id: Id<"slots">, capacity: number) => void;
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
  onSlotToggle,
  onCapacityChange,
  isAddingSlot,
  onStartAddSlot,
  onCancelAddSlot,
  newSlotTime,
  onNewSlotTimeChange,
  newSlotCapacity,
  onNewSlotCapacityChange,
  onConfirmAddSlot,
}: ServiceSectionProps) {
  return (
    <div className="bg-slate-50 rounded-3xl overflow-hidden">
      {/* Service Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
        <span className="font-semibold text-slate-900">{title}</span>
        <Switch checked={isOpen} onCheckedChange={onToggle} />
      </div>

      {/* Slots */}
      <div className="p-4 space-y-2">
        {/* Créneaux horaires header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">Créneaux horaires</span>
          <button
            onClick={onStartAddSlot}
            className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
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
          slots.map((slot) => (
            <div
              key={slot._id}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-colors",
                slot.isOpen ? "bg-white" : "bg-slate-200/50"
              )}
            >
              <div className="flex items-center gap-2 text-slate-600">
                <Clock size={16} />
                <span className="font-mono text-sm font-medium">{slot.timeKey}</span>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <Users size={16} className="text-slate-400" />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={slot.capacity}
                  onChange={(e) => onCapacityChange(slot._id, parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1.5 text-sm bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  disabled={!slot.isOpen}
                />
              </div>

              <Switch
                checked={slot.isOpen}
                onCheckedChange={(open) => onSlotToggle(slot._id, open)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
