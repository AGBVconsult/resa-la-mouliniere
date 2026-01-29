"use client";

import { Globe, Users, Calendar, Clock } from "lucide-react";
import { ProgressIndicator } from "./ui/ProgressIndicator";
import { LANGUAGES } from "@/components/booking/constants";
import type { Language } from "@/components/booking/types";

interface BookingHeaderProps {
  currentStep: number;
  lang: Language;
  onLangChange: (lang: Language) => void;
  guestCount?: number;
  guestLabel?: string;
  dateLabel?: string;
  timeLabel?: string;
  hideSummary?: boolean;
}

export function BookingHeader({ 
  currentStep, 
  lang, 
  onLangChange,
  guestCount,
  guestLabel,
  dateLabel,
  timeLabel,
  hideSummary = false,
}: BookingHeaderProps) {
  return (
    <div 
      className="bg-slate-900 text-white px-[4vw] py-[1.5vh] min-h-[8vh] flex-shrink-0"
      style={{ backgroundColor: '#0f172a', color: 'white', paddingLeft: '4vw', paddingRight: '4vw', paddingTop: '1.5vh', paddingBottom: '1.5vh', minHeight: '8vh', flexShrink: 0 }}
    >
      {/* Ligne 1 : Progress centré + Langue à droite */}
      <div 
        className="flex items-center justify-between h-[4vh] min-h-[40px]"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4vh', minHeight: '40px' }}
      >
        <div className="w-16" />
        <ProgressIndicator currentStep={currentStep} totalSteps={6} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', width: '4rem', justifyContent: 'flex-end' }}>
          <Globe size={16} style={{ color: '#94a3b8' }} />
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value as Language)}
            className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
            style={{ backgroundColor: 'transparent', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', border: 'none', color: 'white' }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="text-slate-900">
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ligne 2 : Récap progressif (masqué si hideSummary) */}
      {!hideSummary && (
        <div 
          className="flex items-center justify-center gap-4 mt-[0.5vh] text-sm whitespace-nowrap"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '0.5vh', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
        >
          {guestCount !== undefined && guestLabel && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Users size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span>{guestCount} {guestLabel}</span>
            </span>
          )}
          {dateLabel && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Calendar size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span>{dateLabel}</span>
            </span>
          )}
          {timeLabel && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Clock size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span>{timeLabel}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
