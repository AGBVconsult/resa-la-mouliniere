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

  // Calculate max date (2 months from today)
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
  const maxDateKey = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, "0")}-${String(maxDate.getDate()).padStart(2, "0")}`;
  const todayKey = today.toISOString().split("T")[0];

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


  const renderIndicator = (isOpen: boolean, type: "lunch" | "dinner") => {
    if (!isOpen) {
      return <div style={{ width: '1vh', height: '1vh', minWidth: '6px', minHeight: '6px', borderRadius: '9999px', backgroundColor: '#cbd5e1' }} />;
    }
    return (
      <div
        style={{
          width: '1vh',
          height: '1vh',
          minWidth: '6px',
          minHeight: '6px',
          borderRadius: '9999px',
          backgroundColor: type === "lunch" ? COLORS.lunch.available : COLORS.dinner.available,
        }}
      />
    );
  };

  return (
    <div style={{ padding: '2vh', backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5vh' }}>
        <button
          type="button"
          onClick={onPrevMonth}
          style={{ width: '5vh', height: '5vh', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
          aria-label="Mois précédent"
        >
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '2.2vh', textTransform: 'capitalize' }}>
          {months[month - 1]} {year}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          style={{ width: '5vh', height: '5vh', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
          aria-label="Mois suivant"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* En-tête jours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginBottom: '0.5vh', textAlign: 'center' }}>
        {daysShort.map((d, i) => (
          <span key={i} style={{ fontSize: '1.3vh', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            {d}
          </span>
        ))}
      </div>

      {/* Grille calendrier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5vh' }}>
        {calendarDays.map((dateKey, idx) => {
          if (!dateKey) {
            return <div key={idx} className="aspect-square" />;
          }

          const dayState = dayStateMap.get(dateKey);
          const isPast = dateKey < todayKey;
          const isTooFar = dateKey > maxDateKey;
          const isSelected = dateKey === selectedDate;
          const hasLunch = dayState?.lunch?.isOpen ?? false;
          const hasDinner = dayState?.dinner?.isOpen ?? false;
          const hasAvailability = hasLunch || hasDinner;
          const isDisabled = isPast || isTooFar || !hasAvailability;

          const dayNumber = parseInt(dateKey.split("-")[2]);

          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectDate(dateKey)}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                opacity: isDisabled ? 0.4 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                backgroundColor: isSelected ? '#0f172a' : 'transparent',
                color: isSelected ? 'white' : 'inherit',
                border: 'none',
              }}
            >
              <span style={{ fontSize: '1.8vh', fontWeight: 500 }}>{dayNumber}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {renderIndicator(hasLunch, "lunch")}
                {renderIndicator(hasDinner, "dinner")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ marginTop: '1.5vh', paddingTop: '1vh', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '1rem', rowGap: '0.5rem', fontSize: '1.4vh', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '9999px', backgroundColor: '#f59e0b' }} />
            <span>{legend.lunchAvailable}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '9999px', backgroundColor: '#3b82f6' }} />
            <span>{legend.dinnerAvailable}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
