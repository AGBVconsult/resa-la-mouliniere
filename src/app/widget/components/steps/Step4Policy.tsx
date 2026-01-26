"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { User, Mail, Phone } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { StepHeader } from "../ui/StepHeader";
import { useTranslation } from "@/components/booking/i18n/translations";
import { formatDateDisplayFull } from "@/lib/utils";
import type { Language, BookingState, ReservationResult } from "@/components/booking/types";

interface Step4PolicyProps {
  lang: Language;
  data: BookingState;
  partySize: number;
  settings: { turnstileSiteKey: string };
  onSuccess: (result: ReservationResult) => void;
  setLoading: (loading: boolean) => void;
  requestPrimaryToken: number;
  onFooterStateChange: (state: {
    primaryDisabled: boolean;
    backDisabled: boolean;
    primaryLabel: string;
  }) => void;
}

export function Step4Policy({
  lang,
  data,
  partySize,
  settings,
  onSuccess,
  setLoading,
  requestPrimaryToken,
  onFooterStateChange,
}: Step4PolicyProps) {
  const { t } = useTranslation(lang);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastRequestTokenRef = useRef(requestPrimaryToken);

  const idemKeyRef = useRef<string>(crypto.randomUUID());

  const createReservation = useAction(api.reservations.create);

  const canSubmit = !!turnstileToken && !submitting;

  const handleSubmit = useCallback(async () => {
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
  }, [
    canSubmit,
    createReservation,
    data.adults,
    data.babyCount,
    data.childrenCount,
    data.dateKey,
    data.email,
    data.firstName,
    data.lastName,
    data.message,
    data.phone,
    data.requiresDogAccess,
    data.requiresHighChair,
    data.requiresWheelchair,
    data.service,
    data.timeKey,
    lang,
    onSuccess,
    setLoading,
    turnstileToken,
  ]);

  const primaryLabel = useMemo(() => {
    return submitting ? t.sending : t.confirm_booking;
  }, [submitting, t.confirm_booking, t.sending]);

  useEffect(() => {
    onFooterStateChange({
      primaryDisabled: !canSubmit,
      backDisabled: submitting,
      primaryLabel,
    });
  }, [canSubmit, onFooterStateChange, primaryLabel, submitting]);

  useEffect(() => {
    if (requestPrimaryToken === lastRequestTokenRef.current) return;
    lastRequestTokenRef.current = requestPrimaryToken;
    void handleSubmit();
  }, [handleSubmit, requestPrimaryToken]);

  const guestLabel = partySize > 1 ? t.convives : t.convive;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <StepHeader title={t.step4_title} subtitle={t.step4_subtitle} className="mb-6" />

        {/* Card Récapitulatif - Une seule ligne */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <p className="text-center font-medium text-slate-900">
            {partySize} {guestLabel} • {data.dateKey && formatDateDisplayFull(data.dateKey, lang)} • {data.timeKey}
          </p>
        </div>

        {/* Card Infos client */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-slate-900 mb-3">{t.client_info}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <User size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.firstName} {data.lastName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.email}</span>
            </div>
          </div>
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
    </div>
  );
}
