"use client";

import { Users, Baby, Accessibility, Dog } from "lucide-react";
import { StepHeader } from "../ui/StepHeader";
import { CounterRow } from "../ui/CounterRow";
import { Toggle } from "../ui/Toggle";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language, BookingState } from "@/components/booking/types";

interface Step1GuestsProps {
  lang: Language;
  data: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onNext: () => void;
}

export function Step1Guests({ lang, data, onUpdate, onNext }: Step1GuestsProps) {
  const { t } = useTranslation(lang);
  
  const total = data.adults + data.childrenCount + data.babyCount;
  const canContinue = data.adults >= 1 && total <= 15;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu - PAS DE SCROLL */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4">
        <StepHeader
          title={t.step1_title}
          subtitle={t.step1_subtitle}
          className="mb-6"
        />

        {/* Compteurs */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <CounterRow
            label={t.adults}
            value={data.adults}
            onChange={(v) => onUpdate({ adults: v })}
            min={1}
            max={200}
          />
          <div className="border-t border-slate-100" />
          <CounterRow
            label={t.children}
            sublabel={t.children_age}
            value={data.childrenCount}
            onChange={(v) => onUpdate({ childrenCount: v })}
            min={0}
            max={200}
          />
          <div className="border-t border-slate-100" />
          <CounterRow
            label={t.babies}
            sublabel={t.babies_age}
            value={data.babyCount}
            onChange={(v) => onUpdate({ babyCount: v })}
            min={0}
            max={200}
          />
        </div>

        {/* Options */}
        <div className="space-y-2">
          {/* Chaise haute - SEULEMENT si babyCount > 0 */}
          {data.babyCount > 0 && (
            <Toggle
              label={t.high_chair}
              icon={Baby}
              checked={data.requiresHighChair}
              onChange={(v) => onUpdate({ requiresHighChair: v })}
              highlighted
            />
          )}

          {/* PMR - Toujours visible */}
          <Toggle
            label={t.wheelchair}
            icon={Accessibility}
            checked={data.requiresWheelchair}
            onChange={(v) => onUpdate({ requiresWheelchair: v })}
          />

          {/* Chien - Toujours visible */}
          <Toggle
            label={t.dog}
            icon={Dog}
            checked={data.requiresDogAccess}
            onChange={(v) => onUpdate({ requiresDogAccess: v })}
          />
        </div>
      </div>

      {/* Footer - Total + Continuer sur la MÊME LIGNE */}
      <div className="px-6 py-4 bg-white border-t">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">
            <span className="text-sm">Total: </span>
            <span className="text-lg font-bold">{total}</span>
            <span className="text-sm"> {total > 1 ? t.convives : t.convive}</span>
          </span>
          <button
            onClick={onNext}
            disabled={!canContinue}
            className={`px-8 py-3 rounded-xl font-bold text-white transition-all ${
              canContinue
                ? "bg-slate-900 hover:bg-slate-800 active:scale-[0.98]"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            {t.continue} →
          </button>
        </div>
      </div>
    </div>
  );
}
