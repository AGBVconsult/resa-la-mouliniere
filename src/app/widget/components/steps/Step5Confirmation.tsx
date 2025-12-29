"use client";

import { CheckCircle, Clock, Calendar, Share2 } from "lucide-react";
import { useTranslation } from "@/components/booking/i18n/translations";
import { formatDateDisplay } from "@/lib/utils";
import type { Language, BookingState, ReservationResult } from "@/components/booking/types";

interface Step5ConfirmationProps {
  lang: Language;
  data: BookingState;
  partySize: number;
  result: ReservationResult;
}

export function Step5Confirmation({ lang, data, partySize, result }: Step5ConfirmationProps) {
  const { t } = useTranslation(lang);

  const isConfirmed = result.kind === "reservation" && result.status === "confirmed";
  const isPending = result.kind === "reservation" && result.status === "pending";
  const isGroupRequest = result.kind === "groupRequest";

  const serviceLabel = data.service === "lunch" ? t.lunch : t.dinner;

  const handleAddToCalendar = () => {
    if (!data.dateKey || !data.timeKey) return;

    const [year, month, day] = data.dateKey.split("-").map(Number);
    const [hours, minutes] = data.timeKey.split(":").map(Number);

    const startDate = new Date(year, month - 1, day, hours, minutes);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Réservation La Moulinière
DESCRIPTION:${partySize} ${partySize > 1 ? t.persons : t.person} - ${serviceLabel}
LOCATION:Visserskaai 17, Oostende
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reservation-la-mouliniere.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!navigator.share) return;

    try {
      await navigator.share({
        title: "Réservation La Moulinière",
        text: `Réservation pour ${partySize} ${partySize > 1 ? t.persons : t.person} le ${data.dateKey && formatDateDisplay(data.dateKey, lang)} à ${data.timeKey}`,
      });
    } catch {
      // User cancelled or share failed
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
        {/* Icon */}
        <div className="mb-6">
          {isConfirmed ? (
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={40} className="text-green-600" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock size={40} className="text-amber-600" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isConfirmed ? t.confirmed_title : t.pending_title}
        </h2>
        <p className="text-slate-500 mb-8">
          {isConfirmed ? t.confirmed_subtitle : t.pending_subtitle}
        </p>

        {/* Récapitulatif */}
        <div className="bg-white rounded-2xl p-6 shadow-sm w-full max-w-sm mb-6">
          <div className="space-y-3 text-sm">
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
              <span className="font-medium">{partySize} {partySize > 1 ? t.persons : t.person}</span>
            </div>
          </div>
        </div>

        {/* Email confirmation */}
        <p className="text-sm text-slate-500 mb-6">
          {t.email_sent} <span className="font-medium text-slate-700">{data.email}</span>
        </p>

        {/* Actions */}
        <div className="flex gap-3 w-full max-w-sm">
          <button
            type="button"
            onClick={handleAddToCalendar}
            className="flex-1 py-3 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            {t.add_calendar}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-3 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
              {t.share}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
