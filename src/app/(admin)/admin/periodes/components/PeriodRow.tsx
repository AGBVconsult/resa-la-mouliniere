"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddPeriodDialog } from "./AddPeriodDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type PeriodType = "holiday" | "closure" | "event";
type ApplyStatus = "open" | "modified" | "closed";

interface Slot {
  timeKey: string;
  capacity: number;
  isActive: boolean;
  maxGroupSize: number | null;
}

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
    lunchSlots?: Slot[];
    dinnerSlots?: Slot[];
    lunchActiveDays?: number[];
    dinnerActiveDays?: number[];
  };
  createdAt: number;
  updatedAt: number;
}

interface PeriodRowProps {
  period: Period;
}

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

export function PeriodRow({ period }: PeriodRowProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deletePeriod = useMutation(api.specialPeriods.remove);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePeriod({ periodId: period._id });
      setShowDeleteDialog(false);
    } catch (err) {
      console.error("Error deleting period:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const isOuverture = period.applyRules.status === "open" || period.applyRules.status === "modified";

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 rounded-lg border bg-white border-slate-200">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">{period.name}</p>
          <p className="text-sm text-slate-500">
            {formatDate(period.startDate)} - {formatDate(period.endDate)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-600"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-red-600"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AddPeriodDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        defaultType={isOuverture ? "ouverture" : "fermeture"}
        editPeriod={period}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Supprimer la période ?</DialogTitle>
            <DialogDescription>
              La période "{period.name}" sera définitivement supprimée.
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
