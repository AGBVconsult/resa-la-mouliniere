"use client";

import { Check } from "lucide-react";
import { StepHeader } from "../ui/StepHeader";
import { useTranslation } from "@/components/booking/i18n/translations";
import type { Language, BookingState, BabySeating } from "@/components/booking/types";

interface Step1BabyProps {
  lang: Language;
  data: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
}

export function Step1Baby({ lang, data, onUpdate }: Step1BabyProps) {
  const { t } = useTranslation(lang);

  const handleSeatingChange = (seating: BabySeating) => {
    onUpdate({ 
      babySeating: seating,
      requiresHighChair: seating === "highchair"
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 flex flex-col justify-center px-[4vw] py-[2vh]">
        <StepHeader
          title={t.step1_baby_title}
          subtitle={t.step1_baby_subtitle}
          className="mb-[2vh]"
        />

        {/* Badges équipements */}
        <div className="flex flex-wrap gap-[1.5vw] mb-[3vh] justify-center">
          <span className="inline-flex items-center px-[3vw] py-[1vh] bg-emerald-100 text-emerald-700 rounded-full text-[1.5vh] font-medium">
            {t.baby_changing_table}
          </span>
          <span className="inline-flex items-center px-[3vw] py-[1vh] bg-emerald-100 text-emerald-700 rounded-full text-[1.5vh] font-medium">
            {t.baby_play_corner}
          </span>
        </div>

        {/* Question installation */}
        <div className="bg-white rounded-2xl p-[2vh] shadow-sm">
          <p className="text-[1.8vh] font-semibold text-slate-700 mb-[2vh] text-center">
            {t.baby_seating_question}
          </p>

          <div className="space-y-[1vh]">
            {/* Option: Sur nos genoux */}
            <button
              type="button"
              role="switch"
              aria-checked={data.babySeating === "lap"}
              onClick={() => handleSeatingChange("lap")}
              className={`w-full flex items-center justify-between p-[1.2vh] min-h-[5.5vh] rounded-lg border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                data.babySeating === "lap"
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-[1.6vh] font-medium">{t.baby_seating_lap}</span>
              <div
                className={`w-[3vh] h-[3vh] min-w-[20px] min-h-[20px] rounded-full border flex items-center justify-center transition-all ${
                  data.babySeating === "lap"
                    ? "bg-slate-900 border-slate-900"
                    : "border-slate-300 bg-white"
                }`}
              >
                {data.babySeating === "lap" && <Check size={12} className="text-white" />}
              </div>
            </button>

            {/* Option: Chaise haute */}
            <button
              type="button"
              role="switch"
              aria-checked={data.babySeating === "highchair"}
              onClick={() => handleSeatingChange("highchair")}
              className={`w-full flex items-center justify-between p-[1.2vh] min-h-[5.5vh] rounded-lg border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                data.babySeating === "highchair"
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col items-start">
                <span className="text-[1.6vh] font-medium">{t.baby_seating_highchair}</span>
                <span className="text-[1.3vh] text-slate-500">{t.high_chair}</span>
              </div>
              <div
                className={`w-[3vh] h-[3vh] min-w-[20px] min-h-[20px] rounded-full border flex items-center justify-center transition-all ${
                  data.babySeating === "highchair"
                    ? "bg-slate-900 border-slate-900"
                    : "border-slate-300 bg-white"
                }`}
              >
                {data.babySeating === "highchair" && <Check size={12} className="text-white" />}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
