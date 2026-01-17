"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  X,
  Users,
  Loader2,
  Sun,
  TreePine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReservationData } from "./ReservationCard";

interface TableData {
  _id: Id<"tables">;
  name: string;
  zone: "dining" | "terrace";
  capacity: number;
  gridX: number;
  gridY: number;
}

interface TableAssignmentProps {
  reservation: ReservationData;
  onClose: () => void;
}

export function TableAssignment({ reservation, onClose }: TableAssignmentProps) {
  const [selectedTables, setSelectedTables] = useState<Id<"tables">[]>(
    reservation.tableIds ?? []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tables = useQuery(api.admin.listTables);
  const updateReservation = useMutation(api.admin.updateReservation);

  // Get all reservations for same slot to check occupancy
  const slotReservations = useQuery(api.admin.listReservations, {
    dateKey: reservation.dateKey,
    service: reservation.service,
    paginationOpts: { numItems: 100, cursor: null },
  });

  // Calculate which tables are occupied by other reservations
  const occupiedTables = useMemo(() => {
    if (!slotReservations?.page) return new Set<string>();

    const occupied = new Set<string>();
    for (const res of slotReservations.page) {
      // Skip current reservation and non-active statuses
      if (res._id === reservation._id) continue;
      if (!["pending", "confirmed", "seated"].includes(res.status)) continue;

      // Same time slot check (simplified - same timeKey)
      if (res.timeKey === reservation.timeKey) {
        for (const tableId of res.tableIds) {
          occupied.add(tableId);
        }
      }
    }
    return occupied;
  }, [slotReservations, reservation]);

  // Calculate total capacity of selected tables
  const selectedCapacity = useMemo(() => {
    if (!tables) return 0;
    return tables
      .filter((t) => selectedTables.includes(t._id))
      .reduce((sum, t) => sum + t.capacity, 0);
  }, [tables, selectedTables]);

  const toggleTable = (tableId: Id<"tables">) => {
    if (occupiedTables.has(tableId)) return;

    setSelectedTables((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await updateReservation({
        reservationId: reservation._id,
        expectedVersion: reservation.version,
        tableIds: selectedTables,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedTables([]);
  };

  if (!tables) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Group tables by zone
  const diningTables = tables.filter((t) => t.zone === "dining");
  const terraceTables = tables.filter((t) => t.zone === "terrace");

  const capacityOk = selectedCapacity >= reservation.partySize;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Attribution des tables</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              {reservation.partySize} couvert{reservation.partySize > 1 ? "s" : ""}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1",
              capacityOk ? "text-green-600" : "text-yellow-600"
            )}
          >
            <span>Capacite: {selectedCapacity}</span>
            {capacityOk ? (
              <Check className="h-4 w-4" />
            ) : (
              <span className="text-xs">(insuffisant)</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Dining zone */}
        {diningTables.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sun className="h-4 w-4" />
              Salle
            </div>
            <div className="grid grid-cols-4 gap-2">
              {diningTables.map((table) => (
                <TableButton
                  key={table._id}
                  table={table}
                  isSelected={selectedTables.includes(table._id)}
                  isOccupied={occupiedTables.has(table._id)}
                  onClick={() => toggleTable(table._id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Terrace zone */}
        {terraceTables.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TreePine className="h-4 w-4" />
              Terrasse
            </div>
            <div className="grid grid-cols-4 gap-2">
              {terraceTables.map((table) => (
                <TableButton
                  key={table._id}
                  table={table}
                  isSelected={selectedTables.includes(table._id)}
                  isOccupied={occupiedTables.has(table._id)}
                  onClick={() => toggleTable(table._id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-primary" />
            <span>Selectionne</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded border bg-background" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-muted" />
            <span>Occupe</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={selectedTables.length === 0 || isLoading}
            className="min-h-[44px]"
          >
            Effacer
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="min-h-[44px] flex-1"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TableButton({
  table,
  isSelected,
  isOccupied,
  onClick,
}: {
  table: TableData;
  isSelected: boolean;
  isOccupied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isOccupied}
      className={cn(
        "flex min-h-[44px] flex-col items-center justify-center rounded-lg border p-2 text-center transition-all",
        isOccupied && "cursor-not-allowed bg-muted opacity-50",
        isSelected && !isOccupied && "border-primary bg-primary text-primary-foreground",
        !isSelected && !isOccupied && "hover:border-primary hover:bg-accent"
      )}
    >
      <span className="text-sm font-medium">{table.name}</span>
      <span className="text-xs opacity-70">{table.capacity}p</span>
    </button>
  );
}
