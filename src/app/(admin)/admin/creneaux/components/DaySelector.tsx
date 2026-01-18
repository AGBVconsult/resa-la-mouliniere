"use client";

import { cn } from "@/lib/utils";

const DAYS = [
  { label: "L", dayOfWeek: 1 },
  { label: "M", dayOfWeek: 2 },
  { label: "M", dayOfWeek: 3 },
  { label: "J", dayOfWeek: 4 },
  { label: "V", dayOfWeek: 5 },
  { label: "S", dayOfWeek: 6 },
  { label: "D", dayOfWeek: 7 },
];

interface DaySelectorProps {
  selectedDays: number[];
  onToggleDay: (dayOfWeek: number) => void;
}

export function DaySelector({ selectedDays, onToggleDay }: DaySelectorProps) {
  return (
    <div className="flex gap-2">
      {DAYS.map((day) => {
        const isSelected = selectedDays.includes(day.dayOfWeek);
        return (
          <button
            key={day.dayOfWeek}
            type="button"
            data-day={day.dayOfWeek}
            data-selected={isSelected}
            onClick={() => onToggleDay(day.dayOfWeek)}
            className={cn(
              "w-9 h-9 rounded-full text-sm font-medium transition-colors",
              isSelected
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
