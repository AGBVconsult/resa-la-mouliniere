"use client";

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayCell } from './DayCell';

interface DayState {
  dateKey: string;
  lunch: { isOpen: boolean };
  dinner: { isOpen: boolean };
}

interface MonthCalendarProps {
  year: number;
  month: number;
  monthData: DayState[] | undefined;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateKey: string) => void;
  lang: string;
}

export function MonthCalendar({
  year,
  month,
  monthData,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  lang,
}: MonthCalendarProps) {
  const monthName = new Date(year, month - 1).toLocaleDateString(
    lang === 'nl' ? 'nl-BE' : 'fr-BE',
    { month: 'long', year: 'numeric' }
  );

  // Générer les jours du mois
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0
  const daysInMonth = lastDay.getDate();

  const today = new Date().toISOString().split('T')[0];

  // Créer grille
  const days: (string | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(dateKey);
  }

  // Lookup monthData
  const dayStateMap = new Map<string, DayState>();
  monthData?.forEach((ds) => dayStateMap.set(ds.dateKey, ds));

  const weekDays = lang === 'nl'
    ? ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
    : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="space-y-4">
      {/* Header navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onPrevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-medium capitalize">{monthName}</span>
        <Button variant="ghost" size="icon" onClick={onNextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {weekDays.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dateKey, idx) => {
          if (!dateKey) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const isPast = dateKey < today;
          const dayState = dayStateMap.get(dateKey);
          const hasLunch = dayState?.lunch?.isOpen ?? false;
          const hasDinner = dayState?.dinner?.isOpen ?? false;
          const hasAvailability = hasLunch || hasDinner;

          return (
            <DayCell
              key={dateKey}
              dateKey={dateKey}
              isPast={isPast}
              hasLunch={hasLunch}
              hasDinner={hasDinner}
              onClick={() => {
                if (!isPast && hasAvailability) {
                  onSelectDate(dateKey);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
