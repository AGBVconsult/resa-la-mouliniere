"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { api } from "../../../../convex/_generated/api";

import { BookingHeader } from "./BookingHeader";
import { BookingFooter } from "./BookingFooter";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { StepTransition } from "./ui/StepTransition";
import { NavigationFooter } from "./ui/NavigationFooter";

import { Step1Guests } from "./steps/Step1Guests";
import { Step2DateTime } from "./steps/Step2DateTime";
import { Step3Contact } from "./steps/Step3Contact";
import { Step4Policy } from "./steps/Step4Policy";
import { Step5PracticalInfo } from "./steps/Step5PracticalInfo";
import { Step6Confirmation } from "./steps/Step6Confirmation";

import { THRESHOLDS, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/components/booking/constants";
import type { Language, BookingState, ReservationResult } from "@/components/booking/types";
import { initialBookingState } from "@/components/booking/types";
import { formatDateShort } from "@/lib/utils";
import { useTranslation } from "@/components/booking/i18n/translations";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

function detectBrowserLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  
  const browserLang = navigator.language?.split("-")[0]?.toLowerCase();
  if (browserLang && SUPPORTED_LANGUAGES.includes(browserLang as Language)) {
    return browserLang as Language;
  }
  return DEFAULT_LANGUAGE;
}

export default function Widget() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [lang, setLang] = useState<Language>(() => {
    const urlLang = searchParams.get("lang") as Language;
    if (urlLang && SUPPORTED_LANGUAGES.includes(urlLang)) {
      return urlLang;
    }
    return detectBrowserLanguage();
  });
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReservationResult | null>(null);

  const [data, setData] = useState<BookingState>(initialBookingState);

  const [requestPrimaryToken, setRequestPrimaryToken] = useState(0);
  const [canContinueStep3, setCanContinueStep3] = useState(false);
  const [step5FooterState, setStep5FooterState] = useState<{
    primaryDisabled: boolean;
    backDisabled: boolean;
    primaryLabel: string;
  } | null>(null);

  const settings = useQuery(api.widget.getSettings, { lang });
  const { t } = useTranslation(lang);

  // Widget désactivé
  if (settings && !settings.publicWidgetEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center p-8">
          <p className="text-slate-600">Les réservations en ligne sont temporairement désactivées.</p>
        </div>
      </div>
    );
  }

  const partySize = data.adults + data.childrenCount + data.babyCount;

  const step1CanContinue = useMemo(() => {
    return data.adults >= 1 && partySize <= 15;
  }, [data.adults, partySize]);

  const step2CanContinue = useMemo(() => {
    return !!(data.dateKey && data.service && data.timeKey);
  }, [data.dateKey, data.service, data.timeKey]);

  // Redirect grand groupe (>15)
  useEffect(() => {
    if (partySize > THRESHOLDS.PENDING_MAX) {
      router.push(
        `/widget/group-request?lang=${lang}&adults=${data.adults}&children=${data.childrenCount}&babies=${data.babyCount}`
      );
    }
  }, [partySize, lang, data.adults, data.childrenCount, data.babyCount, router]);

  const updateData = (updates: Partial<BookingState>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const goToStep = (newStep: Step, dir: "forward" | "backward" = "forward") => {
    setDirection(dir);
    setStep(newStep);
  };

  const nextStep = () => {
    setDirection("forward");
    setStep((prev) => Math.min(prev + 1, 6) as Step);
  };

  const prevStep = () => {
    setDirection("backward");
    setStep((prev) => Math.max(prev - 1, 1) as Step);
  };

  const footerConfig = useMemo(() => {
    if (step === 6) {
      return { showNavigation: false } as const;
    }

    if (step === 1) {
      return {
        showNavigation: true,
        backLabel: undefined,
        onBack: undefined,
        backDisabled: false,
        primaryLabel: `${t.continue} →`,
        onPrimary: nextStep,
        primaryDisabled: !step1CanContinue,
        leftContent: (
          <span className="text-slate-600">
            <span className="text-sm">Total: </span>
            <span className="text-lg font-bold">{partySize}</span>
            <span className="text-sm"> {partySize > 1 ? t.convives : t.convive}</span>
          </span>
        ),
      } as const;
    }

    if (step === 2) {
      return {
        showNavigation: true,
        backLabel: t.back,
        onBack: prevStep,
        backDisabled: false,
        primaryLabel: `${t.continue} →`,
        onPrimary: nextStep,
        primaryDisabled: !step2CanContinue,
        leftContent: undefined,
      } as const;
    }

    if (step === 3) {
      return {
        showNavigation: true,
        backLabel: t.back,
        onBack: prevStep,
        backDisabled: false,
        primaryLabel: t.continue,
        onPrimary: () => setRequestPrimaryToken((x) => x + 1),
        primaryDisabled: !canContinueStep3,
        leftContent: undefined,
      } as const;
    }

    if (step === 4) {
      return {
        showNavigation: true,
        backLabel: t.back,
        onBack: prevStep,
        backDisabled: false,
        primaryLabel: t.practical_info_noted,
        onPrimary: nextStep,
        primaryDisabled: false,
        leftContent: undefined,
      } as const;
    }

    if (step === 5) {
      return {
        showNavigation: true,
        backLabel: t.back,
        onBack: prevStep,
        backDisabled: step5FooterState?.backDisabled ?? false,
        primaryLabel: step5FooterState?.primaryLabel ?? t.confirm_booking,
        onPrimary: () => setRequestPrimaryToken((x) => x + 1),
        primaryDisabled: step5FooterState?.primaryDisabled ?? true,
        leftContent: undefined,
      } as const;
    }

    return { showNavigation: false } as const;
  }, [
    canContinueStep3,
    nextStep,
    partySize,
    prevStep,
    step,
    step1CanContinue,
    step2CanContinue,
    step5FooterState?.backDisabled,
    step5FooterState?.primaryDisabled,
    step5FooterState?.primaryLabel,
    t.back,
    t.confirm_booking,
    t.continue,
    t.convive,
    t.convives,
    t.practical_info_noted,
  ]);

  return (
    <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
      <div
        role="form"
        aria-label="Formulaire de réservation"
        className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <BookingHeader
          currentStep={step}
          lang={lang}
          onLangChange={setLang}
          guestCount={partySize}
          guestLabel={partySize > 1 ? t.convives : t.convive}
          dateLabel={data.dateKey ? formatDateShort(data.dateKey, lang) : undefined}
          timeLabel={data.timeKey || undefined}
          hideSummary={step === 4 || step === 5}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto relative flex flex-col min-h-0 bg-slate-50">
          <LoadingSpinner visible={loading} />

          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <StepTransition key="step-1" direction={direction}>
                <Step1Guests lang={lang} data={data} onUpdate={updateData} />
              </StepTransition>
            )}

            {step === 2 && (
              <StepTransition key="step-2" direction={direction}>
                <Step2DateTime
                  lang={lang}
                  partySize={partySize}
                  data={data}
                  onUpdate={updateData}
                />
              </StepTransition>
            )}

            {step === 3 && (
              <StepTransition key="step-3" direction={direction}>
                <Step3Contact
                  lang={lang}
                  data={data}
                  onUpdate={updateData}
                  onNext={nextStep}
                  requestPrimaryToken={requestPrimaryToken}
                  onCanContinueChange={setCanContinueStep3}
                />
              </StepTransition>
            )}

            {step === 4 && (
              <StepTransition key="step-4" direction={direction}>
                <Step5PracticalInfo
                  lang={lang}
                  data={data}
                  partySize={partySize}
                />
              </StepTransition>
            )}

            {step === 5 && settings && (
              <StepTransition key="step-5" direction={direction}>
                <Step4Policy
                  lang={lang}
                  data={data}
                  partySize={partySize}
                  settings={settings}
                  onSuccess={(res: ReservationResult) => {
                    setResult(res);
                    goToStep(6);
                  }}
                  setLoading={setLoading}
                  requestPrimaryToken={requestPrimaryToken}
                  onFooterStateChange={setStep5FooterState}
                />
              </StepTransition>
            )}

            {step === 6 && result && (
              <StepTransition key="step-6" direction={direction}>
                <Step6Confirmation lang={lang} data={data} partySize={partySize} result={result} />
              </StepTransition>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <BookingFooter
          navigation={
            footerConfig.showNavigation ? (
              <NavigationFooter
                backLabel={footerConfig.backLabel}
                onBack={footerConfig.onBack}
                backDisabled={footerConfig.backDisabled}
                primaryLabel={footerConfig.primaryLabel}
                onPrimary={footerConfig.onPrimary}
                primaryDisabled={footerConfig.primaryDisabled}
                leftContent={footerConfig.leftContent}
              />
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
