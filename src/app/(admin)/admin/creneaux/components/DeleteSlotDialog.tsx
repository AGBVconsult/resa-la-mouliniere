"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: "lunch" | "dinner";
  timeKey: string;
  openDays: number[];
}

export function DeleteSlotDialog({
  isOpen,
  onClose,
  service,
  timeKey,
  openDays,
}: DeleteSlotDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const removeSlot = useMutation(api.weeklyTemplates.removeSlot);
  const syncSlots = useMutation(api.weeklyTemplates.syncSlotsWithTemplate);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      for (const dayOfWeek of openDays) {
        await removeSlot({
          dayOfWeek,
          service,
          timeKey,
        });
        // Sync slots with template changes
        await syncSlots({ dayOfWeek, service });
      }
      onClose();
    } catch (err) {
      console.error("Error deleting slot:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Supprimer le créneau
          </DialogTitle>
          <DialogDescription>
            Voulez-vous vraiment supprimer le créneau de {timeKey} ?
            Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
