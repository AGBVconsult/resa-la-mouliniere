"use client";

import { useCallback } from "react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = LucideIcon | ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; className?: string }>;

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: IconComponent;
  highlighted?: boolean;
}

export function Toggle({
  label,
  checked,
  onChange,
  icon: Icon,
  highlighted = false,
}: ToggleProps) {
  const handleToggle = useCallback(() => {
    onChange(!checked);
  }, [checked, onChange]);

  const getContainerClasses = () => {
    if (checked) return "border-slate-900 bg-slate-50";
    if (highlighted) return "border-amber-200 bg-amber-50/50 hover:bg-amber-50";
    return "border-slate-200 hover:border-slate-300";
  };

  const getCheckboxClasses = () => {
    if (checked) return "bg-slate-900 border-slate-900";
    if (highlighted) return "border-amber-300 bg-white";
    return "border-slate-300 bg-white";
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.2vh',
    minHeight: '5.5vh',
    borderRadius: '0.5rem',
    border: '1px solid',
    cursor: 'pointer',
    borderColor: checked ? '#0f172a' : highlighted ? '#fde68a' : '#e2e8f0',
    backgroundColor: checked ? '#f8fafc' : highlighted ? 'rgba(255, 251, 235, 0.5)' : 'white',
  };

  const checkboxStyle: React.CSSProperties = {
    width: '3vh',
    height: '3vh',
    minWidth: '20px',
    minHeight: '20px',
    borderRadius: '9999px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: checked ? '#0f172a' : highlighted ? '#fcd34d' : '#cbd5e1',
    backgroundColor: checked ? '#0f172a' : 'white',
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleToggle();
      }}
      onMouseDown={(e) => e.preventDefault()}
      className={`w-full flex items-center justify-between p-[1.2vh] min-h-[5.5vh] rounded-lg border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${getContainerClasses()}`}
      style={containerStyle}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {Icon && (
          <Icon
            size={18}
            style={{ color: highlighted && !checked ? '#d97706' : '#475569' }}
          />
        )}
        <span style={{ fontSize: '1.6vh', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={checkboxStyle}>
        {checked && <Check size={12} style={{ color: 'white' }} />}
      </div>
    </button>
  );
}
