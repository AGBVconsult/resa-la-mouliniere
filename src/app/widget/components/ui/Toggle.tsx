"use client";

import { useCallback } from "react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: LucideIcon;
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

  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={`flex items-center justify-between p-3 min-h-[44px] rounded-lg border cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${getContainerClasses()}`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            size={20}
            className={highlighted && !checked ? "text-amber-600" : "text-slate-600"}
          />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div
        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${getCheckboxClasses()}`}
      >
        {checked && <Check size={14} className="text-white" />}
      </div>
    </div>
  );
}
