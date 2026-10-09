"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { AlertTriangle, Loader2, Minus, Moon, Plus, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/utils/haptics";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { Toggle } from "../../components/Toggle";
import { TIME_KEY_PATTERN } from "../scheduleUtils";

export interface ProgressiveFillingSettings {
  enabled: boolean;
  lunchThreshold: string;
  dinnerThreshold: string;
  minFillPercent: number;
}

const PERCENT_STEP = 5;

interface ProgressiveFillingPopupProps {
  settings: ProgressiveFillingSettings;
  onClose: () => void;
}

/** Réglage du remplissage progressif (même contenu que la carte de la page web Créneaux). */
export function ProgressiveFillingPopup({ settings, onClose }: ProgressiveFillingPopupProps) {
  const updateProgressiveFilling = useMutation(api.admin.updateProgressiveFilling);
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [lunchThreshold, setLunchThreshold] = useState(settings.lunchThreshold);
  const [dinnerThreshold, setDinnerThreshold] = useState(settings.dinnerThreshold);
  const [minFillPercent, setMinFillPercent] = useState(settings.minFillPercent);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const hasChanges =
    enabled !== settings.enabled ||
    lunchThreshold !== settings.lunchThreshold ||
    dinnerThreshold !== settings.dinnerThreshold ||
    minFillPercent !== settings.minFillPercent;

  const stepPercent = (delta: number) => {
    const next = Math.min(100, Math.max(0, minFillPercent + delta));
    if (next === minFillPercent) return;
    setMinFillPercent(next);
    triggerHaptic("tick");
  };

  const handleSave = async () => {
    setError(null);
    if (!TIME_KEY_PATTERN.test(lunchThreshold) || !TIME_KEY_PATTERN.test(dinnerThreshold)) {
      return setError("Indiquez une heure pour chaque seuil.");
    }
    setIsSaving(true);
    try {
      await updateProgressiveFilling({ enabled, lunchThreshold, dinnerThreshold, minFillPercent });
      toast.success("Remplissage progressif enregistré");
      onClose();
    } catch (err) {
      setError(formatConvexError(err));
      setIsSaving(false);
    }
  };

  const timeInputClass =
    "h-10 shrink-0 rounded-xl border border-[#E2E2E2] bg-white px-3 text-[15px] tabular-nums text-[#0C0C0C] focus:outline-none focus:border-[#3884FF] focus:ring-[3px] focus:ring-[#3884FF]/20";

  const thresholdRow = (service: "lunch" | "dinner") => {
    const isLunch = service === "lunch";
    const Icon = isLunch ? Sun : Moon;
    const id = `progressive-${service}-threshold`;
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon size={18} strokeWidth={1.75} className={cn("shrink-0", isLunch ? "text-[#D9A441]" : "text-[#6E6E6E]")} />
        <label htmlFor={id} className="flex-1 min-w-0">
          <span className="block text-[15px] font-medium">{isLunch ? "Seuil du midi" : "Seuil du soir"}</span>
          <span className="block text-xs text-[#8A8A8A] mt-0.5">Créneaux concernés à partir de cette heure</span>
        </label>
        <input
          id={id}
          type="time"
          value={isLunch ? lunchThreshold : dinnerThreshold}
          onChange={(e) => (isLunch ? setLunchThreshold : setDinnerThreshold)(e.target.value)}
          className={timeInputClass}
        />
      </div>
    );
  };

  const percentButton = (delta: number) => {
    const disabled = delta < 0 ? minFillPercent <= 0 : minFillPercent >= 100;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => stepPercent(delta)}
        aria-label={`${delta < 0 ? "Diminuer" : "Augmenter"} le taux de remplissage minimum`}
        className="flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 touch-manipulation transition-colors active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:text-slate-300"
      >
        {delta < 0 ? <Minus size={20} strokeWidth={2.2} /> : <Plus size={20} strokeWidth={2.2} />}
      </button>
    );
  };

  return (
    // Centrage par flex : un translate serait écrasé par l'animation d'entrée
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="progressive-filling-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] max-h-full bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0">
          <h2 id="progressive-filling-title" className="text-lg font-bold">Remplissage progressif</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <p className="text-[15px] text-[#6E6E6E] leading-relaxed">
            Masque les créneaux tardifs tant que le créneau précédent n&apos;a pas atteint le taux de remplissage
            minimum, pour concentrer les réservations en début de service.
          </p>

          <div className="bg-[#F6F6F6] rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#ECECEC]">
              <span className="font-semibold">Activer le remplissage progressif</span>
              <Toggle checked={enabled} onChange={() => setEnabled((v) => !v)} label="Activer le remplissage progressif" />
            </div>

            <div className={cn("p-3 transition-opacity", !enabled && "opacity-45 pointer-events-none")}>
              <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#F3F3F3]">
                {thresholdRow("lunch")}
                {thresholdRow("dinner")}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-medium">Remplissage minimum</span>
                    <span className="block text-xs text-[#8A8A8A] mt-0.5">
                      Du créneau précédent, en % de sa capacité réservée
                    </span>
                  </span>
                  <div className="flex items-center select-none">
                    <span aria-live="polite" className="w-[52px] shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
                      {minFillPercent} %
                    </span>
                    <span aria-hidden className="mx-1.5 h-5 w-px bg-slate-200" />
                    {percentButton(-PERCENT_STEP)}
                    {percentButton(PERCENT_STEP)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EFEFEF] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 px-5 rounded-full bg-[#F1F1F1] text-sm font-semibold text-[#464646] disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="h-10 px-5 rounded-full bg-[#3884FF] hover:bg-[#2F74E6] text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60 transition-colors"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
