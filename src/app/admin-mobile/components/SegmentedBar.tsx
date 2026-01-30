"use client";

interface SegmentedBarProps {
  value: number;
  covers?: number;
}

export function SegmentedBar({ value, covers = 0 }: SegmentedBarProps) {
  const segments = [1, 2, 3, 4];

  const getColorClass = (v: number) => {
    if (v >= 90) return "bg-red-500";
    if (v >= 70) return "bg-amber-400";
    return "bg-emerald-500";
  };

  // Si on a des couverts mais un pourcentage très faible, afficher au moins 1 segment
  const hasActivity = covers > 0;
  
  return (
    <div className="flex gap-[1px] w-full h-1">
      {segments.map((s) => {
        // Premier segment actif dès qu'il y a des couverts (même 1)
        // Ensuite progression: 25%, 50%, 75%, 100%
        const threshold = s * 25;
        const isActive = hasActivity && (s === 1 || value >= threshold - 12);
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
