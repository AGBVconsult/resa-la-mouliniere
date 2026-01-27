"use client";

import { Hourglass, Euro, Mail } from "lucide-react";
import { StepHeader } from "../ui/StepHeader";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language } from "@/components/booking/types";

interface Step5PracticalInfoProps {
  lang: Language;
}

export function Step5PracticalInfo({
  lang,
}: Step5PracticalInfoProps) {
  const { t } = useTranslation(lang);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu sans scroll */}
      <div className="flex-1 p-[2vh] flex flex-col">
        <StepHeader title={t.practical_info_title_line1} subtitle={t.practical_info_title_line2} className="mb-[1.5vh]" />

        {/* Card avec les informations */}
        <div className="bg-white rounded-2xl p-[2vh] shadow-sm flex-1 flex flex-col justify-between">
          {/* Blocs d'information */}
          <div className="space-y-[1.5vh]">
            {/* Bloc 1 - Hourglass */}
            <div className="flex items-start gap-3">
              <div className="w-[4vh] h-[4vh] min-w-[28px] min-h-[28px] rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Hourglass size={14} className="text-red-500" />
              </div>
              <p className="text-slate-700 text-[1.6vh] leading-relaxed pt-1">
                {t.practical_info_delay_text_1}{" "}
                <strong>{t.practical_info_15min}</strong>{" "}
                {t.practical_info_delay_text_2}
              </p>
            </div>

            {/* Bloc 2 - Euro/Paiement */}
            <div className="flex items-start gap-3">
              <div className="w-[4vh] h-[4vh] min-w-[28px] min-h-[28px] rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Euro size={14} className="text-orange-500" />
              </div>
              <div className="pt-1">
                <p className="text-slate-700 text-[1.6vh] leading-relaxed">
                  {t.practical_info_payment_text_1}{" "}
                  <strong>Payconiq</strong>.{" "}
                  <span className="inline-flex items-center bg-orange-500 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                    {t.practical_info_no_card}
                  </span>
                </p>
                <p className="text-slate-500 text-[1.3vh] mt-0.5">
                  {t.practical_info_cash}
                </p>
              </div>
            </div>

            {/* Bloc 3 - Email */}
            <div className="flex items-start gap-3">
              <div className="w-[4vh] h-[4vh] min-w-[28px] min-h-[28px] rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Mail size={14} className="text-blue-500" />
              </div>
              <div className="pt-1">
                <p className="text-slate-700 text-[1.6vh] leading-relaxed">
                  {t.practical_info_email_text_1}{" "}
                  <strong>{t.practical_info_email_confirm}</strong>.
                </p>
                <p className="text-slate-500 text-[1.3vh] mt-0.5">
                  {t.practical_info_email_text_2}
                </p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="text-center pt-[1.5vh] mt-[1.5vh] border-t border-slate-100">
            <p className="text-slate-700 text-[1.6vh]">
              {t.practical_info_welcome}
            </p>
            <p className="text-teal-600 font-semibold tracking-wider uppercase text-[1.3vh] mt-1">
              ALLISSON & BENJAMIN
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
    </div>
  );
}
