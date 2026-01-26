"use client";

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
  leftContent?: React.ReactNode;
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

  // Calcul de la classe flex du bouton principal
  const getPrimaryFlexClass = () => {
    if (showBackButton) return "flex-[2]"; // Retour + Continuer : ratio 1:2
    if (leftContent) return "flex-1"; // leftContent + Continuer : ratio 1:1
    return "flex-1"; // Bouton seul : pleine largeur
  };

  return (
    <div className="px-6 pt-4 pb-4 bg-white border-t border-slate-200 flex items-center gap-4 flex-shrink-0 min-h-[88px]">
      {/* Contenu à gauche (optionnel) - utilisé par Step1 pour "Total: X convives" */}
      {leftContent && !showBackButton && (
        <div className="flex-1">
          {leftContent}
        </div>
      )}

      {/* Bouton Retour */}
      {showBackButton && (
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled}
          className="flex-1 py-4 rounded-xl font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {backLabel}
        </button>
      )}

      {/* Bouton Principal */}
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        className={`py-4 rounded-xl font-bold text-white transition-all ${getPrimaryFlexClass()} ${
          primaryDisabled
            ? "bg-slate-300 cursor-not-allowed"
            : "bg-slate-900 hover:bg-slate-800 active:scale-[0.98]"
        }`}
      >
        {primaryLabel}
      </button>
    </div>
  );
}
