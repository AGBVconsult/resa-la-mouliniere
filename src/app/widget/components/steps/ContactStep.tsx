"use client";

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contactSchema } from '@/lib/validations';

interface ContactStepProps {
  lang: string;
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  onUpdate: (updates: Record<string, unknown>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ContactStep({ lang, data, onUpdate, onNext, onBack }: ContactStepProps) {
  const { t } = useTranslation(lang as "fr" | "nl" | "en" | "de" | "it");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleContinue = () => {
    // Validation Zod
    const result = contactSchema.safeParse({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-medium">{t('widget.step3.title')}</h2>
        <p className="text-sm text-gray-500">{t('widget.step3.subtitle')}</p>
      </div>

      {/* Formulaire */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">{t('widget.contact.firstName')} *</Label>
            <Input
              id="firstName"
              value={data.firstName || ''}
              onChange={(e) => onUpdate({ firstName: e.target.value })}
              className={errors.firstName ? 'border-red-500' : ''}
            />
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{t(errors.firstName)}</p>
            )}
          </div>
          <div>
            <Label htmlFor="lastName">{t('widget.contact.lastName')} *</Label>
            <Input
              id="lastName"
              value={data.lastName || ''}
              onChange={(e) => onUpdate({ lastName: e.target.value })}
              className={errors.lastName ? 'border-red-500' : ''}
            />
            {errors.lastName && (
              <p className="text-xs text-red-500 mt-1">{t(errors.lastName)}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="email">{t('widget.contact.email')} *</Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => onUpdate({ email: e.target.value })}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{t(errors.email)}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone">{t('widget.contact.phone')} *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+32 470 12 34 56"
            value={data.phone || ''}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="text-xs text-red-500 mt-1">{t(errors.phone)}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {t('widget.contact.phoneHint')}
          </p>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>
          {t('widget.button.back')}
        </Button>
        <Button onClick={handleContinue}>
          {t('widget.button.continue')}
        </Button>
      </div>
    </div>
  );
}
