/**
 * PRD-011 Phase 2: Scoring V0 (Rule-Based)
 * 
 * Algorithme de scoring pour prédire les meilleurs sets de tables.
 * Version V0 = règles métier statiques, pas de ML.
 */

import type { Doc } from "../_generated/dataModel";

// Scoring weights (total = 100)
export const SCORING_WEIGHTS = {
  capacityFit: 25,        // Capacité optimale (pas trop de gaspillage)
  zoneBalance: 15,        // Équilibrage occupation salle/terrasse
  adjacency: 15,          // Tables adjacentes (pour multi-tables)
  characteristics: 15,    // PMR, vue mer, calme...
  clientPreference: 20,   // Zone/table préférée du client
  availability: 10,       // Pénalité si table très demandée
} as const;

export interface ScoringDetails {
  capacityScore: number;
  clientPreferenceScore: number;
  zoneScore: number;
  balanceScore: number;
  adjacencyBonus: number;
  characteristicsScore: number;
  totalScore: number;
}

export interface ClientContext {
  preferredZone?: "salle" | "terrasse";
  preferredTableName?: string;
  totalVisits: number;
  isVip: boolean;
  needsAccessibility?: boolean;
}

export interface ServiceContext {
  zoneOccupancies: {
    salle: number;
    terrasse: number;
  };
  totalOccupancy: number;
}

/**
 * Score a single table for a reservation
 */
export function scoreTable(
  table: Doc<"tables">,
  partySize: number,
  clientContext: ClientContext | null,
  serviceContext: ServiceContext
): number {
  let score = 0;

  // 1. Capacity fit (25 points max)
  // Optimal: table capacity = partySize or partySize + 1
  // Penalty for waste
  const capacityDiff = table.capacity - partySize;
  if (capacityDiff < 0) {
    // Table too small - heavy penalty
    score += 0;
  } else if (capacityDiff === 0) {
    score += SCORING_WEIGHTS.capacityFit; // Perfect fit
  } else if (capacityDiff === 1) {
    score += SCORING_WEIGHTS.capacityFit * 0.9; // Slight waste OK
  } else if (capacityDiff === 2) {
    score += SCORING_WEIGHTS.capacityFit * 0.7;
  } else {
    // More waste = less score
    score += Math.max(0, SCORING_WEIGHTS.capacityFit * (1 - capacityDiff * 0.15));
  }

  // 2. Zone balance (15 points max)
  // Prefer less occupied zone
  const zone = normalizeZone(table.zone);
  const zoneOccupancy = zone === "salle" 
    ? serviceContext.zoneOccupancies.salle 
    : serviceContext.zoneOccupancies.terrasse;
  
  // Lower occupancy = higher score
  score += SCORING_WEIGHTS.zoneBalance * (1 - zoneOccupancy);

  // 3. Client preference (20 points max)
  if (clientContext) {
    // Zone preference
    if (clientContext.preferredZone && clientContext.preferredZone === zone) {
      score += SCORING_WEIGHTS.clientPreference * 0.6;
    }
    // Table preference
    if (clientContext.preferredTableName && table.name === clientContext.preferredTableName) {
      score += SCORING_WEIGHTS.clientPreference * 0.4;
    }
    // VIP bonus
    if (clientContext.isVip) {
      score += 5; // Bonus for VIP clients
    }
  }

  // 4. Characteristics (15 points max)
  // For now, just check accessibility
  if (clientContext?.needsAccessibility) {
    // Check if table has accessibility feature
    // This would need features array in table schema
    // For now, assume tables with capacity >= 4 are more accessible
    if (table.capacity >= 4) {
      score += SCORING_WEIGHTS.characteristics * 0.5;
    }
  } else {
    // Default characteristics score
    score += SCORING_WEIGHTS.characteristics * 0.5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Score a set of tables for a reservation
 */
export function scoreTableSet(
  tables: Doc<"tables">[],
  partySize: number,
  clientContext: ClientContext | null,
  serviceContext: ServiceContext,
  isAdjacent: boolean
): ScoringDetails {
  if (tables.length === 0) {
    return {
      capacityScore: 0,
      clientPreferenceScore: 0,
      zoneScore: 0,
      balanceScore: 0,
      adjacencyBonus: 0,
      characteristicsScore: 0,
      totalScore: 0,
    };
  }

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  
  // 1. Capacity score
  const capacityDiff = totalCapacity - partySize;
  let capacityScore = 0;
  if (capacityDiff < 0) {
    capacityScore = 0;
  } else if (capacityDiff === 0) {
    capacityScore = SCORING_WEIGHTS.capacityFit;
  } else if (capacityDiff <= 2) {
    capacityScore = SCORING_WEIGHTS.capacityFit * (1 - capacityDiff * 0.1);
  } else {
    capacityScore = Math.max(0, SCORING_WEIGHTS.capacityFit * (1 - capacityDiff * 0.12));
  }

  // 2. Zone score (all tables same zone = bonus)
  const zones = new Set(tables.map(t => normalizeZone(t.zone)));
  const isSameZone = zones.size === 1;
  const primaryZone = normalizeZone(tables[0].zone);
  
  let zoneScore = 0;
  if (isSameZone) {
    zoneScore = 10; // Bonus for same zone
    if (clientContext?.preferredZone === primaryZone) {
      zoneScore += 10; // Extra bonus for preferred zone
    }
  } else {
    zoneScore = 0; // Mixed zones = no bonus
  }

  // 3. Balance score
  const zoneOccupancy = primaryZone === "salle"
    ? serviceContext.zoneOccupancies.salle
    : serviceContext.zoneOccupancies.terrasse;
  const balanceScore = SCORING_WEIGHTS.zoneBalance * (1 - zoneOccupancy);

  // 4. Adjacency bonus (for multi-table sets)
  let adjacencyBonus = 0;
  if (tables.length > 1) {
    adjacencyBonus = isAdjacent ? SCORING_WEIGHTS.adjacency : 0;
  }

  // 5. Client preference score
  let clientPreferenceScore = 0;
  if (clientContext) {
    if (clientContext.preferredZone === primaryZone) {
      clientPreferenceScore += SCORING_WEIGHTS.clientPreference * 0.5;
    }
    if (clientContext.preferredTableName) {
      const hasPreferredTable = tables.some(t => t.name === clientContext.preferredTableName);
      if (hasPreferredTable) {
        clientPreferenceScore += SCORING_WEIGHTS.clientPreference * 0.5;
      }
    }
    if (clientContext.isVip) {
      clientPreferenceScore += 5;
    }
  }

  // 6. Characteristics score
  let characteristicsScore = SCORING_WEIGHTS.characteristics * 0.5; // Default
  if (clientContext?.needsAccessibility) {
    const hasLargeTable = tables.some(t => t.capacity >= 4);
    if (hasLargeTable) {
      characteristicsScore = SCORING_WEIGHTS.characteristics;
    }
  }

  const totalScore = Math.min(100, Math.max(0,
    capacityScore + zoneScore + balanceScore + adjacencyBonus + 
    clientPreferenceScore + characteristicsScore
  ));

  return {
    capacityScore: Math.round(capacityScore * 10) / 10,
    clientPreferenceScore: Math.round(clientPreferenceScore * 10) / 10,
    zoneScore: Math.round(zoneScore * 10) / 10,
    balanceScore: Math.round(balanceScore * 10) / 10,
    adjacencyBonus: Math.round(adjacencyBonus * 10) / 10,
    characteristicsScore: Math.round(characteristicsScore * 10) / 10,
    totalScore: Math.round(totalScore * 10) / 10,
  };
}

/**
 * Normalize zone names (handle legacy values)
 */
function normalizeZone(zone: string): "salle" | "terrasse" {
  if (zone === "dining" || zone === "salle") return "salle";
  if (zone === "terrace" || zone === "terrasse") return "terrasse";
  return "salle"; // Default
}

/**
 * Convert score to confidence percentage (0-100)
 */
export function scoreToConfidence(score: number): number {
  // Score is already 0-100, but we can adjust the curve
  // Higher scores = higher confidence
  return Math.round(Math.min(100, Math.max(0, score)));
}
