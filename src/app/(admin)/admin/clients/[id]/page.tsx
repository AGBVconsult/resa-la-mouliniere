"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Star,
  AlertTriangle,
  RefreshCcw,
  Trash2,
  Download,
  Plus,
  X,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";

type ClientStatus = "new" | "regular" | "vip" | "bad_guest";
type NoteType = "preference" | "incident" | "info" | "alert";

interface ClientNote {
  id: string;
  content: string;
  type: NoteType;
  author: string;
  createdAt: number;
}

function statusBadge(status: ClientStatus): { cls: string; label: string } {
  switch (status) {
    case "vip":
      return { cls: "bg-amber-100 text-amber-800", label: "VIP" };
    case "regular":
      return { cls: "bg-blue-100 text-blue-800", label: "Régulier" };
    case "bad_guest":
      return { cls: "bg-red-100 text-red-800", label: "À surveiller" };
    case "new":
    default:
      return { cls: "bg-gray-100 text-gray-800", label: "Nouveau" };
  }
}

function noteTypeBadge(type: NoteType): { cls: string; label: string; icon: typeof MessageSquare } {
  switch (type) {
    case "preference":
      return { cls: "bg-blue-100 text-blue-800", label: "Préférence", icon: Star };
    case "incident":
      return { cls: "bg-red-100 text-red-800", label: "Incident", icon: AlertTriangle };
    case "alert":
      return { cls: "bg-orange-100 text-orange-800", label: "Alerte", icon: AlertTriangle };
    case "info":
    default:
      return { cls: "bg-gray-100 text-gray-800", label: "Info", icon: MessageSquare };
  }
}

function formatDate(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("fr-BE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const clientId = id as Id<"clients">;

  const clientRaw = useQuery(api.clients.get, { clientId });
  // Cast to any to handle union type from RBAC (full client vs PII-masked)
  const client = clientRaw as any;
  const addNoteMutation = useMutation(api.clients.addNote);
  const deleteNoteMutation = useMutation(api.clients.deleteNote);
  const rebuildStatsMutation = useMutation(api.clients.rebuildStats);
  const deleteClientMutation = useMutation(api.clients.delete);
  const exportClientData = useQuery(api.clients.export, { clientId });

  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState<NoteType>("info");
  const [showAddNote, setShowAddNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (client === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Chargement…</div>
      </div>
    );
  }

  if (client === null) {
    return (
      <div className="space-y-6">
        <Link href="/admin/clients" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
        <Card>
          <CardContent className="py-10 text-center text-slate-500">Client introuvable</CardContent>
        </Card>
      </div>
    );
  }

  const badge = statusBadge(client.clientStatus as ClientStatus);
  const displayName = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Client";

  async function handleAddNote() {
    if (!newNoteContent.trim()) return;
    setIsSubmitting(true);
    try {
      await addNoteMutation({
        clientId,
        content: newNoteContent.trim(),
        type: newNoteType,
      });
      setNewNoteContent("");
      setShowAddNote(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    await deleteNoteMutation({ clientId, noteId });
  }

  async function handleRebuildStats() {
    setIsSubmitting(true);
    try {
      await rebuildStatsMutation({ clientId });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleExport() {
    if (!exportClientData) return;
    const blob = new Blob([JSON.stringify(exportClientData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client-${clientId}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    setIsSubmitting(true);
    try {
      await deleteClientMutation({ clientId, reason: "Suppression manuelle admin" });
      window.location.href = "/admin/clients";
    } finally {
      setIsSubmitting(false);
    }
  }

  const notes = (client.notes ?? []) as ClientNote[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/clients" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            {displayName}
            <span className={cn("px-2 py-1 rounded-full text-sm font-medium", badge.cls)}>{badge.label}</span>
            {client.needsRebuild && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700">Rebuild requis</span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRebuildStats}
            disabled={isSubmitting}
            className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Recalculer
          </button>
          <button
            onClick={handleExport}
            disabled={isSubmitting}
            className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exporter
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSubmitting}
            className="h-10 px-4 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-red-800">
                <strong>Confirmer la suppression ?</strong> Cette action est irréversible (soft delete RGPD).
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-9 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-white"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="h-9 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="font-mono">{client.phone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{client.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">
                  Client depuis le {formatDate(client.firstSeenAt)}
                </span>
              </div>
              {client.lastVisitAt && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">Dernière visite: {formatDate(client.lastVisitAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Notes ({notes.length})</CardTitle>
              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="h-8 px-3 rounded-lg bg-slate-900 text-white text-sm flex items-center gap-2 hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddNote && (
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2">
                    {(["info", "preference", "incident", "alert"] as NoteType[]).map((t) => {
                      const b = noteTypeBadge(t);
                      return (
                        <button
                          key={t}
                          onClick={() => setNewNoteType(t)}
                          className={cn(
                            "h-8 px-3 rounded-full text-xs font-medium border",
                            newNoteType === t ? b.cls + " border-current" : "bg-white border-slate-200 text-slate-600"
                          )}
                        >
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Contenu de la note…"
                    className="w-full h-24 p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowAddNote(false)}
                      className="h-9 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-white"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleAddNote}
                      disabled={isSubmitting || !newNoteContent.trim()}
                      className="h-9 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

              {notes.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucune note pour ce client.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => {
                    const b = noteTypeBadge(note.type);
                    const Icon = b.icon;
                    return (
                      <div key={note.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", b.cls.replace("bg-", "text-").split(" ")[1])} />
                            <div className="min-w-0">
                              <p className="text-sm text-slate-900">{note.content}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {note.author} — {formatDateTime(note.createdAt)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="shrink-0 p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-600"
                            title="Supprimer la note"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Score & Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-slate-900">{client.score ?? 0}</p>
                <p className="text-sm text-slate-500">points</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-green-50 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <p className="text-xl font-semibold text-green-800">{client.totalVisits}</p>
                  <p className="text-xs text-green-600">Visites</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 text-center">
                  <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
                  <p className="text-xl font-semibold text-red-800">{client.totalNoShows}</p>
                  <p className="text-xs text-red-600">No-shows</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 text-center">
                  <Clock className="h-5 w-5 mx-auto text-orange-600 mb-1" />
                  <p className="text-xl font-semibold text-orange-800">{client.totalLateCancellations}</p>
                  <p className="text-xs text-orange-600">Annul. tardives</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 text-center">
                  <Users className="h-5 w-5 mx-auto text-slate-600 mb-1" />
                  <p className="text-xl font-semibold text-slate-800">{client.totalCancellations}</p>
                  <p className="text-xs text-slate-600">Annulations</p>
                </div>
              </div>

              {client.scoreBreakdown && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2">Détail du score</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Visites</span>
                      <span className="font-medium text-green-700">+{client.scoreBreakdown.visits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">No-shows</span>
                      <span className="font-medium text-red-700">{client.scoreBreakdown.noshows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Annul. tardives</span>
                      <span className="font-medium text-orange-700">{client.scoreBreakdown.lateCancels}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {client.dietaryRestrictions && client.dietaryRestrictions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Restrictions alimentaires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {client.dietaryRestrictions.map((r: string) => (
                    <span key={r} className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
                      {r}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {client.tags && client.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((t: string) => (
                    <span key={t} className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                      {t}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
