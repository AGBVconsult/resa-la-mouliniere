"use client";

import { useState, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Check } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { StepHeader } from "../ui/StepHeader";
import { useTranslation } from "@/components/booking/i18n/translations";
import { formatDateDisplay } from "@/lib/utils";
import { THRESHOLDS } from "@/components/booking/constants";
import type { Language, BookingState, ReservationResult } from "@/components/booking/types";

interface Step4PolicyProps {
  lang: Language;
  data: BookingState;
  partySize: number;
  settings: { turnstileSiteKey: string };
  onSuccess: (result: ReservationResult) => void;
  onBack: () => void;
  setLoading: (loading: boolean) => void;
}

export function Step4Policy({
  lang,
  data,
  partySize,
  settings,
  onSuccess,
  onBack,
  setLoading,
}: Step4PolicyProps) {
  const { t } = useTranslation(lang);

  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [acceptRules, setAcceptRules] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const idemKeyRef = useRef<string>(crypto.randomUUID());

  const createReservation = useAction(api.reservations.create);

  const canSubmit = acceptPolicy && acceptRules && turnstileToken && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !data.dateKey || !data.service || !data.timeKey) return;

    setSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      // Build options array from boolean flags
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
      // Generate new idempotency key for retry
      idemKeyRef.current = crypto.randomUUID();
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const serviceLabel = data.service === "lunch" ? t.lunch : t.dinner;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <StepHeader title={t.step4_title} subtitle={t.step4_subtitle} className="mb-6" />

        {/* Récapitulatif */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-slate-900 mb-3">{t.summary}</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{t.date}</span>
              <span className="font-medium">{data.dateKey && formatDateDisplay(data.dateKey, lang)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.time}</span>
              <span className="font-medium">{serviceLabel} • {data.timeKey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.guests}</span>
              <span className="font-medium">
                {data.adults} {t.adults}
                {data.childrenCount > 0 && ` + ${data.childrenCount} ${t.children}`}
                {data.babyCount > 0 && ` + ${data.babyCount} ${t.babies}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.contact}</span>
              <span className="font-medium">{data.firstName} {data.lastName}</span>
            </div>
            {(data.requiresHighChair || data.requiresWheelchair || data.requiresDogAccess) && (
              <div className="flex justify-between">
                <span className="text-slate-500">{t.options}</span>
                <span className="font-medium text-right">
                  {[
                    data.requiresHighChair && t.high_chair,
                    data.requiresWheelchair && t.wheelchair,
                    data.requiresDogAccess && t.dog.replace("Je viens avec mon ", "").replace("Ik kom met mijn ", "").replace("I'm coming with my ", "").replace("Ich komme mit meinem ", "").replace("Vengo con il mio ", ""),
                  ].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {data.message && (
              <div className="flex justify-between">
                <span className="text-slate-500">{t.note}</span>
                <span className="font-medium text-right max-w-[180px] truncate" title={data.message}>
                  {data.message.length > 30 ? data.message.slice(0, 30) + "..." : data.message}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                acceptPolicy ? "bg-slate-900 border-slate-900" : "border-slate-300"
              }`}
              onClick={() => setAcceptPolicy(!acceptPolicy)}
            >
              {acceptPolicy && <Check size={14} className="text-white" />}
            </div>
            <span className="text-sm text-slate-700">{t.accept_policy}</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                acceptRules ? "bg-slate-900 border-slate-900" : "border-slate-300"
              }`}
              onClick={() => setAcceptRules(!acceptRules)}
            >
              {acceptRules && <Check size={14} className="text-white" />}
            </div>
            <span className="text-sm text-slate-700">{t.accept_rules}</span>
          </label>
        </div>

        {/* Turnstile */}
        <div className="flex justify-center mb-4">
          <Turnstile
            siteKey={settings.turnstileSiteKey}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
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
          {submitting ? t.sending : t.confirm_booking}
        </button>
      </div>
    </div>
  );
}
