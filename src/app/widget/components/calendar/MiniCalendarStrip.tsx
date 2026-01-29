"use client";

import { useMemo } from "react";
import { COLORS } from "@/components/booking/constants";
import type { Language } from "@/components/booking/types";

interface DayState {
  dateKey: string;
  lunch: { isOpen: boolean };
  dinner: { isOpen: boolean };
}

interface MiniCalendarStripProps {
  selectedDateKey: string;
  onDateSelect: (dateKey: string) => void;
  monthData: DayState[] | undefined;
  lang: Language;
}

const DAYS_SHORT: Record<string, string[]> = {
  fr: ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"],
  nl: ["ZO", "MA", "DI", "WO", "DO", "VR", "ZA"],
  en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
  de: ["SO", "MO", "DI", "MI", "DO", "FR", "SA"],
  it: ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"],
};

export function MiniCalendarStrip({
  selectedDateKey,
  onDateSelect,
  monthData,
  lang,
}: MiniCalendarStripProps) {
  const daysShort = DAYS_SHORT[lang] || DAYS_SHORT.fr;

  // Afficher 5 jours : J-2 à J+2
  const days = useMemo(() => {
    const baseDate = new Date(selectedDateKey + "T12:00:00");
    const result: string[] = [];
    
    for (let i = -2; i <= 2; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dateKey = d.toISOString().split("T")[0];
      result.push(dateKey);
    }
    return result;
  }, [selectedDateKey]);

  const dayStateMap = useMemo(() => {
    const map = new Map<string, DayState>();
    monthData?.forEach((ds) => map.set(ds.dateKey, ds));
    return map;
  }, [monthData]);

  const today = new Date().toISOString().split("T")[0];

  const renderIndicator = (isOpen: boolean, type: "lunch" | "dinner") => {
    if (!isOpen) {
      return <div style={{ width: '0.8vh', height: '0.8vh', borderRadius: '9999px', backgroundColor: '#cbd5e1' }} />;
    }
    return (
      <div
        style={{
          width: '0.8vh',
          height: '0.8vh',
          borderRadius: '9999px',
          backgroundColor: type === "lunch" ? COLORS.lunch.available : COLORS.dinner.available,
        }}
      />
    );
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1.5vh', paddingBottom: '1.5vh', justifyContent: 'center', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
      {days.map((dateKey) => {
        const date = new Date(dateKey + "T12:00:00");
        const dayState = dayStateMap.get(dateKey);
        const isPast = dateKey < today;
        const isSelected = dateKey === selectedDateKey;
        const hasLunch = dayState?.lunch?.isOpen ?? false;
        const hasDinner = dayState?.dinner?.isOpen ?? false;
        const hasAvailability = hasLunch || hasDinner;
        const isDisabled = isPast || !hasAvailability;

        const dayOfWeek = date.getDay();
        const dayNumber = date.getDate();

        return (
          <button
            key={dateKey}
            type="button"
            onClick={() => !isDisabled && onDateSelect(dateKey)}
            disabled={isDisabled}
            style={{
              flex: '1 1 0%',
              minWidth: 0,
              maxWidth: '72px',
              paddingTop: '1vh',
              paddingBottom: '1vh',
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              backgroundColor: isSelected ? '#0f172a' : 'white',
              color: isSelected ? 'white' : isDisabled ? '#cbd5e1' : '#334155',
              border: isSelected ? 'none' : '1px solid #f1f5f9',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transform: isSelected ? 'scale(1.05)' : 'none',
              boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
            }}
          >
            <span style={{ fontSize: '1.2vh', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              {daysShort[dayOfWeek]}
            </span>
            <span style={{ fontSize: '2.8vh', fontWeight: 700 }}>{dayNumber}</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {renderIndicator(hasLunch, "lunch")}
              {renderIndicator(hasDinner, "dinner")}
            </div>
          </button>
        );
      })}
    </div>
  );
}
