import {
  AlertTriangle,
  Ban,
  BookmarkCheck,
  Check,
  CheckCheck,
  Clock,
  Ghost,
  ShieldQuestion,
  UserRoundCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { ReservationStatus } from "../../../../../spec/contracts.generated";

export interface Reservation {
  _id: Id<"reservations">;
  dateKey: string;
  timeKey: string;
  service: "lunch" | "dinner";
  status: ReservationStatus;
  partySize: number;
  adults: number;
  childrenCount: number;
  babyCount: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: "fr" | "nl" | "en" | "de" | "it";
  note?: string;
  tableIds: Id<"tables">[];
  primaryTableId?: Id<"tables">;
  options?: string[];
  source: string;
  version: number;
  totalVisits?: number;
  clientId?: Id<"clients">;
  hasClientNotes?: boolean;
  isLateClient?: boolean;
  isSlowClient?: boolean;
}

export type Service = "lunch" | "dinner";

/** "assigned" est un statut d'affichage : confirmed + table attribuée. */
export type DisplayStatus = ReservationStatus | "assigned";

export interface StatusStyle {
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Fond de la tuile de statut (palette pastel partagée avec le plan de salle) */
  tile: string;
  /** Couleur d'encre sur la tuile */
  ink: string;
  next: ReservationStatus | null;
}

// Palette pastel identique à la v1 et au plan de salle, pour que la couleur
// d'une ligne corresponde toujours à celle de sa table.
export const STATUS_STYLES: Record<string, StatusStyle> = {
  pending: { label: "En attente", hint: "À valider", icon: Clock, tile: "bg-[#FFEDD5]", ink: "text-orange-800", next: "confirmed" },
  confirmed: { label: "Confirmé", hint: "À assigner", icon: ShieldQuestion, tile: "bg-[#FEF3C7]", ink: "text-amber-800", next: "cardPlaced" },
  assigned: { label: "Assignée", hint: "Prêt pour l'accueil", icon: Check, tile: "bg-[#D0E1F9]", ink: "text-blue-800", next: "cardPlaced" },
  cardPlaced: { label: "Carton", hint: "Carton posé sur table", icon: CheckCheck, tile: "bg-[#B8D0EA]", ink: "text-blue-900", next: "seated" },
  seated: { label: "Installé", hint: "Client à table", icon: UserRoundCheck, tile: "bg-[#91BDA0]", ink: "text-green-950", next: "completed" },
  completed: { label: "Terminé", hint: "Table libérée", icon: BookmarkCheck, tile: "bg-stone-100", ink: "text-stone-600", next: null },
  noshow: { label: "No-show", hint: "Absent", icon: Ghost, tile: "bg-[#FCE7F3]", ink: "text-pink-800", next: null },
  cancelled: { label: "Annulé", hint: "Annulation client", icon: XCircle, tile: "bg-[#FEE2E2]", ink: "text-red-800", next: null },
  refused: { label: "Refusé", hint: "Refus établissement", icon: Ban, tile: "bg-stone-200", ink: "text-stone-700", next: null },
  incident: { label: "Incident", hint: "Problème majeur", icon: AlertTriangle, tile: "bg-slate-200", ink: "text-slate-800", next: null },
};

export const MENU_ORDER: DisplayStatus[] = [
  "pending",
  "confirmed",
  "assigned",
  "cardPlaced",
  "seated",
  "completed",
  "noshow",
  "cancelled",
  "refused",
  "incident",
];

export const INACTIVE_STATUSES: ReservationStatus[] = ["cancelled", "noshow"];

export function isUnassigned(res: Reservation) {
  return !res.primaryTableId && res.tableIds.length === 0;
}

export function getDisplayStatus(status: ReservationStatus, hasTable: boolean): DisplayStatus {
  return status === "confirmed" && hasTable ? "assigned" : status;
}

/** Mêmes règles que la v1 : on ne propose pas de revenir en arrière dans le flux. */
export function getMenuStatuses(current: DisplayStatus): DisplayStatus[] {
  const hidden: DisplayStatus[] =
    current === "pending"
      ? []
      : current === "confirmed"
        ? ["pending"]
        : current === "assigned"
          ? ["pending", "confirmed"]
          : current === "cardPlaced"
            ? ["pending", "confirmed", "assigned"]
            : ["pending", "confirmed", "cardPlaced"];
  return MENU_ORDER.filter((s) => s === current || !hidden.includes(s));
}

export function brusselsDefaultService(): Service {
  const now = new Date();
  const hour = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Brussels" })).getHours();
  return hour >= 16 ? "dinner" : "lunch";
}
