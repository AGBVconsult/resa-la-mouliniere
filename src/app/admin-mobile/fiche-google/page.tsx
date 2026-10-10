"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MapPin, ExternalLink, Loader2 } from "lucide-react";
import { formatDateLabel } from "../../../../convex/lib/webPush";

const TIMEZONE = "Europe/Brussels";

// Opens the Google Maps app (iOS asks for confirmation); profile → "Votre fiche d'établissement"
const GOOGLE_MAPS_APP_URL = "comgooglemaps://";
const GOOGLE_BUSINESS_WEB_URL = "https://business.google.com/";

const STATUS_LABELS: Record<string, string> = {
  closed: "Fermé",
  modified: "Horaires modifiés",
  open: "Ouvert",
};

/**
 * Opened from the "Fiche Google à mettre à jour" notification:
 * upcoming special periods + shortcuts to edit the Google Business Profile.
 */
export default function FicheGooglePage() {
  const periods = useQuery(api.specialPeriods.list, {});

  const todayDateKey = useMemo(
    () => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date()),
    []
  );

  const upcoming = useMemo(
    () =>
      (periods ?? [])
        .filter((p) => !p.deletedAt && p.endDate >= todayDateKey)
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [periods, todayDateKey]
  );

  return (
    <div className="flex flex-col h-full">
      <header className="px-5 py-4 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-bold text-slate-900">Fiche Google</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-2">
          <a
            href={GOOGLE_MAPS_APP_URL}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
          >
            <MapPin className="w-4 h-4" />
            Ouvrir Google Maps
          </a>
          <a
            href={GOOGLE_BUSINESS_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 active:scale-[0.98] transition-transform"
          >
            <ExternalLink className="w-4 h-4" />
            Modifier sur le web
          </a>
          <p className="text-xs text-slate-500 text-center">
            Dans Google Maps : photo de profil › Votre fiche d&apos;établissement › Modifier › Horaires.
          </p>
        </div>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Périodes spéciales à venir
          </h2>
          {periods === undefined ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune période spéciale à venir.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((p) => (
                <li key={p._id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {STATUS_LABELS[p.applyRules.status] ?? p.applyRules.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {formatDateLabel(p.startDate)} → {formatDateLabel(p.endDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
