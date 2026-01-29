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
    <div 
      className="flex flex-col h-full bg-slate-50"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}
    >
      {/* Contenu sans scroll */}
      <div style={{ flex: '1 1 0%', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2vh', paddingBottom: '2vh', display: 'flex', flexDirection: 'column' }}>
        <StepHeader title={t.practical_info_title_line1} subtitle={t.practical_info_title_line2} className="mb-[1.5vh]" />

        {/* Card avec les informations */}
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2vh', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', flex: '1 1 0%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Blocs d'information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5vh' }}>
            {/* Bloc 1 - Hourglass */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ width: '4vh', height: '4vh', minWidth: '28px', minHeight: '28px', borderRadius: '9999px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Hourglass size={14} style={{ color: '#ef4444' }} />
              </div>
              <p style={{ color: '#334155', fontSize: '1.6vh', lineHeight: 1.625, paddingTop: '0.25rem' }}>
                {t.practical_info_delay_text_1}{" "}
                <strong>{t.practical_info_15min}</strong>{" "}
                {t.practical_info_delay_text_2}
              </p>
            </div>

            {/* Bloc 2 - Euro/Paiement */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ width: '4vh', height: '4vh', minWidth: '28px', minHeight: '28px', borderRadius: '9999px', backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Euro size={14} style={{ color: '#f97316' }} />
              </div>
              <div style={{ paddingTop: '0.25rem' }}>
                <p style={{ color: '#334155', fontSize: '1.6vh', lineHeight: 1.625 }}>
                  {t.practical_info_payment_text_1}{" "}
                  <strong>Payconiq</strong>.{" "}
                  <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#f97316', color: 'white', fontSize: '0.75rem', fontWeight: 500, paddingLeft: '0.375rem', paddingRight: '0.375rem', paddingTop: '0.125rem', paddingBottom: '0.125rem', borderRadius: '0.25rem' }}>
                    {t.practical_info_no_card}
                  </span>
                </p>
                <p style={{ color: '#64748b', fontSize: '1.3vh', marginTop: '0.125rem' }}>
                  {t.practical_info_cash}
                </p>
              </div>
            </div>

            {/* Bloc 3 - Email */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ width: '4vh', height: '4vh', minWidth: '28px', minHeight: '28px', borderRadius: '9999px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={14} style={{ color: '#3b82f6' }} />
              </div>
              <div style={{ paddingTop: '0.25rem' }}>
                <p style={{ color: '#334155', fontSize: '1.6vh', lineHeight: 1.625 }}>
                  {t.practical_info_email_text_1}{" "}
                  <strong>{t.practical_info_email_confirm}</strong>.
                </p>
                <p style={{ color: '#64748b', fontSize: '1.3vh', marginTop: '0.125rem' }}>
                  {t.practical_info_email_text_2}
                </p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div style={{ textAlign: 'center', paddingTop: '1.5vh', marginTop: '1.5vh', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ color: '#334155', fontSize: '1.6vh' }}>
              {t.practical_info_welcome}
            </p>
            <p style={{ color: '#0d9488', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '1.3vh', marginTop: '0.25rem' }}>
              ALLISSON & BENJAMIN
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
    </div>
  );
}
