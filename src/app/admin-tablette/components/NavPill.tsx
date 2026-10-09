"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface NavPillProps {
  label: ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
  /** Clic sur la pastille centrale (ex. ouvrir le calendrier) */
  onLabelClick?: () => void;
  /** Bouton de retour (« Auj. », « Ce mois »), affiché seulement si fourni */
  reset?: { label: string; ariaLabel: string; onClick: () => void };
}

/** Délai après un chevron pendant lequel un appui sur la pastille est ignoré (doigt qui ripe en enchaînant les jours) */
const MISFIRE_GUARD_MS = 600;

/**
 * Zone tactile des chevrons agrandie sans changer le visuel : pseudo-élément transparent
 * qui déborde de 10 px en hauteur et mord sur les bords arrondis de la pastille
 * (18 px à gauche, 22 px à droite : « jour suivant » est l'action la plus fréquente).
 */
const chevronClass =
  "relative z-10 w-[34px] h-full flex items-center justify-center text-[#6E6E6E] hover:text-[#0C0C0C] transition-colors active:scale-95 before:absolute before:-inset-y-2.5";

/**
 * Navigateur précédent / suivant au style des sélecteurs : rail gris clair de 36 px,
 * libellé dans une pastille blanche de 40 px qui déborde du rail.
 */
export function NavPill({ label, onPrevious, onNext, previousLabel, nextLabel, onLabelClick, reset }: NavPillProps) {
  const lastStepAt = useRef(-Infinity);

  const step = (action: () => void) => (event: MouseEvent) => {
    lastStepAt.current = event.timeStamp;
    action();
  };

  const handleLabelClick = (event: MouseEvent) => {
    if (event.timeStamp - lastStepAt.current < MISFIRE_GUARD_MS) return;
    onLabelClick?.();
  };

  return (
    <div className="flex items-center h-9 px-1 rounded-full bg-[#EFEFEF]">
      <button
        type="button"
        onClick={step(onPrevious)}
        aria-label={previousLabel}
        className={`${chevronClass} before:-left-4 before:-right-5`}
      >
        <ChevronLeft size={18} strokeWidth={1.75} />
      </button>

      <button
        type="button"
        onClick={handleLabelClick}
        disabled={!onLabelClick}
        className="h-10 -my-0.5 mx-0.5 min-w-[112px] px-5 flex items-center justify-center rounded-full bg-white border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_6px_16px_-6px_rgba(0,0,0,0.25)] text-sm font-medium text-[#0C0C0C] whitespace-nowrap disabled:cursor-default"
      >
        {label}
      </button>

      <button
        type="button"
        onClick={step(onNext)}
        aria-label={nextLabel}
        // Vers l'extérieur : jusqu'au séparateur si « Auj. » est affiché, sinon dans la marge
        className={`${chevronClass} before:-left-6 ${reset ? "before:-right-1.5" : "before:-right-4"}`}
      >
        <ChevronRight size={18} strokeWidth={1.75} />
      </button>

      {reset && (
        <>
          <span aria-hidden className="w-px h-[18px] bg-black/10 ml-0.5 mr-1.5" />
          <button
            type="button"
            onClick={reset.onClick}
            aria-label={reset.ariaLabel}
            className="h-full flex items-center gap-1.5 pl-2 pr-3.5 text-sm font-medium text-[#3884FF] hover:text-[#2F74E6] whitespace-nowrap transition-colors active:scale-95"
          >
            <RotateCcw size={14} strokeWidth={2} />
            {reset.label}
          </button>
        </>
      )}
    </div>
  );
}
