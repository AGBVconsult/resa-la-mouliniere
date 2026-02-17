"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { 
  Bell, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  ArrowRight,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type EventType = "created" | "status_change" | "table_assignment" | "updated";
type Status = "pending" | "confirmed" | "seated" | "completed" | "noshow" | "cancelled" | "refused" | "incident";

interface ActivityEvent {
  _id: string;
  eventType: EventType;
  fromStatus?: string;
  toStatus?: string;
  createdAt: number;
  reservation: {
    _id: string;
    firstName: string;
    lastName: string;
    dateKey: string;
    service: "lunch" | "dinner";
    timeKey: string;
    partySize: number;
    status: Status;
    source: "online" | "admin" | "phone" | "walkin";
  } | null;
}

function getEventIcon(event: ActivityEvent) {
  if (event.eventType === "created") {
    return <UserPlus className="w-4 h-4 text-emerald-600" />;
  }
  if (event.eventType === "status_change") {
    if (event.toStatus === "confirmed") {
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    }
    if (event.toStatus === "cancelled" || event.toStatus === "refused") {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (event.toStatus === "seated") {
      return <Users className="w-4 h-4 text-blue-600" />;
    }
    if (event.toStatus === "completed") {
      return <CheckCircle className="w-4 h-4 text-slate-500" />;
    }
    if (event.toStatus === "noshow") {
      return <XCircle className="w-4 h-4 text-orange-500" />;
    }
    if (event.toStatus === "pending") {
      return <Clock className="w-4 h-4 text-amber-500" />;
    }
  }
  return <Bell className="w-4 h-4 text-slate-400" />;
}

function getEventLabel(event: ActivityEvent): string {
  if (event.eventType === "created") {
    return "Nouvelle réservation";
  }
  if (event.eventType === "status_change") {
    const statusLabels: Record<string, string> = {
      pending: "En attente",
      confirmed: "Confirmée",
      seated: "Installé",
      completed: "Terminée",
      noshow: "No-show",
      cancelled: "Annulée",
      refused: "Refusée",
    };
    return statusLabels[event.toStatus ?? ""] ?? "Statut modifié";
  }
  if (event.eventType === "table_assignment") {
    return "Table assignée";
  }
  return "Mise à jour";
}

function getEventColor(event: ActivityEvent): string {
  if (event.eventType === "created") {
    return "bg-emerald-50 border-emerald-200";
  }
  if (event.eventType === "status_change") {
    if (event.toStatus === "confirmed") return "bg-emerald-50 border-emerald-200";
    if (event.toStatus === "cancelled" || event.toStatus === "refused") return "bg-red-50 border-red-200";
    if (event.toStatus === "seated") return "bg-blue-50 border-blue-200";
    if (event.toStatus === "noshow") return "bg-orange-50 border-orange-200";
    if (event.toStatus === "pending") return "bg-amber-50 border-amber-200";
  }
  return "bg-slate-50 border-slate-200";
}

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" });
}

export default function ActivityPage() {
  const activity = useQuery(api.admin.listRecentActivity, { limit: 50 });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-5 py-4 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-bold text-slate-900">Activité</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activity === undefined ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Bell className="w-8 h-8 mb-2" />
            <p className="text-sm">Aucune activité récente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((event: ActivityEvent) => (
              <div
                key={event._id}
                className={`p-3 rounded-xl border ${getEventColor(event)} transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getEventIcon(event)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700">
                        {getEventLabel(event)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(event.createdAt), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </span>
                    </div>
                    {event.reservation && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-900 truncate">
                          {event.reservation.firstName} {event.reservation.lastName}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.reservation.partySize}
                        </span>
                      </div>
                    )}
                    {event.reservation && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{formatDate(event.reservation.dateKey)}</span>
                        <span className="text-slate-300">•</span>
                        <span>{event.reservation.service === "lunch" ? "Midi" : "Soir"}</span>
                        <span className="text-slate-300">•</span>
                        <span>{event.reservation.timeKey}</span>
                      </div>
                    )}
                    {event.eventType === "status_change" && event.fromStatus && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400">
                        <span className="capitalize">{event.fromStatus}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="capitalize font-medium text-slate-600">{event.toStatus}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
