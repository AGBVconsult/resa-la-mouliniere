"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/components/booking/i18n/translations";
import { COLORS } from "@/components/booking/constants";
import type { Language, DayState } from "@/components/booking/types";

interface MonthCalendarProps {
  year: number;
  month: number;
  monthData: DayState[] | undefined;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  lang: Language;
}

export function MonthCalendar({
  year,
  month,
  monthData,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  lang,
}: MonthCalendarProps) {
  const { months, daysShort, legend } = useTranslation(lang);

  // Générer la grille du mois
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0
    const daysInMonth = lastDay.getDate();

    const days: (string | null)[] = [];

    // Jours vides avant le 1er
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Jours du mois
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push(dateKey);
    }

    return days;
  }, [year, month]);

  // Lookup monthData par dateKey
  const dayStateMap = useMemo(() => {
    const map = new Map<string, DayState>();
    monthData?.forEach((ds) => map.set(ds.dateKey, ds));
    return map;
  }, [monthData]);

  const today = new Date().toISOString().split("T")[0];

  const renderIndicator = (isOpen: boolean, type: "lunch" | "dinner") => {
    if (!isOpen) {
      return <div className="w-[1vh] h-[1vh] min-w-[6px] min-h-[6px] rounded-full bg-slate-300" />;
    }
    return (
      <div
        className="w-[1vh] h-[1vh] min-w-[6px] min-h-[6px] rounded-full"
        style={{
          backgroundColor: type === "lunch" ? COLORS.lunch.available : COLORS.dinner.available,
        }}
      />
    );
  };

  return (
    <div className="p-[2vh] bg-white rounded-2xl shadow-sm">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-[1.5vh]">
        <button
          type="button"
          onClick={onPrevMonth}
          className="w-[5vh] h-[5vh] min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Mois précédent"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-[2.2vh] capitalize">
          {months[month - 1]} {year}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          className="w-[5vh] h-[5vh] min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Mois suivant"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* En-tête jours */}
      <div className="grid grid-cols-7 mb-[0.5vh] text-center">
        {daysShort.map((d, i) => (
          <span key={i} className="text-[1.3vh] font-bold text-slate-500 uppercase">
            {d}
          </span>
        ))}
      </div>

      {/* Grille calendrier */}
      <div className="grid grid-cols-7 gap-[0.5vh]">
        {calendarDays.map((dateKey, idx) => {
          if (!dateKey) {
            return <div key={idx} className="aspect-square" />;
          }

          const dayState = dayStateMap.get(dateKey);
          const isPast = dateKey < today;
          const isSelected = dateKey === selectedDate;
          const hasLunch = dayState?.lunch?.isOpen ?? false;
          const hasDinner = dayState?.dinner?.isOpen ?? false;
          const hasAvailability = hasLunch || hasDinner;
          const isDisabled = isPast || !hasAvailability;

          const dayNumber = parseInt(dateKey.split("-")[2]);

          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectDate(dateKey)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer"
              } ${isSelected ? "bg-slate-900 text-white" : ""}`}
            >
              <span className="text-[1.8vh] font-medium">{dayNumber}</span>
              <div className="flex gap-1">
                {renderIndicator(hasLunch, "lunch")}
                {renderIndicator(hasDinner, "dinner")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-[1.5vh] pt-[1vh] border-t border-slate-100">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[1.4vh] text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>{legend.lunchAvailable}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>{legend.dinnerAvailable}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
