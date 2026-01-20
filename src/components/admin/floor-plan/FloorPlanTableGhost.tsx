"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { TABLE_SIZE, ZONE_STYLES, Z_INDEX } from "@/lib/constants/grid";
import type { TableInfo } from "@/lib/types/tables";

interface FloorPlanTableGhostProps {
  table: TableInfo;
  isValid: boolean;
}

export function FloorPlanTableGhost({ table, isValid }: FloorPlanTableGhostProps) {
  const zoneStyle = ZONE_STYLES[table.zone];
  const width = (table.width ?? 1) * TABLE_SIZE - 4;
  const height = (table.height ?? 1) * TABLE_SIZE - 4;

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2",
        isValid
          ? cn(zoneStyle.bg, "border-blue-500")
          : "bg-red-100 border-red-500"
      )}
      style={{
        width,
        height,
        zIndex: Z_INDEX.ghost,
      }}
      initial={{ scale: 1, opacity: 0.9 }}
      animate={{
        scale: 1.05,
        opacity: 1,
        boxShadow: isValid
          ? "0 10px 30px rgba(59, 130, 246, 0.3)"
          : "0 10px 30px rgba(239, 68, 68, 0.3)",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <span className={cn("text-xs font-semibold", isValid ? zoneStyle.text : "text-red-800")}>
        {table.name}
      </span>
      <span className={cn("text-[10px] flex items-center gap-0.5", isValid ? zoneStyle.text : "text-red-800", "opacity-75")}>
        {table.capacity} <Users className="w-2.5 h-2.5" />
      </span>
    </motion.div>
  );
}
