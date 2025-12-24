"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Button } from '@/components/ui/button';
import { GuestCounter } from '../GuestCounter';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface GuestsStepProps {
  lang: string;
  data: {
    adults?: number;
    childrenCount?: number;
    babyCount?: number;
    requiresHighChair?: boolean;
    requiresWheelchair?: boolean;
    requiresDogAccess?: boolean;
  };
  onUpdate: (updates: Record<string, unknown>) => void;
  onNext: () => void;
}

export function GuestsStep({ lang, data, onUpdate, onNext }: GuestsStepProps) {
  const router = useRouter();
  const { t } = useTranslation(lang as "fr" | "nl" | "en" | "de" | "it");

  const adults = data.adults ?? 2;
  const childrenCount = data.childrenCount ?? 0;
  const babyCount = data.babyCount ?? 0;
  const total = adults + childrenCount + babyCount;

  // Redirect IMMÉDIAT si > 15 (grand groupe)
  useEffect(() => {
    if (total > 15) {
      router.push(
        `/widget/group-request?lang=${lang}&adults=${adults}&children=${childrenCount}&babies=${babyCount}`
      );
    }
  }, [total, lang, adults, childrenCount, babyCount, router]);

  const handleContinue = () => {
    if (adults >= 1 && total <= 15) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-medium">{t('widget.step1.title')}</h2>
        <p className="text-sm text-gray-500">{t('widget.step1.subtitle')}</p>
      </div>

      {/* Compteurs */}
      <div className="space-y-4">
        <GuestCounter
          label={t('widget.guests.adults')}
          value={adults}
          onChange={(v) => onUpdate({ adults: v })}
          min={1}
          max={200}
        />
        <GuestCounter
          label={t('widget.guests.children')}
          sublabel={t('widget.guests.childrenAge')}
          value={childrenCount}
          onChange={(v) => onUpdate({ childrenCount: v })}
          min={0}
          max={200}
        />
        <GuestCounter
          label={t('widget.guests.babies')}
          sublabel={t('widget.guests.babiesAge')}
          value={babyCount}
          onChange={(v) => onUpdate({ babyCount: v })}
          min={0}
          max={200}
        />
      </div>

      {/* Options conditionnelles */}
      <div className="space-y-3">
        {babyCount > 0 && (
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <Checkbox
              checked={data.requiresHighChair ?? false}
              onCheckedChange={(checked) => onUpdate({ requiresHighChair: checked === true })}
            />
            <span className="text-sm">{t('widget.options.highChair')}</span>
          </label>
        )}

        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
          <Checkbox
            checked={data.requiresWheelchair ?? false}
            onCheckedChange={(checked) => onUpdate({ requiresWheelchair: checked === true })}
          />
          <span className="text-sm">{t('widget.options.wheelchair')}</span>
        </label>

        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
          <Checkbox
            checked={data.requiresDogAccess ?? false}
            onCheckedChange={(checked) => onUpdate({ requiresDogAccess: checked === true })}
          />
          <span className="text-sm">{t('widget.options.dog')}</span>
        </label>
      </div>

      {/* Total + Bouton */}
      <div className="flex items-center justify-between pt-4 border-t">
        <span className="text-gray-600">
          {t('widget.guests.total')}: {total} {t('widget.guests.guests')}
        </span>
        <Button onClick={handleContinue} disabled={adults < 1 || total > 15}>
          {t('widget.button.continue')}
        </Button>
      </div>
    </div>
  );
}
