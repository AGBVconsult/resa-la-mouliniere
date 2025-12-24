"use client";

import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface GuestCounterProps {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}

export function GuestCounter({
  label,
  sublabel,
  value,
  onChange,
  min,
  max,
}: GuestCounterProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium">{label}</p>
        {sublabel && <p className="text-sm text-gray-500">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={decrement}
          disabled={value <= min}
          className="h-8 w-8"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center font-medium">{value}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={increment}
          disabled={value >= max}
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
