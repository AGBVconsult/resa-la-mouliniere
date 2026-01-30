"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { SegmentedBar } from "./components/SegmentedBar";

const DAYS_OF_WEEK = ["L", "M", "M", "J", "V", "S", "D"];
const TIMEZONE = "Europe/Brussels";

export default function MobilePlanningPage() {
  const router = useRouter();

  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [todayDateKey, setTodayDateKey] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const now = new Date();
    const brusselsDate = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
    setCurrentYear(brusselsDate.getFullYear());
    setCurrentMonth(brusselsDate.getMonth() + 1);
    setTodayDateKey(
      `${brusselsDate.getFullYear()}-${String(brusselsDate.getMonth() + 1).padStart(2, "0")}-${String(brusselsDate.getDate()).padStart(2, "0")}`
    );
    setIsClient(true);
  }, []);

  const monthData = useQuery(
    api.planning.getMonthEffective,
    currentYear && currentMonth ? { year: currentYear, month: currentMonth } : "skip"
  );

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

  const calendarDays = useMemo(() => {
    if (!currentYear || !currentMonth) return [];

    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: (number | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [currentYear, currentMonth]);

  const monthLabel = useMemo(() => {
    if (!currentYear || !currentMonth) return "";
    const date = new Date(currentYear, currentMonth - 1, 1);
    const formatted = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [currentYear, currentMonth]);

  const handleDayClick = (day: number) => {
    const dateKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    router.push(`/admin/mobile/reservations?date=${dateKey}`);
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Header */}
      <header className="px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">{monthLabel}</h1>
          <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-100/50">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
        </div>
      </header>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-y border-slate-50 bg-slate-50/10">
        {DAYS_OF_WEEK.map((d, i) => (
          <div
            key={`weekday-${i}`}
            className="py-3 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[80px] border-r border-b border-slate-50 bg-slate-50/5"
              />
            );
          }

          const dateKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = monthData?.[dateKey];
          const isToday = dateKey === todayDateKey;
          const isClosed = dayData && !dayData.lunch.isOpen && !dayData.dinner.isOpen;

          // Calculate fill percentages
          const lunchPercent = dayData?.lunch.isOpen && dayData.lunch.capacityEffective > 0
            ? Math.min((dayData.lunch.covers / dayData.lunch.capacityEffective) * 100, 100)
            : 0;
          const dinnerPercent = dayData?.dinner.isOpen && dayData.dinner.capacityEffective > 0
            ? Math.min((dayData.dinner.covers / dayData.dinner.capacityEffective) * 100, 100)
            : 0;

          return (
            <button
              key={`day-${day}`}
              onClick={() => !isClosed && handleDayClick(day)}
              className={`relative min-h-[80px] border-r border-b border-slate-50 p-3 flex flex-col transition-all active:scale-[0.98] ${
                isClosed
                  ? "bg-slate-50/40 cursor-default"
                  : "hover:bg-slate-50/80 cursor-pointer"
              }`}
            >
              <span
                className={`text-xs font-bold text-left mb-auto ${
                  isToday
                    ? "bg-slate-900 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    : isClosed
                      ? "text-slate-200"
                      : "text-slate-400"
                }`}
              >
                {day}
              </span>
              {!isClosed && dayData && (
                <div className="space-y-1.5 w-full pt-3">
                  <SegmentedBar value={lunchPercent} />
                  <SegmentedBar value={dinnerPercent} />
                </div>
              )}
              {isClosed && (
                <span className="text-[8px] text-slate-300 uppercase tracking-wider mt-auto">
                  Fermé
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
