"use client";

import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Settings, Map, Plus, Upload } from "lucide-react";
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
  onImportReservation?: () => void;
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
  onImportReservation,
}: ReservationHeaderProps) {
  const formattedDate = format(selectedDate, "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div 
      className="flex items-center justify-between py-4"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', paddingBottom: '1rem' }}
    >
      {/* Date Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          style={{ fontSize: '1.875rem', fontWeight: 300, textTransform: 'capitalize', background: 'none', border: 'none', cursor: 'pointer' }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Import Button (Migration) */}
        {onImportReservation && (
          <Button
            variant="outline"
            className="rounded-full border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 gap-2"
            onClick={onImportReservation}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
        )}

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
        <div style={{ backgroundColor: 'black', padding: '0.25rem', borderRadius: '9999px', display: 'flex' }}>
          <button
            onClick={() => onServiceChange("lunch")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              currentService === "lunch"
                ? "bg-white text-black shadow-sm"
                : "text-gray-400 hover:text-white"
            )}
            style={{ paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 500, backgroundColor: currentService === 'lunch' ? 'white' : 'transparent', color: currentService === 'lunch' ? 'black' : '#9ca3af', border: 'none', cursor: 'pointer' }}
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
            style={{ paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 500, backgroundColor: currentService === 'dinner' ? 'white' : 'transparent', color: currentService === 'dinner' ? 'black' : '#9ca3af', border: 'none', cursor: 'pointer' }}
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
