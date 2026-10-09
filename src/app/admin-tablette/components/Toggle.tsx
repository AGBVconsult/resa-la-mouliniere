"use client";

import { cn } from "@/lib/utils";

/** Interrupteur des en-têtes de service (éditeur de période, remplissage progressif). */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn("relative w-11 h-[26px] shrink-0 rounded-full transition-colors duration-200", checked ? "bg-slate-800" : "bg-slate-200")}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
          checked && "translate-x-[18px]"
        )}
      />
    </button>
  );
}
