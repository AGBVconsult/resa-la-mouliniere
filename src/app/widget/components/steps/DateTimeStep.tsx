"use client";

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Button } from '@/components/ui/button';
import { MonthCalendar } from '../calendar/MonthCalendar';
import { TimeSlots } from '../calendar/TimeSlots';
import { ChevronLeft, Loader2 } from 'lucide-react';

interface DateTimeStepProps {
  lang: string;
  partySize: number;
  onSelect: (dateKey: string, service: 'lunch' | 'dinner', timeKey: string) => void;
  onBack: () => void;
}

export function DateTimeStep({ lang, partySize, onSelect, onBack }: DateTimeStepProps) {
  const { t } = useTranslation(lang as "fr" | "nl" | "en" | "de" | "it");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendrier mensuel
  const monthData = useQuery(api.availability.getMonth, {
    year,
    month,
    partySize,
  });

  // Slots du jour sélectionné
  const dayData = useQuery(
    api.availability.getDay,
    selectedDate ? { dateKey: selectedDate, partySize } : 'skip'
  );

  // Navigation mois
  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  };

  // Filtrer slots avec capacité suffisante
  const filterSlots = (slots: Array<{ isOpen: boolean; remainingCapacity: number; slotKey: string; timeKey: string }>) =>
    slots.filter(s => s.isOpen && s.remainingCapacity >= partySize);

  const availableLunch = dayData ? filterSlots(dayData.lunch) : [];
  const availableDinner = dayData ? filterSlots(dayData.dinner) : [];
  const hasNoSlots = selectedDate && dayData !== undefined && availableLunch.length === 0 && availableDinner.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-medium">{t('widget.step2.title')}</h2>
        <p className="text-sm text-gray-500">{t('widget.step2.subtitle')}</p>
      </div>

      {/* Calendrier ou Slots */}
      {!selectedDate ? (
        <>
          {monthData === undefined ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <MonthCalendar
              year={year}
              month={month}
              monthData={monthData}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onSelectDate={setSelectedDate}
              lang={lang}
            />
          )}
        </>
      ) : (
        <div className="space-y-4">
          {/* Bouton retour au calendrier */}
          <button
            onClick={() => setSelectedDate(null)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('widget.calendar.backToCalendar')}
          </button>

          {/* Date sélectionnée */}
          <h3 className="text-center font-medium">
            {formatDateLong(selectedDate, lang)}
          </h3>

          {/* Loading slots */}
          {dayData === undefined && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {/* Message si aucun slot */}
          {hasNoSlots && (
            <div className="text-center py-8 text-gray-500">
              <p>{t('widget.calendar.noAvailability')}</p>
              <Button
                variant="outline"
                onClick={() => setSelectedDate(null)}
                className="mt-4"
              >
                {t('widget.calendar.chooseOtherDate')}
              </Button>
            </div>
          )}

          {/* Slots */}
          {dayData !== undefined && !hasNoSlots && (
            <>
              {/* Slots Déjeuner */}
              {availableLunch.length > 0 && (
                <TimeSlots
                  title={t('widget.calendar.lunch')}
                  slots={availableLunch}
                  onSelect={(timeKey) => onSelect(selectedDate, 'lunch', timeKey)}
                />
              )}

              {/* Slots Dîner */}
              {availableDinner.length > 0 && (
                <TimeSlots
                  title={t('widget.calendar.dinner')}
                  slots={availableDinner}
                  onSelect={(timeKey) => onSelect(selectedDate, 'dinner', timeKey)}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Légende */}
      {!selectedDate && monthData !== undefined && (
        <div className="flex justify-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            {t('widget.calendar.legend.lunch')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            {t('widget.calendar.legend.dinner')}
          </span>
        </div>
      )}

      {/* Bouton Retour */}
      <div className="pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>
          {t('widget.button.back')}
        </Button>
      </div>
    </div>
  );
}

function formatDateLong(dateKey: string, lang: string): string {
  const date = new Date(dateKey + 'T12:00:00');
  return date.toLocaleDateString(lang === 'nl' ? 'nl-BE' : lang === 'en' ? 'en-GB' : 'fr-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
