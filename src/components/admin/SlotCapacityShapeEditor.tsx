"use client";

/**
 * PRD-013 — Typologie restante par créneau (Slot Capacity Shape).
 *
 * Composant partagé entre la tablette (`admin-tablette/DaySettingsPopup`) et
 * le desktop (`admin/reservations/DayOverrideModal`) — §40 du PRD impose une
 * seule logique métier, pas deux implémentations divergentes.
 *
 * Philosophie : la typologie est une information opérationnelle ponctuelle
 * saisie par l'humain. OFF par défaut, jamais préremplie depuis le plan de
 * salle, jamais de combinaison automatique de buckets côté UI (c'est déjà
 * garanti côté serveur par `convex/lib/capacityShape.ts`).
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { Loader2, Minus, Plus, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type CapacityBucketDto = { maxPartySize: number; quantity: number };

export type CapacityShapeSummaryDto = {
  enabled: boolean;
  effectiveEnabled: boolean;
  needsReview: boolean;
  buckets: CapacityBucketDto[];
  remainingBuckets: CapacityBucketDto[];
  configuredSeatCapacity: number;
  remainingTypedSeatCapacity: number;
} | null;

// Tailles proposées par défaut (§36) — le backend n'est jamais limité à ces
// valeurs, ce ne sont que des raccourcis UI.
const DEFAULT_BUCKET_SIZES = [2, 4, 6, 8];

interface SlotCapacityShapeEditorProps {
  slotId: Id<"slots">;
  remainingCapacity: number;
  capacityShape: CapacityShapeSummaryDto;
  /** true si le créneau est fermé — la typologie ne peut alors pas être activée. */
  disabled?: boolean;
}

export function SlotCapacityShapeEditor({
  slotId,
  remainingCapacity,
  capacityShape,
  disabled,
}: SlotCapacityShapeEditorProps) {
  const configure = useMutation(api.slotCapacityShapes.configure);
  const disableShape = useMutation(api.slotCapacityShapes.disable);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(capacityShape?.enabled ?? false);
  const [localBuckets, setLocalBuckets] = useState<CapacityBucketDto[]>(
    capacityShape?.buckets ?? []
  );
  const [addSizeInput, setAddSizeInput] = useState("");

  // Resync from server only when not actively editing (avoid clobbering
  // in-progress edits on every reactive query update).
  useEffect(() => {
    if (isExpanded) return;
    setLocalEnabled(capacityShape?.enabled ?? false);
    setLocalBuckets(capacityShape?.buckets ?? []);
  }, [capacityShape, isExpanded]);

  const displayBuckets = useMemo(() => {
    const sizes = new Set<number>(DEFAULT_BUCKET_SIZES);
    for (const b of localBuckets) sizes.add(b.maxPartySize);
    return Array.from(sizes)
      .sort((a, b) => a - b)
      .map((maxPartySize) => ({
        maxPartySize,
        quantity: localBuckets.find((b) => b.maxPartySize === maxPartySize)?.quantity ?? 0,
      }));
  }, [localBuckets]);

  const configuredSeatCapacity = useMemo(
    () => localBuckets.reduce((sum, b) => sum + b.maxPartySize * b.quantity, 0),
    [localBuckets]
  );

  const exceedsRemaining = configuredSeatCapacity > remainingCapacity;
  const hasAtLeastOneBucket = localBuckets.some((b) => b.quantity > 0);
  const canSave = localEnabled ? hasAtLeastOneBucket && !exceedsRemaining : true;

  const hasChanges =
    localEnabled !== (capacityShape?.enabled ?? false) ||
    JSON.stringify([...localBuckets].sort((a, b) => a.maxPartySize - b.maxPartySize)) !==
      JSON.stringify([...(capacityShape?.buckets ?? [])].sort((a, b) => a.maxPartySize - b.maxPartySize));

  const setQuantity = (maxPartySize: number, quantity: number) => {
    const clamped = Math.max(0, quantity);
    setLocalBuckets((prev) => {
      const existing = prev.find((b) => b.maxPartySize === maxPartySize);
      if (existing) {
        return prev.map((b) => (b.maxPartySize === maxPartySize ? { ...b, quantity: clamped } : b));
      }
      return [...prev, { maxPartySize, quantity: clamped }];
    });
  };

  const handleAddSize = () => {
    const size = parseInt(addSizeInput, 10);
    if (!size || size < 1) return;
    if (!localBuckets.some((b) => b.maxPartySize === size)) {
      setLocalBuckets((prev) => [...prev, { maxPartySize: size, quantity: 0 }]);
    }
    setAddSizeInput("");
  };

  const handleToggleEnabled = (next: boolean) => {
    setLocalEnabled(next);
    setIsExpanded(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!localEnabled) {
        await disableShape({ slotId });
      } else {
        await configure({
          slotId,
          enabled: true,
          buckets: localBuckets.filter((b) => b.quantity > 0 || b.maxPartySize),
        });
      }
      setIsExpanded(false);
    } catch (error) {
      console.error("Error saving capacity shape:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalEnabled(capacityShape?.enabled ?? false);
    setLocalBuckets(capacityShape?.buckets ?? []);
    setIsExpanded(false);
  };

  const handleDisableFromReview = async () => {
    setIsSaving(true);
    try {
      await disableShape({ slotId });
    } catch (error) {
      console.error("Error disabling capacity shape:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // §34 — Affichage compact quand désactivée : ne rien surcharger visuellement.
  if (!isExpanded && !capacityShape?.needsReview && !capacityShape?.enabled) {
    return (
      <button
        type="button"
        onClick={() => !disabled && setIsExpanded(true)}
        disabled={disabled}
        className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        title="Typologie restante"
      >
        Typologie
      </button>
    );
  }

  // §39 — État needsReview : visible mais l'enforcement public est suspendu.
  if (!isExpanded && capacityShape?.needsReview) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700"
        >
          <AlertTriangle size={12} />
          À revoir · {summarizeBuckets(capacityShape.buckets)}
        </button>
      </div>
    );
  }

  // §38 — Résumé compact quand active.
  if (!isExpanded && capacityShape?.enabled) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 shrink-0"
      >
        {summarizeBuckets(capacityShape.buckets)}
      </button>
    );
  }

  // ── Mode édition ──────────────────────────────────────────────
  return (
    <div className="w-full mt-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">Typologie restante</span>
        <div className="flex items-center gap-2">
          <Switch checked={localEnabled} onCheckedChange={handleToggleEnabled} className="scale-75" />
          <button onClick={handleCancel} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {capacityShape?.needsReview && (
        <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-100 rounded-lg px-2 py-1.5">
          <AlertTriangle size={12} className="shrink-0" />
          <span>
            Typologie à revoir : une décision récente est incompatible avec cette configuration.
            L&apos;application de la typologie côté widget public est suspendue.
          </span>
        </div>
      )}

      {localEnabled && (
        <>
          <p className="text-[11px] text-slate-500">{remainingCapacity} couverts restants</p>

          <div className="space-y-1.5">
            {displayBuckets.map((bucket) => (
              <div key={bucket.maxPartySize} className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600 w-16">{bucket.maxPartySize} pers.</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(bucket.maxPartySize, bucket.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 transition-transform"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{bucket.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(bucket.maxPartySize, bucket.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 transition-transform"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              placeholder="Taille"
              value={addSizeInput}
              onChange={(e) => setAddSizeInput(e.target.value)}
              className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddSize}
              disabled={!addSizeInput}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-40"
            >
              + Ajouter une taille
            </button>
          </div>

          <div
            className={cn(
              "text-xs font-medium",
              exceedsRemaining ? "text-red-600" : "text-slate-600"
            )}
          >
            {configuredSeatCapacity} / {remainingCapacity} couverts typés
            {!exceedsRemaining && configuredSeatCapacity < remainingCapacity && (
              <span className="text-slate-400"> · {remainingCapacity - configuredSeatCapacity} non affectés</span>
            )}
            {exceedsRemaining && <span> — dépasse les couverts restants</span>}
          </div>
        </>
      )}

      <div className="flex gap-2">
        {capacityShape?.needsReview && (
          <button
            type="button"
            onClick={handleDisableFromReview}
            disabled={isSaving}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Désactiver
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !canSave || (!hasChanges && !capacityShape?.needsReview)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

/** §38 — Résumé compact "1×4 · 2×2". Ne montre jamais needsReview ici. */
function summarizeBuckets(buckets: CapacityBucketDto[]): string {
  const active = buckets.filter((b) => b.quantity > 0);
  if (active.length === 0) return "—";
  return active
    .sort((a, b) => a.maxPartySize - b.maxPartySize)
    .map((b) => `${b.quantity}×${b.maxPartySize}`)
    .join(" · ");
}
