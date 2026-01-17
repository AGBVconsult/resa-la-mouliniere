"use client";

import { useState, useMemo } from "react";
import { ReservationCard, type ReservationData } from "./ReservationCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, SortAsc, Users } from "lucide-react";

interface ReservationListProps {
  reservations: ReservationData[];
  onSelectReservation: (reservation: ReservationData) => void;
  selectedReservationId?: string;
  isLoading?: boolean;
}

type StatusFilter = "all" | "pending" | "confirmed" | "seated" | "completed" | "noshow" | "cancelled";

const statusFilters: { value: StatusFilter; label: string; color: string }[] = [
  { value: "all", label: "Tous", color: "" },
  { value: "pending", label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Confirmes", color: "bg-green-100 text-green-800" },
  { value: "seated", label: "Installes", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Termines", color: "bg-gray-100 text-gray-800" },
  { value: "noshow", label: "No-shows", color: "bg-red-100 text-red-800" },
];

export function ReservationList({
  reservations,
  onSelectReservation,
  selectedReservationId,
  isLoading,
}: ReservationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<"time" | "name" | "size">("time");

  // Filter and sort reservations
  const filteredReservations = useMemo(() => {
    let result = [...reservations];

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.firstName.toLowerCase().includes(query) ||
          r.lastName.toLowerCase().includes(query) ||
          r.phone.includes(query) ||
          r.email.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "time":
          return a.timeKey.localeCompare(b.timeKey);
        case "name":
          return `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`
          );
        case "size":
          return b.partySize - a.partySize;
        default:
          return 0;
      }
    });

    return result;
  }, [reservations, statusFilter, searchQuery, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeReservations = reservations.filter((r) =>
      ["pending", "confirmed", "seated"].includes(r.status)
    );
    return {
      total: reservations.length,
      active: activeReservations.length,
      guests: activeReservations.reduce((sum, r) => sum + r.partySize, 0),
      pending: reservations.filter((r) => r.status === "pending").length,
    };
  }, [reservations]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{stats.guests}</span>
          <span className="text-sm text-muted-foreground">couverts</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {stats.active} reservation{stats.active > 1 ? "s" : ""} active{stats.active > 1 ? "s" : ""}
        </div>
        {stats.pending > 0 && (
          <Badge variant="warning">{stats.pending} en attente</Badge>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, tel, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-[44px] pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={sortBy === "time" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("time")}
            className="min-h-[44px]"
          >
            <SortAsc className="mr-1 h-4 w-4" />
            Heure
          </Button>
          <Button
            variant={sortBy === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("name")}
            className="min-h-[44px]"
          >
            Nom
          </Button>
          <Button
            variant={sortBy === "size" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("size")}
            className="min-h-[44px]"
          >
            Couverts
          </Button>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const count = filter.value === "all"
            ? reservations.length
            : reservations.filter((r) => r.status === filter.value).length;

          return (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className="min-h-[44px]"
            >
              <Filter className="mr-1 h-3 w-3" />
              {filter.label}
              <span className="ml-1 text-xs opacity-70">({count})</span>
            </Button>
          );
        })}
      </div>

      {/* Reservation list */}
      {filteredReservations.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== "all"
              ? "Aucune reservation trouvee avec ces criteres"
              : "Aucune reservation pour ce service"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReservations.map((reservation) => (
            <ReservationCard
              key={reservation._id}
              reservation={reservation}
              onClick={() => onSelectReservation(reservation)}
              isSelected={selectedReservationId === reservation._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
