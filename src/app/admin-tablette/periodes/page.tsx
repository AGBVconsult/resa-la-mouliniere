"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AlertTriangle, ChevronLeft, DoorClosed, DoorOpen, Loader2, Moon, Plus, RefreshCw, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { PeriodEditorPopup } from "./components/PeriodEditorPopup";
import { DeletePeriodPopup } from "./components/DeletePeriodPopup";
import {
  daysBetween,
  formatDate,
  formatDays,
  formatShortDate,
  kindOf,
  overlapsOf,
  relativeLabel,
  todayKey,
  type Period,
  type PeriodKind,
} from "./periodUtils";

type EditorState = { kind: PeriodKind; period?: Period } | null;

export default function TabletPeriodesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const periods = useQuery(api.specialPeriods.list, {});
  const regenerateSlots = useMutation(api.specialPeriods.regenerateAllSlots);
  const [editor, setEditor] = useState<EditorState>(null);
  const [toDelete, setToDelete] = useState<Period | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const today = todayKey();
  // Périodes en cours ou à venir, dans l'ordre chronologique
  const active = useMemo(
    () => (periods ?? []).filter((p) => p.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [periods, today]
  );
  const ouvertures = active.filter((p) => kindOf(p) === "ouverture");
  const fermetures = active.filter((p) => kindOf(p) === "fermeture");

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await regenerateSlots({});
      toast.success("Créneaux régénérés");
    } catch (error) {
      toast.error(formatConvexError(error));
    } finally {
      setIsRegenerating(false);
    }
  };

  const renderRow = (period: Period) => {
    const kind = kindOf(period);
    const when = relativeLabel(period, today);
    const rules = period.applyRules;
    const services = (["lunch", "dinner"] as const).map((service) => {
      const isOpen = rules.services.includes(service);
      const days = (service === "lunch" ? rules.lunchActiveDays : rules.dinnerActiveDays) ?? rules.activeDays;
      const Icon = service === "lunch" ? Sun : Moon;
      return (
        <span
          key={service}
          className={cn(
            "inline-flex items-center gap-1.5 h-6 px-2 rounded-lg bg-[#F4F4F4] text-xs font-medium whitespace-nowrap",
            isOpen ? "text-[#464646]" : "text-[#A5A5A5] line-through"
          )}
        >
          <Icon size={13} strokeWidth={1.75} />
          {service === "lunch" ? "Midi" : "Soir"}
          {isOpen && ` · ${formatDays(days)}`}
        </span>
      );
    });

    return (
      <div
        key={period._id}
        role="button"
        tabIndex={0}
        onClick={() => setEditor({ kind, period })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditor({ kind, period });
          }
        }}
        className="flex items-center gap-3.5 px-4 py-3.5 border-b border-[#F3F3F3] hover:bg-[#FAFAFA] active:bg-[#F5F5F5] transition-colors cursor-pointer"
      >
        <span className={cn("w-1 h-10 rounded-full shrink-0", kind === "ouverture" ? "bg-emerald-500" : "bg-red-500")} />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="text-base font-semibold truncate">{period.name}</span>
          <span className="text-[13px] text-[#6E6E6E] tabular-nums">
            {formatDate(period.startDate)} – {formatDate(period.endDate)}
            <span className="mx-2 text-[#C5C5C5]">•</span>
            {daysBetween(period.startDate, period.endDate) + 1} jours
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {kind === "ouverture" ? (
              services
            ) : (
              <span className="inline-flex items-center h-6 px-2 rounded-lg bg-[#F4F4F4] text-xs font-medium text-[#464646]">
                Midi et soir fermés
              </span>
            )}
            {overlapsOf(period, active).map(({ other, from, to }) => (
              <span
                key={other._id}
                className="inline-flex items-center gap-1.5 min-h-6 px-2 py-0.5 rounded-lg bg-[#FFF1E3] text-xs font-medium text-[#9A4A0F]"
              >
                <AlertTriangle size={13} strokeWidth={1.75} className="shrink-0" />
                {kind === "ouverture"
                  ? `Fermé du ${formatShortDate(from)} au ${formatShortDate(to)} : « ${other.name} » est prioritaire`
                  : `Prioritaire sur « ${other.name} » du ${formatShortDate(from)} au ${formatShortDate(to)}`}
              </span>
            ))}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 h-6 px-2.5 flex items-center rounded-full text-xs font-semibold whitespace-nowrap",
            when.current ? "bg-[#3884FF] text-white" : "bg-[#EFEFEF] text-[#464646]"
          )}
        >
          {when.label}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setToDelete(period);
          }}
          aria-label={`Supprimer ${period.name}`}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[#8A8A8A] hover:bg-red-50 hover:text-red-600 transition-colors active:scale-95"
        >
          <Trash2 size={18} strokeWidth={1.6} />
        </button>
      </div>
    );
  };

  const renderColumn = (kind: PeriodKind, list: Period[]) => {
    const isOuverture = kind === "ouverture";
    const Icon = isOuverture ? DoorOpen : DoorClosed;
    return (
      <div className={cn("w-1/2 flex flex-col min-h-0", isOuverture && "border-r border-[#E5E5E5]")}>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#F6F6F6] border-b border-[#E5E5E5]">
          <Icon size={18} strokeWidth={1.75} className={isOuverture ? "text-emerald-600" : "text-red-600"} />
          <span className="font-bold">{isOuverture ? "Ouvertures" : "Fermetures"}</span>
          <span className="text-sm text-[#6E6E6E] tabular-nums">{list.length}</span>
          <button
            type="button"
            onClick={() => setEditor({ kind })}
            className="ml-auto h-8 px-1.5 flex items-center gap-1 text-sm font-medium text-[#3884FF] hover:text-[#2F74E6] transition-colors active:scale-95"
          >
            <Plus size={16} strokeWidth={2} />
            Ajouter
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 py-14 text-sm text-[#8A8A8A]">
              <span className="w-14 h-14 rounded-full bg-[#F1F1F1] flex items-center justify-center text-[#9A9A9A]">
                <Icon size={24} strokeWidth={1.5} />
              </span>
              {isOuverture ? "Aucune ouverture exceptionnelle" : "Aucune fermeture exceptionnelle"}
            </div>
          ) : (
            list.map(renderRow)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F6F6F6] animate-in slide-in-from-right-4 duration-300">
      <header className="relative flex items-center pt-12 pb-10 px-8 border-b border-[#E5E5E5] bg-white shrink-0">
        {/* Retour aux réservations, au style des pastilles de navigation */}
        <button
          type="button"
          onClick={() => router.push("/admin-tablette/reservations")}
          className="h-9 pl-2 pr-4 flex items-center gap-1 rounded-full bg-[#EFEFEF] text-sm font-medium text-[#0C0C0C] hover:bg-[#E6E6E6] transition-colors active:scale-95"
        >
          <ChevronLeft size={18} strokeWidth={1.75} className="text-[#6E6E6E]" />
          Réservations
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-lg font-bold">Périodes spéciales</h1>
          <p className="text-[13px] text-[#6E6E6E]">Ouvertures et fermetures exceptionnelles</p>
        </div>

        {active.length > 0 && (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            aria-label="Régénérer les créneaux"
            title="Régénérer les créneaux"
            className="ml-auto w-10 h-10 flex items-center justify-center text-[#3884FF] hover:text-[#2F74E6] disabled:opacity-60 transition-colors active:scale-95"
          >
            <RefreshCw size={22} strokeWidth={1.75} className={cn(isRegenerating && "animate-spin")} />
          </button>
        )}
      </header>

      {periods === undefined ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {renderColumn("ouverture", ouvertures)}
          {renderColumn("fermeture", fermetures)}
        </div>
      )}

      {editor && (
        <PeriodEditorPopup
          kind={editor.kind}
          period={editor.period}
          onClose={() => setEditor(null)}
          onDelete={editor.period ? () => setToDelete(editor.period!) : undefined}
        />
      )}
      {toDelete && (
        <DeletePeriodPopup
          period={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={() => {
            setToDelete(null);
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}
