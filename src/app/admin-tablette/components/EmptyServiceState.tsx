"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface EmptyServiceStateProps {
  service: "lunch" | "dinner";
  date: Date;
  isToday: boolean;
  /** Créneaux du service pour ce jour */
  slots: Array<{ isOpen: boolean; capacity: number }>;
}

const STROKE = {
  stroke: "#BDBDBD",
  strokeWidth: 3,
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Carnet de réservations ouvert et vierge, avec un stylo bleu */
function BookIllustration() {
  return (
    <svg viewBox="0 0 200 150" className="w-[200px] h-[150px] overflow-visible" aria-hidden>
      <ellipse cx="100" cy="138" rx="80" ry="7" fill="#F1F1F1" />
      <path
        d="M100 32c-20-10-48-12-72-6v100c24-6 52-4 72 6 20-10 48-12 72-6V26c-24-6-52-4-72 6z"
        {...STROKE}
        fill="#FFFFFF"
      />
      <path d="M100 32v100" stroke="#D6D6D6" strokeWidth={2} />
      <path
        d="M44 52h40M44 68h40M44 84h28M116 52h40M116 68h40M116 84h28"
        stroke="#E2E2E2"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <g>
        <path d="M142 104l26-26 8 8-26 26-11 3z" fill="#3884FF" />
        <path d="M164 82l8 8" stroke="#FFFFFF" strokeWidth={2} />
      </g>
    </svg>
  );
}

/**
 * État vide de la liste d'un service : illustration du carnet, message adapté au
 * service et au jour, rappel des couverts encore disponibles.
 */
export function EmptyServiceState({ service, date, isToday, slots }: EmptyServiceStateProps) {
  const moment = service === "lunch" ? "midi" : "soir";
  const when = isToday ? `ce ${moment}` : `${format(date, "EEEE", { locale: fr })} ${moment}`;

  const openSlots = slots.filter((s) => s.isOpen);
  const availableCovers = openSlots.reduce((sum, s) => sum + s.capacity, 0);
  const isOpen = openSlots.length > 0;

  return (
    <div className="h-full min-h-[360px] flex items-center justify-center px-8 py-12">
      <div className="flex flex-col items-center text-center gap-3.5 max-w-[380px]">
        <BookIllustration />
        <h3 className="mt-1.5 text-xl font-semibold text-[#0C0C0C] text-balance">
          Aucune réservation {when}
        </h3>
        <p className="text-sm leading-relaxed text-[#6E6E6E]">
          Le service est encore calme.
          <br />
          Les réservations apparaîtront ici.
        </p>
        <span className="flex items-center gap-2 h-8 px-3.5 rounded-full bg-[#F6F6F6] text-[13px] text-[#464646]">
          <span className={cn("w-2 h-2 rounded-full", isOpen ? "bg-[#22C55E]" : "bg-[#BDBDBD]")} />
          {isOpen ? (
            <>
              <span className="font-bold text-[#0C0C0C] tabular-nums">{availableCovers}</span>
              couverts disponibles · {openSlots.length} créneau{openSlots.length > 1 ? "x" : ""} ouvert{openSlots.length > 1 ? "s" : ""}
            </>
          ) : (
            "Aucun créneau ouvert"
          )}
        </span>
      </div>
    </div>
  );
}
