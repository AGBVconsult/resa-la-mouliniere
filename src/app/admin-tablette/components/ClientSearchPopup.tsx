"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { X, Search, Loader2, User, Phone, Star, Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFlag } from "@/lib/getFlag";

interface ClientSearchPopupProps {
  onClose: () => void;
  onSelectClient: (clientId: Id<"clients">) => void;
}

const STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  new: { icon: <User size={14} />, color: "text-emerald-600" },
  regular: { icon: <Star size={14} />, color: "text-blue-600" },
  vip: { icon: <Crown size={14} />, color: "text-amber-500" },
  bad_guest: { icon: <AlertTriangle size={14} />, color: "text-red-500" },
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  regular: "Régulier",
  vip: "VIP",
  bad_guest: "Indésirable",
};

export function ClientSearchPopup({ onClose, onSelectClient }: ClientSearchPopupProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const results = useQuery(
    api.clients.search,
    debouncedTerm.length >= 2 ? { query: debouncedTerm, limit: 15 } : "skip"
  );

  const isSearching = debouncedTerm.length >= 2 && results === undefined;

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="mt-20 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un client (nom, téléphone, email...)"
            className="flex-1 text-base outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
          />
          {isSearching && <Loader2 size={18} className="text-slate-400 animate-spin shrink-0" />}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {debouncedTerm.length < 2 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Tapez au moins 2 caractères pour rechercher
            </div>
          )}

          {debouncedTerm.length >= 2 && results && results.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Aucun client trouvé
            </div>
          )}

          {results && results.length > 0 && (
            <ul className="py-2">
              {results.map((client) => {
                const statusInfo = STATUS_ICONS[client.clientStatus ?? "new"];
                const clientPhone = "phone" in client ? (client as any).phone : (client as any).primaryPhone;
                const flag = client.preferredLanguage && clientPhone ? getFlag(clientPhone, client.preferredLanguage) : null;

                return (
                  <li key={client._id}>
                    <button
                      onClick={() => onSelectClient(client._id as Id<"clients">)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                    >
                      {/* Avatar avec statut */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        client.clientStatus === "vip" ? "bg-amber-50" :
                        client.clientStatus === "bad_guest" ? "bg-red-50" :
                        client.clientStatus === "regular" ? "bg-blue-50" :
                        "bg-slate-100"
                      )}>
                        <span className={statusInfo?.color ?? "text-slate-500"}>
                          {statusInfo?.icon ?? <User size={14} />}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900 truncate">
                            {client.firstName} {client.lastName}
                          </span>
                          {flag && <span className="text-sm">{flag}</span>}
                          <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                            client.clientStatus === "vip" ? "bg-amber-100 text-amber-700" :
                            client.clientStatus === "bad_guest" ? "bg-red-100 text-red-600" :
                            client.clientStatus === "regular" ? "bg-blue-100 text-blue-700" :
                            "bg-emerald-100 text-emerald-700"
                          )}>
                            {STATUS_LABELS[client.clientStatus ?? "new"]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone size={11} />
                            {clientPhone}
                          </span>
                          <span className="text-xs text-slate-400">
                            {client.totalVisits} visite{client.totalVisits !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
