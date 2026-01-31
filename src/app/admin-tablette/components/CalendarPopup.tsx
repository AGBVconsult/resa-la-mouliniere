"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, Users, DoorOpen, Settings } from "lucide-react";
import { SegmentedBar } from "./SegmentedBar";

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TIMEZONE = "Europe/Brussels";

interface CalendarPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey?: string;
}

export function CalendarPopup({ isOpen, onClose, onSelectDate, selectedDateKey }: CalendarPopupProps) {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [todayDateKey, setTodayDateKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Si une date est sélectionnée, ouvrir sur ce mois
      if (selectedDateKey) {
        const [year, month] = selectedDateKey.split("-").map(Number);
        setCurrentYear(year);
        setCurrentMonth(month);
      } else {
        const now = new Date();
        const brusselsDate = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
        setCurrentYear(brusselsDate.getFullYear());
        setCurrentMonth(brusselsDate.getMonth() + 1);
      }
      
      const now = new Date();
      const brusselsDate = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
      setTodayDateKey(
        `${brusselsDate.getFullYear()}-${String(brusselsDate.getMonth() + 1).padStart(2, "0")}-${String(brusselsDate.getDate()).padStart(2, "0")}`
      );
    }
  }, [isOpen, selectedDateKey]);

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
    onSelectDate(dateKey);
    onClose();
  };

  const monthStats = useMemo(() => {
    if (!monthData) return { reservations: 0, covers: 0, openDays: 0 };
    let reservations = 0;
    let covers = 0;
    let openDays = 0;
    Object.values(monthData).forEach((day) => {
      reservations += (day.lunch.reservationCount || 0) + (day.dinner.reservationCount || 0);
      covers += (day.lunch.covers || 0) + (day.dinner.covers || 0);
      if (day.lunch.isOpen || day.dinner.isOpen) openDays++;
    });
    return { reservations, covers, openDays };
  }, [monthData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "85vw", height: "85vh" }}
      >
        {/* Content */}
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <header className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-800">
                {monthLabel.split(" ")[0]}{" "}
                <span className="text-slate-400 font-light">{currentYear}</span>
              </h1>
              <div className="flex bg-slate-50 rounded-full p-1 border border-slate-200">
                <button
                  onClick={goToPreviousMonth}
                  className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors rounded-full"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors rounded-full"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                <DoorOpen size={14} strokeWidth={2.5} className="text-slate-600" />
                <span className="text-sm font-bold text-slate-700">{monthStats.openDays}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide">jours</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                <CalendarDays size={14} strokeWidth={2.5} className="text-slate-600" />
                <span className="text-sm font-bold text-slate-700">{monthStats.reservations}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide">résa</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full">
                <Users size={14} strokeWidth={2.5} className="text-slate-600" />
                <span className="text-sm font-bold text-slate-700">{monthStats.covers}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide">couverts</span>
              </div>
            </div>
          </header>

          {/* Days of week header */}
          <div className="grid grid-cols-7 border-y border-slate-100 bg-slate-50/30 rounded-t-xl shrink-0">
            {DAYS_OF_WEEK.map((d, i) => (
              <div
                key={`weekday-${i}`}
                className="py-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 flex-1 bg-white rounded-b-xl border border-t-0 border-slate-100 overflow-hidden">
            {!monthData ? (
              <div className="col-span-7 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              calendarDays.map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="border-r border-b border-slate-50 bg-slate-50/20"
                    />
                  );
                }

                const dateKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayData = monthData?.[dateKey];
                const isToday = dateKey === todayDateKey;
                const isSelected = dateKey === selectedDateKey;
                const isClosed = dayData && !dayData.lunch.isOpen && !dayData.dinner.isOpen;

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
                    className={`relative border-r border-b border-slate-50 p-2 flex flex-col transition-all active:scale-[0.98] ${
                      isClosed
                        ? "bg-slate-50/40 cursor-default"
                        : "hover:bg-slate-50/80 cursor-pointer"
                    } ${isSelected ? "bg-blue-50 ring-2 ring-blue-400 ring-inset" : ""}`}
                  >
                    {/* Settings icon */}
                    {!isClosed && (
                      <div className="absolute top-2 right-2">
                        <Settings size={12} className="text-slate-300" strokeWidth={1.5} />
                      </div>
                    )}
                    <span
                      className={`text-sm font-bold text-left ${
                        isToday
                          ? "bg-slate-900 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                          : isClosed
                            ? "text-slate-200"
                            : isSelected
                              ? "text-blue-600"
                              : "text-slate-500"
                      }`}
                    >
                      {day}
                    </span>
                    {!isClosed && dayData && (
                      <div className="space-y-2 w-full mt-auto">
                        {/* Déjeuner */}
                        {dayData.lunch.isOpen && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 w-6 shrink-0">Déj</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  lunchPercent >= 90 ? "bg-red-400" : lunchPercent >= 70 ? "bg-amber-400" : "bg-emerald-400"
                                }`}
                                style={{ width: `${lunchPercent}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-0.5 text-[10px] text-slate-500 shrink-0">
                              <Users size={10} strokeWidth={2} />
                              <span>{dayData.lunch.covers}/{dayData.lunch.capacityEffective}</span>
                            </div>
                          </div>
                        )}
                        {/* Dîner */}
                        {dayData.dinner.isOpen && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 w-6 shrink-0">Dîn</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  dinnerPercent >= 90 ? "bg-red-400" : dinnerPercent >= 70 ? "bg-amber-400" : "bg-emerald-400"
                                }`}
                                style={{ width: `${dinnerPercent}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-0.5 text-[10px] text-slate-500 shrink-0">
                              <Users size={10} strokeWidth={2} />
                              <span>{dayData.dinner.covers}/{dayData.dinner.capacityEffective}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {isClosed && (
                      <span className="text-[8px] text-slate-400 uppercase tracking-wider mt-auto">
                        Fermé
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
