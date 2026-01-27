"use client";

import { useCallback } from "react";
import { Minus, Plus } from "lucide-react";

interface CounterRowProps {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
}

export function CounterRow({
  label,
  sublabel,
  value,
  onChange,
  min = 0,
  max = 20,
}: CounterRowProps) {
  const handleDecrement = useCallback(() => {
    if (value > min) onChange(value - 1);
  }, [value, min, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < max) onChange(value + 1);
  }, [value, max, onChange]);

  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <div className="flex items-center justify-between py-[1.2vh]">
      <div>
        <span className="text-[1.6vh] font-medium text-slate-700">{label}</span>
        {sublabel && <p className="text-[1.3vh] text-slate-400">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          aria-label={`Diminuer ${label}`}
          className={`w-[5.5vh] h-[5.5vh] min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
            canDecrement
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
              : "bg-slate-50 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Minus size={16} />
        </button>
        <span
          aria-live="polite"
          aria-atomic="true"
          className="w-[4vh] text-center text-[2.2vh] font-bold text-slate-900"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          aria-label={`Augmenter ${label}`}
          className={`w-[5.5vh] h-[5.5vh] min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
            canIncrement
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
              : "bg-slate-50 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
