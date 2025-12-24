"use client";

import { useState } from 'react';
import { useAction } from 'convex/react';
import dynamic from 'next/dynamic';
import { api } from '../../../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

// Import dynamique pour éviter crash SSR
const Turnstile = dynamic(
  () => import('@marsidev/react-turnstile').then((mod) => mod.Turnstile),
  { ssr: false, loading: () => <div className="h-16 bg-gray-100 animate-pulse rounded" /> }
);

interface WidgetData {
  adults: number;
  childrenCount: number;
  babyCount: number;
  dateKey: string;
  service: 'lunch' | 'dinner';
  timeKey: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface ReservationResult {
  kind: 'reservation' | 'groupRequest';
  reservationId?: string;
  groupRequestId?: string;
  status?: string;
  manageUrlPath?: string;
}

interface PolicyStepProps {
  lang: 'fr' | 'nl' | 'en' | 'de' | 'it';
  data: WidgetData;
  turnstileSiteKey: string;
  onSuccess: (result: ReservationResult) => void;
  onBack: () => void;
}

export function PolicyStep({ lang, data, turnstileSiteKey, onSuccess, onBack }: PolicyStepProps) {
  const { t } = useTranslation(lang);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [acceptRules, setAcceptRules] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // idemKey généré UNE SEULE FOIS (stable)
  const [idemKey] = useState(() => crypto.randomUUID());

  const createReservation = useAction(api.reservations.create);

  const canSubmit = acceptPolicy && acceptRules && turnstileToken && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !turnstileToken) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createReservation({
        payload: {
          dateKey: data.dateKey,
          service: data.service,
          timeKey: data.timeKey,
          adults: data.adults,
          childrenCount: data.childrenCount,
          babyCount: data.babyCount,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          language: lang,
        },
        turnstileToken,
        idemKey,
      });

      onSuccess(result as ReservationResult);
    } catch (err: unknown) {
      // Erreur métier du backend
      const errorData = (err as { data?: { messageKey?: string; code?: string } })?.data;
      if (errorData?.messageKey) {
        setError(errorData.messageKey);
      } else if (errorData?.code) {
        setError(`error.${errorData.code.toLowerCase()}`);
      } else {
        setError('error.unknown');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const partySize = data.adults + data.childrenCount + data.babyCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-medium">{t('widget.step4.title')}</h2>
      </div>

      {/* Récapitulatif */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h3 className="font-medium text-sm text-gray-700">{t('widget.step4.summary')}</h3>
        <div className="text-sm space-y-1">
          <p><span className="text-gray-500">{t('widget.step4.date')}:</span> {formatDate(data.dateKey, lang)}</p>
          <p><span className="text-gray-500">{t('widget.step4.time')}:</span> {data.timeKey}</p>
          <p><span className="text-gray-500">{t('widget.step4.guests')}:</span> {partySize} {t('widget.guests.guests')}</p>
          <p><span className="text-gray-500">{t('widget.step4.contact')}:</span> {data.firstName} {data.lastName}</p>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={acceptPolicy}
            onCheckedChange={(checked) => setAcceptPolicy(checked === true)}
          />
          <span className="text-sm">{t('widget.policy.cancellation')} *</span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={acceptRules}
            onCheckedChange={(checked) => setAcceptRules(checked === true)}
          />
          <span className="text-sm">{t('widget.policy.rules')} *</span>
        </label>
      </div>

      {/* Turnstile */}
      <div className="flex justify-center">
        <Turnstile
          siteKey={turnstileSiteKey}
          onSuccess={setTurnstileToken}
          onError={() => setError('error.turnstileFailed')}
          onExpire={() => setTurnstileToken(null)}
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {t(error)}
        </div>
      )}

      {/* Boutons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          {t('widget.button.back')}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('widget.button.submitting')}
            </>
          ) : (
            t('widget.button.confirm')
          )}
        </Button>
      </div>
    </div>
  );
}

function formatDate(dateKey: string, lang: string): string {
  const date = new Date(dateKey + 'T12:00:00');
  return date.toLocaleDateString(lang === 'nl' ? 'nl-BE' : lang === 'en' ? 'en-GB' : 'fr-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
