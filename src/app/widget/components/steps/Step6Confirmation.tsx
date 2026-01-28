"use client";

import { CheckCircle, Clock, Calendar, Share2, User, Phone, Mail, MessageSquare, Users, Baby, Accessibility, PawPrint, Icon } from "lucide-react";
import { stroller } from "@lucide/lab";
import { useTranslation } from "@/components/booking/i18n/translations";
import { formatDateDisplay } from "@/lib/utils";
import type { Language, BookingState, ReservationResult } from "@/components/booking/types";

interface Step6ConfirmationProps {
  lang: Language;
  data: BookingState;
  partySize: number;
  result: ReservationResult;
}

export function Step6Confirmation({ lang, data, partySize, result }: Step6ConfirmationProps) {
  const { t } = useTranslation(lang);

  const isConfirmed = result.kind === "reservation" && result.status === "confirmed";
  const isPending = result.kind === "reservation" && result.status === "pending";
  const isGroupRequest = result.kind === "groupRequest";

  const serviceLabel = data.service === "lunch" ? t.lunch : t.dinner;

  const formatPhoneInternational = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
    if (cleaned.startsWith("0")) return "+32" + cleaned.slice(1);
    return cleaned;
  };

  const guestDetails = (): string => {
    const parts: string[] = [];
    parts.push(`${partySize} ${partySize > 1 ? t.convives : t.convive}`);
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
      <div className="flex-1 overflow-hidden px-4 py-[2vh] flex flex-col items-center justify-center text-center">
        {/* Icon */}
        <div className="mb-[2vh]">
          {isConfirmed ? (
            <div className="w-[10vh] h-[10vh] rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
          ) : (
            <div className="w-[10vh] h-[10vh] rounded-full bg-amber-100 flex items-center justify-center">
              <Clock size={32} className="text-amber-600" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-[2.8vh] font-bold text-slate-900 mb-[0.5vh]">
          {isConfirmed ? t.confirmed_title : t.pending_title}
        </h2>
        <p className="text-[1.6vh] text-slate-500 mb-[2vh]">
          {isConfirmed ? t.confirmed_subtitle : t.pending_subtitle}
        </p>

        {/* Card Récapitulatif */}
        <div className="bg-white rounded-2xl p-[1.5vh] shadow-sm w-full max-w-[90%] mb-[1.5vh]">
          <h3 className="font-bold text-slate-900 mb-[0.8vh] text-[1.6vh]">{t.summary}</h3>
          <div className="space-y-[0.6vh] text-[1.5vh]">
            <div className="flex items-center gap-3">
              <Users size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{guestDetails()}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.dateKey && formatDateDisplay(data.dateKey, lang)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{serviceLabel} • {data.timeKey}</span>
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
        <div className="bg-white rounded-2xl p-[1.5vh] shadow-sm w-full max-w-[90%] mb-[1.5vh]">
          <h3 className="font-bold text-slate-900 mb-[0.8vh] text-[1.6vh]">{t.client_info}</h3>
          <div className="space-y-[0.6vh] text-[1.5vh]">
            <div className="flex items-center gap-3">
              <User size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.lastName} {data.firstName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{formatPhoneInternational(data.phone)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.email}</span>
            </div>
          </div>
        </div>

        {/* Card Message (si renseigné) */}
        {data.message && data.message.trim() && (
          <div className="bg-white rounded-2xl p-[1.5vh] shadow-sm w-full max-w-[90%] mb-[1.5vh]">
            <h3 className="font-bold text-slate-900 mb-[0.8vh] text-[1.6vh]">{t.message}</h3>
            <div className="flex items-start gap-3">
              <MessageSquare size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700 text-sm">{data.message}</p>
            </div>
          </div>
        )}

        {/* Email confirmation */}
        <p className="text-[1.4vh] text-slate-500 mb-[1.5vh]">
          {t.email_sent} <span className="font-medium text-slate-700">{data.email}</span>
        </p>

        {/* Actions */}
        <div className="flex gap-[2vw] w-full max-w-[90%]">
          <button
            type="button"
            onClick={handleAddToCalendar}
            className="flex-1 py-[1.2vh] min-h-[44px] rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            {t.add_calendar}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-[1.2vh] min-h-[44px] rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
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
