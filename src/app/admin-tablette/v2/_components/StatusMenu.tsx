"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STATUS_STYLES, getMenuStatuses, type DisplayStatus } from "./status";

interface StatusMenuProps {
  anchor: DOMRect;
  current: DisplayStatus;
  onSelect: (status: DisplayStatus) => void;
  onClose: () => void;
}

const MENU_WIDTH = 272;
const GAP = 8;
const EDGE = 12;

/**
 * Popover ancré sous (ou au-dessus de) la tuile de statut.
 * Il grandit depuis son déclencheur, sans voile sombre : le service continue derrière.
 */
export function StatusMenu({ anchor, current, onSelect, onClose }: StatusMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Positionné avant le premier affichage : on mesure la hauteur réelle,
  // puis on ouvre vers le bas s'il y a la place, sinon vers le haut.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const height = el.offsetHeight;
    const left = Math.min(
      Math.max(anchor.right - MENU_WIDTH, EDGE),
      window.innerWidth - MENU_WIDTH - EDGE,
    );
    const fitsBelow = anchor.bottom + GAP + height <= window.innerHeight - EDGE;
    const top = fitsBelow ? anchor.bottom + GAP : Math.max(EDGE, anchor.top - GAP - height);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.transformOrigin = fitsBelow ? "top right" : "bottom right";
  }, [anchor]);

  const statuses = getMenuStatuses(current);

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} aria-hidden />
      <motion.div
        ref={ref}
        role="menu"
        aria-label="Changer le statut"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
        style={{ width: MENU_WIDTH }}
        className="fixed z-[91] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_12px_40px_-8px_rgba(41,37,36,0.28),0_2px_6px_rgba(41,37,36,0.08)]"
      >
        {statuses.map((status) => {
          const style = STATUS_STYLES[status];
          const Icon = style.icon;
          const isCurrent = status === current;
          return (
            <button
              key={status}
              role="menuitem"
              type="button"
              onClick={() => onSelect(status)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-150",
                "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#334156]/40",
                isCurrent ? "bg-stone-100" : "hover:bg-stone-50",
              )}
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", style.tile)}>
                <Icon size={18} strokeWidth={2} className={style.ink} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-stone-900">{style.label}</span>
                <span className="text-xs text-stone-500">{style.hint}</span>
              </span>
              {isCurrent && (
                <span className="ml-auto text-[11px] font-semibold text-stone-500">Actuel</span>
              )}
            </button>
          );
        })}
      </motion.div>
    </>
  );
}
