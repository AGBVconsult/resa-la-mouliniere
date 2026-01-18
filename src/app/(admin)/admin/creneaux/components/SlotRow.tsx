"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Clock, Users, Trash2, UserX } from "lucide-react";
import { EditableCapacity } from "./EditableCapacity";
import { DeleteSlotDialog } from "./DeleteSlotDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Slot {
  timeKey: string;
  capacity: number;
  isActive: boolean;
  largeTableAllowed: boolean;
  maxGroupSize: number | null;
}

interface SlotRowProps {
  service: "lunch" | "dinner";
  slot: Slot;
  openDays: number[];
}

export function SlotRow({ service, slot, openDays }: SlotRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const updateSlot = useMutation(api.weeklyTemplates.updateSlot);
  const syncSlots = useMutation(api.weeklyTemplates.syncSlotsWithTemplate);

  const isLimited = slot.maxGroupSize !== null;

  const handleCapacityChange = async (capacity: number) => {
    for (const dayOfWeek of openDays) {
      await updateSlot({
        dayOfWeek,
        service,
        timeKey: slot.timeKey,
        patch: { capacity },
      });
      await syncSlots({ dayOfWeek, service });
    }
  };

  const handleToggleActive = async () => {
    for (const dayOfWeek of openDays) {
      await updateSlot({
        dayOfWeek,
        service,
        timeKey: slot.timeKey,
        patch: { isActive: !slot.isActive },
      });
      await syncSlots({ dayOfWeek, service });
    }
  };

  const handleToggleLimit = async () => {
    const newMaxGroupSize = isLimited ? null : 4;
    for (const dayOfWeek of openDays) {
      await updateSlot({
        dayOfWeek,
        service,
        timeKey: slot.timeKey,
        patch: { maxGroupSize: newMaxGroupSize },
      });
      await syncSlots({ dayOfWeek, service });
    }
  };

  const handleMaxGroupSizeChange = async (value: number) => {
    if (value < 1 || value > 50) return;
    for (const dayOfWeek of openDays) {
      await updateSlot({
        dayOfWeek,
        service,
        timeKey: slot.timeKey,
        patch: { maxGroupSize: value },
      });
      await syncSlots({ dayOfWeek, service });
    }
  };

  return (
    <>
      <div
        data-slot={slot.timeKey}
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
          <EditableCapacity
            value={slot.capacity}
            onChange={handleCapacityChange}
          />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleLimit}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
              isLimited
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
            title={isLimited ? "Limitation active" : "Limiter les grandes tables"}
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
                  if (!isNaN(val)) handleMaxGroupSizeChange(val);
                }}
                className="w-10 h-5 px-1 text-xs text-center border-0 bg-transparent focus:ring-0"
              />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleToggleActive}
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
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <DeleteSlotDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        service={service}
        timeKey={slot.timeKey}
        openDays={openDays}
      />
    </>
  );
}
