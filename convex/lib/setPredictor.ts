/**
 * PRD-011 Phase 2: Set Predictor
 * 
 * Generates candidate table sets and predicts the best one.
 * D10: Predicts complete SETS, not individual table rankings.
 */

import type { Doc, Id } from "../_generated/dataModel";
import { isTableSetAdjacent, getCanonicalZone } from "./adjacency";
import { scoreTableSet, scoreToConfidence, type ClientContext, type ServiceContext, type ScoringDetails } from "./scoring";

export interface SetPrediction {
  tableSet: Id<"tables">[];
  tableNames: string[];
  zone: "salle" | "terrasse" | "mixed";
  capacity: number;
  isAdjacent: boolean;
  confidence: number;
  scoringDetails: ScoringDetails;
}

export interface PredictionResult {
  predictedSet: SetPrediction;
  alternativeSets: SetPrediction[];
}

interface CandidateSet {
  tables: Doc<"tables">[];
  totalCapacity: number;
}

/**
 * Generate all valid candidate sets for a party size
 */
function generateCandidateSets(
  availableTables: Doc<"tables">[],
  seatingSize: number,
  maxTables: number = 3
): CandidateSet[] {
  const candidates: CandidateSet[] = [];

  // 1. Single tables with sufficient capacity
  for (const t of availableTables) {
    if (t.capacity >= seatingSize) {
      candidates.push({
        tables: [t],
        totalCapacity: t.capacity,
      });
    }
  }

  // 2. Pairs of tables (if needed)
  const maxSingleCapacity = Math.max(0, ...availableTables.map(t => t.capacity));
  if (seatingSize > maxSingleCapacity || candidates.length < 3) {
    for (let i = 0; i < availableTables.length; i++) {
      for (let j = i + 1; j < availableTables.length; j++) {
        const combined = availableTables[i].capacity + availableTables[j].capacity;
        if (combined >= seatingSize) {
          candidates.push({
            tables: [availableTables[i], availableTables[j]],
            totalCapacity: combined,
          });
        }
      }
    }
  }

  // 3. Triplets (for large groups > 10)
  if (maxTables >= 3 && seatingSize > 10) {
    const maxPairCapacity = Math.max(0, ...candidates
      .filter(c => c.tables.length === 2)
      .map(c => c.totalCapacity));
    
    if (seatingSize > maxPairCapacity) {
      for (let i = 0; i < availableTables.length; i++) {
        for (let j = i + 1; j < availableTables.length; j++) {
          for (let k = j + 1; k < availableTables.length; k++) {
            const combined = availableTables[i].capacity + 
                           availableTables[j].capacity + 
                           availableTables[k].capacity;
            if (combined >= seatingSize) {
              candidates.push({
                tables: [availableTables[i], availableTables[j], availableTables[k]],
                totalCapacity: combined,
              });
            }
          }
        }
      }
    }
  }

  return candidates;
}

/**
 * Score and rank candidate sets
 */
function scoreCandidateSets(
  candidates: CandidateSet[],
  seatingSize: number,
  clientContext: ClientContext | null,
  serviceContext: ServiceContext
): SetPrediction[] {
  const scored: SetPrediction[] = [];

  for (const candidate of candidates) {
    const isAdjacent = isTableSetAdjacent(candidate.tables);
    const zone = getCanonicalZone(candidate.tables);
    
    const scoringDetails = scoreTableSet(
      candidate.tables,
      seatingSize,
      clientContext,
      serviceContext,
      isAdjacent
    );

    scored.push({
      tableSet: candidate.tables.map(t => t._id),
      tableNames: candidate.tables.map(t => t.name),
      zone,
      capacity: candidate.totalCapacity,
      isAdjacent,
      confidence: scoreToConfidence(scoringDetails.totalScore),
      scoringDetails,
    });
  }

  // Sort by score descending
  scored.sort((a, b) => b.confidence - a.confidence);

  return scored;
}

/**
 * Generate set predictions for a reservation
 * Returns the best prediction and up to 2 alternatives
 */
export function generateSetPredictions(
  availableTables: Doc<"tables">[],
  seatingSize: number,
  clientContext: ClientContext | null,
  serviceContext: ServiceContext
): PredictionResult | null {
  // Filter to active tables only
  const activeTables = availableTables.filter(t => t.isActive);

  if (activeTables.length === 0) {
    return null;
  }

  // Generate candidates
  const candidates = generateCandidateSets(activeTables, seatingSize);

  if (candidates.length === 0) {
    return null;
  }

  // Score and rank
  const scored = scoreCandidateSets(
    candidates,
    seatingSize,
    clientContext,
    serviceContext
  );

  if (scored.length === 0) {
    return null;
  }

  return {
    predictedSet: scored[0],
    alternativeSets: scored.slice(1, 3), // Top 2 alternatives
  };
}

/**
 * Quick prediction for logging (minimal computation)
 */
export function quickPredict(
  availableTables: Doc<"tables">[],
  seatingSize: number,
  zoneOccupancies: { salle: number; terrasse: number }
): PredictionResult | null {
  // Simple client context (no client data in Phase 2)
  const clientContext: ClientContext | null = null;

  const serviceContext: ServiceContext = {
    zoneOccupancies,
    totalOccupancy: (zoneOccupancies.salle + zoneOccupancies.terrasse) / 2,
  };

  return generateSetPredictions(
    availableTables,
    seatingSize,
    clientContext,
    serviceContext
  );
}
