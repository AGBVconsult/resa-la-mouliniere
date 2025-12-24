"use client";

interface DayCellProps {
  dateKey: string;
  isPast: boolean;
  hasLunch: boolean;
  hasDinner: boolean;
  onClick: () => void;
}

export function DayCell({
  dateKey,
  isPast,
  hasLunch,
  hasDinner,
  onClick,
}: DayCellProps) {
  const day = parseInt(dateKey.split('-')[2]);
  const hasAvailability = hasLunch || hasDinner;
  const isClickable = !isPast && hasAvailability;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`
        aspect-square flex flex-col items-center justify-center rounded-lg text-sm
        transition-colors relative
        ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
        ${!isPast && !hasAvailability ? 'text-gray-400 cursor-not-allowed' : ''}
        ${isClickable ? 'hover:bg-gray-100 cursor-pointer' : ''}
      `}
    >
      <span className={isClickable ? 'font-medium' : ''}>{day}</span>
      
      {/* Indicateurs disponibilité */}
      {!isPast && hasAvailability && (
        <div className="flex gap-0.5 mt-0.5">
          {hasLunch && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
          {hasDinner && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </div>
      )}
    </button>
  );
}
