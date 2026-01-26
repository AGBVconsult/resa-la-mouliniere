"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { StepHeader } from "../ui/StepHeader";
import { TimeSlotGrid } from "../ui/TimeSlotGrid";
import { NavigationFooter } from "../ui/NavigationFooter";
import { MonthCalendar } from "../calendar/MonthCalendar";
import { MiniCalendarStrip } from "../calendar/MiniCalendarStrip";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language, BookingState, Service } from "@/components/booking/types";

interface Step2DateTimeProps {
  lang: Language;
  partySize: number;
  data: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2DateTime({
  lang,
  partySize,
  data,
  onUpdate,
  onNext,
  onBack,
}: Step2DateTimeProps) {
  const { t } = useTranslation(lang);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);

  const monthData = useQuery(api.availability.getMonth, {
    year,
    month,
    partySize,
  });

  const dayData = useQuery(
    api.availability.getDay,
    data.dateKey ? { dateKey: data.dateKey, partySize } : "skip"
  );

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleDateSelectFromCalendar = (dateKey: string) => {
    onUpdate({ dateKey, service: null, timeKey: null });
    setTimeout(() => setIsCalendarCollapsed(true), 150);
  };

  const handleDateSelectFromStrip = (dateKey: string) => {
    onUpdate({ dateKey, service: null, timeKey: null });
  };

  const handleShowFullCalendar = () => {
    setIsCalendarCollapsed(false);
  };

  const handleTimeSelect = (timeKey: string, service: Service) => {
    onUpdate({ timeKey, service });
  };

  const lunchSlots = useMemo(() => {
    return dayData?.lunch?.filter(
      (s: { isOpen: boolean; remainingCapacity: number; maxGroupSize: number | null }) => {
        if (!s.isOpen) return false;
        if (s.remainingCapacity < partySize) return false;
        // Vérifier la taille max du groupe (maxGroupSize = null signifie pas de limite)
        if (s.maxGroupSize !== null && partySize > s.maxGroupSize) return false;
        return true;
      }
    ) || [];
  }, [dayData, partySize]);

  const dinnerSlots = useMemo(() => {
    return dayData?.dinner?.filter(
      (s: { isOpen: boolean; remainingCapacity: number; maxGroupSize: number | null }) => {
        if (!s.isOpen) return false;
        if (s.remainingCapacity < partySize) return false;
        // Vérifier la taille max du groupe (maxGroupSize = null signifie pas de limite)
        if (s.maxGroupSize !== null && partySize > s.maxGroupSize) return false;
        return true;
      }
    ) || [];
  }, [dayData, partySize]);

  const canContinue = !!(data.dateKey && data.service && data.timeKey);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 flex flex-col">
        <div className="px-6 pt-6 pb-4 text-center">
          <StepHeader
            title={t.step2_title}
            subtitle={t.step2_subtitle}
          />
        </div>

        <div className="px-6">
          {!isCalendarCollapsed ? (
            <MonthCalendar
              year={year}
              month={month}
              monthData={monthData ?? undefined}
              selectedDate={data.dateKey}
              onSelectDate={handleDateSelectFromCalendar}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              lang={lang}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm">
              <div className="text-center pt-4 font-bold text-lg">
                {t.months[month - 1]} {year}
              </div>
              
              <MiniCalendarStrip
                selectedDateKey={data.dateKey!}
                onDateSelect={handleDateSelectFromStrip}
                monthData={monthData ?? undefined}
                lang={lang}
              />

              <div className="text-center pb-4">
                <button
                  type="button"
                  onClick={handleShowFullCalendar}
                  className="text-sm text-slate-500 underline hover:text-slate-700"
                >
                  {t.show_monthly_calendar}
                </button>
              </div>
            </div>
          )}
        </div>

        {data.dateKey && isCalendarCollapsed && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {lunchSlots.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>{t.lunch}</span>
                  <span className="font-normal text-slate-400">{t.lunch_hours}</span>
                </h3>
                <TimeSlotGrid
                  slots={lunchSlots}
                  selectedTime={data.service === "lunch" ? data.timeKey : null}
                  onSelect={(timeKey) => handleTimeSelect(timeKey, "lunch")}
                  color="amber"
                />
              </div>
            )}

            {dinnerSlots.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>{t.dinner}</span>
                  <span className="font-normal text-slate-400">{t.dinner_hours}</span>
                </h3>
                <TimeSlotGrid
                  slots={dinnerSlots}
                  selectedTime={data.service === "dinner" ? data.timeKey : null}
                  onSelect={(timeKey) => handleTimeSelect(timeKey, "dinner")}
                  color="blue"
                />
              </div>
            )}

            {lunchSlots.length === 0 && dinnerSlots.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>{t.no_slots}</p>
                <button
                  type="button"
                  onClick={handleShowFullCalendar}
                  className="mt-4 text-slate-900 underline"
                >
                  {t.choose_other_date}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <NavigationFooter
        backLabel={t.back}
        onBack={onBack}
        primaryLabel={`${t.continue} →`}
        onPrimary={onNext}
        primaryDisabled={!canContinue}
      />
    </div>
  );
}
