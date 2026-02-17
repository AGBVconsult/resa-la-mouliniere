"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { 
  Bell, 
  UserPlus, 
  XCircle, 
  Clock, 
  Users,
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
    return <UserPlus className="w-5 h-5 text-emerald-600" />;
  }
  if (event.eventType === "updated") {
    return <Clock className="w-5 h-5 text-blue-600" />;
  }
  if (event.eventType === "status_change" && event.toStatus === "cancelled") {
    return <XCircle className="w-5 h-5 text-red-500" />;
  }
  return <Bell className="w-5 h-5 text-slate-400" />;
}

function getEventLabel(event: ActivityEvent): string {
  if (event.eventType === "created") {
    return "Nouvelle réservation";
  }
  if (event.eventType === "updated") {
    return "Modification";
  }
  if (event.eventType === "status_change" && event.toStatus === "cancelled") {
    return "Annulée";
  }
  return "Activité";
}

function getEventColor(event: ActivityEvent): string {
  if (event.eventType === "created") {
    return "bg-emerald-50 border-emerald-200";
  }
  if (event.eventType === "updated") {
    return "bg-blue-50 border-blue-200";
  }
  if (event.eventType === "status_change" && event.toStatus === "cancelled") {
    return "bg-red-50 border-red-200";
  }
  return "bg-slate-50 border-slate-200";
}

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" });
}

export default function ActivityPage() {
  const router = useRouter();
  const activity = useQuery(api.admin.listRecentActivity, { limit: 50 });

  const handleEventClick = (event: ActivityEvent) => {
    if (event.reservation) {
      const { dateKey, service } = event.reservation;
      router.push(`/admin-mobile/reservations?date=${dateKey}&service=${service}`);
    }
  };

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
      <div className="flex-1 overflow-y-auto px-4 py-3">
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
          <div className="space-y-2">
            {activity.map((event: ActivityEvent) => (
              <button
                key={event._id}
                onClick={() => handleEventClick(event)}
                className={`w-full p-3 rounded-xl border ${getEventColor(event)} transition-all active:scale-[0.98] text-left`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {getEventIcon(event)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Ligne 1: Type + Temps + Nom + Couverts */}
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                    {/* Ligne 2: Nom + Couverts + Date + Service + Heure */}
                    {event.reservation && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm">
                        <span className="font-medium text-slate-900 truncate max-w-[140px]">
                          {event.reservation.firstName} {event.reservation.lastName}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 flex items-center gap-0.5 shrink-0">
                          <Users className="w-3 h-3" />
                          {event.reservation.partySize}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {formatDate(event.reservation.dateKey)}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {event.reservation.service === "lunch" ? "Midi" : "Soir"}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {event.reservation.timeKey}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
