"use client";

import { useState, useEffect } from "react";
import { X, Copy, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { TableInfo, Zone, CombinationDirection } from "@/lib/types/tables";

interface TableEditPanelProps {
  table: TableInfo | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    capacity: number;
    zone: Zone;
    combinationDirection: CombinationDirection;
  }) => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
}

export function TableEditPanel({
  table,
  onClose,
  onSave,
  onDuplicate,
  onToggleActive,
}: TableEditPanelProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [zone, setZone] = useState<Zone>("salle");
  const [combinationDirection, setCombinationDirection] = useState<CombinationDirection>("none");

  // Sync state when table changes
  useEffect(() => {
    if (table) {
      setName(table.name);
      setCapacity(table.capacity);
      setZone(table.zone);
      setCombinationDirection(table.combinationDirection);
    }
  }, [table]);

  if (!table) {
    return (
      <div className="w-[300px] bg-white border-l p-4 flex items-center justify-center text-gray-400">
        Sélectionnez une table
      </div>
    );
  }

  const handleSave = () => {
    onSave({ name, capacity, zone, combinationDirection });
  };

  return (
    <div className="w-[300px] bg-white border-l flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Table {table.name}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="T1"
            maxLength={20}
          />
        </div>

        {/* Capacity */}
        <div className="space-y-1.5">
          <Label htmlFor="capacity">Capacité</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            max={20}
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
          />
        </div>

        {/* Zone */}
        <div className="space-y-1.5">
          <Label>Zone</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setZone("salle")}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors",
                zone === "salle"
                  ? "bg-amber-100 border-amber-400 text-amber-800"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              )}
            >
              Salle
            </button>
            <button
              type="button"
              onClick={() => setZone("terrasse")}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors",
                zone === "terrasse"
                  ? "bg-emerald-100 border-emerald-400 text-emerald-800"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              )}
            >
              Terrasse
            </button>
          </div>
        </div>

        {/* Combination Direction */}
        <div className="space-y-1.5">
          <Label>Combinaison</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCombinationDirection("none")}
              className={cn(
                "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-colors",
                combinationDirection === "none"
                  ? "bg-gray-200 border-gray-400 text-gray-800"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              )}
            >
              Aucune
            </button>
            <button
              type="button"
              onClick={() => setCombinationDirection("horizontal")}
              className={cn(
                "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-colors",
                combinationDirection === "horizontal"
                  ? "bg-violet-100 border-violet-400 text-violet-800"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              )}
            >
              Horiz.
            </button>
            <button
              type="button"
              onClick={() => setCombinationDirection("vertical")}
              className={cn(
                "flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-colors",
                combinationDirection === "vertical"
                  ? "bg-blue-100 border-blue-400 text-blue-800"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              )}
            >
              Vert.
            </button>
          </div>
        </div>

        {/* Position (read-only) */}
        <div className="space-y-1.5">
          <Label>Position</Label>
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            X: {table.positionX} &nbsp;|&nbsp; Y: {table.positionY}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label>Statut</Label>
          <div
            className={cn(
              "text-sm font-medium px-3 py-2 rounded-lg",
              table.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            )}
          >
            {table.isActive ? "Active" : "Désactivée"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-2">
        <Button onClick={handleSave} className="w-full">
          Valider
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onDuplicate}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-1" />
            Dupliquer
          </Button>
          <Button
            variant="outline"
            onClick={onToggleActive}
            className={cn(
              "flex-1",
              table.isActive
                ? "text-red-600 hover:bg-red-50"
                : "text-green-600 hover:bg-green-50"
            )}
          >
            {table.isActive ? (
              <>
                <PowerOff className="h-4 w-4 mr-1" />
                Désactiver
              </>
            ) : (
              <>
                <Power className="h-4 w-4 mr-1" />
                Réactiver
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
