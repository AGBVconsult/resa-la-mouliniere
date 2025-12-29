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
}

export function BookingHeader({ 
  currentStep, 
  lang, 
  onLangChange,
  guestCount,
  guestLabel,
  dateLabel,
  timeLabel,
}: BookingHeaderProps) {
  return (
    <div className="bg-slate-900 text-white px-4 py-3">
      {/* Ligne 1 : Logo + Progress + Langue */}
      <div className="flex items-center justify-between h-12">
        <span className="text-sm font-bold tracking-tight">LA MOULINIÈRE</span>
        <ProgressIndicator currentStep={currentStep} totalSteps={5} />
        <div className="flex items-center gap-1.5">
          <Globe size={16} className="text-slate-400" />
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value as Language)}
            className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="text-slate-900">
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ligne 2 : Récap progressif */}
      <div className="flex items-center justify-center gap-6 mt-2 text-sm">
        {guestCount !== undefined && guestLabel && (
          <span className="flex items-center gap-2">
            <Users size={14} className="text-slate-400" />
            <span>{guestCount} {guestLabel}</span>
          </span>
        )}
        {dateLabel && (
          <span className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span>{dateLabel}</span>
          </span>
        )}
        {timeLabel && (
          <span className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            <span>{timeLabel}</span>
          </span>
        )}
      </div>
    </div>
  );
}
