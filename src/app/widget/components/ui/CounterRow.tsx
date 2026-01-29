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
    <div 
      className="flex items-center justify-between py-[1.2vh]"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1.2vh', paddingBottom: '1.2vh' }}
    >
      <div>
        <span style={{ fontSize: '1.6vh', fontWeight: 500, color: '#334155' }}>{label}</span>
        {sublabel && <p style={{ fontSize: '1.3vh', color: '#94a3b8' }}>{sublabel}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          aria-label={`Diminuer ${label}`}
          style={{
            width: '5.5vh',
            height: '5.5vh',
            minWidth: '40px',
            minHeight: '40px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canDecrement ? '#f1f5f9' : '#f8fafc',
            color: canDecrement ? '#334155' : '#94a3b8',
            cursor: canDecrement ? 'pointer' : 'not-allowed',
            border: 'none',
          }}
        >
          <Minus size={16} />
        </button>
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{ width: '4vh', textAlign: 'center', fontSize: '2.2vh', fontWeight: 700, color: '#0f172a' }}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          aria-label={`Augmenter ${label}`}
          style={{
            width: '5.5vh',
            height: '5.5vh',
            minWidth: '40px',
            minHeight: '40px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canIncrement ? '#f1f5f9' : '#f8fafc',
            color: canIncrement ? '#334155' : '#94a3b8',
            cursor: canIncrement ? 'pointer' : 'not-allowed',
            border: 'none',
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
