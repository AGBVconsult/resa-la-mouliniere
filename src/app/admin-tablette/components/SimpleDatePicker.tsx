"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface SimpleDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey: string;
}

export function SimpleDatePicker({ isOpen, onClose, onSelectDate, selectedDateKey }: SimpleDatePickerProps) {
  const [year, month] = selectedDateKey.split("-").map(Number);
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month); // 1-indexed

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1);
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    let startDay = first.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const prev = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  };

  const next = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  };

  const pick = (day: number) => {
    const dk = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onSelectDate(dk);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-5 w-[340px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={prev} className="p-2 rounded-xl hover:bg-slate-100 active:scale-95">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <span className="text-sm font-bold text-slate-800">
            {MONTHS[viewMonth - 1]} {viewYear}
          </span>
          <button type="button" onClick={next} className="p-2 rounded-xl hover:bg-slate-100 active:scale-95">
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold uppercase text-slate-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />;
            const dk = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = dk === selectedDateKey;
            const isToday = dk === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => pick(day)}
                className={cn(
                  "h-10 w-full rounded-lg text-sm font-medium transition-all active:scale-90",
                  isSelected
                    ? "bg-emerald-500 text-white shadow-sm"
                    : isToday
                      ? "bg-slate-100 text-slate-900 font-bold ring-1 ring-slate-300"
                      : "text-slate-700 hover:bg-slate-100"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
