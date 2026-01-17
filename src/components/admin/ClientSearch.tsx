"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Phone, Mail, Calendar, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  reservationCount: number;
  lastVisitDate: string | null;
  lastVisitStatus: string | null;
}

interface ClientSearchProps {
  onSelectClient?: (client: ClientData) => void;
  placeholder?: string;
}

export function ClientSearch({
  onSelectClient,
  placeholder = "Rechercher un client...",
}: ClientSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch clients
  const clients = useQuery(
    api.admin.searchClients,
    debouncedQuery.length >= 2 ? { query: debouncedQuery, limit: 10 } : "skip"
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (client: ClientData) => {
    onSelectClient?.(client);
    setQuery("");
    setIsOpen(false);
  };

  const isLoading = debouncedQuery.length >= 2 && clients === undefined;
  const showResults = isOpen && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="min-h-[44px] pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <Card className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto shadow-lg">
          <CardContent className="p-0">
            {clients === undefined ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Aucun client trouve
              </div>
            ) : (
              <ul className="divide-y">
                {clients.map((client, index) => (
                  <li key={`${client.email || client.phone}-${index}`}>
                    <button
                      onClick={() => handleSelect(client)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {client.firstName} {client.lastName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {client.reservationCount} visite
                            {client.reservationCount > 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </span>
                          )}
                          {client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </span>
                          )}
                        </div>
                        {client.lastVisitDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Derniere visite: {client.lastVisitDate}
                            </span>
                            {client.lastVisitStatus && (
                              <Badge
                                variant={
                                  client.lastVisitStatus === "completed"
                                    ? "secondary"
                                    : client.lastVisitStatus === "noshow"
                                      ? "destructive"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {client.lastVisitStatus}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
