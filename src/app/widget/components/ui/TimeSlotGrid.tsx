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
      "py-[1.2vh] min-h-[5vh] rounded-xl text-center font-semibold text-[1.6vh] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2";

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

  const getButtonStyle = (slot: TimeSlot): React.CSSProperties => {
    const isSelected = selectedTime === slot.timeKey;
    const isDisabled = !slot.isOpen || slot.remainingCapacity <= 0;

    const base: React.CSSProperties = {
      paddingTop: '1.2vh',
      paddingBottom: '1.2vh',
      minHeight: '5vh',
      borderRadius: '0.75rem',
      textAlign: 'center',
      fontWeight: 600,
      fontSize: '1.6vh',
      border: 'none',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
    };

    if (isDisabled) {
      return { ...base, backgroundColor: '#f1f5f9', color: '#94a3b8' };
    }

    if (isSelected) {
      return { 
        ...base, 
        backgroundColor: color === 'amber' ? '#f59e0b' : '#3b82f6', 
        color: 'white',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      };
    }

    return { ...base, backgroundColor: 'white', border: '1px solid #e2e8f0' };
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1vh' }}>
      {slots.map((slot) => (
        <button
          key={slot.timeKey}
          type="button"
          onClick={() => slot.isOpen && onSelect(slot.timeKey)}
          disabled={!slot.isOpen || slot.remainingCapacity <= 0}
          aria-pressed={selectedTime === slot.timeKey}
          className={getButtonClasses(slot)}
          style={getButtonStyle(slot)}
        >
          {slot.timeKey}
        </button>
      ))}
    </div>
  );
}
