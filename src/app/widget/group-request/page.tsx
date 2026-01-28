"use client";

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAction, useQuery } from 'convex/react';
import dynamic from 'next/dynamic';
import { api } from '../../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2 } from 'lucide-react';

const Turnstile = dynamic(
  () => import('@marsidev/react-turnstile').then((mod) => mod.Turnstile),
  { ssr: false }
);

type Language = 'fr' | 'nl' | 'en' | 'de' | 'it';

function GroupRequestContent() {
  const searchParams = useSearchParams();
  const lang = (searchParams.get('lang') || 'fr') as Language;
  const initialAdults = parseInt(searchParams.get('adults') || '16');
  const initialChildren = parseInt(searchParams.get('children') || '0');
  const initialBabies = parseInt(searchParams.get('babies') || '0');

  const { t } = useTranslation(lang);
  const settings = useQuery(api.widget.getSettings, { lang });

  const [partySize, setPartySize] = useState(
    Math.max(16, initialAdults + initialChildren + initialBabies)
  );
  const [preferredDateKey, setPreferredDateKey] = useState('');
  const [preferredService, setPreferredService] = useState<'lunch' | 'dinner'>('dinner');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [idemKey] = useState(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGroupRequest = useAction(api.groupRequests.create);

  // Validation dateKey
  const isValidDateKey = /^\d{4}-\d{2}-\d{2}$/.test(preferredDateKey);

  const canSubmit =
    partySize >= 16 &&
    isValidDateKey &&
    firstName.length >= 2 &&
    lastName.length >= 2 &&
    email.includes('@') &&
    phone.length >= 8 &&
    turnstileToken &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !turnstileToken) return;

    if (!isValidDateKey) {
      setError('error.invalidDateFormat');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createGroupRequest({
        payload: {
          partySize,
          preferredDateKey,
          preferredService,
          firstName,
          lastName,
          email,
          phone,
          message: message || "",
          language: lang,
        },
        turnstileToken,
        idemKey,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const errorData = (err as { data?: { messageKey?: string } })?.data;
      if (errorData?.messageKey) {
        setError(errorData.messageKey);
      } else {
        setError('error.unknown');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chargement des settings
  if (settings === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Succès
  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h1 className="text-xl font-semibold">{t('widget.groupRequest.success.title')}</h1>
        <p className="text-gray-600">{t('widget.groupRequest.success.subtitle')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">{t('widget.groupRequest.title')}</h1>
        <p className="text-sm text-gray-500">{t('widget.groupRequest.subtitle')}</p>
      </div>

      <div className="space-y-4">
        {/* Nombre de personnes */}
        <div>
          <Label>{t('widget.groupRequest.partySize')} *</Label>
          <Input
            type="number"
            min={16}
            max={200}
            value={partySize}
            onChange={(e) => setPartySize(Math.max(16, parseInt(e.target.value) || 16))}
          />
          <p className="text-xs text-gray-500 mt-1">{t('widget.groupRequest.partySizeHint')}</p>
        </div>

        {/* Date souhaitée */}
        <div>
          <Label>{t('widget.groupRequest.preferredDate')} *</Label>
          <Input
            type="date"
            value={preferredDateKey}
            onChange={(e) => setPreferredDateKey(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Service */}
        <div>
          <Label>{t('widget.groupRequest.preferredService')} *</Label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={preferredService === 'lunch'}
                onChange={() => setPreferredService('lunch')}
              />
              {t('widget.calendar.lunch')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={preferredService === 'dinner'}
                onChange={() => setPreferredService('dinner')}
              />
              {t('widget.calendar.dinner')}
            </label>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('widget.contact.firstName')} *</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>{t('widget.contact.lastName')} *</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>{t('widget.contact.email')} *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <Label>{t('widget.contact.phone')} *</Label>
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+32 470 12 34 56" />
        </div>

        {/* Message */}
        <div>
          <Label>{t('widget.groupRequest.message')}</Label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('widget.groupRequest.messagePlaceholder')}
            rows={4}
            className="w-full border rounded-md p-2 text-sm"
          />
        </div>

        {/* Turnstile */}
        {settings?.turnstileSiteKey && (
          <div className="flex justify-center">
            <Turnstile
              siteKey={settings.turnstileSiteKey}
              options={{ size: "normal" }}
              onSuccess={setTurnstileToken}
              onError={() => setError('error.turnstileFailed')}
            />
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            {t(error)}
          </div>
        )}

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('widget.button.submitting')}
            </>
          ) : (
            t('widget.groupRequest.submit')
          )}
        </Button>
      </div>
    </div>
  );
}

export default function GroupRequestPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded" />}>
      <GroupRequestContent />
    </Suspense>
  );
}
