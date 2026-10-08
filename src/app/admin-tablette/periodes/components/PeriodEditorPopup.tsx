"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { AlertTriangle, Check, DoorClosed, Loader2, Moon, Plus, Sun, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  GroupSizeRow,
  SlotMeta,
  SlotOptionsButton,
  SlotSlider,
  SLOT_POPOVER_ATTR,
  useCloseOnOutsidePointer,
} from "@/components/admin/SlotRowControls";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { daysBetween, formatDate, type Period, type PeriodKind } from "../periodUtils";

interface Slot {
  timeKey: string;
  capacity: number;
  isActive: boolean;
  maxGroupSize: number | null;
}

interface ServiceConfig {
  isOpen: boolean;
  activeDays: number[];
  slots: Slot[];
}

type Service = "lunch" | "dinner";

const DAYS = [
  { value: 1, label: "L", name: "Lundi" },
  { value: 2, label: "M", name: "Mardi" },
  { value: 3, label: "M", name: "Mercredi" },
  { value: 4, label: "J", name: "Jeudi" },
  { value: 5, label: "V", name: "Vendredi" },
  { value: 6, label: "S", name: "Samedi" },
  { value: 7, label: "D", name: "Dimanche" },
];

// Mêmes valeurs par défaut que la page web /admin/periodes
const defaultConfig = (service: Service): ServiceConfig =>
  service === "lunch"
    ? {
        isOpen: true,
        activeDays: [6, 7],
        slots: ["12:00", "12:30", "13:00"].map((timeKey) => ({ timeKey, capacity: 16, isActive: true, maxGroupSize: null })),
      }
    : {
        isOpen: true,
        activeDays: [5, 6, 7],
        slots: ["18:00", "18:30", "19:00"].map((timeKey) => ({ timeKey, capacity: 16, isActive: true, maxGroupSize: null })),
      };

function configFromPeriod(period: Period, service: Service): ServiceConfig {
  const rules = period.applyRules;
  const slots = service === "lunch" ? rules.lunchSlots : rules.dinnerSlots;
  const days = service === "lunch" ? rules.lunchActiveDays : rules.dinnerActiveDays;
  return {
    isOpen: rules.services.includes(service),
    activeDays: days ?? rules.activeDays,
    slots: slots ?? defaultConfig(service).slots,
  };
}

const MIN_CAPACITY = 1;
const MAX_CAPACITY = 50;

interface PeriodEditorPopupProps {
  kind: PeriodKind;
  /** Période à modifier ; absente pour une création */
  period?: Period;
  onClose: () => void;
  onDelete?: () => void;
}

export function PeriodEditorPopup({ kind, period, onClose, onDelete }: PeriodEditorPopupProps) {
  const isOuverture = kind === "ouverture";
  const isEditing = !!period;
  const createPeriod = useMutation(api.specialPeriods.create);
  const updatePeriod = useMutation(api.specialPeriods.update);
  const { toast } = useToast();

  const [name, setName] = useState(period?.name ?? "");
  const [startDate, setStartDate] = useState(period?.startDate ?? "");
  const [endDate, setEndDate] = useState(period?.endDate ?? "");
  const [lunch, setLunch] = useState<ServiceConfig>(() => (period ? configFromPeriod(period, "lunch") : defaultConfig("lunch")));
  const [dinner, setDinner] = useState<ServiceConfig>(() => (period ? configFromPeriod(period, "dinner") : defaultConfig("dinner")));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const dayCount = startDate && endDate && endDate >= startDate ? daysBetween(startDate, endDate) + 1 : null;

  const handleSave = async () => {
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError("Le titre doit contenir au moins 2 caractères.");
    if (!startDate) return setError("La date de début est requise.");
    if (!endDate) return setError("La date de fin est requise.");
    if (endDate < startDate) return setError("La date de fin doit être après la date de début.");
    if (isOuverture && !lunch.isOpen && !dinner.isOpen) return setError("Ouvrez au moins un service (midi ou soir).");
    if (isOuverture && ((lunch.isOpen && lunch.activeDays.length === 0) || (dinner.isOpen && dinner.activeDays.length === 0))) {
      return setError("Choisissez au moins un jour pour chaque service ouvert.");
    }

    let applyRules;
    if (isOuverture) {
      const services: Service[] = [];
      const activeDays = new Set<number>();
      if (lunch.isOpen) {
        services.push("lunch");
        lunch.activeDays.forEach((d) => activeDays.add(d));
      }
      if (dinner.isOpen) {
        services.push("dinner");
        dinner.activeDays.forEach((d) => activeDays.add(d));
      }
      applyRules = {
        status: "modified" as const,
        services,
        activeDays: Array.from(activeDays).sort((a, b) => a - b),
        lunchSlots: lunch.isOpen ? lunch.slots : undefined,
        dinnerSlots: dinner.isOpen ? dinner.slots : undefined,
        lunchActiveDays: lunch.isOpen ? lunch.activeDays : undefined,
        dinnerActiveDays: dinner.isOpen ? dinner.activeDays : undefined,
      };
    } else {
      applyRules = {
        status: "closed" as const,
        services: ["lunch", "dinner"] as Service[],
        activeDays: [1, 2, 3, 4, 5, 6, 7],
      };
    }

    setIsSaving(true);
    try {
      if (period) {
        await updatePeriod({ periodId: period._id, name: trimmed, startDate, endDate, applyRules });
        toast.success("Modifications enregistrées");
      } else {
        await createPeriod({ name: trimmed, type: isOuverture ? "event" : "closure", startDate, endDate, applyRules });
        toast.success(isOuverture ? "Ouverture créée" : "Fermeture créée");
      }
      onClose();
    } catch (err) {
      setError(formatConvexError(err));
      setIsSaving(false);
    }
  };

  const title = isEditing
    ? isOuverture ? "Modifier l'ouverture" : "Modifier la fermeture"
    : isOuverture ? "Nouvelle ouverture" : "Nouvelle fermeture";

  const inputClass =
    "h-10 w-full min-w-0 appearance-none rounded-xl border border-[#E2E2E2] bg-white px-3 text-left text-[15px] text-[#0C0C0C] focus:outline-none focus:border-[#3884FF] focus:ring-[3px] focus:ring-[#3884FF]/20 [&::-webkit-date-and-time-value]:text-left";

  return (
    <>
      {/* Centrage par flex : un translate serait écrasé par l'animation d'entrée */}
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] md:p-6 md:pt-[calc(1.5rem+env(safe-area-inset-top))] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="period-editor-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-h-full bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
          // Ouverture : même marge de chaque côté de l'écran que « Réglages du jour ».
          isOuverture ? "md:h-full" : "max-w-[560px]"
        )}
      >
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0">
          <h2 id="period-editor-title" className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div className={cn("grid gap-3", isOuverture ? "grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-2")}>
            <div className={cn("flex flex-col gap-1 min-w-0", !isOuverture && "col-span-2")}>
              <label htmlFor="period-name" className="text-[13px] font-medium text-[#6E6E6E]">Titre de la période</label>
              <input
                id="period-name"
                type="text"
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. : Fermeture annuelle, Ouverture exceptionnelle…"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="period-start" className="text-[13px] font-medium text-[#6E6E6E]">Du</label>
              <input id="period-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="period-end" className="text-[13px] font-medium text-[#6E6E6E]">Au</label>
              <input id="period-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
              <span className="text-xs text-[#8A8A8A] h-3.5 leading-none">{dayCount ? `${dayCount} jour${dayCount > 1 ? "s" : ""}` : ""}</span>
            </div>
          </div>

          {isOuverture ? (
            <div className="grid grid-cols-2 gap-3">
              <ServiceCard service="lunch" config={lunch} onChange={setLunch} />
              <ServiceCard service="dinner" config={dinner} onChange={setDinner} />
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#FBEDEC] text-sm leading-relaxed text-[#7A2E2E]">
              <DoorClosed size={20} strokeWidth={1.75} className="shrink-0" />
              <span>
                Le restaurant sera fermé midi et soir
                {startDate && endDate ? ` du ${formatDate(startDate)} au ${formatDate(endDate)}` : " sur toute la période"}.
                Elle ne peut pas chevaucher une autre période.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EFEFEF] shrink-0">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSaving}
              className="mr-auto h-10 px-4 flex items-center gap-1.5 rounded-full bg-[#F1F1F1] text-sm font-semibold text-red-600 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Supprimer
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 px-5 rounded-full bg-[#F1F1F1] text-sm font-semibold text-[#464646] disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 px-5 rounded-full bg-[#3884FF] hover:bg-[#2F74E6] text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60 transition-colors"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn("relative w-11 h-[26px] shrink-0 rounded-full transition-colors duration-200", checked ? "bg-slate-800" : "bg-slate-200")}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
          checked && "translate-x-[18px]"
        )}
      />
    </button>
  );
}

function ServiceCard({ service, config, onChange }: { service: Service; config: ServiceConfig; onChange: (c: ServiceConfig) => void }) {
  const [newTime, setNewTime] = useState<string | null>(null);
  // Un seul créneau a ses options (taille de groupe) ouvertes à la fois.
  const [optionsTime, setOptionsTime] = useState<string | null>(null);
  const closeOptions = useCallback(() => setOptionsTime(null), []);
  // Toucher n'importe où ailleurs que dans le créneau ouvert ferme ses options.
  useCloseOnOutsidePointer(optionsTime !== null, closeOptions);
  const label = service === "lunch" ? "Midi" : "Soir";
  const Icon = service === "lunch" ? Sun : Moon;

  const updateSlot = (index: number, patch: Partial<Slot>) =>
    onChange({ ...config, slots: config.slots.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

  const toggleDay = (day: number) =>
    onChange({
      ...config,
      activeDays: config.activeDays.includes(day)
        ? config.activeDays.filter((d) => d !== day)
        : [...config.activeDays, day].sort((a, b) => a - b),
    });

  const addSlot = () => {
    if (!newTime || config.slots.some((s) => s.timeKey === newTime)) return;
    onChange({
      ...config,
      slots: [...config.slots, { timeKey: newTime, capacity: 16, isActive: true, maxGroupSize: null }].sort((a, b) =>
        a.timeKey.localeCompare(b.timeKey)
      ),
    });
    setNewTime(null);
  };

  return (
    <div className="bg-[#F6F6F6] rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#ECECEC]">
        <span className="flex items-center gap-2 font-semibold">
          <Icon size={18} strokeWidth={1.75} className={service === "lunch" ? "text-[#D9A441]" : "text-[#6E6E6E]"} />
          {label}
        </span>
        <Toggle checked={config.isOpen} onChange={() => onChange({ ...config, isOpen: !config.isOpen })} label={`Ouvrir le ${label.toLowerCase()}`} />
      </div>

      <div className={cn("p-3 space-y-2.5 transition-opacity", !config.isOpen && "opacity-45 pointer-events-none")}>
        <div className="flex gap-1.5">
          {DAYS.map((day) => {
            const on = config.activeDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                aria-pressed={on}
                aria-label={day.name}
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

        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#F3F3F3]">
          {config.slots.length === 0 && <p className="py-4 text-center text-sm text-[#8A8A8A]">Aucun créneau</p>}
          {config.slots.map((slot, index) => (
            // Même ligne que « Réglages du jour » : heure · curseur · x places · options · interrupteur · ⋯.
            <div
              key={slot.timeKey}
              {...(optionsTime === slot.timeKey ? { [SLOT_POPOVER_ATTR]: "" } : {})}
              className={cn("px-3 transition-colors", !slot.isActive && "bg-slate-100/50")}
            >
              <div className="flex h-[54px] items-center gap-3">
                <span className="w-[46px] shrink-0 text-base font-extrabold tabular-nums text-slate-800">{slot.timeKey}</span>
                <SlotSlider
                  value={slot.capacity}
                  reservedCovers={0}
                  min={MIN_CAPACITY}
                  max={MAX_CAPACITY}
                  isOpen={slot.isActive}
                  onChange={(capacity) => updateSlot(index, { capacity })}
                  unit="places"
                  ariaLabel={`Capacité du créneau ${slot.timeKey}`}
                />
                <SlotMeta maxGroupSize={slot.maxGroupSize} />
                <Switch
                  checked={slot.isActive}
                  onCheckedChange={() => updateSlot(index, { isActive: !slot.isActive })}
                  aria-label={`Créneau ${slot.timeKey} actif`}
                  className="shrink-0"
                />
                <SlotOptionsButton
                  isOpen={optionsTime === slot.timeKey}
                  onClick={() => setOptionsTime((current) => (current === slot.timeKey ? null : slot.timeKey))}
                  label={`Options du créneau ${slot.timeKey}`}
                />
              </div>
              {optionsTime === slot.timeKey && (
                <div className="space-y-2 pb-3">
                  <GroupSizeRow value={slot.maxGroupSize} onChange={(maxGroupSize) => updateSlot(index, { maxGroupSize })} />
                  {/* Supprimer est rare : il vit dans les options plutôt que sur chaque ligne. */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ ...config, slots: config.slots.filter((_, i) => i !== index) });
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

        {newTime === null ? (
          <button
            type="button"
            onClick={() => setNewTime(service === "lunch" ? "13:30" : "19:30")}
            className="w-full h-9 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#C9D9F5] text-sm font-medium text-[#3884FF]"
          >
            <Plus size={16} strokeWidth={2} />
            Ajouter un créneau
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1 rounded-2xl bg-white border border-[#C9D9F5]">
            <input
              type="time"
              value={newTime}
              step={900}
              onChange={(e) => setNewTime(e.target.value)}
              aria-label="Heure du nouveau créneau"
              className="h-9 px-2 rounded-lg border border-[#E2E2E2] text-[15px] tabular-nums"
            />
            {config.slots.some((s) => s.timeKey === newTime) && <span className="text-xs text-red-600">Existe déjà</span>}
            <span className="flex-1" />
            <button type="button" onClick={() => setNewTime(null)} aria-label="Annuler" className="w-9 h-9 rounded-full flex items-center justify-center text-[#6E6E6E] hover:bg-[#F1F1F1]">
              <X size={16} />
            </button>
            <button
              type="button"
              onClick={addSlot}
              disabled={!newTime || config.slots.some((s) => s.timeKey === newTime)}
              aria-label="Ajouter le créneau"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#3884FF] text-white disabled:opacity-40"
            >
              <Check size={16} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
