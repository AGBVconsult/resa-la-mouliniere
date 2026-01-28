"use client";

import { useMemo } from "react";
import { COLORS } from "@/components/booking/constants";
import type { Language } from "@/components/booking/types";

interface DayState {
  dateKey: string;
  lunch: { isOpen: boolean };
  dinner: { isOpen: boolean };
}

interface MiniCalendarStripProps {
  selectedDateKey: string;
  onDateSelect: (dateKey: string) => void;
  monthData: DayState[] | undefined;
  lang: Language;
}

const DAYS_SHORT: Record<string, string[]> = {
  fr: ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"],
  nl: ["ZO", "MA", "DI", "WO", "DO", "VR", "ZA"],
  en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
  de: ["SO", "MO", "DI", "MI", "DO", "FR", "SA"],
  it: ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"],
};

export function MiniCalendarStrip({
  selectedDateKey,
  onDateSelect,
  monthData,
  lang,
}: MiniCalendarStripProps) {
  const daysShort = DAYS_SHORT[lang] || DAYS_SHORT.fr;

  // Afficher 5 jours : J-2 à J+2
  const days = useMemo(() => {
    const baseDate = new Date(selectedDateKey + "T12:00:00");
    const result: string[] = [];
    
    for (let i = -2; i <= 2; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dateKey = d.toISOString().split("T")[0];
      result.push(dateKey);
    }
    return result;
  }, [selectedDateKey]);

  const dayStateMap = useMemo(() => {
    const map = new Map<string, DayState>();
    monthData?.forEach((ds) => map.set(ds.dateKey, ds));
    return map;
  }, [monthData]);

  const today = new Date().toISOString().split("T")[0];

  const renderIndicator = (isOpen: boolean, type: "lunch" | "dinner") => {
    if (!isOpen) {
      return <div className="w-[0.8vh] h-[0.8vh] rounded-full bg-slate-300" />;
    }
    return (
      <div
        className="w-[0.8vh] h-[0.8vh] rounded-full"
        style={{
          backgroundColor: type === "lunch" ? COLORS.lunch.available : COLORS.dinner.available,
        }}
      />
    );
  };

  return (
    <div className="flex gap-2 py-[1.5vh] justify-center px-2">
      {days.map((dateKey) => {
        const date = new Date(dateKey + "T12:00:00");
        const dayState = dayStateMap.get(dateKey);
        const isPast = dateKey < today;
        const isSelected = dateKey === selectedDateKey;
        const hasLunch = dayState?.lunch?.isOpen ?? false;
        const hasDinner = dayState?.dinner?.isOpen ?? false;
        const hasAvailability = hasLunch || hasDinner;
        const isDisabled = isPast || !hasAvailability;

        const dayOfWeek = date.getDay();
        const dayNumber = date.getDate();

        return (
          <button
            key={dateKey}
            type="button"
            onClick={() => !isDisabled && onDateSelect(dateKey)}
            disabled={isDisabled}
            className={`flex-1 min-w-0 max-w-[72px] py-[1vh] rounded-xl flex flex-col items-center gap-1 transition-all ${
              isSelected
                ? "bg-slate-900 text-white shadow-md scale-105"
                : isDisabled
                  ? "bg-white border border-slate-100 text-slate-300 cursor-not-allowed"
                  : "bg-white border border-slate-100 text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="text-[1.2vh] uppercase font-bold tracking-wider">
              {daysShort[dayOfWeek]}
            </span>
            <span className="text-[2.8vh] font-bold">{dayNumber}</span>
            <div className="flex gap-1">
              {renderIndicator(hasLunch, "lunch")}
              {renderIndicator(hasDinner, "dinner")}
            </div>
          </button>
        );
      })}
    </div>
  );
}
