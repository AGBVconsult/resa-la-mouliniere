"use client";

import { Clock, Smartphone, Mail } from "lucide-react";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language } from "@/components/booking/types";

interface Step5PracticalInfoProps {
  lang: Language;
  onNext: () => void;
  onBack: () => void;
}

export function Step5PracticalInfo({
  lang,
  onNext,
  onBack,
}: Step5PracticalInfoProps) {
  const { t } = useTranslation(lang);

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
          {t.practical_info_noted}
        </button>
      </div>
    </div>
  );
}
