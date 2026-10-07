"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { NavPill } from "./NavPill";
import { Loader2, CalendarDays, Users, DoorOpen, Settings } from "lucide-react";
import { BRUME_GAUGE, getGaugeLevel } from "@/lib/constants/brume";

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TIMEZONE = "Europe/Brussels";

interface CalendarPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey?: string;
  /** Bouton engrenage d'une case : gestion des créneaux de ce jour */
  onOpenDaySettings?: (dateKey: string) => void;
}

// Jauge du thème Brume : mêmes seuils et couleurs que la vue Service (gris pour les jours passés)
function getGaugeColor(count: number, total: number, isPast: boolean): string {
  if (isPast) return count === 0 ? "#C9D2DA" : "#A5A5A5";
  return BRUME_GAUGE[getGaugeLevel(count, total)].bar;
}

export function CalendarPopup({
  isOpen,
  onClose,
  onSelectDate,
  selectedDateKey,
  onOpenDaySettings,
}: CalendarPopupProps) {
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

  // Retour au mois en cours (Europe/Brussels)
  const [todayYear, todayMonth] = todayDateKey ? todayDateKey.split("-").map(Number) : [null, null];
  const isCurrentMonth = currentYear === todayYear && currentMonth === todayMonth;

  const goToCurrentMonth = () => {
    if (!todayYear || !todayMonth) return;
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
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
        className="absolute inset-0 backdrop-blur-[2px] bg-[#000000]/50"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div 
        className="relative bg-[#F6F6F6] rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "90vw", height: "84vh" }}
      >
        {/* Content */}
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <header className="flex flex-row items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-6">
              {/* Navigateur de mois : même composant que le navigateur de date du header */}
              <NavPill
                label={<span>{monthLabel} <span className="font-normal text-[#6E6E6E]">{currentYear}</span></span>}
                onPrevious={goToPreviousMonth}
                onNext={goToNextMonth}
                previousLabel="Mois précédent"
                nextLabel="Mois suivant"
                reset={!isCurrentMonth && todayYear ? { label: "Ce mois", ariaLabel: "Revenir au mois en cours", onClick: goToCurrentMonth } : undefined}
              />
            </div>
            {/* Statistiques du mois : une seule pastille d'infos, non cliquable */}
            <div
              role="group"
              aria-label="Statistiques du mois"
              className="flex items-center h-9 px-1.5 bg-[#EFEFEF] rounded-full text-[#6E6E6E]"
            >
              <div className="flex items-center gap-1.5 px-3 whitespace-nowrap">
                <Users size={15} strokeWidth={1.75} />
                <span className="font-bold text-base tabular-nums text-[#0C0C0C]">{monthStats.covers}</span>
                <span className="text-sm">couverts</span>
              </div>
              <div className="w-px h-[18px] bg-black/10" />
              <div className="flex items-center gap-1.5 px-3 whitespace-nowrap">
                <CalendarDays size={15} strokeWidth={1.75} />
                <span className="font-bold text-base tabular-nums text-[#0C0C0C]">{monthStats.reservations}</span>
                <span className="text-sm">résa</span>
              </div>
              <div className="w-px h-[18px] bg-black/10" />
              <div className="flex items-center gap-1.5 px-3 whitespace-nowrap">
                <DoorOpen size={15} strokeWidth={1.75} />
                <span className="font-bold text-base tabular-nums text-[#0C0C0C]">{monthStats.openDays}</span>
                <span className="text-sm">jours</span>
              </div>
            </div>
          </header>

          {/* Calendar container */}
          <div className="bg-white rounded-[32px] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] border border-[#E5E5E5] overflow-hidden flex-1 flex flex-col">
            {/* Days of week header */}
            <div className="grid grid-cols-7 bg-[#464646] shrink-0">
              {DAYS_OF_WEEK.map((d, i) => (
                <div
                  key={`weekday-${i}`}
                  className="py-3 px-4 text-xs font-semibold text-white/85 text-center"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 flex-1">
              {!monthData ? (
                <div className="col-span-7 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#6E6E6E]" />
                </div>
              ) : (
                calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="bg-[#FAFAFA] border-r border-b border-[#EFEFEF] min-h-[80px]"
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
                  const hasReservations = dayData && ((dayData.lunch.covers || 0) + (dayData.dinner.covers || 0)) > 0;
                  const showSettingsButton = !isPast && onOpenDaySettings;

                  return (
                    <div
                      key={`day-${day}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleDayClick(day)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleDayClick(day);
                        }
                      }}
                      className={`relative min-h-[80px] p-2 border-r border-b border-[#EFEFEF] transition-all duration-200 flex flex-col text-left
                        ${showMutedBackground ? "bg-[#F6F6F6] hover:bg-[#EFEFEF]" : hasReservations && !isClosed ? "bg-[#FAFAFA] hover:bg-[#F2F2F2]" : "bg-white hover:bg-[#FAFAFA]"}
                        ${isToday ? "ring-2 ring-inset ring-[#0C0C0C] z-10" : ""}
                        ${isPast ? "opacity-80" : ""}
                        ${isSelected ? "bg-[#EAF2FF] ring-2 ring-[#3884FF] ring-inset" : ""}
                        cursor-pointer
                      `}
                    >
                      {/* Pattern rayé pour jours fermés */}
                      {isClosed && (
                        <div 
                          className="absolute inset-0 opacity-[0.07] pointer-events-none"
                          style={{ 
                            backgroundImage: "linear-gradient(45deg, #464646 25%, transparent 25%, transparent 50%, #464646 50%, #464646 75%, transparent 75%, transparent)", 
                            backgroundSize: "10px 10px" 
                          }}
                        />
                      )}

                      {/* Header de la case */}
                      <div className="relative flex items-start gap-1.5">
                        <span className={`text-sm font-semibold ${isToday ? "text-[#0C0C0C]" : isPast ? "text-[#A5A5A5]" : "text-[#464646]"}`}>
                          {day}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          {isToday && (
                            <span className="text-[10px] font-semibold bg-[#3884FF] text-white px-2 py-0.5 rounded-full">
                              Aujourd&apos;hui
                            </span>
                          )}
                          {showSettingsButton && (
                            <button
                              type="button"
                              aria-label="Créneaux du jour"
                              title="Créneaux du jour"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDaySettings(dateKey);
                              }}
                              className="w-6 h-6 text-[#6E6E6E] hover:text-[#2D2D2D] flex items-center justify-center transition-colors"
                            >
                              <Settings size={12} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Contenu pour jours ouverts */}
                      {!isClosed && dayData && (
                        <div className="space-y-1.5 mt-auto pt-2 w-full">
                          {/* Déjeuner */}
                          {dayData.lunch.isOpen ? (
                            <div className="flex items-center gap-2 w-full">
                              <span className={`text-[11px] font-semibold shrink-0 w-6 ${isPast ? "text-[#A5A5A5]" : "text-[#6E6E6E]"}`}>
                                Déj
                              </span>
                              <div className="flex-1 h-1.5 bg-[#F6F6F6] rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{
                                    width: `${dayData.lunch.capacityEffective > 0 ? (dayData.lunch.covers / dayData.lunch.capacityEffective) * 100 : 0}%`,
                                    backgroundColor: getGaugeColor(dayData.lunch.covers, dayData.lunch.capacityEffective, isPast),
                                  }}
                                />
                              </div>
                              <span className={`text-[11px] font-bold shrink-0 ${isPast ? "text-[#6E6E6E]" : "text-[#2D2D2D]"}`}>
                                {dayData.lunch.covers}<span className="font-normal text-[#A5A5A5]">/{dayData.lunch.capacityEffective}</span>
                              </span>
                            </div>
                          ) : (
                            // Service fermé : ligne vide pour garder Déj en haut et Dîn en bas
                            <div aria-hidden className="invisible flex items-center gap-2 w-full">
                              <span className="text-[11px] font-semibold">&nbsp;</span>
                            </div>
                          )}
                          {/* Dîner */}
                          {dayData.dinner.isOpen ? (
                            <div className="flex items-center gap-2 w-full">
                              <span className={`text-[11px] font-semibold shrink-0 w-6 ${isPast ? "text-[#A5A5A5]" : "text-[#6E6E6E]"}`}>
                                Dîn
                              </span>
                              <div className="flex-1 h-1.5 bg-[#F6F6F6] rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{
                                    width: `${dayData.dinner.capacityEffective > 0 ? (dayData.dinner.covers / dayData.dinner.capacityEffective) * 100 : 0}%`,
                                    backgroundColor: getGaugeColor(dayData.dinner.covers, dayData.dinner.capacityEffective, isPast),
                                  }}
                                />
                              </div>
                              <span className={`text-[11px] font-bold shrink-0 ${isPast ? "text-[#6E6E6E]" : "text-[#2D2D2D]"}`}>
                                {dayData.dinner.covers}<span className="font-normal text-[#A5A5A5]">/{dayData.dinner.capacityEffective}</span>
                              </span>
                            </div>
                          ) : (
                            // Service fermé : ligne vide pour garder Déj en haut et Dîn en bas
                            <div aria-hidden className="invisible flex items-center gap-2 w-full">
                              <span className="text-[11px] font-semibold">&nbsp;</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
