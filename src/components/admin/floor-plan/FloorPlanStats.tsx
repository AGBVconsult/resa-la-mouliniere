"use client";

import { LayoutGrid, Home, Sun, Users } from "lucide-react";

interface FloorPlanStatsProps {
  stats: {
    total: number;
    active: number;
    salle: { count: number; capacity: number };
    terrasse: { count: number; capacity: number };
    totalCapacity: number;
  };
}

export function FloorPlanStats({ stats }: FloorPlanStatsProps) {
  return (
    <div className="flex items-center gap-4 text-sm text-gray-600 py-2 px-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-1.5">
        <LayoutGrid className="h-4 w-4" />
        <span className="font-medium">{stats.active}</span>
        <span>tables</span>
      </div>
      <div className="w-px h-4 bg-gray-300" />
      <div className="flex items-center gap-1.5">
        <Home className="h-4 w-4 text-amber-600" />
        <span className="font-medium">{stats.salle.capacity}</span>
        <span>salle</span>
      </div>
      <div className="w-px h-4 bg-gray-300" />
      <div className="flex items-center gap-1.5">
        <Sun className="h-4 w-4 text-emerald-600" />
        <span className="font-medium">{stats.terrasse.capacity}</span>
        <span>terrasse</span>
      </div>
      <div className="w-px h-4 bg-gray-300" />
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4" />
        <span className="font-medium">{stats.totalCapacity}</span>
        <span>total</span>
      </div>
    </div>
  );
}
