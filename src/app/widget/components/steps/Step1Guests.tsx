"use client";

import { Accessibility, PawPrint, Icon } from "lucide-react";
import { stroller } from "@lucide/lab";
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
    <div 
      className="flex flex-col h-full bg-slate-50"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}
    >
      {/* Contenu - PAS DE SCROLL */}
      <div 
        className="flex-1 flex flex-col justify-center px-4 py-[2vh]"
        style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '2vh', paddingBottom: '2vh' }}
      >
        <StepHeader
          title={t.step1_title}
          subtitle={t.step1_subtitle}
          className="mb-[2vh]"
        />

        {/* Compteurs */}
        <div 
          className="bg-white rounded-2xl p-[2vh] shadow-sm mb-[2vh]"
          style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2vh', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', marginBottom: '2vh' }}
        >
          <CounterRow
            label={t.adults}
            value={data.adults}
            onChange={(v) => onUpdate({ adults: v })}
            min={1}
            max={200}
          />
          <div style={{ borderTop: '1px solid #f1f5f9' }} />
          <CounterRow
            label={t.children}
            sublabel={t.children_age}
            value={data.childrenCount}
            onChange={(v) => onUpdate({ childrenCount: v })}
            min={0}
            max={200}
          />
          <div style={{ borderTop: '1px solid #f1f5f9' }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1vh' }}>
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
