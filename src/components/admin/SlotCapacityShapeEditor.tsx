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

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { Loader2, Minus, Plus, X, AlertTriangle, type LucideProps } from "lucide-react";
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

/** Table vue de dessus avec une chaise de chaque côté (même trait que lucide). */
function TableIcon({ size = 24, className, strokeWidth = 1.8 }: Pick<LucideProps, "size" | "className" | "strokeWidth">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M2.5 10v4M21.5 10v4" />
    </svg>
  );
}

interface SlotCapacityShapeButtonProps {
  capacityShape: CapacityShapeSummaryDto;
  /** true si l'éditeur est ouvert sous la ligne du créneau. */
  isOpen: boolean;
  onClick: () => void;
  /** true si le créneau est fermé — la typologie ne peut alors pas être activée. */
  disabled?: boolean;
  /** Agrandit la roue à partir de `lg` (≥ 1024 px), zone tactile de 44 px inchangée. */
  large?: boolean;
}

/**
 * Bouton « table » affiché sur la ligne du créneau : active / ouvre la typologie.
 * - désactivée (§34) : icône grise ;
 * - active (§38) : icône verte, résumé « 1×4 · 2×2 » en info-bulle ;
 * - à revoir (§39) : icône orange avec pastille d'alerte.
 */
export function SlotCapacityShapeButton({
  capacityShape,
  isOpen,
  onClick,
  disabled,
  large,
}: SlotCapacityShapeButtonProps) {
  const needsReview = capacityShape?.needsReview ?? false;
  const enabled = capacityShape?.enabled ?? false;
  const isActive = enabled || needsReview;
  // Une typologie existante reste consultable même sur un créneau fermé.
  const isDisabled = disabled && !isActive;
  const summary = isActive && capacityShape ? summarizeBuckets(capacityShape.buckets) : null;
  const label = needsReview
    ? `Tables restantes à revoir (${summary})`
    : enabled
      ? `Tables restantes (${summary})`
      : "Définir les tables restantes";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-expanded={isOpen}
      aria-label={label}
      title={label}
      className={cn(
        "group flex h-11 w-9 shrink-0 items-center justify-center touch-manipulation focus:outline-none disabled:cursor-not-allowed",
        large && "lg:w-11"
      )}
    >
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
          large && "lg:h-10 lg:w-10",
          "group-focus-visible:ring-2 group-focus-visible:ring-emerald-500",
          needsReview
            ? "border-amber-200 bg-amber-50 text-amber-600"
            : enabled
              ? "border-emerald-200 bg-emerald-50 text-emerald-600"
              : "border-slate-200 bg-white text-slate-500",
          isOpen && "ring-2 ring-emerald-500/40",
          isDisabled && "border-slate-100 text-slate-300"
        )}
      >
        <TableIcon size={16} className={cn(large && "lg:h-5 lg:w-5")} />
        {needsReview && (
          <AlertTriangle
            size={10}
            className="absolute -right-1 -top-1 rounded-full bg-white text-amber-600"
          />
        )}
      </span>
    </button>
  );
}

interface SlotCapacityShapeEditorProps {
  slotId: Id<"slots">;
  remainingCapacity: number;
  capacityShape: CapacityShapeSummaryDto;
  /** Ferme l'éditeur (annulation ou après enregistrement). */
  onClose: () => void;
  /** Agrandit boutons et textes à partir de `lg` (≥ 1024 px, iPad mini paysage). */
  large?: boolean;
  /**
   * Version une ligne (options d'un créneau sur tablette) : « Tables » puis les
   * tailles côte à côte. Pas d'interrupteur : l'option est active dès qu'il reste
   * une table, désactivée quand tout est à 0.
   */
  inline?: boolean;
}

/**
 * Éditeur de typologie, affiché sous la ligne du créneau quand le bouton
 * `SlotCapacityShapeButton` est activé. Monté à l'ouverture : l'état local
 * part toujours de la dernière valeur serveur.
 */
export function SlotCapacityShapeEditor({
  slotId,
  remainingCapacity,
  capacityShape,
  onClose,
  large,
  inline,
}: SlotCapacityShapeEditorProps) {
  const configure = useMutation(api.slotCapacityShapes.configure);
  const disableShape = useMutation(api.slotCapacityShapes.disable);

  const [isSaving, setIsSaving] = useState(false);
  // Le switch reflète les compteurs : activé seulement s'il reste au moins une
  // table. Il s'allume dès qu'on ajoute une table.
  const [localEnabled, setLocalEnabled] = useState(
    !!capacityShape?.enabled && capacityShape.buckets.some((b) => b.quantity > 0)
  );
  // Une typologie désactivée repart de zéro : on n'affiche jamais les anciens
  // compteurs conservés en base.
  const [localBuckets, setLocalBuckets] = useState<CapacityBucketDto[]>(
    capacityShape?.enabled ? capacityShape.buckets : []
  );

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
  // Tous les compteurs à 0 = option désactivée, quel que soit le switch.
  const effectiveEnabled = localEnabled && hasAtLeastOneBucket;
  const serverEnabled = capacityShape?.enabled ?? false;

  const hasChanges = effectiveEnabled
    ? !serverEnabled ||
      JSON.stringify(sortBuckets(localBuckets.filter((b) => b.quantity > 0))) !==
        JSON.stringify(sortBuckets((capacityShape?.buckets ?? []).filter((b) => b.quantity > 0)))
    : serverEnabled || (capacityShape?.needsReview ?? false);
  const canSave = effectiveEnabled ? !exceedsRemaining : true;

  const setQuantity = (maxPartySize: number, quantity: number) => {
    const clamped = Math.max(0, quantity);
    const existing = localBuckets.find((b) => b.maxPartySize === maxPartySize);
    const next = existing
      ? localBuckets.map((b) => (b.maxPartySize === maxPartySize ? { ...b, quantity: clamped } : b))
      : [...localBuckets, { maxPartySize, quantity: clamped }];
    setLocalBuckets(next);
    // Le switch suit les compteurs : au moins une table = activé, tout à 0 = désactivé.
    setLocalEnabled(next.some((b) => b.quantity > 0));
  };

  const handleToggleEnabled = (next: boolean) => {
    setLocalEnabled(next);
    // Désactiver remet les compteurs à zéro.
    if (!next) setLocalBuckets([]);
    // Rien à désactiver côté serveur : on referme simplement.
    if (!next && !capacityShape?.enabled && !capacityShape?.needsReview) onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!effectiveEnabled) {
        await disableShape({ slotId });
      } else {
        await configure({
          slotId,
          enabled: true,
          buckets: localBuckets.filter((b) => b.quantity > 0),
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving capacity shape:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleDisableFromReview = async () => {
    setIsSaving(true);
    try {
      await disableShape({ slotId });
      onClose();
    } catch (error) {
      console.error("Error disabling capacity shape:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Version une ligne ─────────────────────────────────────────
  if (inline) {
    const needsReview = capacityShape?.needsReview ?? false;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className="w-[54px] shrink-0 text-[12.5px] font-bold leading-tight text-slate-600">
            Tables
            {needsReview && <span className="block text-[11px] text-amber-700">à revoir</span>}
          </span>
          <div className="flex min-w-0 flex-1 gap-1.5">
            {displayBuckets.map((bucket) => (
              <div
                key={bucket.maxPartySize}
                className={cn(
                  "flex h-9 min-w-0 flex-1 items-center justify-between rounded-[10px] pl-2 pr-0.5 text-xs font-bold",
                  bucket.quantity > 0
                    ? needsReview && !hasChanges
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                <span className="whitespace-nowrap">{bucket.maxPartySize} p.</span>
                <span className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setQuantity(bucket.maxPartySize, bucket.quantity - 1)}
                    disabled={bucket.quantity <= 0}
                    aria-label={`Retirer une table de ${bucket.maxPartySize}`}
                    className="flex h-[34px] w-[22px] items-center justify-center text-slate-700 touch-manipulation disabled:text-slate-300"
                  >
                    <Minus size={13} strokeWidth={2.4} />
                  </button>
                  <span className="min-w-[12px] text-center text-[13px] tabular-nums text-slate-900">{bucket.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(bucket.maxPartySize, bucket.quantity + 1)}
                    aria-label={`Ajouter une table de ${bucket.maxPartySize}`}
                    className="flex h-[34px] w-[22px] items-center justify-center text-slate-700 touch-manipulation"
                  >
                    <Plus size={13} strokeWidth={2.4} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
        {exceedsRemaining && (
          <p className="pl-[64px] text-xs font-medium text-red-600">
            {configuredSeatCapacity} places en tables pour {remainingCapacity} couverts restants : réduisez le nombre de tables.
          </p>
        )}
        {(hasChanges || needsReview) && (
          <div className="flex items-center justify-end gap-3 pl-[64px]">
            {needsReview && !hasChanges && (
              <button
                type="button"
                onClick={handleDisableFromReview}
                disabled={isSaving}
                className="text-xs font-semibold text-slate-500 underline hover:text-slate-700"
              >
                Désactiver
              </button>
            )}
            {hasChanges && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !canSave}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : "Enregistrer les tables"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Mode édition ──────────────────────────────────────────────
  return (
    <div className="w-full mt-1 px-2.5 py-3 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3">
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-semibold text-slate-700", large && "lg:text-sm")}>Tables restantes</span>
        <div className="flex items-center gap-2">
          <Switch checked={localEnabled} onCheckedChange={handleToggleEnabled} className="scale-75" />
          <button type="button" onClick={handleCancel} aria-label="Fermer" className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {capacityShape?.needsReview && (
        <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-100 rounded-lg px-2 py-1.5">
          <AlertTriangle size={12} className="shrink-0" />
          <span>
            Tables restantes à revoir : une décision récente est incompatible avec cette configuration.
            Leur application côté widget public est suspendue.
          </span>
        </div>
      )}

      {/* Une colonne par taille de table, côte à côte (retour à la ligne si besoin). */}
      <div
        className={cn(
          "grid grid-cols-[repeat(auto-fit,minmax(4.25rem,1fr))] gap-x-2 gap-y-3",
          large && "lg:grid-cols-[repeat(auto-fit,minmax(6rem,1fr))]"
        )}
      >
        {displayBuckets.map((bucket) => (
          <div key={bucket.maxPartySize} className="flex flex-col items-center gap-1">
            <span className={cn("text-[11px] text-slate-600", large && "lg:text-sm")}>{bucket.maxPartySize} pers.</span>
            <div className={cn("flex items-center", large && "lg:gap-1.5")}>
              <button
                type="button"
                onClick={() => setQuantity(bucket.maxPartySize, bucket.quantity - 1)}
                disabled={bucket.quantity <= 0}
                aria-label={`Retirer une table de ${bucket.maxPartySize}`}
                className={cn(
                  "flex h-[26px] w-[26px] items-center justify-center rounded-full border bg-white transition-colors touch-manipulation",
                  large && "lg:h-[30px] lg:w-[30px]",
                  bucket.quantity <= 0
                    ? "border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-600 active:bg-slate-100"
                )}
              >
                <Minus size={12} className={cn(large && "lg:h-4 lg:w-4")} />
              </button>
              <span className={cn("w-4 text-center text-sm font-semibold tabular-nums text-slate-900", large && "lg:w-6 lg:text-base")}>
                {bucket.quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(bucket.maxPartySize, bucket.quantity + 1)}
                aria-label={`Ajouter une table de ${bucket.maxPartySize}`}
                className={cn(
                  "flex h-[26px] w-[26px] items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors active:bg-slate-100 touch-manipulation",
                  large && "lg:h-[30px] lg:w-[30px]"
                )}
              >
                <Plus size={12} className={cn(large && "lg:h-4 lg:w-4")} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Seul cas bloquant : plus de places en tables que de couverts restants. */}
      {exceedsRemaining && (
        <p className={cn("text-xs font-medium text-red-600", large && "lg:text-sm")}>
          {configuredSeatCapacity} places en tables pour {remainingCapacity} couverts restants : réduisez le nombre de tables.
        </p>
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
          disabled={isSaving || !canSave || !hasChanges}
          className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5", large && "lg:px-4 lg:py-2 lg:text-sm")}
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function sortBuckets(buckets: CapacityBucketDto[]): CapacityBucketDto[] {
  return [...buckets].sort((a, b) => a.maxPartySize - b.maxPartySize);
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
