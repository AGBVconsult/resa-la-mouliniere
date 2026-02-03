"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, Users, DoorOpen } from "lucide-react";

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TIMEZONE = "Europe/Brussels";

interface CalendarPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey?: string;
}

function getStatusColor(count: number, total: number, isPast: boolean): string {
  const ratio = count / total;
  if (isPast) {
    if (count === 0) return "bg-slate-200";
    return "bg-slate-400";
  }
  if (ratio >= 0.95) return "bg-red-500";
  if (ratio >= 0.7) return "bg-orange-500";
  if (count > 0) return "bg-emerald-500";
  return "bg-slate-200";
}

export function CalendarPopup({ isOpen, onClose, onSelectDate, selectedDateKey }: CalendarPopupProps) {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [todayDateKey, setTodayDateKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
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
    const formatted = date.toLocaleDateString("fr-FR", { month: "long" });
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
        className="relative bg-slate-50 rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "90vw", height: "90vh" }}
      >
        {/* Content */}
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <header className="flex flex-row items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-6">
              <h1 className="text-3xl font-bold tracking-tighter text-slate-900">
                {monthLabel}{" "}
                <span className="text-slate-300 font-normal">{currentYear}</span>
              </h1>
              <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200/60 p-1.5">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-black"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-black"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-slate-200 shadow-sm bg-white text-slate-500 text-[11px] font-bold tracking-tight">
                <DoorOpen size={14} />
                {monthStats.openDays} JOURS
              </div>
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-slate-200 shadow-sm bg-white text-slate-500 text-[11px] font-bold tracking-tight">
                <CalendarDays size={14} />
                {monthStats.reservations} RÉSA
              </div>
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-black shadow-sm bg-black text-white text-[11px] font-bold tracking-tight">
                <Users size={14} />
                {monthStats.covers} COUVERTS
              </div>
            </div>
          </header>

          {/* Calendar container */}
          <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/40 border border-slate-200/80 overflow-hidden flex-1 flex flex-col">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30 shrink-0">
              {DAYS_OF_WEEK.map((d, i) => (
                <div
                  key={`weekday-${i}`}
                  className="py-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 text-center"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 flex-1">
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
                        className="bg-slate-50/10 border-r border-b border-slate-100 min-h-[120px]"
                      />
                    );
                  }

                  const dateKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayData = monthData?.[dateKey];
                  const isToday = dateKey === todayDateKey;
                  const isSelected = dateKey === selectedDateKey;
                  const isClosed = dayData && !dayData.lunch.isOpen && !dayData.dinner.isOpen;
                  const isPast = todayDateKey ? dateKey < todayDateKey : false;
                  const showMutedBackground = isClosed || isPast;

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => !isClosed && handleDayClick(day)}
                      className={`relative min-h-[120px] p-3 border-r border-b border-slate-100 transition-all duration-200 flex flex-col text-left
                        ${showMutedBackground ? "bg-slate-50/70" : "bg-white hover:bg-slate-50"}
                        ${isToday ? "ring-2 ring-inset ring-black z-10" : ""}
                        ${isPast ? "opacity-80" : ""}
                        ${isSelected ? "bg-blue-50 ring-2 ring-blue-400 ring-inset" : ""}
                        ${isClosed ? "cursor-default" : "cursor-pointer"}
                      `}
                    >
                      {/* Pattern rayé pour jours fermés */}
                      {isClosed && (
                        <div 
                          className="absolute inset-0 opacity-5 pointer-events-none"
                          style={{ 
                            backgroundImage: "linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)", 
                            backgroundSize: "10px 10px" 
                          }}
                        />
                      )}

                      {/* Header de la case */}
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-sm font-semibold ${isToday ? "text-black" : isPast ? "text-slate-300" : "text-slate-400"}`}>
                          {day}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-full">
                            Aujourd&apos;hui
                          </span>
                        )}
                      </div>

                      {/* Contenu pour jours ouverts */}
                      {!isClosed && dayData && (
                        <div className="space-y-4 mt-auto">
                          {/* Déjeuner */}
                          {dayData.lunch.isOpen && (
                            <div className="group cursor-default">
                              <div className="flex justify-between items-baseline mb-1.5">
                                <span className={`text-[10px] font-light uppercase tracking-[0.05em] ${isPast ? "text-slate-300" : "text-slate-400"}`}>
                                  Déjeuner
                                </span>
                                <span className={`text-sm font-bold tracking-tight ${isPast ? "text-slate-500" : "text-slate-900"}`}>
                                  {dayData.lunch.covers}
                                  <span className={`font-normal ml-0.5 ${isPast ? "text-slate-300" : "text-slate-300"}`}>
                                    /{dayData.lunch.capacityEffective}
                                  </span>
                                </span>
                              </div>
                              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-700 ease-out ${getStatusColor(dayData.lunch.covers, dayData.lunch.capacityEffective, isPast)}`}
                                  style={{ width: `${dayData.lunch.capacityEffective > 0 ? (dayData.lunch.covers / dayData.lunch.capacityEffective) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {/* Dîner */}
                          {dayData.dinner.isOpen && (
                            <div className="group cursor-default">
                              <div className="flex justify-between items-baseline mb-1.5">
                                <span className={`text-[10px] font-light uppercase tracking-[0.05em] ${isPast ? "text-slate-300" : "text-slate-400"}`}>
                                  Dîner
                                </span>
                                <span className={`text-sm font-bold tracking-tight ${isPast ? "text-slate-500" : "text-slate-900"}`}>
                                  {dayData.dinner.covers}
                                  <span className={`font-normal ml-0.5 ${isPast ? "text-slate-300" : "text-slate-300"}`}>
                                    /{dayData.dinner.capacityEffective}
                                  </span>
                                </span>
                              </div>
                              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-700 ease-out ${getStatusColor(dayData.dinner.covers, dayData.dinner.capacityEffective, isPast)}`}
                                  style={{ width: `${dayData.dinner.capacityEffective > 0 ? (dayData.dinner.covers / dayData.dinner.capacityEffective) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer légende */}
          <footer className="mt-4 flex items-center justify-between text-slate-400 border-t border-slate-200 pt-4 shrink-0">
            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Disponibilité
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Presque complet
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Complet
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Passé
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
