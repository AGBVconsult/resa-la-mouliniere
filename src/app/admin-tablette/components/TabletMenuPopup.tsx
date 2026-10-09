"use client";

import { useEffect } from "react";
import { Search, Map, X, ChevronRight, CalendarRange, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabletMenuPopupProps {
  showFloorPlan: boolean;
  onSearchClient: () => void;
  onToggleFloorPlan: () => void;
  onOpenSlots: () => void;
  onOpenPeriods: () => void;
  onClose: () => void;
}

/**
 * Menu regroupant les options peu utilisées de la page réservations
 * (recherche client, affichage du plan de salle, créneaux, périodes spéciales) pour alléger l'en-tête.
 */
export function TabletMenuPopup({
  showFloorPlan,
  onSearchClient,
  onToggleFloorPlan,
  onOpenSlots,
  onOpenPeriods,
  onClose,
}: TabletMenuPopupProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        onClick={(e) => e.stopPropagation()}
        className="mt-[84px] mr-4 w-[340px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden origin-top-right animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
      >
        <div className="flex items-center justify-between pl-5 pr-3 pt-4 pb-2">
          <span className="text-[11px] font-semibold text-slate-400">
            Menu
          </span>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-2 pb-2">
          <button
            onClick={onSearchClient}
            className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <span className="w-11 h-11 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Search size={20} strokeWidth={1.5} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-medium text-slate-900">Rechercher un client</span>
              <span className="block text-xs text-slate-400 mt-0.5">Par nom, téléphone ou email</span>
            </span>
            <ChevronRight size={18} className="text-slate-300 shrink-0" />
          </button>

          <button
            onClick={onToggleFloorPlan}
            role="switch"
            aria-checked={!showFloorPlan}
            className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <span className="w-11 h-11 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Map size={20} strokeWidth={1.5} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-medium text-slate-900">Masquer le plan de salle</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                {showFloorPlan ? "Plan affiché" : "Liste en pleine largeur"}
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                "relative w-11 h-[26px] shrink-0 rounded-full transition-colors duration-200",
                showFloorPlan ? "bg-slate-200" : "bg-slate-800"
              )}
            >
              <span
                className={cn(
                  "absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
                  !showFloorPlan && "translate-x-[18px]"
                )}
              />
            </span>
          </button>

          <button
            onClick={onOpenSlots}
            className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <span className="w-11 h-11 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Clock size={20} strokeWidth={1.5} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-medium text-slate-900">Créneaux</span>
              <span className="block text-xs text-slate-400 mt-0.5">Horaires et capacités de la semaine</span>
            </span>
            <ChevronRight size={18} className="text-slate-300 shrink-0" />
          </button>

          <button
            onClick={onOpenPeriods}
            className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <span className="w-11 h-11 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <CalendarRange size={20} strokeWidth={1.5} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-medium text-slate-900">Périodes spéciales</span>
              <span className="block text-xs text-slate-400 mt-0.5">Ouvertures et fermetures exceptionnelles</span>
            </span>
            <ChevronRight size={18} className="text-slate-300 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
