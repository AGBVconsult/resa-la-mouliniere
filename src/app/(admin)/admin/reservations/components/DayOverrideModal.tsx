"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Loader2, Clock, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DayOverrideModalProps {
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

export function DayOverrideModal({ dateKey, onClose }: DayOverrideModalProps) {
  const slotsData = useQuery(api.slots.listByDate, { dateKey });
  const batchUpdateSlots = useMutation(api.slots.batchUpdateSlots);
  const addSlot = useMutation(api.slots.addSlot);

  const [lunchSlots, setLunchSlots] = useState<SlotState[]>([]);
  const [dinnerSlots, setDinnerSlots] = useState<SlotState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState<"lunch" | "dinner" | null>(null);
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotCapacity, setNewSlotCapacity] = useState(50);

  // Initialize local state from query
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

  // Computed states
  const isDayOpen = useMemo(() => {
    return [...lunchSlots, ...dinnerSlots].some((s) => s.isOpen);
  }, [lunchSlots, dinnerSlots]);

  const isLunchOpen = useMemo(() => {
    return lunchSlots.some((s) => s.isOpen);
  }, [lunchSlots]);

  const isDinnerOpen = useMemo(() => {
    return dinnerSlots.some((s) => s.isOpen);
  }, [dinnerSlots]);

  // Check if there are changes
  const hasChanges = useMemo(() => {
    const allSlots = [...lunchSlots, ...dinnerSlots];
    return allSlots.some(
      (s) => s.isOpen !== s.originalIsOpen || s.capacity !== s.originalCapacity
    );
  }, [lunchSlots, dinnerSlots]);

  // Handlers
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

  // Format date for display
  const formattedDate = format(new Date(dateKey), "EEEE d MMMM yyyy", { locale: fr });

  if (!slotsData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl w-[800px] p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-[900px] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold capitalize">{formattedDate}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
          {/* Day Toggle */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="font-medium text-lg">Jour complet</span>
              <Switch
                checked={isDayOpen}
                onCheckedChange={handleDayToggle}
              />
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Lunch */}
            <ServiceCard
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

            {/* Dinner */}
            <ServiceCard
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
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Service Card Component
interface ServiceCardProps {
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

function ServiceCard({
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
}: ServiceCardProps) {
  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Service Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
        <span className="font-medium">{title}</span>
        <Switch checked={isOpen} onCheckedChange={onToggle} />
      </div>

      {/* Créneaux horaires header with add button */}
      <div className="px-4 py-2 flex items-center justify-between border-b bg-gray-50/50">
        <span className="text-sm text-gray-600">Créneaux horaires</span>
        <button
          onClick={onStartAddSlot}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Ajouter un créneau"
        >
          <Plus className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Slots List */}
      <div className="p-4 space-y-2 max-h-[350px] overflow-auto">
        {/* Add Slot Form */}
        {isAddingSlot && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-emerald-600" />
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => onNewSlotTimeChange(e.target.value)}
                className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="HH:MM"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-600" />
              <input
                type="number"
                min={1}
                max={100}
                value={newSlotCapacity}
                onChange={(e) => onNewSlotCapacityChange(parseInt(e.target.value) || 50)}
                className="w-16 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-1 ml-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelAddSlot}
                className="h-7 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={onConfirmAddSlot}
                className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={!newSlotTime}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {slots.length === 0 && !isAddingSlot ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Aucun créneau configuré
          </p>
        ) : (
          slots.map((slot) => (
            <div
              key={slot._id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                slot.isOpen ? "bg-white border" : "bg-gray-100 border border-gray-200"
              )}
            >
              {/* Time */}
              <div className="flex items-center gap-1.5 text-gray-600 w-16">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-sm">{slot.timeKey}</span>
              </div>

              {/* Capacity */}
              <div className="flex items-center gap-1.5 flex-1">
                <Users className="h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={slot.capacity}
                  onChange={(e) => onCapacityChange(slot._id, parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  disabled={!slot.isOpen}
                />
              </div>

              {/* Toggle */}
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
