"use client";

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

          <div className="space-y-[1.5vh]">
            {/* Option: Sur nos genoux */}
            <button
              type="button"
              onClick={() => handleSeatingChange("lap")}
              className={`w-full flex items-center gap-[3vw] p-[2vh] rounded-xl border-2 transition-all ${
                data.babySeating === "lap"
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div
                className={`w-[2.5vh] h-[2.5vh] rounded-full border-2 flex items-center justify-center ${
                  data.babySeating === "lap"
                    ? "border-slate-900"
                    : "border-slate-300"
                }`}
              >
                {data.babySeating === "lap" && (
                  <div className="w-[1.3vh] h-[1.3vh] rounded-full bg-slate-900" />
                )}
              </div>
              <span className="text-[1.7vh] text-slate-700">
                {t.baby_seating_lap}
              </span>
            </button>

            {/* Option: Chaise haute */}
            <button
              type="button"
              onClick={() => handleSeatingChange("highchair")}
              className={`w-full flex items-center gap-[3vw] p-[2vh] rounded-xl border-2 transition-all ${
                data.babySeating === "highchair"
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div
                className={`w-[2.5vh] h-[2.5vh] rounded-full border-2 flex items-center justify-center ${
                  data.babySeating === "highchair"
                    ? "border-slate-900"
                    : "border-slate-300"
                }`}
              >
                {data.babySeating === "highchair" && (
                  <div className="w-[1.3vh] h-[1.3vh] rounded-full bg-slate-900" />
                )}
              </div>
              <span className="text-[1.7vh] text-slate-700">
                {t.baby_seating_highchair}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
