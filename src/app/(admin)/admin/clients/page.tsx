"use client";

import { useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Search, RefreshCcw, ShieldAlert, Users, Upload, X, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";

type ClientStatus = "new" | "regular" | "vip" | "bad_guest";

type ClientListRow = {
  _id: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  clientStatus: ClientStatus;
  totalVisits: number;
  lastVisitAt?: number;
  preferredLanguage?: "fr" | "nl" | "en" | "de" | "it";
  needsRebuild?: boolean;
  score?: number;
};

const STATUS_FILTERS: Array<{ label: string; value: ClientStatus | "all" }> = [
  { label: "Tous", value: "all" },
  { label: "VIP", value: "vip" },
  { label: "Réguliers", value: "regular" },
  { label: "Nouveaux", value: "new" },
  { label: "À surveiller", value: "bad_guest" },
];

function formatLastVisit(ts?: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("fr-BE", { year: "numeric", month: "2-digit", day: "2-digit" });
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

type CSVRow = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  totalVisits: number;
};

type ImportResult = {
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
};

function parseCSV(text: string): CSVRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;\t]/);
    if (cols.length < 4) continue;

    const firstName = cols[0]?.trim() ?? "";
    const lastName = cols[1]?.trim() ?? "";
    const phone = cols[2]?.trim() ?? "";
    const email = cols[3]?.trim() ?? "";
    const totalVisits = parseInt(cols[4]?.trim() ?? "0", 10) || 0;

    if (phone.length >= 5) {
      rows.push({ firstName, lastName, phone, email, totalVisits });
    }
  }
  return rows;
}

export default function AdminClientsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("all");
  const [onlyRebuild, setOnlyRebuild] = useState(false);

  // Import CSV state
  const [showImport, setShowImport] = useState(false);
  const [csvRows, setCsvRows] = useState<CSVRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useMutation(api.clients.importFromCSV);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      setCsvRows(parsed);
      setImportResult(null);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (csvRows.length === 0) return;
    setIsImporting(true);

    const BATCH_SIZE = 500;
    let totalCreated = 0;
    let totalUpdated = 0;
    const allErrors: Array<{ row: number; error: string }> = [];

    try {
      for (let i = 0; i < csvRows.length; i += BATCH_SIZE) {
        const batch = csvRows.slice(i, i + BATCH_SIZE);
        const result = await importMutation({ rows: batch });
        totalCreated += result.created;
        totalUpdated += result.updated;
        // Adjust row numbers to reflect original CSV position
        for (const err of result.errors) {
          allErrors.push({ row: i + err.row, error: err.error });
        }
      }
      setImportResult({ created: totalCreated, updated: totalUpdated, errors: allErrors });
      setCsvRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsImporting(false);
    }
  }

  function closeImport() {
    setShowImport(false);
    setCsvRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Simple pagination (first page). On étendra ensuite si nécessaire.
  const listResult = useQuery(api.clients.list, {
    paginationOpts: { numItems: 50, cursor: null },
    status: status === "all" ? undefined : status,
    needsRebuild: onlyRebuild ? true : undefined,
    includeDeleted: false,
  });

  const searchResult = useQuery(
    api.clients.search,
    q.trim().length >= 2
      ? {
          query: q.trim(),
          limit: 50,
          status: status === "all" ? undefined : status,
        }
      : "skip"
  );

  const rows = useMemo<ClientListRow[]>(() => {
    const base = q.trim().length >= 2
      ? (searchResult as ClientListRow[] | undefined)
      : listResult?.page;
    return base ?? [];
  }, [q, listResult, searchResult]);

  const rebuildCount = useMemo(() => rows.filter((r) => r.needsRebuild).length, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Base Clients
          </h1>
          <p className="text-slate-600">CRM — recherche, scoring et historique</p>
        </div>
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Importer CSV
        </button>
      </div>

      {showImport && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Import CSV
              </CardTitle>
              <button onClick={closeImport} className="p-1.5 rounded hover:bg-blue-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-700">
              <p className="mb-2">Format attendu (CSV avec séparateur <code>,</code> <code>;</code> ou <code>tab</code>) :</p>
              <p className="font-mono text-xs bg-white p-2 rounded border border-blue-200">
                Prénom, Nom, Téléphone_International, email, Réservations
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800"
            />

            {csvRows.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  {csvRows.length} clients détectés. Aperçu :
                </p>
                <div className="max-h-48 overflow-auto rounded border border-blue-200 bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left">Prénom</th>
                        <th className="px-2 py-1 text-left">Nom</th>
                        <th className="px-2 py-1 text-left">Téléphone</th>
                        <th className="px-2 py-1 text-left">Email</th>
                        <th className="px-2 py-1 text-right">Visites</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-2 py-1">{r.firstName}</td>
                          <td className="px-2 py-1">{r.lastName}</td>
                          <td className="px-2 py-1 font-mono">{r.phone}</td>
                          <td className="px-2 py-1">{r.email}</td>
                          <td className="px-2 py-1 text-right">{r.totalVisits}</td>
                        </tr>
                      ))}
                      {csvRows.length > 10 && (
                        <tr className="border-t border-slate-100">
                          <td colSpan={5} className="px-2 py-1 text-center text-slate-500">
                            … et {csvRows.length - 10} autres
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isImporting}
                  className="h-10 px-4 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting ? "Import en cours…" : `Importer ${csvRows.length} clients`}
                </button>
              </div>
            )}

            {importResult && (
              <div className="p-3 rounded-lg bg-white border border-blue-200 space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Import terminé</span>
                </div>
                <p className="text-sm text-slate-700">
                  {importResult.created} créés, {importResult.updated} mis à jour
                </p>
                {importResult.errors.length > 0 && (
                  <div className="text-sm text-red-700">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{importResult.errors.length} erreurs :</span>
                    </div>
                    <ul className="list-disc list-inside text-xs">
                      {importResult.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>Ligne {e.row}: {e.error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>… et {importResult.errors.length - 5} autres</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recherche & filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (nom, téléphone, email…)"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setQ("");
                setStatus("all");
                setOnlyRebuild(false);
              }}
              className="h-10 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Réinitialiser
            </button>

            <button
              type="button"
              onClick={() => setOnlyRebuild((v) => !v)}
              className={cn(
                "h-10 px-3 rounded-lg border flex items-center gap-2",
                onlyRebuild
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
              title="Afficher uniquement les clients à rebuild"
            >
              <ShieldAlert className="h-4 w-4" />
              Rebuild requis: {rebuildCount}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={cn(
                  "h-9 px-3 rounded-full text-sm border",
                  status === f.value
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Liste des clients ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {listResult === undefined && q.trim().length < 2 ? (
            <div className="py-10 text-center text-slate-500">Chargement…</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-slate-500">Aucun client trouvé</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Nom</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Téléphone</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Statut</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Score</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Visites</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Dernière visite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((c) => {
                    const badge = statusBadge(c.clientStatus);
                    const displayName = `${c.lastName ?? ""}${c.lastName && c.firstName ? ", " : ""}${c.firstName ?? ""}`.trim();
                    return (
                      <tr
                        key={c._id}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/admin/clients/${c._id}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {displayName.length > 0 ? displayName : "Client"}
                            </span>
                            {c.needsRebuild && (
                              <span title="Rebuild requis">
                                <ShieldAlert className="h-4 w-4 text-orange-500" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{c.phone}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-1 rounded-full text-xs font-medium", badge.cls)}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {typeof c.score === "number" ? c.score : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{c.totalVisits}</td>
                        <td className="px-4 py-3 text-slate-500">{formatLastVisit(c.lastVisitAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
