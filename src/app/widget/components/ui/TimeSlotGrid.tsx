"use client";

interface TimeSlot {
  timeKey: string;
  isOpen: boolean;
  remainingCapacity: number;
}

interface TimeSlotGridProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelect: (timeKey: string) => void;
  color: "amber" | "blue";
}

export function TimeSlotGrid({ slots, selectedTime, onSelect, color }: TimeSlotGridProps) {
  if (slots.length === 0) return null;

  const getButtonClasses = (slot: TimeSlot) => {
    const isSelected = selectedTime === slot.timeKey;
    const isDisabled = !slot.isOpen || slot.remainingCapacity <= 0;

    const base =
      "py-3 min-h-[44px] rounded-xl text-center font-semibold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";

    if (isDisabled) {
      return `${base} bg-slate-100 text-slate-400 cursor-not-allowed`;
    }

    if (isSelected) {
      return `${base} ${
        color === "amber" ? "bg-amber-500 text-white shadow-lg" : "bg-blue-500 text-white shadow-lg"
      }`;
    }

    return `${base} bg-white border border-slate-200 ${
      color === "amber"
        ? "hover:bg-amber-50 hover:border-amber-200"
        : "hover:bg-blue-50 hover:border-blue-200"
    }`;
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {slots.map((slot) => (
        <button
          key={slot.timeKey}
          type="button"
          onClick={() => slot.isOpen && onSelect(slot.timeKey)}
          disabled={!slot.isOpen || slot.remainingCapacity <= 0}
          aria-pressed={selectedTime === slot.timeKey}
          className={getButtonClasses(slot)}
        >
          {slot.timeKey}
        </button>
      ))}
    </div>
  );
}
