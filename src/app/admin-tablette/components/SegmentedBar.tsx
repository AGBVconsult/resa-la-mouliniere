"use client";

interface SegmentedBarProps {
  value: number;
  covers?: number;
}

export function SegmentedBar({ value, covers = 0 }: SegmentedBarProps) {
  const totalSegments = 5;
  const filledSegments = covers > 0 ? Math.max(1, Math.round((value / 100) * totalSegments)) : Math.round((value / 100) * totalSegments);

  const getColor = () => {
    if (value >= 90) return "bg-red-400";
    if (value >= 70) return "bg-amber-400";
    return "bg-emerald-400";
  };

  return (
    <div className="flex gap-1 w-full">
      {Array.from({ length: totalSegments }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < filledSegments ? getColor() : "bg-slate-100"
          }`}
        />
      ))}
    </div>
  );
}
