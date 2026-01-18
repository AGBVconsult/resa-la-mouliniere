"use client";

import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Settings, Map, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReservationHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  currentService: "lunch" | "dinner";
  onServiceChange: (service: "lunch" | "dinner") => void;
  showFloorPlan: boolean;
  onToggleFloorPlan: () => void;
  onOpenSettings: () => void;
  onOpenDatePicker: () => void;
  onCreateReservation: () => void;
}

export function ReservationHeader({
  selectedDate,
  onDateChange,
  currentService,
  onServiceChange,
  showFloorPlan,
  onToggleFloorPlan,
  onOpenSettings,
  onOpenDatePicker,
  onCreateReservation,
}: ReservationHeaderProps) {
  const formattedDate = format(selectedDate, "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="flex items-center justify-between py-4">
      {/* Date Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-gray-100"
          onClick={() => onDateChange(subDays(selectedDate, 1))}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <button
          onClick={onOpenDatePicker}
          className="text-3xl font-light capitalize hover:text-gray-600 transition-colors"
        >
          {formattedDate}
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-gray-100"
          onClick={() => onDateChange(addDays(selectedDate, 1))}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-gray-100"
          onClick={() => onDateChange(new Date())}
        >
          <Calendar className="h-5 w-5" />
        </Button>
      </div>

      {/* Service Toggle + Actions */}
      <div className="flex items-center gap-3">
        {/* Create Reservation Button */}
        <Button
          variant="default"
          className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-4 gap-2"
          onClick={onCreateReservation}
        >
          <Plus className="h-5 w-5" />
          Nouvelle
        </Button>

        {/* Service Toggle */}
        <div className="bg-black p-1 rounded-full flex">
          <button
            onClick={() => onServiceChange("lunch")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              currentService === "lunch"
                ? "bg-white text-black shadow-sm"
                : "text-gray-400 hover:text-white"
            )}
          >
            Déjeuner
          </button>
          <button
            onClick={() => onServiceChange("dinner")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              currentService === "dinner"
                ? "bg-white text-black shadow-sm"
                : "text-gray-400 hover:text-white"
            )}
          >
            Dîner
          </button>
        </div>

        {/* Settings Button */}
        <Button
          variant="default"
          size="icon"
          className="w-11 h-11 rounded-full bg-black hover:bg-gray-800"
          onClick={onOpenSettings}
        >
          <Settings className="h-5 w-5" />
        </Button>

        {/* Floor Plan Toggle */}
        <Button
          variant={showFloorPlan ? "default" : "outline"}
          size="icon"
          className={cn(
            "w-11 h-11 rounded-full",
            showFloorPlan
              ? "bg-black hover:bg-gray-800"
              : "bg-white border-gray-300 hover:bg-gray-100"
          )}
          onClick={onToggleFloorPlan}
        >
          <Map className={cn("h-5 w-5", showFloorPlan ? "text-white" : "text-black")} />
        </Button>
      </div>
    </div>
  );
}
