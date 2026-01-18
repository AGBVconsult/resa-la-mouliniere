"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SlotSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: "lunch" | "dinner";
  timeKey: string;
  openDays: number[];
  maxGroupSize: number | null;
}

export function SlotSettingsDialog({
  isOpen,
  onClose,
  service,
  timeKey,
  openDays,
  maxGroupSize: initialMaxGroupSize,
}: SlotSettingsDialogProps) {
  // Toggle ON = limitation active (maxGroupSize défini)
  // Toggle OFF = pas de limitation (maxGroupSize = null)
  const [isLimited, setIsLimited] = useState(initialMaxGroupSize !== null);
  const [maxGroupSize, setMaxGroupSize] = useState<number>(initialMaxGroupSize ?? 4);
  const [isLoading, setIsLoading] = useState(false);

  const updateSlot = useMutation(api.weeklyTemplates.updateSlot);
  const syncSlots = useMutation(api.weeklyTemplates.syncSlotsWithTemplate);

  // Reset state when dialog opens with new values
  useEffect(() => {
    if (isOpen) {
      setIsLimited(initialMaxGroupSize !== null);
      setMaxGroupSize(initialMaxGroupSize ?? 4);
    }
  }, [isOpen, initialMaxGroupSize]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const effectiveMaxGroupSize = isLimited ? maxGroupSize : null;
      
      for (const dayOfWeek of openDays) {
        await updateSlot({
          dayOfWeek,
          service,
          timeKey,
          patch: {
            maxGroupSize: effectiveMaxGroupSize,
          },
        });
        await syncSlots({ dayOfWeek, service });
      }
      onClose();
    } catch (err) {
      console.error("Error updating slot settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Paramètres du créneau {timeKey}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="limitLargeTables" className="text-sm font-medium">
                Limiter les grandes tables
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Bloque les réservations dépassant le nombre de couverts défini
              </p>
            </div>
            <Switch
              id="limitLargeTables"
              checked={isLimited}
              onCheckedChange={setIsLimited}
            />
          </div>

          {isLimited && (
            <div className="space-y-2">
              <Label htmlFor="maxGroupSize" className="text-sm font-medium">
                Nombre max. de couverts
              </Label>
              <p className="text-xs text-slate-500">
                Les groupes supérieurs à ce nombre ne pourront pas réserver ce créneau
              </p>
              <Input
                id="maxGroupSize"
                type="number"
                min={1}
                max={50}
                value={maxGroupSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 50) {
                    setMaxGroupSize(val);
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
