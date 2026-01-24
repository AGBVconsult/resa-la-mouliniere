"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Sun, Moon, Clock, Plus, Trash2, Settings, ChevronDown, ChevronUp, Users, UserX } from "lucide-react";

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

const DAY_LABELS = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "M" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 7, label: "D" },
];

const DEFAULT_LUNCH_SLOTS: Slot[] = [
  { timeKey: "12:00", capacity: 16, isActive: true, maxGroupSize: null },
  { timeKey: "12:30", capacity: 16, isActive: true, maxGroupSize: null },
  { timeKey: "13:00", capacity: 16, isActive: true, maxGroupSize: null },
];

const DEFAULT_DINNER_SLOTS: Slot[] = [
  { timeKey: "18:00", capacity: 16, isActive: true, maxGroupSize: null },
  { timeKey: "18:30", capacity: 16, isActive: true, maxGroupSize: null },
  { timeKey: "19:00", capacity: 16, isActive: true, maxGroupSize: null },
];

interface EditPeriod {
  _id: Id<"specialPeriods">;
  name: string;
  startDate: string;
  endDate: string;
  applyRules: {
    status: "open" | "modified" | "closed";
    services: ("lunch" | "dinner")[];
    activeDays: number[];
    lunchSlots?: Slot[];
    dinnerSlots?: Slot[];
    lunchActiveDays?: number[];
    dinnerActiveDays?: number[];
  };
}

interface AddPeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: "ouverture" | "fermeture";
  editPeriod?: EditPeriod;
}

export function AddPeriodDialog({ isOpen, onClose, defaultType = "fermeture", editPeriod }: AddPeriodDialogProps) {
  const isEditing = !!editPeriod;
  const isOuverture = defaultType === "ouverture";
  
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lunchConfig, setLunchConfig] = useState<ServiceConfig>({
    isOpen: true,
    activeDays: [6, 7],
    slots: [...DEFAULT_LUNCH_SLOTS],
  });
  const [dinnerConfig, setDinnerConfig] = useState<ServiceConfig>({
    isOpen: true,
    activeDays: [5, 6, 7],
    slots: [...DEFAULT_DINNER_SLOTS],
  });

  // Reset/initialize form when dialog opens or editPeriod changes
  useEffect(() => {
    if (isOpen) {
      if (editPeriod) {
        setName(editPeriod.name);
        setStartDate(editPeriod.startDate);
        setEndDate(editPeriod.endDate);
        if (isOuverture) {
          setLunchConfig({
            isOpen: editPeriod.applyRules.services.includes("lunch"),
            activeDays: editPeriod.applyRules.lunchActiveDays ?? editPeriod.applyRules.activeDays,
            slots: editPeriod.applyRules.lunchSlots ?? [...DEFAULT_LUNCH_SLOTS],
          });
          setDinnerConfig({
            isOpen: editPeriod.applyRules.services.includes("dinner"),
            activeDays: editPeriod.applyRules.dinnerActiveDays ?? editPeriod.applyRules.activeDays,
            slots: editPeriod.applyRules.dinnerSlots ?? [...DEFAULT_DINNER_SLOTS],
          });
        }
      } else {
        setName("");
        setStartDate("");
        setEndDate("");
        setLunchConfig({
          isOpen: true,
          activeDays: [6, 7],
          slots: [...DEFAULT_LUNCH_SLOTS],
        });
        setDinnerConfig({
          isOpen: true,
          activeDays: [5, 6, 7],
          slots: [...DEFAULT_DINNER_SLOTS],
        });
      }
      setError(null);
    }
  }, [isOpen, editPeriod, isOuverture]);

  // Progressive filling settings
  const [progressiveEnabled, setProgressiveEnabled] = useState(false);
  const [progressiveExpanded, setProgressiveExpanded] = useState(false);
  const [lunchThreshold, setLunchThreshold] = useState("13:00");
  const [dinnerThreshold, setDinnerThreshold] = useState("19:30");
  const [minFillPercent, setMinFillPercent] = useState(20);

  const createPeriod = useMutation(api.specialPeriods.create);
  const updatePeriod = useMutation(api.specialPeriods.update);
  const deletePeriod = useMutation(api.specialPeriods.remove);

  const resetForm = () => {
    if (!editPeriod) {
      setName("");
      setStartDate("");
      setEndDate("");
      setLunchConfig({
        isOpen: true,
        activeDays: [6, 7],
        slots: [...DEFAULT_LUNCH_SLOTS],
      });
      setDinnerConfig({
        isOpen: true,
        activeDays: [5, 6, 7],
        slots: [...DEFAULT_DINNER_SLOTS],
      });
    }
    setProgressiveEnabled(false);
    setProgressiveExpanded(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Le titre est requis");
      return;
    }
    if (!startDate) {
      setError("La date de début est requise");
      return;
    }
    if (!endDate) {
      setError("La date de fin est requise");
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && editPeriod) {
        // Update existing period
        if (isOuverture) {
          const services: ("lunch" | "dinner")[] = [];
          const activeDays = new Set<number>();

          if (lunchConfig.isOpen) {
            services.push("lunch");
            lunchConfig.activeDays.forEach((d) => activeDays.add(d));
          }
          if (dinnerConfig.isOpen) {
            services.push("dinner");
            dinnerConfig.activeDays.forEach((d) => activeDays.add(d));
          }

          if (services.length === 0) {
            setError("Au moins un service doit être activé");
            setIsLoading(false);
            return;
          }

          // Delete old period and create new one (simpler than complex update)
          await deletePeriod({ periodId: editPeriod._id });
          await createPeriod({
            name: name.trim(),
            type: "event",
            startDate,
            endDate,
            applyRules: {
              status: "modified",
              services,
              activeDays: Array.from(activeDays).sort((a, b) => a - b),
              lunchSlots: lunchConfig.isOpen ? lunchConfig.slots : undefined,
              dinnerSlots: dinnerConfig.isOpen ? dinnerConfig.slots : undefined,
              lunchActiveDays: lunchConfig.isOpen ? lunchConfig.activeDays : undefined,
              dinnerActiveDays: dinnerConfig.isOpen ? dinnerConfig.activeDays : undefined,
            },
          });
        } else {
          // Update fermeture
          await deletePeriod({ periodId: editPeriod._id });
          await createPeriod({
            name: name.trim(),
            type: "closure",
            startDate,
            endDate,
            applyRules: {
              status: "closed",
              services: ["lunch", "dinner"],
              activeDays: [1, 2, 3, 4, 5, 6, 7],
            },
          });
        }
      } else {
        // Create new period
        if (isOuverture) {
          const services: ("lunch" | "dinner")[] = [];
          const activeDays = new Set<number>();

          if (lunchConfig.isOpen) {
            services.push("lunch");
            lunchConfig.activeDays.forEach((d) => activeDays.add(d));
          }
          if (dinnerConfig.isOpen) {
            services.push("dinner");
            dinnerConfig.activeDays.forEach((d) => activeDays.add(d));
          }

          if (services.length === 0) {
            setError("Au moins un service doit être activé");
            setIsLoading(false);
            return;
          }

          await createPeriod({
            name: name.trim(),
            type: "event",
            startDate,
            endDate,
            applyRules: {
              status: "modified",
              services,
              activeDays: Array.from(activeDays).sort((a, b) => a - b),
              lunchSlots: lunchConfig.isOpen ? lunchConfig.slots : undefined,
              dinnerSlots: dinnerConfig.isOpen ? dinnerConfig.slots : undefined,
              lunchActiveDays: lunchConfig.isOpen ? lunchConfig.activeDays : undefined,
              dinnerActiveDays: dinnerConfig.isOpen ? dinnerConfig.activeDays : undefined,
            },
          });
        } else {
          await createPeriod({
            name: name.trim(),
            type: "closure",
            startDate,
            endDate,
            applyRules: {
              status: "closed",
              services: ["lunch", "dinner"],
              activeDays: [1, 2, 3, 4, 5, 6, 7],
            },
          });
        }
      }
      handleClose();
    } catch (err: any) {
      console.error("Error saving period:", err);
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-y-auto",
        isOuverture ? "sm:max-w-[900px]" : "sm:max-w-[500px]"
      )}>
        <DialogHeader>
          <DialogTitle>
            {isEditing 
              ? (isOuverture ? "Modifier l'ouverture" : "Modifier la fermeture")
              : (isOuverture ? "Nouvelle ouverture" : "Nouvelle fermeture")
            }
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Titre de la période</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Fermeture annuelle, Ouverture exceptionnelle..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {isOuverture && (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <ServiceConfigCard
                  service="lunch"
                  title="Déjeuner"
                  icon={<Sun className="h-5 w-5 text-amber-500" />}
                  config={lunchConfig}
                  onChange={setLunchConfig}
                />
                <ServiceConfigCard
                  service="dinner"
                  title="Dîner"
                  icon={<Moon className="h-5 w-5 text-indigo-500" />}
                  config={dinnerConfig}
                  onChange={setDinnerConfig}
                />
              </div>

              <Card>
                <CardHeader 
                  className="cursor-pointer select-none py-3"
                  onClick={() => setProgressiveExpanded(!progressiveExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-slate-500" />
                      <CardTitle className="text-base">Remplissage progressif</CardTitle>
                      {progressiveEnabled && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          Actif
                        </span>
                      )}
                    </div>
                    {progressiveExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </CardHeader>
                
                {progressiveExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    <p className="text-sm text-slate-600">
                      Masque automatiquement les créneaux tardifs si le créneau précédent n'a pas atteint le taux de remplissage minimum.
                    </p>

                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="pf-enabled" className="font-medium">
                        Activer le remplissage progressif
                      </Label>
                      <Switch
                        id="pf-enabled"
                        checked={progressiveEnabled}
                        onCheckedChange={setProgressiveEnabled}
                      />
                    </div>

                    {progressiveEnabled && (
                      <div className="space-y-4 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="lunch-threshold" className="text-sm">
                              Seuil déjeuner
                            </Label>
                            <Input
                              id="lunch-threshold"
                              type="time"
                              value={lunchThreshold}
                              onChange={(e) => setLunchThreshold(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dinner-threshold" className="text-sm">
                              Seuil dîner
                            </Label>
                            <Input
                              id="dinner-threshold"
                              type="time"
                              value={dinnerThreshold}
                              onChange={(e) => setDinnerThreshold(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="min-fill" className="text-sm">
                            Taux de remplissage minimum ({minFillPercent}%)
                          </Label>
                          <Input
                            id="min-fill"
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={minFillPercent}
                            onChange={(e) => setMinFillPercent(parseInt(e.target.value, 10))}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading 
              ? (isEditing ? "Enregistrement..." : "Création...") 
              : (isEditing ? "Enregistrer" : "Créer")
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ServiceConfigCardProps {
  service: "lunch" | "dinner";
  title: string;
  icon: React.ReactNode;
  config: ServiceConfig;
  onChange: (config: ServiceConfig) => void;
}

function ServiceConfigCard({ title, icon, config, onChange }: ServiceConfigCardProps) {
  const toggleDay = (day: number) => {
    const newDays = config.activeDays.includes(day)
      ? config.activeDays.filter((d) => d !== day)
      : [...config.activeDays, day].sort((a, b) => a - b);
    onChange({ ...config, activeDays: newDays });
  };

  const toggleSlotActive = (timeKey: string) => {
    const newSlots = config.slots.map((s) =>
      s.timeKey === timeKey ? { ...s, isActive: !s.isActive } : s
    );
    onChange({ ...config, slots: newSlots });
  };

  const updateSlotCapacity = (timeKey: string, capacity: number) => {
    const newSlots = config.slots.map((s) =>
      s.timeKey === timeKey ? { ...s, capacity } : s
    );
    onChange({ ...config, slots: newSlots });
  };

  const removeSlot = (timeKey: string) => {
    const newSlots = config.slots.filter((s) => s.timeKey !== timeKey);
    onChange({ ...config, slots: newSlots });
  };

  const toggleMaxGroupSize = (timeKey: string) => {
    const newSlots = config.slots.map((s) => {
      if (s.timeKey === timeKey) {
        return { ...s, maxGroupSize: s.maxGroupSize === null ? 4 : null };
      }
      return s;
    });
    onChange({ ...config, slots: newSlots });
  };

  const updateMaxGroupSize = (timeKey: string, value: number) => {
    if (value < 1 || value > 50) return;
    const newSlots = config.slots.map((s) =>
      s.timeKey === timeKey ? { ...s, maxGroupSize: value } : s
    );
    onChange({ ...config, slots: newSlots });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <button
            type="button"
            onClick={() => onChange({ ...config, isOpen: !config.isOpen })}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors",
              config.isOpen ? "bg-slate-900" : "bg-slate-300"
            )}
          >
            <span
              className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                config.isOpen ? "left-6" : "left-1"
              )}
            />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Jours d'ouverture</p>
          <div className="flex gap-2">
            {DAY_LABELS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={cn(
                  "w-9 h-9 rounded-full text-sm font-medium transition-colors",
                  config.activeDays.includes(day.value)
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Créneaux horaires
            </p>
            <AddSlotInline
              existingTimes={config.slots.map((s) => s.timeKey)}
              onAdd={(timeKey, capacity) => {
                const newSlots = [...config.slots, {
                  timeKey,
                  capacity,
                  isActive: true,
                  maxGroupSize: null,
                }].sort((a, b) => a.timeKey.localeCompare(b.timeKey));
                onChange({ ...config, slots: newSlots });
              }}
            />
          </div>
          
          <div className="space-y-2">
            {config.slots.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">
                Aucun créneau configuré
              </div>
            ) : (
              config.slots.map((slot) => {
                const isLimited = slot.maxGroupSize !== null;
                return (
                  <div
                    key={slot.timeKey}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors",
                      slot.isActive
                        ? "bg-white border-slate-200"
                        : "bg-slate-50 border-slate-100 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-[70px]">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{slot.timeKey}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={slot.capacity}
                        onChange={(e) => updateSlotCapacity(slot.timeKey, parseInt(e.target.value, 10) || 1)}
                        className="w-14 h-8 text-sm text-center"
                      />
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleMaxGroupSize(slot.timeKey)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                          isLimited
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        <UserX className="h-3.5 w-3.5" />
                        {isLimited && (
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={slot.maxGroupSize ?? 4}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) updateMaxGroupSize(slot.timeKey, val);
                            }}
                            className="w-10 h-5 px-1 text-xs text-center border-0 bg-transparent focus:ring-0"
                          />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSlotActive(slot.timeKey)}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors",
                        slot.isActive ? "bg-slate-900" : "bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                          slot.isActive ? "left-6" : "left-1"
                        )}
                      />
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => removeSlot(slot.timeKey)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AddSlotInlineProps {
  existingTimes: string[];
  onAdd: (timeKey: string, capacity: number) => void;
}

function AddSlotInline({ existingTimes, onAdd }: AddSlotInlineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [time, setTime] = useState("12:00");
  const [capacity, setCapacity] = useState(16);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (existingTimes.includes(time)) {
      setError("Ce créneau existe déjà");
      return;
    }

    if (capacity < 1 || capacity > 50) {
      setError("La capacité doit être entre 1 et 50");
      return;
    }

    onAdd(time, capacity);
    setIsOpen(false);
    setTime("12:00");
    setCapacity(16);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nouveau créneau</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slot-time">Heure</Label>
            <Input
              id="slot-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slot-capacity">Capacité</Label>
            <Input
              id="slot-capacity"
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 16)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit">
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
