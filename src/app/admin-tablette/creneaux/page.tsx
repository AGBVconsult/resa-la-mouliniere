"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ChevronLeft, Gauge, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { FloatingSaveBar } from "@/components/admin/FloatingSaveBar";
import { ServiceColumn } from "./components/ServiceColumn";
import { ProgressiveFillingPopup } from "./components/ProgressiveFillingPopup";
import {
  buildTemplateUpdates,
  countChanges,
  deriveWeekSchedule,
  type Service,
  type ServiceSchedule,
  type WeekSchedule,
} from "./scheduleUtils";

/** Brouillon : `base` = semaine type au début de l'édition, `current` = semaine type modifiée. */
type Draft = { base: WeekSchedule; current: WeekSchedule };

export default function TabletCreneauxPage() {
  const router = useRouter();
  const { toast } = useToast();
  const templates = useQuery(api.weeklyTemplates.list);
  const settings = useQuery(api.admin.getSettings);
  const upsertTemplate = useMutation(api.weeklyTemplates.upsert);
  const syncSlots = useMutation(api.weeklyTemplates.syncSlotsWithTemplate);

  const saved = useMemo(() => (templates ? deriveWeekSchedule(templates) : null), [templates]);
  // null tant que rien n'est modifié : la page suit alors le serveur en direct.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showProgressiveFilling, setShowProgressiveFilling] = useState(false);

  const schedule = draft?.current ?? saved;
  const changeCount = draft ? countChanges(draft.base, draft.current) : 0;
  const progressiveFilling = settings?.progressiveFilling;

  const updateService = (service: Service, update: (prev: ServiceSchedule) => ServiceSchedule) => {
    if (!saved) return;
    setDraft((prev) => {
      const base = prev?.base ?? saved;
      const from = prev?.current ?? saved;
      const current = { ...from, [service]: update(from[service]) };
      return countChanges(base, current) === 0 ? null : { base, current };
    });
  };

  const handleSave = async () => {
    if (!draft || !templates) return;
    setIsSaving(true);
    try {
      // Chaque modèle modifié est réécrit puis répercuté sur les créneaux des 6 prochains mois
      // (hors périodes spéciales et réglages du jour), comme sur la page web.
      for (const update of buildTemplateUpdates(templates, draft.base, draft.current)) {
        await upsertTemplate(update);
        await syncSlots({ dayOfWeek: update.dayOfWeek, service: update.service });
      }
      setDraft(null);
      toast.success("Créneaux enregistrés");
    } catch (error) {
      toast.error(formatConvexError(error));
    } finally {
      setIsSaving(false);
    }
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
          <h1 className="text-lg font-bold">Créneaux</h1>
          <p className="text-[13px] text-[#6E6E6E]">Horaires et capacités de la semaine</p>
        </div>

        {progressiveFilling && (
          <button
            type="button"
            onClick={() => setShowProgressiveFilling(true)}
            aria-haspopup="dialog"
            className="ml-auto h-9 pl-3 pr-4 flex items-center gap-2 rounded-full bg-[#EFEFEF] text-sm font-medium text-[#0C0C0C] hover:bg-[#E6E6E6] transition-colors active:scale-95"
          >
            <Gauge size={16} strokeWidth={1.75} className="text-[#6E6E6E]" />
            Remplissage progressif
            {progressiveFilling.enabled && (
              <span className="h-5 px-1.5 flex items-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">
                Actif
              </span>
            )}
          </button>
        )}
      </header>

      {schedule === null ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="relative flex-1 flex min-h-0">
          {/* Pas d'édition pendant l'enregistrement : elle serait perdue à la fin. */}
          <div className={cn("flex-1 flex min-h-0", isSaving && "pointer-events-none")}>
            <ServiceColumn
              service="lunch"
              schedule={schedule.lunch}
              onChange={(update) => updateService("lunch", update)}
              bottomInset={changeCount > 0}
            />
            <ServiceColumn
              service="dinner"
              schedule={schedule.dinner}
              onChange={(update) => updateService("dinner", update)}
              bottomInset={changeCount > 0}
            />
          </div>

          {/* Barre flottante : visible uniquement s'il y a des modifications */}
          <FloatingSaveBar
            visible={changeCount > 0}
            changeCount={changeCount}
            label={`${changeCount} modification${changeCount > 1 ? "s" : ""}`}
            isSaving={isSaving}
            onCancel={() => setDraft(null)}
            onSave={handleSave}
          />
        </div>
      )}

      {showProgressiveFilling && progressiveFilling && (
        <ProgressiveFillingPopup settings={progressiveFilling} onClose={() => setShowProgressiveFilling(false)} />
      )}
    </div>
  );
}
