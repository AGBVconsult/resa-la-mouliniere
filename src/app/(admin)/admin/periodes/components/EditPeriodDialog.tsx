"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PeriodType = "holiday" | "closure" | "event";
type ApplyStatus = "open" | "modified" | "closed";

interface Period {
  _id: Id<"specialPeriods">;
  name: string;
  type: PeriodType;
  startDate: string;
  endDate: string;
  applyRules: {
    status: ApplyStatus;
    services: ("lunch" | "dinner")[];
    activeDays: number[];
    overrideCapacity?: number;
    maxGroupSize?: number | null;
    largeTableAllowed?: boolean;
  };
}

const STATUS_OPTIONS: { value: ApplyStatus; label: string }[] = [
  { value: "open", label: "Ouvert" },
  { value: "modified", label: "Modifié" },
  { value: "closed", label: "Fermé" },
];

const DAY_LABELS = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "M" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 7, label: "D" },
];

interface EditPeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  period: Period;
}

export function EditPeriodDialog({ isOpen, onClose, period }: EditPeriodDialogProps) {
  const [name, setName] = useState(period.name);
  const [startDate, setStartDate] = useState(period.startDate);
  const [endDate, setEndDate] = useState(period.endDate);
  const [status, setStatus] = useState<ApplyStatus>(period.applyRules.status);
  const [services, setServices] = useState<("lunch" | "dinner")[]>(period.applyRules.services);
  const [activeDays, setActiveDays] = useState<number[]>(period.applyRules.activeDays);
  const [overrideCapacity, setOverrideCapacity] = useState<number | undefined>(period.applyRules.overrideCapacity);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePeriod = useMutation(api.specialPeriods.update);

  useEffect(() => {
    if (isOpen) {
      setName(period.name);
      setStartDate(period.startDate);
      setEndDate(period.endDate);
      setStatus(period.applyRules.status);
      setServices(period.applyRules.services);
      setActiveDays(period.applyRules.activeDays);
      setOverrideCapacity(period.applyRules.overrideCapacity);
      setError(null);
    }
  }, [isOpen, period]);

  const toggleService = (service: "lunch" | "dinner") => {
    setServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const toggleDay = (day: number) => {
    setActiveDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Le nom est requis");
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
    if (services.length === 0) {
      setError("Au moins un service est requis");
      return;
    }
    if (activeDays.length === 0) {
      setError("Au moins un jour est requis");
      return;
    }

    setIsLoading(true);
    try {
      await updatePeriod({
        periodId: period._id,
        name: name.trim(),
        startDate,
        endDate,
        applyRules: {
          status,
          services,
          activeDays,
          ...(status === "modified" && overrideCapacity ? { overrideCapacity } : {}),
        },
      });
      onClose();
    } catch (err: any) {
      console.error("Error updating period:", err);
      setError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier la période</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Nom</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Date de début</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">Date de fin</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "p-2 rounded-lg border text-sm font-medium transition-colors",
                    status === opt.value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Services</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleService("lunch")}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                  services.includes("lunch")
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                Déjeuner
              </button>
              <button
                type="button"
                onClick={() => toggleService("dinner")}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                  services.includes("dinner")
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                Dîner
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Jours actifs</Label>
            <div className="flex gap-1">
              {DAY_LABELS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "w-9 h-9 rounded-lg text-sm font-medium transition-colors",
                    activeDays.includes(day.value)
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {status === "modified" && (
            <div className="space-y-2">
              <Label htmlFor="edit-capacity">Capacité modifiée (optionnel)</Label>
              <Input
                id="edit-capacity"
                type="number"
                min={1}
                max={200}
                value={overrideCapacity ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setOverrideCapacity(val === "" ? undefined : parseInt(val, 10));
                }}
                placeholder="Laisser vide pour garder la capacité normale"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
