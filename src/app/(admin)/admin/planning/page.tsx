"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ChevronLeft, ChevronRight, Settings, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DayOverrideModal } from "../reservations/components/DayOverrideModal";

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TIMEZONE = "Europe/Brussels";

export default function PlanningPage() {
  const router = useRouter();
  
  // SSR-safe state initialization
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [todayDateKey, setTodayDateKey] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Navigate to reservations page with selected date
  const navigateToReservations = (dateKey: string) => {
    router.push(`/admin/reservations?date=${dateKey}`);
  };

  // Initialize on client only (avoid hydration mismatch)
  useEffect(() => {
    const now = new Date();
    // Use Brussels timezone
    const brusselsDate = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
    setCurrentYear(brusselsDate.getFullYear());
    setCurrentMonth(brusselsDate.getMonth() + 1);
    setTodayDateKey(
      `${brusselsDate.getFullYear()}-${String(brusselsDate.getMonth() + 1).padStart(2, "0")}-${String(brusselsDate.getDate()).padStart(2, "0")}`
    );
    setIsClient(true);
  }, []);

  // Fetch month data
  const monthData = useQuery(
    api.planning.getMonthEffective,
    currentYear && currentMonth ? { year: currentYear, month: currentMonth } : "skip"
  );

  // Navigation handlers
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => (y ?? 2025) - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => (m ?? 1) - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => (y ?? 2025) + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => (m ?? 1) + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    const brusselsDate = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
    setCurrentYear(brusselsDate.getFullYear());
    setCurrentMonth(brusselsDate.getMonth() + 1);
  };

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    if (!currentYear || !currentMonth) return [];

    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();

    // Get day of week for first day (0=Sunday, convert to Monday=0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: (number | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [currentYear, currentMonth]);

  // Format month label
  const monthLabel = useMemo(() => {
    if (!currentYear || !currentMonth) return "";
    const date = new Date(currentYear, currentMonth - 1, 1);
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }, [currentYear, currentMonth]);

  // Loading state
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold capitalize">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-sm font-medium text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="border-b border-r bg-gray-50/50 min-h-[120px]" />;
            }

            const dateKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayData = monthData?.[dateKey];
            const isToday = dateKey === todayDateKey;
            const isPast = todayDateKey ? dateKey < todayDateKey : false;
            const isClosed = dayData && !dayData.lunch.isOpen && !dayData.dinner.isOpen;

            return (
              <DayCell
                key={dateKey}
                day={day}
                dateKey={dateKey}
                isToday={isToday}
                isPast={isPast}
                isClosed={isClosed ?? false}
                lunch={dayData?.lunch}
                dinner={dayData?.dinner}
                isLoading={!monthData}
                onOpenSettings={() => setSelectedDateKey(dateKey)}
                onOpenReservations={() => navigateToReservations(dateKey)}
              />
            );
          })}
        </div>
      </div>

      {/* Day Override Modal */}
      {selectedDateKey && (
        <DayOverrideModal
          dateKey={selectedDateKey}
          onClose={() => setSelectedDateKey(null)}
        />
      )}
    </div>
  );
}

// Day Cell Component
interface DayCellProps {
  day: number;
  dateKey: string;
  isToday: boolean;
  isPast: boolean;
  isClosed: boolean;
  lunch?: { isOpen: boolean; capacityEffective: number; covers: number };
  dinner?: { isOpen: boolean; capacityEffective: number; covers: number };
  isLoading: boolean;
  onOpenSettings: () => void;
  onOpenReservations: () => void;
}

function DayCell({
  day,
  dateKey,
  isToday,
  isPast,
  isClosed,
  lunch,
  dinner,
  isLoading,
  onOpenSettings,
  onOpenReservations,
}: DayCellProps) {
  // Past days are shown as closed (grayed out) but still show fill rate
  const showAsClosed = isPast || isClosed;
  
  return (
    <div
      className={cn(
        "border-b border-r min-h-[120px] p-2 relative group transition-colors cursor-pointer hover:bg-gray-50",
        isToday && "bg-blue-50 hover:bg-blue-100",
        isPast && "bg-gray-100 opacity-60",
        !isPast && isClosed && "bg-gray-100 hover:bg-gray-150"
      )}
      onClick={onOpenReservations}
    >
      {/* Header: Day number + Settings */}
      <div className="flex items-start justify-between mb-2">
        <span
          className={cn(
            "text-sm font-medium",
            isToday && "bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center"
          )}
        >
          {day}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          title="Paramètres du jour"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-16">
          <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
        </div>
      ) : isPast ? (
        // Past days: show fill rate but grayed out
        <div className="space-y-1.5">
          <ServiceRow
            label="Déj"
            covers={lunch?.covers ?? 0}
            capacity={lunch?.capacityEffective ?? 0}
            isClosed={!lunch?.isOpen}
          />
          <ServiceRow
            label="Dîn"
            covers={dinner?.covers ?? 0}
            capacity={dinner?.capacityEffective ?? 0}
            isClosed={!dinner?.isOpen}
          />
        </div>
      ) : isClosed ? (
        <div className="text-center text-gray-400 text-sm mt-4">Fermé</div>
      ) : (
        <div className="space-y-1.5">
          {/* Lunch - toujours en haut */}
          <ServiceRow
            label="Déj"
            covers={lunch?.covers ?? 0}
            capacity={lunch?.capacityEffective ?? 0}
            isClosed={!lunch?.isOpen}
          />

          {/* Dinner - toujours en bas */}
          <ServiceRow
            label="Dîn"
            covers={dinner?.covers ?? 0}
            capacity={dinner?.capacityEffective ?? 0}
            isClosed={!dinner?.isOpen}
          />
        </div>
      )}
    </div>
  );
}

// Service Row Component
interface ServiceRowProps {
  label: string;
  covers: number;
  capacity: number;
  isClosed?: boolean;
}

function ServiceRow({ label, covers, capacity, isClosed = false }: ServiceRowProps) {
  const percentage = capacity > 0 ? Math.min((covers / capacity) * 100, 100) : 0;

  if (isClosed) {
    return (
      <div className="flex items-center gap-1.5 text-xs opacity-40">
        <span className="text-gray-400 w-6">{label}</span>
        <span className="text-gray-400 text-[10px]">Fermé</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-500 w-6">{label}</span>
      {/* Progress bar */}
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percentage >= 80 ? "bg-red-500" : percentage >= 50 ? "bg-yellow-500" : "bg-emerald-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {/* Counter */}
      <div className="flex items-center gap-0.5 text-gray-600 min-w-[45px] justify-end">
        <Users className="h-3 w-3" />
        <span>{covers}/{capacity}</span>
      </div>
    </div>
  );
}
