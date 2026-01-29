"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { StepHeader } from "../ui/StepHeader";
import { TimeSlotGrid } from "../ui/TimeSlotGrid";
import { MonthCalendar } from "../calendar/MonthCalendar";
import { MiniCalendarStrip } from "../calendar/MiniCalendarStrip";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language, BookingState, Service } from "@/components/booking/types";

interface Step2DateTimeProps {
  lang: Language;
  partySize: number;
  data: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
}

export function Step2DateTime({
  lang,
  partySize,
  data,
  onUpdate,
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

  return (
    <div 
      className="flex flex-col h-full bg-slate-50"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}
    >
      <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2vh', paddingBottom: '1vh', textAlign: 'center' }}>
          <StepHeader
            title={t.step2_title}
            subtitle={t.step2_subtitle}
          />
        </div>

        <div style={{ paddingLeft: '1rem', paddingRight: '1rem' }}>
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
            <div style={{ backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <div style={{ textAlign: 'center', paddingTop: '1vh', fontWeight: 700, fontSize: '2.2vh' }}>
                {t.months[month - 1]} {year}
              </div>
              
              <MiniCalendarStrip
                selectedDateKey={data.dateKey!}
                onDateSelect={handleDateSelectFromStrip}
                monthData={monthData ?? undefined}
                lang={lang}
              />

              <div style={{ textAlign: 'center', paddingBottom: '1vh' }}>
                <button
                  type="button"
                  onClick={handleShowFullCalendar}
                  style={{ fontSize: '1.5vh', color: '#64748b', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t.show_monthly_calendar}
                </button>
              </div>
            </div>
          )}
        </div>

        {data.dateKey && isCalendarCollapsed && (
          <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '1.5vh', paddingBottom: '1.5vh', WebkitOverflowScrolling: 'touch' }}>
            {lunchSlots.length > 0 && (
              <div style={{ marginBottom: '2vh' }}>
                <h3 style={{ fontSize: '1.6vh', fontWeight: 700, color: '#334155', marginBottom: '1vh', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', backgroundColor: '#f59e0b' }} />
                  <span>{t.lunch}</span>
                  <span style={{ fontWeight: 400, color: '#94a3b8' }}>{t.lunch_hours}</span>
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
              <div style={{ marginBottom: '2vh' }}>
                <h3 style={{ fontSize: '1.6vh', fontWeight: 700, color: '#334155', marginBottom: '1vh', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', backgroundColor: '#3b82f6' }} />
                  <span>{t.dinner}</span>
                  <span style={{ fontWeight: 400, color: '#94a3b8' }}>{t.dinner_hours}</span>
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
              <div style={{ textAlign: 'center', paddingTop: '2vh', paddingBottom: '2vh', color: '#64748b' }}>
                <p>{t.no_slots}</p>
                <button
                  type="button"
                  onClick={handleShowFullCalendar}
                  style={{ marginTop: '1rem', color: '#0f172a', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t.choose_other_date}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
    </div>
  );
}
