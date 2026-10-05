import { Ghost, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type OutcomeKind = "noshow" | "incident";

const OUTCOME_CONFIG: Record<OutcomeKind, { label: string; icon: typeof Ghost; classes: string }> = {
  noshow: { label: "No-show", icon: Ghost, classes: "bg-pink-100 text-pink-600" },
  incident: { label: "Incident", icon: AlertTriangle, classes: "bg-orange-100 text-orange-600" },
};

interface OutcomeSource {
  status: string;
  dateKey: string;
  lastNoShowDateKey?: string | null;
  lastIncidentDateKey?: string | null;
}

/**
 * Indicateur affiché à droite du badge de visites : la réservation elle-même
 * ou la précédente du client s'est soldée par un no-show ou un incident.
 */
export function OutcomeIndicator({ reservation, size = 20, className }: {
  reservation: OutcomeSource;
  /** Diamètre de la pastille en px */
  size?: number;
  className?: string;
}) {
  let kind: OutcomeKind;
  let dateKey: string;
  let isSelf = false;
  if (reservation.status === "noshow" || reservation.status === "incident") {
    kind = reservation.status;
    dateKey = reservation.dateKey;
    isSelf = true;
  } else if (reservation.lastNoShowDateKey) {
    kind = "noshow";
    dateKey = reservation.lastNoShowDateKey;
  } else if (reservation.lastIncidentDateKey) {
    kind = "incident";
    dateKey = reservation.lastIncidentDateKey;
  } else {
    return null;
  }

  const { label, icon: IconComponent, classes } = OUTCOME_CONFIG[kind];
  const date = new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const text = isSelf ? `${label} · ${date}` : `Dernière réservation : ${label.toLowerCase()} · ${date}`;

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full", classes, className)}
      style={{ width: size, height: size }}
      title={text}
      aria-label={text}
    >
      <IconComponent size={Math.round(size * 0.65)} strokeWidth={2} />
    </span>
  );
}
