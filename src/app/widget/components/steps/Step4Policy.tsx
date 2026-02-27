"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { User, Mail, Phone, Users, Calendar, MessageSquare, Baby, Accessibility, PawPrint, Icon } from "lucide-react";
import { stroller } from "@lucide/lab";
import { Turnstile } from "@marsidev/react-turnstile";
import { StepHeader } from "../ui/StepHeader";
import { useTranslation } from "@/components/booking/i18n/translations";
import { formatDateDisplayFull, generateUUID } from "@/lib/utils";
import { withRetry, parseError, isOnline, setupOnlineListener, type ApiError } from "@/lib/api-client";
import { trackBookingSubmitted, trackBookingError } from "@/lib/analytics";
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
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Offline detection
  useEffect(() => {
    setIsOffline(!isOnline());
    return setupOnlineListener(
      () => setIsOffline(false),
      () => setIsOffline(true)
    );
  }, []);
  const lastRequestTokenRef = useRef(requestPrimaryToken);

  const idemKeyRef = useRef<string>(generateUUID());

  const createReservation = useAction(api.reservations.create);

  const canSubmit = !!turnstileToken && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !data.dateKey || !data.service || !data.timeKey) return;

    setSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      const options: string[] = [];
      if (data.requiresStroller) options.push("stroller");
      if (data.requiresHighChair) options.push("highChair");
      if (data.requiresDogAccess) options.push("dogAccess");
      if (data.requiresWheelchair) options.push("wheelchair");

      // Track booking submission attempt
      trackBookingSubmitted({
        date: data.dateKey!,
        time: data.timeKey!,
        service: data.service!,
        adults: data.adults,
        children: data.childrenCount,
        babies: data.babyCount,
        options,
      });

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
        referralSource: data.referralSource || undefined,
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
      const apiError = parseError(err);
      
      // Track booking error
      trackBookingError(
        apiError.code || 'UNKNOWN',
        apiError.userMessage[lang] || 'Unknown error',
        apiError.retryable
      );
      
      setError(apiError);
      setRetryCount((c) => c + 1);
      // Only regenerate idemKey for non-retryable errors to avoid duplicates
      if (!apiError.retryable) {
        idemKeyRef.current = generateUUID();
      }
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
    <div 
      className="flex flex-col h-full bg-slate-50"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}
    >
      {/* Contenu scrollable */}
      <div style={{ flex: '1 1 0%', overflow: 'hidden', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2vh', paddingBottom: '2vh' }}>
        <StepHeader title={t.step4_title} subtitle={t.step4_subtitle} className="mb-[1.5vh]" />

        {/* Card Récapitulatif */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5vh', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', marginBottom: '1.5vh' }}>
          <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '1vh', fontSize: '1.6vh' }}>{t.summary}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8vh', fontSize: '1.5vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{guestDetails()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{data.dateKey && formatDateDisplayFull(data.dateKey, lang)} • {serviceLabel} • {data.timeKey}</span>
            </div>
            {selectedOptions().length > 0 && (
              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedOptions().map((opt, idx) => (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', paddingLeft: '0.5rem', paddingRight: '0.5rem', paddingTop: '0.25rem', paddingBottom: '0.25rem', borderRadius: '9999px' }}>
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
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5vh', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', marginBottom: '1.5vh' }}>
          <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '1vh', fontSize: '1.6vh' }}>{t.client_info}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8vh', fontSize: '1.5vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <User size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{data.lastName} {data.firstName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Phone size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span style={{ color: '#334155' }}>{formatPhoneInternational(data.phone)}</span>
              <Mail size={16} style={{ color: '#94a3b8', flexShrink: 0, marginLeft: '0.5rem' }} />
              <span style={{ color: '#334155' }}>{data.email}</span>
            </div>
          </div>
        </div>

        {/* Card Message (si renseigné) */}
        {data.message && data.message.trim() && (
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5vh', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', marginBottom: '1.5vh' }}>
            <h3 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '1vh', fontSize: '1.6vh' }}>Message</h3>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <MessageSquare size={16} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '0.125rem' }} />
              <p style={{ color: '#334155', fontSize: '0.875rem' }}>{data.message}</p>
            </div>
          </div>
        )}

        {/* Turnstile */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5vh' }}>
          <Turnstile
            siteKey={settings.turnstileSiteKey}
            options={{ size: "normal" }}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>

        {/* Offline warning */}
        {isOffline && (
          <div style={{ backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '0.5rem', padding: '1vh', marginBottom: '1.5vh' }}>
            <p style={{ fontSize: '0.875rem', color: '#a16207' }}>
              {lang === 'fr' ? 'Vous êtes hors ligne. Veuillez vous reconnecter.' :
               lang === 'nl' ? 'U bent offline. Maak opnieuw verbinding.' :
               lang === 'de' ? 'Sie sind offline. Bitte verbinden Sie sich erneut.' :
               lang === 'it' ? 'Sei offline. Per favore riconnettiti.' :
               'You are offline. Please reconnect.'}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && !isOffline && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1vh', marginBottom: '1.5vh' }}>
            <p style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error.userMessage[lang]}</p>
            {error.retryable && retryCount > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '0.5vh' }}>
                {lang === 'fr' ? `Tentative ${retryCount}/3` :
                 lang === 'nl' ? `Poging ${retryCount}/3` :
                 lang === 'de' ? `Versuch ${retryCount}/3` :
                 lang === 'it' ? `Tentativo ${retryCount}/3` :
                 `Attempt ${retryCount}/3`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
