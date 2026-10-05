import { Ghost, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type OutcomeKind = "noshow" | "incident";

const OUTCOME_CONFIG: Record<OutcomeKind, { label: string; icon: typeof Ghost; classes: string }> = {
  noshow: { label: "No-show", icon: Ghost, classes: "text-pink-400" },
  incident: { label: "Incident", icon: AlertTriangle, classes: "text-red-500" },
};

interface OutcomeSource {
  status: string;
  dateKey: string;
  lastNoShowDateKey?: string | null;
  lastIncidentDateKey?: string | null;
}

/**
 * No-show / incident de la réservation elle-même ou, à défaut, de la précédente
 * du client. Les deux sont exclusifs : un seul indicateur au même endroit.
 */
export function getOutcome(reservation: OutcomeSource): { kind: OutcomeKind; dateKey: string; isSelf: boolean } | null {
  if (reservation.status === "noshow" || reservation.status === "incident") {
    return { kind: reservation.status, dateKey: reservation.dateKey, isSelf: true };
  }
  if (reservation.lastNoShowDateKey) {
    return { kind: "noshow", dateKey: reservation.lastNoShowDateKey, isSelf: false };
  }
  if (reservation.lastIncidentDateKey) {
    return { kind: "incident", dateKey: reservation.lastIncidentDateKey, isSelf: false };
  }
  return null;
}

/**
 * Icône no-show (fantôme) ou incident (triangle), même style que les
 * indicateurs « souvent en retard » / « prend son temps ».
 */
export function OutcomeIndicator({ reservation, size = 18, className }: {
  reservation: OutcomeSource;
  /** Taille de l'icône en px */
  size?: number;
  className?: string;
}) {
  const outcome = getOutcome(reservation);
  if (!outcome) return null;

  const { label, icon: IconComponent, classes } = OUTCOME_CONFIG[outcome.kind];
  const date = new Date(`${outcome.dateKey}T12:00:00`).toLocaleDateString("fr-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const text = outcome.isSelf ? `${label} · ${date}` : `Dernière réservation : ${label.toLowerCase()} · ${date}`;

  return (
    <span className={cn("flex shrink-0", classes, className)} title={text} aria-label={text}>
      <IconComponent size={size} strokeWidth={2} />
    </span>
  );
}
