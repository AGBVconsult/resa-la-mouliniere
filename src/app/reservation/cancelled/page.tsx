"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language } from "@/components/booking/types";
import { BookingFooter } from "@/app/widget/components/BookingFooter";

function CancelledContent() {
  const searchParams = useSearchParams();
  const lang = (searchParams.get("lang") || "fr") as Language;
  const { t } = useTranslation(lang);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
        {t.cancelled_title}
      </h2>
      <p className="text-slate-500 text-center mb-8">
        {t.cancelled_subtitle}
      </p>
      <a
        href="/widget"
        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
      >
        {t.new_reservation}
      </a>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

export default function CancelledPage() {
  return (
    <div className="min-h-screen md:bg-slate-100 md:flex md:items-center md:justify-center md:p-4">
      <div className="w-full min-h-[100dvh] flex flex-col bg-white md:min-h-0 md:max-w-[400px] md:h-[750px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-200 overflow-hidden">
        <Suspense fallback={<LoadingFallback />}>
          <CancelledContent />
        </Suspense>
        <BookingFooter />
      </div>
    </div>
  );
}
