"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, Moon, Plus, Sun, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  GroupSizeRow,
  SlotMeta,
  SlotOptionsButton,
  SlotCoverStepper,
  SLOT_POPOVER_ATTR,
  useCloseOnOutsidePointer,
} from "@/components/admin/SlotRowControls";
import {
  MAX_CAPACITY,
  MIN_CAPACITY,
  TIME_KEY_PATTERN,
  newTemplateSlot,
  sortSlots,
  suggestNewSlotTime,
  type Service,
  type ServiceSchedule,
  type TemplateSlot,
} from "../scheduleUtils";

const DAYS = [
  { value: 1, label: "L", name: "Lundi" },
  { value: 2, label: "M", name: "Mardi" },
  { value: 3, label: "M", name: "Mercredi" },
  { value: 4, label: "J", name: "Jeudi" },
  { value: 5, label: "V", name: "Vendredi" },
  { value: 6, label: "S", name: "Samedi" },
  { value: 7, label: "D", name: "Dimanche" },
];

interface ServiceColumnProps {
  service: Service;
  schedule: ServiceSchedule;
  onChange: (update: (prev: ServiceSchedule) => ServiceSchedule) => void;
  /** Marge basse pour faire défiler les derniers créneaux au-dessus de la barre d'enregistrement. */
  bottomInset: boolean;
}

/** Colonne d'un service : jours d'ouverture puis créneaux (même ligne que « Réglages du jour »). */
export function ServiceColumn({ service, schedule, onChange, bottomInset }: ServiceColumnProps) {
  const isLunch = service === "lunch";
  const label = isLunch ? "Midi" : "Soir";
  const Icon = isLunch ? Sun : Moon;

  const [newTime, setNewTime] = useState<string | null>(null);
  // Un seul créneau a ses options (taille de groupe, suppression) ouvertes à la fois.
  const [optionsTime, setOptionsTime] = useState<string | null>(null);
  const closeOptions = useCallback(() => setOptionsTime(null), []);
  // Toucher n'importe où ailleurs que dans le créneau ouvert ferme ses options.
  useCloseOnOutsidePointer(optionsTime !== null, closeOptions);

  // Le formulaire d'ajout est en bas de la liste : on le fait défiler à l'écran à l'ouverture.
  const addFormRef = useRef<HTMLDivElement>(null);
  const isAdding = newTime !== null;
  useEffect(() => {
    if (isAdding) addFormRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isAdding]);

  const isClosedAllWeek = schedule.openDays.length === 0;
  const newTimeExists = newTime !== null && schedule.slots.some((s) => s.timeKey === newTime);
  const canAdd = newTime !== null && TIME_KEY_PATTERN.test(newTime) && !newTimeExists;

  const updateSlot = (timeKey: string, patch: Partial<TemplateSlot>) =>
    onChange((prev) => ({ ...prev, slots: prev.slots.map((s) => (s.timeKey === timeKey ? { ...s, ...patch } : s)) }));

  const removeSlot = (timeKey: string) =>
    onChange((prev) => ({ ...prev, slots: prev.slots.filter((s) => s.timeKey !== timeKey) }));

  const toggleDay = (day: number) =>
    onChange((prev) => ({
      ...prev,
      openDays: prev.openDays.includes(day)
        ? prev.openDays.filter((d) => d !== day)
        : [...prev.openDays, day].sort((a, b) => a - b),
    }));

  const addSlot = () => {
    if (newTime === null || !canAdd) return;
    const timeKey = newTime;
    onChange((prev) =>
      prev.slots.some((s) => s.timeKey === timeKey) ? prev : { ...prev, slots: sortSlots([...prev.slots, newTemplateSlot(timeKey)]) }
    );
    setNewTime(null);
  };

  return (
    <section aria-label={label} className={cn("w-1/2 flex flex-col min-h-0", isLunch && "border-r border-[#E5E5E5]")}>
      <div className="flex items-center gap-2 px-4 py-2 bg-[#F6F6F6] border-b border-[#E5E5E5]">
        <Icon size={18} strokeWidth={1.75} className={isLunch ? "text-[#D9A441]" : "text-[#6E6E6E]"} />
        <span className="font-bold">{label}</span>
        <span className="text-sm text-[#6E6E6E] tabular-nums">{schedule.slots.length}</span>
        <button
          type="button"
          onClick={() => setNewTime(suggestNewSlotTime(schedule.slots, service))}
          className="ml-auto h-8 px-1.5 flex items-center gap-1 text-sm font-medium text-[#3884FF] hover:text-[#2F74E6] transition-colors active:scale-95"
        >
          <Plus size={16} strokeWidth={2} />
          Ajouter
        </button>
      </div>

      <div className={cn("flex-1 overflow-y-auto overscroll-contain bg-white", bottomInset && "pb-28")}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F3F3]">
          <span className={cn("text-[13px] font-medium", isClosedAllWeek ? "text-red-600" : "text-[#6E6E6E]")}>
            {isClosedAllWeek ? "Fermé toute la semaine" : "Jours d'ouverture"}
          </span>
          <div className="ml-auto flex gap-1.5">
            {DAYS.map((day) => {
              const on = schedule.openDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  aria-pressed={on}
                  aria-label={`${day.name} ${label.toLowerCase()}`}
                  className={cn(
                    "w-[34px] h-[34px] rounded-full border text-[13px] font-semibold transition-colors",
                    on ? "bg-[#0C0C0C] border-[#0C0C0C] text-white" : "bg-white border-[#E2E2E2] text-[#6E6E6E]"
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {schedule.slots.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center gap-2.5 py-14 text-sm text-[#8A8A8A]">
            <span className="w-14 h-14 rounded-full bg-[#F1F1F1] flex items-center justify-center text-[#9A9A9A]">
              <Clock size={24} strokeWidth={1.5} />
            </span>
            Aucun créneau
          </div>
        ) : (
          <div className={cn("transition-opacity", isClosedAllWeek && "opacity-45")}>
            {schedule.slots.map((slot) => (
              // heure · x places | − + · options · interrupteur · ⋯ (comme « Réglages du jour »)
              <div
                key={slot.timeKey}
                {...(optionsTime === slot.timeKey ? { [SLOT_POPOVER_ATTR]: "" } : {})}
                className={cn("px-4 border-b border-[#F3F3F3] transition-colors", !slot.isActive && "bg-slate-100/50")}
              >
                <div className="flex h-12 items-center gap-2">
                  <span className="w-[42px] shrink-0 text-sm font-extrabold tabular-nums text-slate-800">{slot.timeKey}</span>
                  <SlotCoverStepper
                    value={slot.capacity}
                    reservedCovers={0}
                    min={MIN_CAPACITY}
                    max={MAX_CAPACITY}
                    isOpen={slot.isActive}
                    onChange={(capacity) => updateSlot(slot.timeKey, { capacity })}
                    unit="places"
                    showBar={false}
                    ariaLabel={`Capacité du créneau ${slot.timeKey}`}
                  />
                  <span aria-hidden className="flex-1" />
                  <SlotMeta maxGroupSize={slot.maxGroupSize} />
                  {/* Switch réduit aux 3/4 (42 × 21 px) : le cadre fixe garde l'alignement en colonne. */}
                  <div className="flex h-11 w-[42px] shrink-0 items-center justify-end">
                    <Switch
                      checked={slot.isActive}
                      onCheckedChange={(isActive) => updateSlot(slot.timeKey, { isActive })}
                      aria-label={`${slot.isActive ? "Fermer" : "Ouvrir"} le créneau ${slot.timeKey}`}
                      className="origin-right scale-75"
                    />
                  </div>
                  <SlotOptionsButton
                    isOpen={optionsTime === slot.timeKey}
                    onClick={() => setOptionsTime((current) => (current === slot.timeKey ? null : slot.timeKey))}
                    label={`Options du créneau ${slot.timeKey}`}
                  />
                </div>
                {optionsTime === slot.timeKey && (
                  <div className="space-y-3 pt-2 pb-4">
                    <GroupSizeRow value={slot.maxGroupSize} onChange={(maxGroupSize) => updateSlot(slot.timeKey, { maxGroupSize })} />
                    {/* Supprimer est rare : il vit dans les options plutôt que sur chaque ligne. */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          removeSlot(slot.timeKey);
                          setOptionsTime(null);
                        }}
                        className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                        Supprimer le créneau {slot.timeKey}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {newTime !== null && (
          <div ref={addFormRef} className="flex items-center gap-2 mx-4 mt-3 px-2 py-1 rounded-2xl bg-white border border-[#C9D9F5]">
            <input
              type="time"
              value={newTime}
              step={900}
              onChange={(e) => setNewTime(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSlot();
                if (e.key === "Escape") setNewTime(null);
              }}
              aria-label={`Heure du nouveau créneau du ${label.toLowerCase()}`}
              className="h-9 px-2 rounded-lg border border-[#E2E2E2] text-[15px] tabular-nums"
            />
            {newTimeExists && <span className="text-xs text-red-600">Existe déjà</span>}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setNewTime(null)}
              aria-label="Annuler"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#6E6E6E] hover:bg-[#F1F1F1]"
            >
              <X size={16} />
            </button>
            <button
              type="button"
              onClick={addSlot}
              disabled={!canAdd}
              aria-label="Ajouter le créneau"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#3884FF] text-white disabled:opacity-40"
            >
              <Check size={16} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
