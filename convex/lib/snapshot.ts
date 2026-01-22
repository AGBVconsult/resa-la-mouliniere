/**
 * PRD-011: Snapshot generation for assignment logs
 * 
 * Hybrid snapshot strategy:
 * - Normal mode: counts + hash + sample (5 tables max)
 * - Full mode: complete lists if isTest=true OR phase >= suggest
 */

import type { Id } from "../_generated/dataModel";

export type Phase = "shadow" | "suggest" | "auto_vip" | "full_auto";

export interface SnapshotConfig {
  isTest: boolean;
  phase: Phase;
}

export interface TablesSnapshot {
  availableCount: number;
  takenCount: number;
  totalCount: number;
  stateHash: string;
  availableSample: Id<"tables">[];
  takenSample: Id<"tables">[];
  availableIds?: Id<"tables">[];
  takenIds?: Id<"tables">[];
  isFullSnapshot: boolean;
}

/**
 * Simple hash function for state verification
 * (crypto not available in Convex runtime)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Generate a tables snapshot for assignment logging
 */
export function generateTablesSnapshot(
  availableTables: Id<"tables">[],
  takenTables: Id<"tables">[],
  config: SnapshotConfig
): TablesSnapshot {
  const shouldIncludeFullLists = config.isTest || config.phase !== "shadow";

  // Hash for integrity verification
  const allIds = [...availableTables, ...takenTables].sort();
  const stateHash = simpleHash(allIds.join(","));

  return {
    availableCount: availableTables.length,
    takenCount: takenTables.length,
    totalCount: availableTables.length + takenTables.length,
    stateHash,
    availableSample: availableTables.slice(0, 5),
    takenSample: takenTables.slice(0, 5),
    availableIds: shouldIncludeFullLists ? availableTables : undefined,
    takenIds: shouldIncludeFullLists ? takenTables : undefined,
    isFullSnapshot: shouldIncludeFullLists,
  };
}

/**
 * Validate snapshot integrity against current state
 */
export function validateSnapshotIntegrity(
  snapshot: TablesSnapshot,
  currentAvailable: Id<"tables">[],
  currentTaken: Id<"tables">[]
): { valid: boolean; drift: string | null } {
  // Recompute hash
  const allIds = [...currentAvailable, ...currentTaken].sort();
  const currentHash = simpleHash(allIds.join(","));

  if (currentHash !== snapshot.stateHash) {
    return {
      valid: false,
      drift: `Hash mismatch: ${snapshot.stateHash} vs ${currentHash}`,
    };
  }

  return { valid: true, drift: null };
}
