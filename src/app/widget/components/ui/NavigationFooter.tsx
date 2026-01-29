"use client";

import type { ReactNode } from "react";

interface NavigationFooterProps {
  /** Label du bouton retour (optionnel - si non fourni, pas de bouton retour) */
  backLabel?: string;
  /** Label du bouton principal */
  primaryLabel: string;
  /** Callback bouton retour */
  onBack?: () => void;
  /** Callback bouton principal */
  onPrimary: () => void;
  /** Désactiver le bouton principal */
  primaryDisabled?: boolean;
  /** Désactiver le bouton retour */
  backDisabled?: boolean;
  /** Contenu supplémentaire à gauche (ex: "Total: 2 convives") */
  leftContent?: ReactNode;
}

/**
 * Footer de navigation uniforme pour toutes les étapes du widget.
 * Hauteur fixe, style cohérent.
 */
export function NavigationFooter({
  backLabel,
  primaryLabel,
  onBack,
  onPrimary,
  primaryDisabled = false,
  backDisabled = false,
  leftContent,
}: NavigationFooterProps) {
  const showBackButton = backLabel && onBack;

  return (
    <div 
      className="px-[4vw] pt-[1.5vh] pb-[calc(2vh+env(safe-area-inset-bottom))] bg-white border-t border-slate-200 flex items-center gap-[2vw] flex-shrink-0"
      style={{ paddingLeft: '4vw', paddingRight: '4vw', paddingTop: '1.5vh', paddingBottom: 'calc(2vh + env(safe-area-inset-bottom, 0px))', backgroundColor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '2vw', flexShrink: 0 }}
    >
      {/* Contenu à gauche (optionnel) - utilisé par Step1 pour "Total: X convives" */}
      {leftContent && !showBackButton && (
        <div style={{ flex: '1 1 0%' }}>
          {leftContent}
        </div>
      )}

      {/* Bouton Retour */}
      {showBackButton && (
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          aria-label={`Retour : ${backLabel}`}
          className="flex-1 py-[1.5vh] min-h-[44px] rounded-xl font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ flex: '1 1 0%', paddingTop: '1.5vh', paddingBottom: '1.5vh', minHeight: '44px', borderRadius: '0.75rem', fontWeight: 700, color: '#334155', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: backDisabled ? 'not-allowed' : 'pointer', opacity: backDisabled ? 0.5 : 1 }}
        >
          {backLabel}
        </button>
      )}

      {/* Bouton Principal */}
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        aria-label={primaryLabel}
        aria-disabled={primaryDisabled}
        className={`py-[1.5vh] min-h-[44px] rounded-xl font-bold text-white transition-all ${
          showBackButton || leftContent ? "flex-[2]" : "flex-1"
        } ${
          primaryDisabled
            ? "bg-slate-300 cursor-not-allowed"
            : "bg-slate-900 hover:bg-slate-800 active:scale-[0.98]"
        }`}
        style={{ 
          flex: showBackButton || leftContent ? '2 1 0%' : '1 1 0%', 
          paddingTop: '1.5vh', 
          paddingBottom: '1.5vh', 
          minHeight: '44px', 
          borderRadius: '0.75rem', 
          fontWeight: 700, 
          color: 'white', 
          backgroundColor: primaryDisabled ? '#cbd5e1' : '#0f172a', 
          cursor: primaryDisabled ? 'not-allowed' : 'pointer',
          border: 'none',
        }}
      >
        {primaryLabel}
      </button>
    </div>
  );
}
