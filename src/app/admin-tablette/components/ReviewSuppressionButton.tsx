"use client";

import { Component, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { StarOff, Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";

interface ReviewSuppressionButtonProps {
  dateKey: string;
  service: "lunch" | "dinner";
}

/**
 * Isole le bouton : une erreur de sa requête le masque au lieu de faire
 * planter toute la page tablette (useQuery relance les erreurs serveur).
 */
class HideOnError extends Component<{ resetKey: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("ReviewSuppressionButton failed", error);
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (this.state.failed && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Bouton (bas gauche du plan de salle) pour suspendre / réactiver les
 * demandes d'avis de tout le service affiché. Masqué hors fenêtre autorisée
 * (services du jour, ou d'hier avant 06:30).
 */
export function ReviewSuppressionButton(props: ReviewSuppressionButtonProps) {
  return (
    <HideOnError resetKey={`${props.dateKey}:${props.service}`}>
      <ReviewSuppressionButtonInner {...props} />
    </HideOnError>
  );
}

function ReviewSuppressionButtonInner({ dateKey, service }: ReviewSuppressionButtonProps) {
  const { toast } = useToast();
  const state = useQuery(api.reviewSuppressions.getForService, { dateKey, service });
  const setForService = useMutation(api.reviewSuppressions.setForService);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!state || !state.canToggle) return null;

  const { suppressed } = state;
  const serviceLabel = service === "lunch" ? "midi" : "soir";
  const formattedDate = format(parseISO(dateKey), "EEEE dd/MM", { locale: fr });

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await setForService({ dateKey, service, suppressed: !suppressed });
      setConfirmOpen(false);
    } catch (error) {
      toast.error(formatConvexError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={suppressed ? "Avis suspendus — réactiver" : "Annuler les demandes d'avis du service"}
        className={cn(
          "absolute bottom-3 left-3 z-30 flex items-center gap-2 rounded-full shadow-lg transition-all active:scale-95",
          suppressed
            ? "bg-orange-500 text-white px-4 py-2.5 text-sm font-semibold"
            : "bg-white/70 text-slate-500 p-2.5 border border-white/40"
        )}
      >
        <StarOff size={18} strokeWidth={1.75} />
        {suppressed && <span>Avis suspendus</span>}
      </button>

      {confirmOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => !isSubmitting && setConfirmOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(440px,calc(100vw-2rem))] bg-white rounded-3xl shadow-2xl z-[201] p-6">
            <h2 className="text-lg font-bold text-slate-900">
              {suppressed ? "Réactiver les demandes d'avis ?" : "Annuler les demandes d'avis ?"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {suppressed ? (
                <>Les demandes d&apos;avis seront envoyées normalement pour le service du <strong>{serviceLabel} du {formattedDate}</strong>.</>
              ) : (
                <>Aucune demande d&apos;avis ne sera envoyée pour tout le service du <strong>{serviceLabel} du {formattedDate}</strong>.</>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-semibold text-white flex items-center gap-2 transition-colors",
                  suppressed ? "bg-slate-800 hover:bg-slate-900" : "bg-orange-500 hover:bg-orange-600"
                )}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
