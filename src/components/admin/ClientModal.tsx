"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import {
  X,
  Star,
  Crown,
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  MapPin,
  Tag,
  History,
  CheckCircle,
  XCircle,
  Ghost,
  Plus,
  Trash2,
  Save,
  Baby,
  User,
  Utensils,
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
  const [activeTab, setActiveTab] = useState<"reservation" | "history">("reservation");
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"info" | "preference" | "incident" | "alert">("info");
  const [isSaving, setIsSaving] = useState(false);

  // Form state for reservation editing
  const [formData, setFormData] = useState({
    dateKey: "",
    timeKey: "",
    service: "lunch" as "lunch" | "dinner",
    adults: 2,
    childrenCount: 0,
    babyCount: 0,
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    note: "",
    options: [] as string[],
  });

  const client = useQuery(api.clients.get, { clientId });
  const addNote = useMutation(api.clients.addNote);
  const deleteNote = useMutation(api.clients.deleteNote);
  const updateReservation = useMutation(api.admin.updateReservationFull);

  // Find the current reservation
  const currentReservation = client?.reservations?.find((r) => r._id === currentReservationId);

  // Initialize form data when reservation loads
  useEffect(() => {
    if (currentReservation) {
      setFormData({
        dateKey: currentReservation.dateKey,
        timeKey: currentReservation.timeKey,
        service: currentReservation.service as "lunch" | "dinner",
        adults: currentReservation.adults ?? 2,
        childrenCount: currentReservation.childrenCount ?? 0,
        babyCount: currentReservation.babyCount ?? 0,
        firstName: currentReservation.firstName ?? "",
        lastName: currentReservation.lastName ?? "",
        phone: currentReservation.phone ?? "",
        email: currentReservation.email ?? "",
        note: currentReservation.note ?? "",
        options: currentReservation.options ?? [],
      });
    }
  }, [currentReservation]);

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

  const { toast } = useToast();

  const handleSaveReservation = async () => {
    if (!currentReservation || !currentReservationId) return;
    
    setIsSaving(true);
    try {
      await updateReservation({
        reservationId: currentReservationId,
        expectedVersion: currentReservation.version,
        dateKey: formData.dateKey,
        service: formData.service,
        timeKey: formData.timeKey,
        adults: formData.adults,
        childrenCount: formData.childrenCount,
        babyCount: formData.babyCount,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        note: formData.note,
        options: formData.options,
      });
      toast.success("Réservation mise à jour");
    } catch (error) {
      toast.error(formatConvexError(error));
    } finally {
      setIsSaving(false);
    }
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
        {/* Sidebar gauche - Design épuré */}
        <div className="w-96 bg-white p-8 flex flex-col gap-8 border-r border-slate-100 overflow-y-auto">
          {/* Header client */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {client.firstName} {client.lastName}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
                clientStatusConfig.color
              )}>
                {clientStatusConfig.label}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {client.totalVisits} visite{client.totalVisits > 1 ? "s" : ""}
              </span>
              {client.totalNoShows > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                  {client.totalNoShows} no-show{client.totalNoShows > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Détails client */}
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Détails client</h3>
              <Plus size={16} className="text-slate-300" />
            </div>
            
            <div className="space-y-4 pt-3">
              {(client.phone || ("primaryPhone" in client && client.primaryPhone)) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Téléphone</span>
                  <span className="text-sm font-medium text-slate-900">
                    {client.phone || ("primaryPhone" in client ? String(client.primaryPhone) : "")}
                  </span>
                </div>
              )}

              {("email" in client && client.email) || ("primaryEmail" in client && client.primaryEmail) ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Email</span>
                  <span className="text-sm font-medium text-slate-900">
                    {"email" in client ? String(client.email) : "primaryEmail" in client ? String(client.primaryEmail) : ""}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Tags profil */}
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-slate-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tags profil</h3>
              </div>
              <Plus size={16} className="text-slate-300" />
            </div>
            
            <div className="flex flex-wrap gap-2 pt-3">
              {client.tags && client.tags.length > 0 ? (
                client.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-full text-xs font-medium uppercase">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400 italic">Aucun tag</span>
              )}
              {client.preferredZone && (
                <span className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-full text-xs font-medium uppercase">
                  {client.preferredZone}
                </span>
              )}
              {client.preferredTable && (
                <span className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-full text-xs font-medium uppercase">
                  Table {client.preferredTable}
                </span>
              )}
            </div>
          </div>

          {/* Comportement */}
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Comportement</h3>
              </div>
              <Plus size={16} className="text-slate-300" />
            </div>
            
            <div className="flex flex-wrap gap-2 pt-3">
              {client.dietaryRestrictions && client.dietaryRestrictions.length > 0 ? (
                client.dietaryRestrictions.map((r, i) => (
                  <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium flex items-center gap-1">
                    {r}
                    <X size={12} className="cursor-pointer hover:text-amber-900" />
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400 italic">Aucune observation</span>
              )}
            </div>
          </div>

          {/* Notes internes */}
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notes internes</h3>
              <Plus size={16} className="text-slate-300 cursor-pointer hover:text-slate-500" />
            </div>
            
            {/* Notes existantes */}
            <div className="space-y-2 pt-3 max-h-32 overflow-y-auto">
              {client.notes && client.notes.length > 0 ? (
                client.notes.map((note) => (
                  <div 
                    key={note.id} 
                    className={cn(
                      "p-3 rounded-xl text-sm relative group",
                      note.type === "alert" && "bg-red-50 text-red-700",
                      note.type === "incident" && "bg-orange-50 text-orange-700",
                      note.type === "preference" && "bg-blue-50 text-blue-700",
                      note.type === "info" && "bg-slate-50 text-slate-700"
                    )}
                  >
                    <p>{note.content}</p>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/50 rounded transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : null}
            </div>

            {/* Input note */}
            <div className="pt-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ajouter une note persistante..."
                className="w-full px-4 py-3 text-sm bg-amber-50/50 border border-amber-100 rounded-2xl text-amber-700 placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              />
            </div>
          </div>
        </div>

        {/* Zone principale */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header avec onglets */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("reservation")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "reservation"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Calendar size={14} className="inline mr-2" />
                Réservation
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
            {activeTab === "reservation" ? (
              <ReservationEditForm
                reservation={currentReservation}
                formData={formData}
                setFormData={setFormData}
                isSaving={isSaving}
                onSave={handleSaveReservation}
                formatDate={formatDate}
              />
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
    adults?: number;
    childrenCount?: number;
    babyCount?: number;
    status: string;
    tableNames?: string[];
    note?: string | null;
    options?: string[];
    source?: string;
    language?: string;
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

  const sourceLabels: Record<string, string> = {
    online: "En ligne",
    phone: "Téléphone",
    walkin: "Sur place",
    admin: "Admin",
  };

  const languageLabels: Record<string, string> = {
    fr: "Français",
    nl: "Néerlandais",
    en: "Anglais",
    de: "Allemand",
    it: "Italien",
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      isHighlighted 
        ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200" 
        : "bg-white border-slate-200 hover:border-slate-300"
    )}>
      {/* Ligne 1: Date, heure, statut */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="text-center min-w-[60px]">
            <div className="text-lg font-bold text-slate-900">{reservation.timeKey}</div>
            <div className="text-xs text-slate-500">{reservation.service === "lunch" ? "Midi" : "Soir"}</div>
          </div>
          
          <div className="h-10 w-px bg-slate-200" />
          
          <div className="font-medium text-slate-900">{formatDate(reservation.dateKey)}</div>
        </div>

        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
          statusConfig.color
        )}>
          <StatusIcon size={14} />
          {statusConfig.label}
        </div>
      </div>

      {/* Ligne 2: Détails réservation */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-slate-100 pt-3">
        {/* Nombre de personnes */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Couverts</span>
          <span className="font-medium text-slate-900">
            {reservation.partySize} pers.
            {(reservation.adults !== undefined || reservation.childrenCount || reservation.babyCount) && (
              <span className="text-slate-400 font-normal ml-1">
                ({reservation.adults || 0}A
                {reservation.childrenCount ? ` ${reservation.childrenCount}E` : ""}
                {reservation.babyCount ? ` ${reservation.babyCount}B` : ""})
              </span>
            )}
          </span>
        </div>

        {/* Table */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Table</span>
          <span className="font-medium text-slate-900">
            {reservation.tableNames && reservation.tableNames.length > 0 
              ? reservation.tableNames.join(", ")
              : <span className="text-amber-600 italic">Non assignée</span>
            }
          </span>
        </div>

        {/* Source */}
        {reservation.source && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Source</span>
            <span className="font-medium text-slate-900">{sourceLabels[reservation.source] || reservation.source}</span>
          </div>
        )}

        {/* Langue */}
        {reservation.language && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Langue</span>
            <span className="font-medium text-slate-900">{languageLabels[reservation.language] || reservation.language}</span>
          </div>
        )}
      </div>

      {/* Options */}
      {reservation.options && reservation.options.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
          {reservation.options.map((opt, i) => (
            <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              {opt}
            </span>
          ))}
        </div>
      )}

      {/* Note */}
      {reservation.note && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-600 italic">"{reservation.note}"</p>
        </div>
      )}
    </div>
  );
}

// Formulaire d'édition de réservation
interface ReservationEditFormProps {
  reservation?: {
    _id: Id<"reservations">;
    dateKey: string;
    timeKey: string;
    service: string;
    partySize: number;
    adults?: number;
    childrenCount?: number;
    babyCount?: number;
    status: string;
    tableNames?: string[];
    note?: string | null;
    options?: string[];
    source?: string;
    language?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    version: number;
  };
  formData: {
    dateKey: string;
    timeKey: string;
    service: "lunch" | "dinner";
    adults: number;
    childrenCount: number;
    babyCount: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    note: string;
    options: string[];
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    dateKey: string;
    timeKey: string;
    service: "lunch" | "dinner";
    adults: number;
    childrenCount: number;
    babyCount: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    note: string;
    options: string[];
  }>>;
  isSaving: boolean;
  onSave: () => void;
  formatDate: (dateKey: string) => string;
}

const TIME_SLOTS = [
  "11:30", "11:45", "12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30",
  "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45", "21:00"
];

const AVAILABLE_OPTIONS = [
  "Anniversaire",
  "Chaise haute",
  "Allergies",
  "Végétarien",
  "Terrasse",
  "Calme",
];

function ReservationEditForm({ 
  reservation, 
  formData, 
  setFormData, 
  isSaving, 
  onSave,
  formatDate 
}: ReservationEditFormProps) {
  if (!reservation) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
        <p>Aucune réservation sélectionnée</p>
      </div>
    );
  }

  const statusConfig = STATUS_LABELS[reservation.status] || { label: reservation.status, color: "bg-slate-100 text-slate-600" };

  const updateField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleOption = (option: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.includes(option)
        ? prev.options.filter(o => o !== option)
        : [...prev.options, option]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header avec statut */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {formatDate(reservation.dateKey)} - {reservation.timeKey}
          </h3>
          <p className="text-sm text-slate-500">
            {reservation.service === "lunch" ? "Service du midi" : "Service du soir"}
          </p>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium",
          statusConfig.color
        )}>
          {statusConfig.label}
        </div>
      </div>

      {/* Formulaire */}
      <div className="grid grid-cols-2 gap-6">
        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={formData.dateKey}
            onChange={(e) => updateField("dateKey", e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Heure */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Heure</label>
          <select
            value={formData.timeKey}
            onChange={(e) => updateField("timeKey", e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIME_SLOTS.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Nombre de personnes */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Nombre de personnes</label>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <User size={14} />
              Adultes
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateField("adults", Math.max(1, formData.adults - 1))}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                -
              </button>
              <span className="w-8 text-center font-medium">{formData.adults}</span>
              <button
                type="button"
                onClick={() => updateField("adults", formData.adults + 1)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users size={14} />
              Enfants
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateField("childrenCount", Math.max(0, formData.childrenCount - 1))}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                -
              </button>
              <span className="w-8 text-center font-medium">{formData.childrenCount}</span>
              <button
                type="button"
                onClick={() => updateField("childrenCount", formData.childrenCount + 1)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Baby size={14} />
              Bébés
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateField("babyCount", Math.max(0, formData.babyCount - 1))}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                -
              </button>
              <span className="w-8 text-center font-medium">{formData.babyCount}</span>
              <button
                type="button"
                onClick={() => updateField("babyCount", formData.babyCount + 1)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          Total: {formData.adults + formData.childrenCount} couverts
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Options</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                formData.options.includes(option)
                  ? "bg-purple-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Note</label>
        <textarea
          value={formData.note}
          onChange={(e) => updateField("note", e.target.value)}
          rows={3}
          placeholder="Ajouter une note pour cette réservation..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all",
            isSaving
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          )}
        >
          <Save size={18} />
          {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  );
}
