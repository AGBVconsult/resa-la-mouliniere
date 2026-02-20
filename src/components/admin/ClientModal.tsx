"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  X,
  Mail,
  Phone,
  Star,
  Crown,
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  MapPin,
  MessageSquare,
  Tag,
  History,
  CheckCircle,
  XCircle,
  Ghost,
  Plus,
  Trash2,
} from "lucide-react";

interface ClientModalProps {
  clientId: Id<"clients">;
  currentReservationId?: Id<"reservations">;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmé", color: "bg-amber-100 text-amber-700" },
  seated: { label: "Installé", color: "bg-green-100 text-green-700" },
  completed: { label: "Terminé", color: "bg-slate-100 text-slate-600" },
  pending: { label: "En attente", color: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Annulé", color: "bg-red-100 text-red-600" },
  noshow: { label: "No-show", color: "bg-pink-100 text-pink-600" },
  refused: { label: "Refusé", color: "bg-stone-100 text-stone-600" },
  incident: { label: "Incident", color: "bg-slate-200 text-slate-700" },
};

const CLIENT_STATUS_CONFIG: Record<string, { label: string; icon: typeof Star; color: string }> = {
  new: { label: "Nouveau", icon: Star, color: "bg-blue-100 text-blue-600" },
  regular: { label: "Habitué", icon: Users, color: "bg-emerald-100 text-emerald-600" },
  vip: { label: "VIP", icon: Crown, color: "bg-amber-100 text-amber-600" },
  bad_guest: { label: "Attention", icon: AlertTriangle, color: "bg-red-100 text-red-600" },
};

export function ClientModal({ clientId, currentReservationId, onClose }: ClientModalProps) {
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"info" | "preference" | "incident" | "alert">("info");

  const client = useQuery(api.clients.get, { clientId });
  const addNote = useMutation(api.clients.addNote);
  const deleteNote = useMutation(api.clients.deleteNote);

  if (!client) {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full" />
        </div>
      </div>
    );
  }

  const clientStatusConfig = CLIENT_STATUS_CONFIG[client.clientStatus] || CLIENT_STATUS_CONFIG.new;
  const ClientStatusIcon = clientStatusConfig.icon;

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const currentReservations = client.reservations?.filter(
    (r) => r.dateKey >= todayKey && !["cancelled", "noshow", "refused"].includes(r.status)
  ) || [];
  const pastReservations = client.reservations?.filter(
    (r) => r.dateKey < todayKey || ["cancelled", "noshow", "refused", "completed"].includes(r.status)
  ) || [];

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote({ clientId, content: newNote.trim(), type: noteType });
    setNewNote("");
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote({ clientId, noteId });
  };

  const formatDate = (dateKey: string) => {
    try {
      return format(parseISO(dateKey), "EEE d MMM yyyy", { locale: fr });
    } catch {
      return dateKey;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar gauche */}
        <div className="w-80 bg-slate-50 p-6 flex flex-col gap-6 border-r border-slate-200 overflow-y-auto">
          {/* Header client */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              clientStatusConfig.color
            )}>
              <ClientStatusIcon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-slate-900 truncate">
                {client.firstName} {client.lastName}
              </h2>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                clientStatusConfig.color
              )}>
                {clientStatusConfig.label}
              </span>
            </div>
          </div>

          {/* Détails contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</h3>
            
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-slate-400" />
                <span className="text-slate-700">{client.phone}</span>
              </div>
            )}
            
            {"email" in client && client.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-slate-400" />
                <span className="text-slate-700 truncate">{String(client.email)}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Statistiques</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-slate-900">{client.totalVisits}</div>
                <div className="text-xs text-slate-500">Visites</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-slate-900">{client.score}</div>
                <div className="text-xs text-slate-500">Score</div>
              </div>
              {client.totalNoShows > 0 && (
                <div className="bg-red-50 rounded-xl p-3 text-center col-span-2">
                  <div className="text-xl font-bold text-red-600">{client.totalNoShows}</div>
                  <div className="text-xs text-red-500">No-shows</div>
                </div>
              )}
            </div>
          </div>

          {/* Tags profil */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Tag size={12} />
              Tags profil
            </h3>
            <div className="flex flex-wrap gap-2">
              {client.tags && client.tags.length > 0 ? (
                client.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Aucun tag</span>
              )}
            </div>
          </div>

          {/* Préférences */}
          {(client.dietaryRestrictions?.length || client.preferredZone || client.preferredTable) && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Préférences</h3>
              {client.dietaryRestrictions && client.dietaryRestrictions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {client.dietaryRestrictions.map((r, i) => (
                    <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                      {r}
                    </span>
                  ))}
                </div>
              )}
              {client.preferredZone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} />
                  Zone: {client.preferredZone}
                </div>
              )}
              {client.preferredTable && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} />
                  Table: {client.preferredTable}
                </div>
              )}
            </div>
          )}

          {/* Notes internes */}
          <div className="space-y-3 flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={12} />
              Notes internes
            </h3>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {client.notes && client.notes.length > 0 ? (
                client.notes.map((note) => (
                  <div 
                    key={note.id} 
                    className={cn(
                      "p-2 rounded-lg text-xs relative group",
                      note.type === "alert" && "bg-red-50 text-red-700",
                      note.type === "incident" && "bg-orange-50 text-orange-700",
                      note.type === "preference" && "bg-blue-50 text-blue-700",
                      note.type === "info" && "bg-slate-100 text-slate-700"
                    )}
                  >
                    <p>{note.content}</p>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/50 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Aucune note</span>
              )}
            </div>

            {/* Ajouter une note */}
            <div className="space-y-2">
              <div className="flex gap-1">
                {(["info", "preference", "incident", "alert"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNoteType(type)}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-medium transition-all",
                      noteType === type
                        ? type === "alert" ? "bg-red-500 text-white"
                        : type === "incident" ? "bg-orange-500 text-white"
                        : type === "preference" ? "bg-blue-500 text-white"
                        : "bg-slate-500 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {type === "info" ? "Info" : type === "preference" ? "Préf." : type === "incident" ? "Incident" : "Alerte"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ajouter une note..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Zone principale */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header avec onglets */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("current")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "current"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Calendar size={14} className="inline mr-2" />
                Réservations en cours
                {currentReservations.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                    {currentReservations.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "history"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <History size={14} className="inline mr-2" />
                Historique
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* Contenu des onglets */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "current" ? (
              <div className="space-y-3">
                {currentReservations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Aucune réservation en cours</p>
                  </div>
                ) : (
                  currentReservations.map((res) => (
                    <ReservationCard 
                      key={res._id} 
                      reservation={res} 
                      isHighlighted={res._id === currentReservationId}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {pastReservations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <History size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Aucun historique</p>
                  </div>
                ) : (
                  pastReservations.map((res) => (
                    <ReservationCard 
                      key={res._id} 
                      reservation={res}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReservationCardProps {
  reservation: {
    _id: Id<"reservations">;
    dateKey: string;
    timeKey: string;
    service: string;
    partySize: number;
    status: string;
    tableNames?: string[];
    note?: string | null;
  };
  isHighlighted?: boolean;
  formatDate: (dateKey: string) => string;
}

function ReservationCard({ reservation, isHighlighted, formatDate }: ReservationCardProps) {
  const statusConfig = STATUS_LABELS[reservation.status] || { label: reservation.status, color: "bg-slate-100 text-slate-600" };
  
  const StatusIcon = reservation.status === "completed" ? CheckCircle
    : reservation.status === "cancelled" || reservation.status === "refused" ? XCircle
    : reservation.status === "noshow" ? Ghost
    : Clock;

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      isHighlighted 
        ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200" 
        : "bg-white border-slate-200 hover:border-slate-300"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-900">{reservation.timeKey}</div>
            <div className="text-xs text-slate-500">{reservation.service === "lunch" ? "Midi" : "Soir"}</div>
          </div>
          
          <div className="h-10 w-px bg-slate-200" />
          
          <div>
            <div className="font-medium text-slate-900">{formatDate(reservation.dateKey)}</div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users size={14} />
              <span>{reservation.partySize} pers.</span>
              {reservation.tableNames && reservation.tableNames.length > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <MapPin size={14} />
                  <span>{reservation.tableNames.join(", ")}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
          statusConfig.color
        )}>
          <StatusIcon size={14} />
          {statusConfig.label}
        </div>
      </div>

      {reservation.note && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-600 italic">"{reservation.note}"</p>
        </div>
      )}
    </div>
  );
}
