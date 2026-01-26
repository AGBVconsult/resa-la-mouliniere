"use client";

import { User, Mail, Phone } from "lucide-react";
import { StepHeader } from "../ui/StepHeader";
import { useTranslation } from "@/components/booking/i18n/translations";
import { formatDateDisplayFull } from "@/lib/utils";
import type { Language, BookingState } from "@/components/booking/types";

interface Step4PolicyProps {
  lang: Language;
  data: BookingState;
  partySize: number;
  onNext: () => void;
  onBack: () => void;
}

export function Step4Policy({
  lang,
  data,
  partySize,
  onNext,
  onBack,
}: Step4PolicyProps) {
  const { t } = useTranslation(lang);

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
      </div>

      {/* Footer */}
      <div className="p-6 bg-white border-t flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-4 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
        >
          {t.back}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-[2] py-4 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all"
        >
          {t.continue}
        </button>
      </div>
    </div>
  );
}
