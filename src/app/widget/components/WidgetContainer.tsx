"use client";

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

import { StepIndicator } from './StepIndicator';
import { LanguageSelector } from './LanguageSelector';
import { GuestsStep } from './steps/GuestsStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { ContactStep } from './steps/ContactStep';
import { PolicyStep } from './steps/PolicyStep';
import { ConfirmationStep } from './steps/ConfirmationStep';

type Step = 1 | 2 | 3 | 4 | 5;
type Language = 'fr' | 'nl' | 'en' | 'de' | 'it';

interface WidgetData {
  // Step 1
  adults: number;
  childrenCount: number;
  babyCount: number;
  requiresHighChair: boolean;
  requiresWheelchair: boolean;
  requiresDogAccess: boolean;
  // Step 2
  dateKey: string;
  service: 'lunch' | 'dinner';
  timeKey: string;
  // Step 3
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

interface WidgetContainerProps {
  lang: Language;
  turnstileSiteKey: string;
}

export function WidgetContainer({ lang: initialLang, turnstileSiteKey }: WidgetContainerProps) {
  const [lang, setLang] = useState<Language>(initialLang);
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<Partial<WidgetData>>({
    adults: 2,
    childrenCount: 0,
    babyCount: 0,
    requiresHighChair: false,
    requiresWheelchair: false,
    requiresDogAccess: false,
  });
  const [result, setResult] = useState<ReservationResult | null>(null);

  const { t } = useTranslation(lang);

  const partySize = (data.adults || 0) + (data.childrenCount || 0) + (data.babyCount || 0);

  const updateData = (updates: Partial<WidgetData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (newStep: Step) => setStep(newStep);
  const nextStep = () => setStep(prev => Math.min(prev + 1, 5) as Step);
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1) as Step);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">{t('widget.title')}</h1>
        <LanguageSelector value={lang} onChange={setLang} />
      </div>

      {/* Progress */}
      {step < 5 && <StepIndicator currentStep={step} />}

      {/* Steps */}
      {step === 1 && (
        <GuestsStep
          lang={lang}
          data={data}
          onUpdate={updateData}
          onNext={nextStep}
        />
      )}

      {step === 2 && (
        <DateTimeStep
          lang={lang}
          partySize={partySize}
          onSelect={(dateKey, service, timeKey) => {
            updateData({ dateKey, service, timeKey });
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {step === 3 && (
        <ContactStep
          lang={lang}
          data={data}
          onUpdate={updateData}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {step === 4 && (
        <PolicyStep
          lang={lang}
          data={data as WidgetData}
          turnstileSiteKey={turnstileSiteKey}
          onSuccess={(res) => {
            setResult(res);
            goToStep(5);
          }}
          onBack={prevStep}
        />
      )}

      {step === 5 && result && (
        <ConfirmationStep
          lang={lang}
          data={data as WidgetData}
          result={result}
        />
      )}
    </div>
  );
}
