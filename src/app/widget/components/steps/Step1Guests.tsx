"use client";

import { Accessibility, PawPrint } from "lucide-react";
import { stroller } from "@lucide/lab";
import { Icon } from "lucide-react";
import { StepHeader } from "../ui/StepHeader";
import { CounterRow } from "../ui/CounterRow";
import { Toggle } from "../ui/Toggle";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language, BookingState } from "@/components/booking/types";

interface Step1GuestsProps {
  lang: Language;
  data: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
}

export function Step1Guests({ lang, data, onUpdate }: Step1GuestsProps) {
  const { t } = useTranslation(lang);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Contenu - PAS DE SCROLL */}
      <div className="flex-1 flex flex-col justify-center px-4 py-[2vh]">
        <StepHeader
          title={t.step1_title}
          subtitle={t.step1_subtitle}
          className="mb-[2vh]"
        />

        {/* Compteurs */}
        <div className="bg-white rounded-2xl p-[2vh] shadow-sm mb-[2vh]">
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
        <div className="space-y-[1vh]">
          {/* Option poussette - si enfant OU bébé */}
          {(data.childrenCount > 0 || data.babyCount > 0) && (
            <Toggle
              label={t.stroller}
              icon={(props: { size?: number | string; className?: string }) => <Icon iconNode={stroller} {...props} />}
              checked={data.requiresStroller}
              onChange={(v) => onUpdate({ requiresStroller: v })}
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
            icon={PawPrint}
            checked={data.requiresDogAccess}
            onChange={(v) => onUpdate({ requiresDogAccess: v })}
          />
        </div>
      </div>

      {/* Footer */}
    </div>
  );
}
