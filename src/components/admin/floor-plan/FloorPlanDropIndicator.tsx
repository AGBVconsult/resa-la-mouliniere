"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GRID_CELL_SIZE, TABLE_SIZE, Z_INDEX } from "@/lib/constants/grid";

interface FloorPlanDropIndicatorProps {
  position: { x: number; y: number };
  width?: number;
  height?: number;
  isValid: boolean;
}

export function FloorPlanDropIndicator({
  position,
  width = 1,
  height = 1,
  isValid,
}: FloorPlanDropIndicatorProps) {
  return (
    <motion.div
      className={cn(
        "absolute rounded-lg border-2 border-dashed pointer-events-none",
        "flex items-center justify-center",
        isValid
          ? "border-green-400 bg-green-100/50"
          : "border-red-400 bg-red-100/50"
      )}
      style={{
        left: position.x * GRID_CELL_SIZE + 4,
        top: position.y * GRID_CELL_SIZE + 4,
        width: width * TABLE_SIZE - 8,
        height: height * TABLE_SIZE - 8,
        zIndex: Z_INDEX.dropIndicator,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
    >
      {isValid ? (
        <Check className="w-5 h-5 text-green-600" />
      ) : (
        <X className="w-5 h-5 text-red-600" />
      )}
    </motion.div>
  );
}
