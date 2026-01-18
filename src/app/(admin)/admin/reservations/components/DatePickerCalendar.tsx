"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerCalendarProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

export function DatePickerCalendar({ selectedDate, onSelect, onClose }: DatePickerCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <div className="w-[300px] bg-white rounded-xl shadow-xl border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-medium capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="h-9 flex items-center justify-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                onSelect(day);
                onClose();
              }}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center text-sm transition-colors",
                !isCurrentMonth && "text-gray-300",
                isCurrentMonth && !isSelected && "hover:bg-gray-100",
                isSelected && "bg-blue-600 text-white",
                isTodayDate && !isSelected && "border-2 border-blue-600 font-semibold"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      <div className="mt-4 pt-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            onSelect(new Date());
            onClose();
          }}
        >
          Aujourd&apos;hui
        </Button>
      </div>
    </div>
  );
}
