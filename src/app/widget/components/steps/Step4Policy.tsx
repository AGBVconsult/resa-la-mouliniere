"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { User, Mail, Phone, Users, Calendar, MessageSquare, Baby, Accessibility, PawPrint, Icon } from "lucide-react";
import { stroller } from "@lucide/lab";
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

  const formatPhoneInternational = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
    if (cleaned.startsWith("0")) return "+32" + cleaned.slice(1);
    return cleaned;
  };

  const guestDetails = (): string => {
    const parts: string[] = [];
    parts.push(`${partySize} ${guestLabel}`);
    const details: string[] = [];
    if (data.childrenCount > 0) {
      details.push(`${data.childrenCount} ${t.children.toLowerCase()}`);
    }
    if (data.babyCount > 0) {
      details.push(`${data.babyCount} ${t.babies.toLowerCase()}`);
    }
    if (details.length > 0) {
      parts.push(`(${details.join(", ")})`);
    }
    return parts.join(" ");
  };

  type IconType = typeof Baby | ((props: { size?: number }) => React.ReactElement);
  
  const selectedOptions = (): { icon: IconType; label: string }[] => {
    const opts: { icon: IconType; label: string }[] = [];
    if (data.requiresStroller) opts.push({ icon: (props: { size?: number }) => <Icon iconNode={stroller} {...props} />, label: t.stroller });
    if (data.requiresHighChair) opts.push({ icon: Baby, label: t.high_chair });
    if (data.requiresWheelchair) opts.push({ icon: Accessibility, label: t.wheelchair });
    if (data.requiresDogAccess) opts.push({ icon: PawPrint, label: t.dog });
    return opts;
  };

  const serviceLabel = data.service === "lunch" ? t.lunch : t.dinner;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu scrollable */}
      <div className="flex-1 overflow-hidden p-[2vh]">
        <StepHeader title={t.step4_title} subtitle={t.step4_subtitle} className="mb-[1.5vh]" />

        {/* Card Récapitulatif */}
        <div className="bg-white rounded-2xl p-[1.5vh] shadow-sm mb-[1.5vh]">
          <h3 className="font-bold text-slate-900 mb-[1vh] text-[1.6vh]">{t.summary}</h3>
          <div className="space-y-[0.8vh] text-[1.5vh]">
            <div className="flex items-center gap-3">
              <Users size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{guestDetails()}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.dateKey && formatDateDisplayFull(data.dateKey, lang)} • {serviceLabel} • {data.timeKey}</span>
            </div>
            {selectedOptions().length > 0 && (
              <div className="pt-2 border-t border-slate-100 mt-2">
                <div className="flex flex-wrap gap-2">
                  {selectedOptions().map((opt, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                      <opt.icon size={12} />
                      {opt.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card Infos client */}
        <div className="bg-white rounded-2xl p-[1.5vh] shadow-sm mb-[1.5vh]">
          <h3 className="font-bold text-slate-900 mb-[1vh] text-[1.6vh]">{t.client_info}</h3>
          <div className="space-y-[0.8vh] text-[1.5vh]">
            <div className="flex items-center gap-3">
              <User size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.lastName} {data.firstName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{formatPhoneInternational(data.phone)}</span>
              <Mail size={16} className="text-slate-400 flex-shrink-0 ml-2" />
              <span className="text-slate-700">{data.email}</span>
            </div>
          </div>
        </div>

        {/* Card Message (si renseigné) */}
        {data.message && data.message.trim() && (
          <div className="bg-white rounded-2xl p-[1.5vh] shadow-sm mb-[1.5vh]">
            <h3 className="font-bold text-slate-900 mb-[1vh] text-[1.6vh]">Message</h3>
            <div className="flex items-start gap-3">
              <MessageSquare size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700 text-sm">{data.message}</p>
            </div>
          </div>
        )}

        {/* Turnstile */}
        <div className="flex justify-center mb-[1.5vh]">
          <Turnstile
            siteKey={settings.turnstileSiteKey}
            options={{ size: "compact" }}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-[1vh] mb-[1.5vh]">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
