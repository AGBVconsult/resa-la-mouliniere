"use client";

import { Hourglass, Euro, Mail, Users, Calendar, Clock, User, Phone, Mail as MailIcon, MessageSquare, Baby, Accessibility, Dog } from "lucide-react";
import { StepHeader } from "../ui/StepHeader";
import { useTranslation } from "@/components/booking/i18n/translations";
import { formatDateDisplay } from "@/lib/utils";
import type { Language, BookingState } from "@/components/booking/types";

interface Step5PracticalInfoProps {
  lang: Language;
  data: BookingState;
  partySize: number;
}

export function Step5PracticalInfo({
  lang,
  data,
  partySize,
}: Step5PracticalInfoProps) {
  const { t } = useTranslation(lang);

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

  const selectedOptions = (): { icon: typeof Baby; label: string }[] => {
    const opts: { icon: typeof Baby; label: string }[] = [];
    if (data.requiresHighChair) opts.push({ icon: Baby, label: t.high_chair });
    if (data.requiresWheelchair) opts.push({ icon: Accessibility, label: t.wheelchair });
    if (data.requiresDogAccess) opts.push({ icon: Dog, label: t.dog });
    return opts;
  };

  const serviceLabel = data.service === "lunch" ? t.lunch : t.dinner;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu avec scroll */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        <StepHeader title={t.practical_info_title_line1} subtitle={t.practical_info_title_line2} />

        {/* Card Récapitulatif */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3">{t.summary}</h3>
          <div className="space-y-2 text-sm">
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
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3">{t.client_info}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <User size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.lastName} {data.firstName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{formatPhoneInternational(data.phone)}</span>
            </div>
            <div className="flex items-center gap-3">
              <MailIcon size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">{data.email}</span>
            </div>
          </div>
        </div>

        {/* Card Message (si renseigné) */}
        {data.message && data.message.trim() && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">{t.message}</h3>
            <div className="flex items-start gap-3">
              <MessageSquare size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700 text-sm">{data.message}</p>
            </div>
          </div>
        )}

        {/* Card Informations pratiques */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3">{t.practical_info_title_line1}</h3>
          <div className="space-y-3">
            {/* Bloc 1 - Hourglass */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Hourglass size={14} className="text-red-500" />
              </div>
              <p className="text-slate-700 text-sm leading-relaxed pt-1">
                {t.practical_info_delay_text_1}{" "}
                <strong>{t.practical_info_15min}</strong>{" "}
                {t.practical_info_delay_text_2}
              </p>
            </div>

            {/* Bloc 2 - Euro/Paiement */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Euro size={14} className="text-orange-500" />
              </div>
              <div className="pt-1">
                <p className="text-slate-700 text-sm leading-relaxed">
                  {t.practical_info_payment_text_1}{" "}
                  <strong>Payconiq</strong>.{" "}
                  <span className="inline-flex items-center bg-orange-500 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                    {t.practical_info_no_card}
                  </span>
                </p>
                <p className="text-slate-500 text-sm mt-0.5">
                  {t.practical_info_cash}
                </p>
              </div>
            </div>

            {/* Bloc 3 - Email */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Mail size={14} className="text-blue-500" />
              </div>
              <div className="pt-1">
                <p className="text-slate-700 text-sm leading-relaxed">
                  {t.practical_info_email_text_1}{" "}
                  <strong>{t.practical_info_email_confirm}</strong>.
                </p>
                <p className="text-slate-500 text-sm mt-0.5">
                  {t.practical_info_email_text_2}
                </p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="text-center pt-4 mt-3 border-t border-slate-100">
            <p className="text-slate-700 text-sm">
              {t.practical_info_welcome}
            </p>
            <p className="text-teal-600 font-semibold tracking-wider uppercase text-xs mt-1">
              ALLISSON & BENJAMIN
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
