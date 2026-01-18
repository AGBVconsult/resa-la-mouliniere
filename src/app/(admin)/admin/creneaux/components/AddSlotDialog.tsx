"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface AddSlotDialogProps {
  service: "lunch" | "dinner";
  existingTimes: string[];
}

export function AddSlotDialog({ service, existingTimes }: AddSlotDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [time, setTime] = useState("12:00");
  const [capacity, setCapacity] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addSlot = useMutation(api.weeklyTemplates.addSlot);
  const syncSlots = useMutation(api.weeklyTemplates.syncSlotsWithTemplate);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);

    try {
      for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
        await addSlot({
          dayOfWeek,
          service,
          slot: {
            timeKey: time,
            capacity,
            isActive: true,
            largeTableAllowed: false,
            maxGroupSize: 15,
          },
        });
        // Sync slots with template changes
        await syncSlots({ dayOfWeek, service });
      }
      setIsOpen(false);
      setTime("12:00");
      setCapacity(8);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" data-action="add-slot">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nouveau créneau</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="time">Heure</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacité</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 8)}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
