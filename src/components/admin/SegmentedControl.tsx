"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** "md" : rail 36 px / pastille 40 px (header) — "sm" : rail 32 px / pastille 36 px */
  size?: "md" | "sm";
  ariaLabel?: string;
  className?: string;
  /** Élément ajouté au bout du rail, après un séparateur (ex. bouton de réglages) */
  trailing?: ReactNode;
}

/**
 * Sélecteur à rail gris clair : la pastille blanche du choix actif est plus haute
 * que le rail (2 px de débordement en haut et en bas) et glisse d'un choix à l'autre.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
  className,
  trailing,
}: SegmentedControlProps<T>) {
  const buttonRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const btn = buttonRefs.current[value];
      if (btn) setThumb({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    update();
    // Les polices peuvent finir de charger après le premier rendu
    document.fonts?.ready.then(update);
  }, [value, options]);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative flex items-center rounded-full bg-[#EFEFEF]",
        size === "md" ? "h-9" : "h-8",
        className
      )}
    >
      {thumb && (
        <div
          aria-hidden
          className="absolute -top-0.5 -bottom-0.5 left-0 rounded-full bg-white border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_6px_16px_-6px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out"
          style={{ width: thumb.width + 4, transform: `translateX(${thumb.left - 2}px)` }}
        />
      )}
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={option.ariaLabel}
            ref={(el) => { buttonRefs.current[option.value] = el; }}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex h-full items-center justify-center gap-1.5 rounded-full px-[18px] text-sm transition-colors duration-200 active:scale-[0.98]",
              isActive ? "text-[#0C0C0C]" : "text-[#6E6E6E] hover:text-[#2D2D2D]"
            )}
          >
            {option.label}
          </button>
        );
      })}
      {trailing && (
        <>
          <span aria-hidden className="w-px h-[18px] bg-black/10 mx-0.5" />
          {trailing}
        </>
      )}
    </div>
  );
}
