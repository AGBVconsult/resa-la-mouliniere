/**
 * Table types for floor plan (PRD-004)
 */

import type { Id } from "../../../convex/_generated/dataModel";

export type Zone = "salle" | "terrasse";
export type CombinationDirection = "horizontal" | "vertical" | "none";

export interface Table {
  _id: Id<"tables">;
  _creationTime: number;
  restaurantId: Id<"restaurants">;
  name: string;
  capacity: number;
  zone: Zone;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  combinationDirection: CombinationDirection;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TableInfo {
  _id: string;
  name: string;
  capacity: number;
  zone: Zone;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  combinationDirection: CombinationDirection;
  isActive: boolean;
}

export function getTableDimensions(table: Pick<Table, "width" | "height">) {
  return {
    width: table.width ?? 1,
    height: table.height ?? 1,
  };
}

export function getTableGridPosition(table: Pick<Table, "positionX" | "positionY">) {
  return {
    x: table.positionX,
    y: table.positionY,
  };
}
