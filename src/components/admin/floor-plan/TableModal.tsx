"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Zone, CombinationDirection } from "@/lib/types/tables";

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    capacity: number;
    zone: Zone;
    positionX: number;
    positionY: number;
    combinationDirection: CombinationDirection;
  }) => void;
  defaultPosition?: { x: number; y: number };
}

export function TableModal({
  isOpen,
  onClose,
  onCreate,
  defaultPosition = { x: 0, y: 0 },
}: TableModalProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [zone, setZone] = useState<Zone>("salle");
  const [combinationDirection, setCombinationDirection] = useState<CombinationDirection>("none");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreate({
      name: name.trim(),
      capacity,
      zone,
      positionX: defaultPosition.x,
      positionY: defaultPosition.y,
      combinationDirection,
    });

    // Reset form
    setName("");
    setCapacity(4);
    setZone("salle");
    setCombinationDirection("none");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-[calc(100%-2rem)] max-w-[400px] max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Nouvelle table</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Nom *</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T1, VIP, 101..."
              maxLength={20}
              autoFocus
            />
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            <Label htmlFor="new-capacity">Capacité *</Label>
            <Input
              id="new-capacity"
              type="number"
              min={1}
              max={20}
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Zone */}
          <div className="space-y-1.5">
            <Label>Zone *</Label>
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
                Horizontale
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
                Verticale
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={!name.trim()}>
              Créer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
