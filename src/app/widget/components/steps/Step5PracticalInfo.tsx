"use client";

import { Clock, Smartphone, Mail, Heart } from "lucide-react";
import { StepHeader } from "../ui/StepHeader";
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
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu sans scroll */}
      <div className="flex-1 p-6 flex flex-col">
        <StepHeader title={t.practical_info_title_line1} subtitle={t.practical_info_title_line2} className="mb-4" />

        {/* Card avec les informations */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex-1 flex flex-col justify-between">
          {/* Blocs d'information */}
          <div className="space-y-3">
            {/* Bloc 1 - Horloge */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Clock size={14} className="text-slate-500" />
              </div>
              <p className="text-slate-700 text-sm leading-relaxed pt-1">
                {t.practical_info_delay_text_1}{" "}
                <strong>{t.practical_info_15min}</strong>{" "}
                {t.practical_info_delay_text_2}
              </p>
            </div>

            {/* Bloc 2 - Smartphone/Paiement */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Smartphone size={14} className="text-slate-500" />
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
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Mail size={14} className="text-slate-500" />
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
            <p className="text-slate-700 text-sm flex items-center justify-center gap-1">
              {t.practical_info_welcome} <Heart size={14} className="text-red-500 fill-red-500" />
            </p>
            <p className="text-teal-600 font-semibold tracking-wider uppercase text-xs mt-1">
              ALLISSON & BENJAMIN
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white border-t flex gap-3">
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
