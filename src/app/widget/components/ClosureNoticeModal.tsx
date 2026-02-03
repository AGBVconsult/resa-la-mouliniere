"use client";

import { X } from "lucide-react";
import type { Language } from "@/components/booking/types";
import { useTranslation } from "@/components/booking/i18n/translations";

interface ClosureNoticeModalProps {
  lang: Language;
  startDate: string;
  endDate: string;
  reopenDate: string;
  onClose: () => void;
}

function formatDateDisplay(dateKey: string, lang: Language): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" };
  const locale = lang === "en" ? "en-GB" : lang === "de" ? "de-DE" : lang === "it" ? "it-IT" : lang === "nl" ? "nl-BE" : "fr-BE";
  
  return date.toLocaleDateString(locale, options);
}

export function ClosureNoticeModal({
  lang,
  startDate,
  endDate,
  reopenDate,
  onClose,
}: ClosureNoticeModalProps) {
  const { t } = useTranslation(lang);

  const startFormatted = formatDateDisplay(startDate, lang);
  const endFormatted = formatDateDisplay(endDate, lang);
  const reopenFormatted = formatDateDisplay(reopenDate, lang);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-amber-900">
            {t.closure_title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-amber-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-amber-700" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-slate-700 text-base leading-relaxed">
            {t.closure_message_1}{" "}
            <span className="font-semibold">{startFormatted}</span>{" "}
            {t.closure_message_2}{" "}
            <span className="font-semibold">{endFormatted}</span>{" "}
            {t.closure_message_3}
          </p>
          
          <p className="text-slate-600 text-base leading-relaxed mt-3">
            {t.closure_thanks}{" "}
            <span className="font-semibold text-emerald-600">{reopenFormatted}</span>.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
          >
            {t.closure_understood}
          </button>
        </div>
      </div>
    </div>
  );
}
