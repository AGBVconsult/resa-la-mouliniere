"use client";

interface Slot {
  slotKey: string;
  timeKey: string;
  isOpen: boolean;
  remainingCapacity: number;
}

interface TimeSlotsProps {
  title: string;
  slots: Slot[];
  onSelect: (timeKey: string) => void;
}

export function TimeSlots({ title, slots, onSelect }: TimeSlotsProps) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot.slotKey}
            onClick={() => onSelect(slot.timeKey)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            {slot.timeKey}
          </button>
        ))}
      </div>
    </div>
  );
}
