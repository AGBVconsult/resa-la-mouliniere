"use client";

import { useTranslation } from '@/lib/i18n/useTranslation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Calendar, Share2 } from 'lucide-react';

interface ConfirmationStepProps {
  lang: string;
  data: {
    dateKey: string;
    timeKey: string;
    adults: number;
    childrenCount: number;
    babyCount: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  result: {
    kind: 'reservation' | 'groupRequest';
    status?: string;
    manageUrlPath?: string;
  };
}

export function ConfirmationStep({ lang, data, result }: ConfirmationStepProps) {
  const { t } = useTranslation(lang as "fr" | "nl" | "en" | "de" | "it");

  const isConfirmed = result.status === 'confirmed';
  const isPending = result.status === 'pending';
  const isGroupRequest = result.kind === 'groupRequest';
  const partySize = data.adults + data.childrenCount + data.babyCount;

  // Génération lien calendrier (Google Calendar)
  const calendarUrl = generateGoogleCalendarUrl(data, lang);

  return (
    <div className="space-y-6 text-center">
      {/* Icône + Message */}
      {isConfirmed && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-green-700">
              {t('widget.step5.confirmed.title')}
            </h2>
            <p className="text-gray-600">{t('widget.step5.confirmed.subtitle')}</p>
          </div>
        </>
      )}

      {isPending && (
        <>
          <Clock className="w-16 h-16 text-amber-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-amber-700">
              {t('widget.step5.pending.title')}
            </h2>
            <p className="text-gray-600">{t('widget.step5.pending.subtitle')}</p>
          </div>
        </>
      )}

      {isGroupRequest && (
        <>
          <Clock className="w-16 h-16 text-blue-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-blue-700">
              {t('widget.step5.groupRequest.title')}
            </h2>
            <p className="text-gray-600">{t('widget.step5.groupRequest.subtitle')}</p>
          </div>
        </>
      )}

      {/* Détails réservation */}
      {!isGroupRequest && (
        <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
          <p className="font-medium text-center">
            {formatDateLong(data.dateKey, lang)}
          </p>
          <div className="text-sm space-y-1">
            <p>🕐 {t('widget.step5.time')}: {data.timeKey}</p>
            <p>👥 {t('widget.step5.guests')}: {partySize}</p>
            <p>📧 {data.email}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      {isConfirmed && (
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
              <Calendar className="w-4 h-4 mr-2" />
              {t('widget.step5.addToCalendar')}
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.share?.({
                title: t('widget.step5.shareTitle'),
                text: t('widget.step5.shareText'),
                url: window.location.origin + result.manageUrlPath,
              });
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {t('widget.step5.share')}
          </Button>
        </div>
      )}

      {/* Message email */}
      <p className="text-sm text-gray-500">
        📧 {t('widget.step5.emailSent')}
      </p>
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

function generateGoogleCalendarUrl(data: { dateKey: string; timeKey: string; adults: number; childrenCount: number; babyCount: number }, lang: string): string {
  const date = data.dateKey.replace(/-/g, '');
  const time = data.timeKey.replace(':', '') + '00';
  const endTime = (parseInt(data.timeKey.split(':')[0]) + 2).toString().padStart(2, '0') + data.timeKey.slice(3).replace(':', '') + '00';
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Réservation La Moulinière',
    dates: `${date}T${time}/${date}T${endTime}`,
    details: `Réservation pour ${data.adults + data.childrenCount + data.babyCount} personnes`,
    location: 'La Moulinière, Visserskaai 17, 8400 Oostende',
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}
