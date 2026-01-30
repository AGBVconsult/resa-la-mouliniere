"use client";

interface SegmentedBarProps {
  value: number;
  large?: boolean;
}

export function SegmentedBar({ value, large = false }: SegmentedBarProps) {
  const segments = [1, 2, 3, 4];

  const getColorClass = (v: number) => {
    if (v >= 90) return "bg-red-500";
    if (v >= 70) return "bg-amber-400";
    return "bg-emerald-500";
  };

  return (
    <div className={`flex gap-[2px] w-full ${large ? "h-[3px]" : "h-1.5"}`}>
      {segments.map((s) => {
        const threshold = s * 25;
        const isActive = value >= threshold - 12;
        return (
          <div
            key={s}
            className={`flex-1 rounded-full transition-all duration-700 ${
              isActive ? getColorClass(value) : "bg-slate-100"
            }`}
          />
        );
      })}
    </div>
  );
}
