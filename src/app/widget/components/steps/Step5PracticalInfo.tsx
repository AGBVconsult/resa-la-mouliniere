"use client";

import { useState, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Clock, Smartphone, Mail } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language, BookingState, ReservationResult } from "@/components/booking/types";

interface Step5PracticalInfoProps {
  lang: Language;
  data: BookingState;
  partySize: number;
  settings: { turnstileSiteKey: string };
  onSuccess: (result: ReservationResult) => void;
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

export function Step5PracticalInfo({
  lang,
  data,
  partySize,
  settings,
  onSuccess,
  onBack,
  setLoading,
}: Step5PracticalInfoProps) {
  const { t } = useTranslation(lang);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const idemKeyRef = useRef<string>(crypto.randomUUID());

  const createReservation = useAction(api.reservations.create);

  const canSubmit = turnstileToken && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !data.dateKey || !data.service || !data.timeKey) return;

    setSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      const options: string[] = [];
      if (data.requiresHighChair) options.push("highChair");
      if (data.requiresDogAccess) options.push("dogAccess");
      if (data.requiresWheelchair) options.push("wheelchair");

      const payload = {
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
        note: data.message || undefined,
        options: options.length > 0 ? options : undefined,
      };

      const result = await createReservation({
        payload,
        turnstileToken: turnstileToken!,
        idemKey: idemKeyRef.current,
      });

      if (result.kind === "reservation") {
        onSuccess({
          kind: "reservation",
          reservationId: result.reservationId,
          status: result.status,
          manageUrlPath: result.manageUrlPath,
        });
      } else {
        onSuccess({
          kind: "groupRequest",
          groupRequestId: result.groupRequestId,
        });
      }
    } catch (err: unknown) {
      console.error("Reservation error:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      idemKeyRef.current = crypto.randomUUID();
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA]">
      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Titre */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-[#1A1A1A] leading-tight">
            {t.practical_info_title_line1}
          </h1>
          <h2 className="text-2xl font-semibold text-[#1A1A1A] leading-tight">
            {t.practical_info_title_line2}
          </h2>
          {/* Séparateur accent */}
          <div className="flex justify-center mt-4">
            <div className="w-12 h-1 bg-amber-400 rounded-full" />
          </div>
        </div>

        {/* Blocs d'information */}
        <div className="space-y-6 mt-8">
          {/* Bloc 1 - Horloge */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Clock size={22} className="text-slate-500" />
            </div>
            <p className="text-[#1A1A1A] text-base leading-relaxed pt-2">
              {t.practical_info_delay_text_1}{" "}
              <strong>{t.practical_info_15min}</strong>{" "}
              {t.practical_info_delay_text_2}
            </p>
          </div>

          {/* Bloc 2 - Smartphone/Paiement */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Smartphone size={22} className="text-slate-500" />
            </div>
            <div className="pt-2">
              <p className="text-[#1A1A1A] text-base leading-relaxed">
                {t.practical_info_payment_text_1}{" "}
                <strong>Payconiq</strong>.{" "}
                <span className="inline-flex items-center bg-[#F97316] text-white text-sm font-medium px-2 py-0.5 rounded ml-1">
                  {t.practical_info_no_card}
                </span>
              </p>
              <p className="text-slate-500 text-base mt-1">
                {t.practical_info_cash}
              </p>
            </div>
          </div>

          {/* Bloc 3 - Email */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Mail size={22} className="text-slate-500" />
            </div>
            <div className="pt-2">
              <p className="text-[#1A1A1A] text-base leading-relaxed">
                {t.practical_info_email_text_1}{" "}
                <strong>{t.practical_info_email_confirm}</strong>.
              </p>
              <p className="text-slate-500 text-base mt-1">
                {t.practical_info_email_text_2}
              </p>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="text-center mt-10 pt-6 border-t border-slate-200">
          <p className="text-[#1A1A1A] text-lg">
            {t.practical_info_welcome} <span className="text-red-500">❤️</span>
          </p>
          <p className="text-teal-600 font-semibold tracking-wider uppercase text-sm mt-2">
            ALLISSON & BENJAMIN
          </p>
        </div>

        {/* Turnstile */}
        <div className="flex justify-center mt-6">
          <Turnstile
            siteKey={settings.turnstileSiteKey}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 bg-white border-t flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-4 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          {t.back}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`flex-[2] py-4 rounded-xl font-bold text-white transition-all ${
            canSubmit
              ? "bg-slate-900 hover:bg-slate-800"
              : "bg-slate-300 cursor-not-allowed"
          }`}
        >
          {submitting ? t.sending : t.practical_info_noted}
        </button>
      </div>
    </div>
  );
}
