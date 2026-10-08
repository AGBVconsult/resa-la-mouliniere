"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { NavPill } from "./NavPill";
import { Loader2, CalendarDays, Users, DoorOpen, Clock } from "lucide-react";
import { BRUME_GAUGE_SOFT, STATUS_TONES, getGaugeLevel } from "@/lib/constants/brume";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const TIMEZONE = "Europe/Brussels";

interface CalendarPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dateKey: string) => void;
  selectedDateKey?: string;
  /** Boutons de droite du header (notifications, menu) : mêmes que la vue du jour */
  headerActions?: ReactNode;
}

type ServiceDay = { isOpen: boolean; covers: number; capacityEffective: number };

/** Bande d'un service : couleur douce selon le remplissage. Service fermé : pas de bande. */
function ServiceBand({ label, service }: { label: string; service: ServiceDay }) {
  if (!service.isOpen) return <div aria-hidden className="h-[20px]" />;
  const tone =
    service.covers === 0
      ? // Ouvert mais aucun couvert réservé : teinte ardoise claire, distincte du vert
        { bg: "bg-[#EDF1F7]", text: "text-[#64748B]" }
      : BRUME_GAUGE_SOFT[getGaugeLevel(service.covers, service.capacityEffective)];
  return (
    <div className={cn("h-[20px] rounded-md px-2 flex items-center justify-between text-[11px] tabular-nums", tone.bg, tone.text)}>
      <span className="font-medium opacity-80">{label}</span>
      <span>
        <span className="font-bold">{service.covers}</span>
        <span className="opacity-60">/{service.capacityEffective}</span>
      </span>
    </div>
  );
}

export function CalendarPopup({
  isOpen,
  onClose,
  onSelectDate,
  selectedDateKey,
  headerActions,
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

  // Échap : retour à la vue du jour
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

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

  // Page plein écran (à la place de la vue du jour) : on en sort en touchant un jour
  return (
    <div className="flex flex-col h-full w-full bg-[#F6F6F6] animate-in fade-in duration-200">
      {/* Header : mêmes dimensions que celui de la vue du jour (mois à gauche, stats au centre, actions à droite) */}
      <header className="relative flex items-center pt-12 pb-10 px-8 border-b border-[#E5E5E5] bg-white shrink-0">
        <NavPill
          label={<span>{monthLabel} <span className="font-normal text-[#6E6E6E]">{currentYear}</span></span>}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          previousLabel="Mois précédent"
          nextLabel="Mois suivant"
          reset={!isCurrentMonth && todayYear ? { label: "Auj.", ariaLabel: "Revenir au mois en cours", onClick: goToCurrentMonth } : undefined}
        />
        {/* Statistiques du mois : une seule pastille d'infos, non cliquable, centrée */}
        <div
          role="group"
          aria-label="Statistiques du mois"
          className="absolute left-1/2 -translate-x-1/2 flex items-center h-9 px-1.5 bg-[#EFEFEF] rounded-full text-[#6E6E6E]"
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
        {headerActions}
      </header>

      {/* Calendrier compact, centré : cases de hauteur fixe (pas étirées sur tout l'écran) */}
      {/* Marge de 35 px sur les 4 côtés ; en haut (header → bordure de la carte), la ligne des jours occupe ces 35 px */}
      <div className="flex-1 min-h-0 flex flex-col px-[35px] pb-[35px]">
        {/* Jours de la semaine : au-dessus de la carte, sans fond */}
        <div className="grid grid-cols-7 items-center h-[35px] shrink-0">
          {DAYS_OF_WEEK.map((d, i) => (
            <div key={`weekday-${i}`} className="text-xs font-semibold text-[#6E6E6E] text-center">
              {d}
            </div>
          ))}
        </div>

        {/* Grille du mois : la 1re ligne reçoit l'arrondi haut de la carte */}
        <div className="w-full flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          {/* Les semaines se partagent la hauteur disponible : tout le mois tient à l'écran */}
          <div className="grid grid-cols-7 flex-1 min-h-0 auto-rows-fr">
            {!monthData ? (
              <div className="col-span-7 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#6E6E6E]" />
              </div>
            ) : (
              calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="bg-[#FAFAFA] border-r border-b border-[#F0F0F0]" />;
                }

                const dateKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayData = monthData?.[dateKey];
                const isToday = dateKey === todayDateKey;
                const isClosed = !!dayData && !dayData.lunch.isOpen && !dayData.dinner.isOpen;
                const isPast = todayDateKey ? dateKey < todayDateKey : false;
                const dayCovers = dayData
                  ? (dayData.lunch.isOpen ? dayData.lunch.covers || 0 : 0) + (dayData.dinner.isOpen ? dayData.dinner.covers || 0 : 0)
                  : 0;
                const hasPending = !!dayData && dayData.lunch.pendingCount + dayData.dinner.pendingCount > 0;

                return (
                  <div
                    key={`day-${day}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ouvrir le ${day} ${monthLabel.toLowerCase()}`}
                    onClick={() => handleDayClick(day)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleDayClick(day);
                      }
                    }}
                    className={cn(
                      "relative min-h-0 overflow-hidden px-2 pt-1.5 pb-1.5 border-r border-b border-[#F0F0F0] flex flex-col gap-1 text-left cursor-pointer transition-colors",
                      isClosed ? "bg-[#F6F6F6] hover:bg-[#EFEFEF]" : "bg-white hover:bg-[#FAFAFA]"
                    )}
                  >
                    {/* Rayures des jours fermés */}
                    {isClosed && (
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(0,0,0,0.045) 0 1px, transparent 1px 7px)" }}
                      />
                    )}

                    {/* Numéro, badge du jour, total de couverts (à droite) */}
                    <div className="relative flex items-center gap-1.5 min-h-[20px]">
                      <span className={cn("text-[13px] font-bold tabular-nums", isPast ? "text-[#A5A5A5]" : "text-[#2D2D2D]")}>{day}</span>
                      {isToday && (
                        <span className="text-[10px] font-semibold bg-[#3884FF] text-white px-2 py-0.5 rounded-full">Auj.</span>
                      )}
                      {dayData && !isClosed && (
                        <span className={cn("ml-auto flex items-center gap-1 text-[13px] font-medium tabular-nums", isPast ? "text-[#A5A5A5]" : "text-[#464646]")}>
                          {hasPending && (
                            <Clock size={13} strokeWidth={2} aria-label="Validation en attente" className={cn("mr-1", STATUS_TONES.pending.iconColor)} />
                          )}
                          <Users size={13} strokeWidth={1.75} className={isPast ? "text-[#B5B5B5]" : "text-[#6E6E6E]"} />
                          {dayCovers}
                        </span>
                      )}
                    </div>

                    {/* Bandes midi / soir */}
                    {dayData && !isClosed && (
                      <div className="relative mt-auto grid gap-1">
                        <ServiceBand label="Midi" service={dayData.lunch} />
                        <ServiceBand label="Soir" service={dayData.dinner} />
                      </div>
                    )}

                    {/* Jours passés : voile clair par-dessus (bandes toujours en couleur, mais estompées) */}
                    {isPast && <div aria-hidden className="absolute inset-0 bg-white/55 pointer-events-none" />}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
