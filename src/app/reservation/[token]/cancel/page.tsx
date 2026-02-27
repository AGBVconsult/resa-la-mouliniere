"use client";

import { use, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language } from "@/components/booking/types";
import { formatDateShort, generateUUID } from "@/lib/utils";
import { BookingHeader } from "@/app/widget/components/BookingHeader";
import { BookingFooter } from "@/app/widget/components/BookingFooter";
import { StepHeader } from "@/app/widget/components/ui/StepHeader";

import {
  AlertCircle,
  Loader2,
  ArrowLeft,
  XCircle,
  Calendar,
  Clock,
  Users,
} from "lucide-react";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function CancelReservationPage({ params }: PageProps) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = (searchParams.get("lang") || "fr") as Language;
  const { t } = useTranslation(lang);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idemKey] = useState(() => generateUUID());
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Skip query after successful cancellation to avoid race condition:
  // cancelByToken marks the token as used, which causes getByToken to throw
  // TOKEN_INVALID before the router.push redirect completes.
  const reservation = useQuery(
    api.reservations.getByToken,
    cancelSuccess ? "skip" : { token }
  );
  const cancelByToken = useAction(api.reservations.cancelByToken);

  const handleCancel = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await cancelByToken({
        token,
        idemKey,
      });
      setCancelSuccess(true);
      router.push(`/reservation/cancelled?lang=${lang}`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/reservation/${token}?lang=${lang}`);
  };

  // Compute partySize for header
  const partySize = reservation?.reservation
    ? reservation.reservation.adults +
      reservation.reservation.childrenCount +
      reservation.reservation.babyCount
    : 0;

  // Redirecting after successful cancellation
  if (cancelSuccess) {
    return (
      <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
        <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (reservation === undefined) {
    return (
      <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
        <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  // Not found or expired
  if (reservation === null) {
    return (
      <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
        <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Réservation introuvable
            </h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Ce lien a expiré ou n&apos;est plus valide.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const res = reservation.reservation;
  const canCancel = res.status !== "cancelled";
  const dateKey = res.dateKey;
  const timeKey = res.timeKey;

  // Cannot cancel
  if (!canCancel) {
    return (
      <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
        <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6">
            <XCircle className="h-12 w-12 text-slate-400 mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Annulation impossible
            </h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Cette réservation ne peut plus être annulée.
            </p>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              <ArrowLeft size={18} />
              {t.back}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
      <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
        <BookingHeader
          currentStep={1}
          lang={lang}
          onLangChange={(newLang) => {
            router.push(`/reservation/${token}/cancel?lang=${newLang}`);
          }}
          guestCount={partySize}
          guestLabel={partySize > 1 ? t.convives : t.convive}
          dateLabel={dateKey ? formatDateShort(dateKey, lang) : undefined}
          timeLabel={timeKey || undefined}
        />
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex flex-col h-full bg-slate-50">
            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <StepHeader
                title={t.cancel_title}
                subtitle={t.cancel_subtitle}
                className="mb-6"
              />

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle size={18} />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              {/* Reservation summary */}
              <div className="bg-white rounded-2xl p-4 mb-6 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4">
                  {t.summary}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">{t.date}</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDateShort(dateKey, lang)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">{t.time}</p>
                      <p className="text-sm font-medium text-slate-900">
                        {timeKey}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">{t.guests}</p>
                      <p className="text-sm font-medium text-slate-900">
                        {partySize} {partySize > 1 ? t.convives : t.convive}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    {t.cancel_warning}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer - Boutons */}
            <div className="px-6 py-4 bg-white border-t">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-3 text-slate-600 hover:text-slate-900 transition-all"
                >
                  <ArrowLeft size={18} />
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-white text-sm transition-all ${
                    !isSubmitting
                      ? "bg-red-600 hover:bg-red-700 active:scale-[0.98]"
                      : "bg-red-300 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />}
                  {t.cancel_confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
        <BookingFooter />
      </div>
    </div>
  );
}
