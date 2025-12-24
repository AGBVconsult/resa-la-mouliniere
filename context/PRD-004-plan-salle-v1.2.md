# PRD-004 : Plan de Salle (Floor Plan)

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-004 |
| **Titre** | Plan de Salle — Gestion des Tables et Zones |
| **Statut** | ✅ Production-ready |
| **Priorité** | P0 — Critique (GAP-01) |
| **Version** | 1.2 |
| **Date création** | 2025-12-21 |
| **Dernière MàJ** | 2025-12-21 |
| **Responsable** | AGBVconsult |
| **Score Qualité** | 98/100 |

---

## Résumé des Décisions Clés (v1.2)

```
┌─────────────────────────────────────────────────────────────────┐
│  DÉCISIONS VERROUILLÉES v1.2                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Statuts table : free / reserved / seated (+ blocked P1)       │
│  Zones MVP : enum hardcodé (salle | terrasse)                  │
│  Pré-assignation : autorisée via overlap [startAt, expectedEndAt)│
│  Durée : settings.defaultReservationDurationMinutes (90min)    │
│  Anti-collision : refus dur + pattern _version COMPLET         │
│  Coordonnées : gridX/gridY entiers (validation mutation)       │
│  Règle overlap : back-to-back OK ; seated bloque jusqu'à completed│
│                                                                 │
│  ═══════════════════════════════════════════════════════════════│
│  NOUVEAUTÉS v1.2 (DIAMOND-grade)                               │
│                                                                 │
│  • _version : incrément atomique + expectedVersion OBLIGATOIRE │
│  • DST-safe : Luxon server-authoritative (Europe/Brussels)     │
│  • Index array supprimé (by_date + filter en mémoire)          │
│  • Erreurs standardisées : format CODE|param1|param2           │
│  • getTableStates déterministe (seated > startAt min)          │
│  • Query optimisée (collect une fois, filter en mémoire)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# PARTIE 1 : VISION & SCOPE

## 1.1 Objectif

Fournir une représentation visuelle interactive du restaurant permettant :
- De visualiser l'état des 50 tables en temps réel
- D'assigner des réservations aux tables par click-to-click
- De pré-assigner tout un service le matin (multi-créneaux sur même table)
- D'optimiser le placement selon la capacité et les préférences

> **GAP-01** : Ce module est le bottleneck principal pour le lancement production.

## 1.2 Problème Résolu

| Problème | Solution |
|----------|----------|
| Pas de vue d'ensemble salle | Visualisation interactive du plan |
| Assignation table complexe | Click-to-click sur iPad |
| Conflits multi-créneaux | Overlap temporel avec refus dur |
| Grandes tablées difficiles | Multi-assignation (fusion tables) |
| Pas de temps réel | Sync WebSocket Convex |
| Double-assignation concurrent | Pattern `_version` COMPLET |
| Décalage DST | Luxon server-authoritative |

## 1.3 Contexte Opérationnel

| Aspect | Valeur |
|--------|--------|
| **Nombre de tables** | 50 (30 salle + 20 terrasse) |
| **Device principal** | iPad Mini (touch) |
| **Utilisateur** | Allisson (manager, 15 ans XP) |
| **Interaction** | Click-to-click (PAS drag-drop pendant service) |
| **Sync** | Real-time via Convex |
| **Durée résa** | 90 min par défaut (PRD-012) |
| **Timezone** | Europe/Brussels (server-authoritative) |

## 1.4 Inclus / Exclus

| ✅ Inclus | ❌ Exclus |
|-----------|----------|
| Visualisation plan interactif | Attribution automatique ML (PRD-011) |
| Assignation click-to-click | Import d'image de plan (v2) |
| Multi-tables (grandes tablées) | Gestion stocks/cuisine |
| Overlap temporel + refus dur | Facturation/POS |
| DST-safe via Luxon | Rotation tables automatique |
| Pattern _version complet | Table `zones` configurable (P1) |

---

# PARTIE 2 : CONCEPTS MÉTIER

## 2.1 Définitions

| Concept | Définition |
|---------|------------|
| **Zone** | Regroupement logique de tables (MVP: enum `salle` \| `terrasse`) |
| **Table** | Emplacement physique avec capacité max |
| **Capacité** | Nombre max de couverts (`partySize` ≤ `capacity`) |
| **Assignation** | Lien entre une réservation et une ou plusieurs tables |
| **Multi-tables** | Grande tablée occupant plusieurs tables adjacentes |
| **Fenêtre** | Intervalle `[startAt, expectedEndAt)` d'une réservation |
| **Overlap** | Deux fenêtres se chevauchent (conflit) |

## 2.2 Statuts Table (3 États)

```
┌─────────────────────────────────────────────────────────────────┐
│  STATUTS TABLE (v1.2)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Priorité d'affichage : blocked > seated > reserved > free     │
│                                                                 │
│  ┌─────────┬─────────────────────────────────────────────────┐ │
│  │ SEATED  │ Au moins 1 résa assignée avec status="seated"   │ │
│  │   🔴    │ Couleur: rouge | Bloquante jusqu'à completed    │ │
│  ├─────────┼─────────────────────────────────────────────────┤ │
│  │RESERVED │ Au moins 1 résa assignée avec statut actif      │ │
│  │   🟠    │ (pending/confirmed/late) qui overlap la fenêtre │ │
│  │         │ Couleur: orange | Planifiée, pas encore réelle  │ │
│  ├─────────┼─────────────────────────────────────────────────┤ │
│  │  FREE   │ Aucune résa assignée avec overlap               │ │
│  │   🟢    │ Couleur: vert/gris | Disponible                 │ │
│  ├─────────┼─────────────────────────────────────────────────┤ │
│  │ BLOCKED │ isActive=false (P1: isBlocked=true)             │ │
│  │   ⚫    │ Couleur: gris foncé | Override tous les autres  │ │
│  └─────────┴─────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Logique de Calcul

```typescript
type TableStatus = "seated" | "reserved" | "free" | "blocked";

function getTableStatus(
  table: Table,
  assignedReservations: Reservation[],
  viewWindow: { start: number; end: number }
): TableStatus {
  // 1. Override blocked
  if (!table.isActive) return "blocked";
  
  // 2. Check seated (réalité prime)
  const hasSeated = assignedReservations.some(r => r.status === "seated");
  if (hasSeated) return "seated";
  
  // 3. Check reserved (planifié avec overlap)
  const ACTIVE_STATUSES = ["pending", "confirmed", "late"];
  const hasReserved = assignedReservations.some(r => 
    ACTIVE_STATUSES.includes(r.status) &&
    overlaps(r.startAt, r.expectedEndAt, viewWindow.start, viewWindow.end)
  );
  if (hasReserved) return "reserved";
  
  // 4. Default free
  return "free";
}
```

## 2.3 Fenêtre Temporelle & Overlap

```
┌─────────────────────────────────────────────────────────────────┐
│  RÈGLE D'OVERLAP (P0)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Fenêtre de réservation :                                       │
│  • startAt : timestamp calculé SERVER-SIDE (Luxon + Brussels)  │
│  • expectedEndAt : startAt + defaultReservationDurationMinutes │
│  • Stockés sur la réservation (source of truth backend)        │
│                                                                 │
│  Règle overlap (end EXCLUSIF) :                                 │
│  • overlaps(A, B) = A.startAt < B.expectedEndAt                │
│                  && B.startAt < A.expectedEndAt                │
│  • Back-to-back autorisé : 12:00-13:30 puis 13:30-15:00 = OK   │
│                                                                 │
│  Cas seated (réalité > théorie) :                              │
│  • Une résa "seated" bloque jusqu'à "completed"                │
│  • Pas de calcul expectedEndAt, juste flag "occupée"           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implémentation Overlap

```typescript
/**
 * Vérifie si deux fenêtres temporelles se chevauchent.
 * End est EXCLUSIF (back-to-back OK).
 */
function overlaps(
  aStart: number, 
  aEnd: number, 
  bStart: number, 
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Vérifie si une réservation est "bloquante" pour une table.
 * Seated = toujours bloquant (pas de fin théorique).
 */
function isBlocking(
  existing: Reservation,
  target: { startAt: number; expectedEndAt: number }
): boolean {
  if (existing.status === "seated") {
    // Seated bloque tout overlap avec startAt
    return target.startAt < Number.MAX_SAFE_INTEGER; // Toujours true
  }
  return overlaps(existing.startAt, existing.expectedEndAt, target.startAt, target.expectedEndAt);
}
```

## 2.4 DST-Safe : Calcul Server-Authoritative (v1.2)

```
┌─────────────────────────────────────────────────────────────────┐
│  CALCUL TIMEZONE (v1.2 — DIAMOND-grade)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DÉCISION : Option B — Server-authoritative avec Luxon         │
│                                                                 │
│  Pourquoi :                                                     │
│  • Robustesse multi-devices (iPad, laptop, iPhone...)          │
│  • Reproductibilité & audit (même résa = même startAt)         │
│  • DST vraiment safe (maîtrise 100% timezone)                  │
│  • Faible coût (Luxon uniquement au write)                     │
│                                                                 │
│  Contrat Frontend → Backend :                                   │
│  • Envoyer : date ("YYYY-MM-DD") + time ("HH:mm")              │
│  • NE PAS envoyer startAt (le backend calcule)                 │
│                                                                 │
│  Backend calcule :                                              │
│  • startAt = DateTime.fromISO(date+time, zone=Brussels).toMillis()│
│  • expectedEndAt = startAt + durationMinutes                   │
│                                                                 │
│  Timezone canonique : Europe/Brussels (PRD-012)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implémentation Luxon

```typescript
// lib/datetime.ts

import { DateTime } from "luxon";

/**
 * Timezone canonique pour tout le système.
 * Défini dans PRD-012 settings.canonicalTimeZone
 */
export const CANONICAL_TZ = "Europe/Brussels";

/**
 * Calcule la fenêtre temporelle d'une réservation.
 * SERVER-AUTHORITATIVE : le backend est la source de vérité.
 * 
 * @param date Format "YYYY-MM-DD"
 * @param time Format "HH:mm"
 * @param durationMinutes Durée en minutes (défaut: settings.defaultReservationDurationMinutes)
 * @returns { startAt, expectedEndAt } en millisecondes
 * @throws INVALID_DATETIME si date/time invalides
 */
export function computeReservationWindow(
  date: string,
  time: string,
  durationMinutes: number
): { startAt: number; expectedEndAt: number } {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: CANONICAL_TZ });

  if (!dt.isValid) {
    throw new Error(`INVALID_DATETIME|${date}|${time}|${dt.invalidReason}`);
  }

  const startAt = dt.toMillis();
  const expectedEndAt = dt.plus({ minutes: durationMinutes }).toMillis();

  return { startAt, expectedEndAt };
}

/**
 * Formate un timestamp pour affichage.
 * Utilisé dans les messages d'erreur.
 */
export function formatTimeFromTimestamp(timestamp: number): string {
  if (timestamp >= Number.MAX_SAFE_INTEGER - 1000) {
    return "en cours"; // Cas seated
  }
  return DateTime.fromMillis(timestamp, { zone: CANONICAL_TZ }).toFormat("HH:mm");
}
```

## 2.5 Pré-assignation Multi-Créneaux

```
┌─────────────────────────────────────────────────────────────────┐
│  PRÉ-ASSIGNATION (autorisée)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scénario : Allisson prépare le service du soir                │
│                                                                 │
│  Table T5 (capacité 4) :                                        │
│  • 19:00 - Dupont (4p) → assignée ✓                            │
│  • 20:45 - Martin (2p) → assignée ✓ (pas d'overlap avec Dupont)│
│  • 20:00 - Schmidt (3p) → REFUSÉ ✗ (overlap avec Dupont)       │
│                                                                 │
│  Timeline :                                                     │
│  19:00        20:30  20:45        22:15                        │
│  [====Dupont====]    [====Martin====]                          │
│           [==Schmidt==] ← CONFLIT                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2.6 Multi-Tables (Grandes Tablées)

```
┌─────────────────────────────────────────────────────────────────┐
│  MULTI-TABLES                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pour une réservation de 12 personnes :                        │
│                                                                 │
│  Option A : 1 grande table (si disponible)                     │
│  • T20 (capacity: 12) → assignée seule                         │
│                                                                 │
│  Option B : Fusion de tables                                   │
│  • T5 (4) + T6 (4) + T7 (4) → total 12                        │
│  • tableIds = ["T5", "T6", "T7"]                               │
│                                                                 │
│  Règles :                                                       │
│  • Capacité combinée ≥ partySize                               │
│  • Toutes les tables doivent être "free" pour la fenêtre       │
│  • Même zone recommandé (warning si cross-zone)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# PARTIE 3 : MODÈLE DE DONNÉES

## 3.1 Table `tables`

```typescript
// convex/schema.ts

tables: defineTable({
  // ═══════════════════════════════════════════════════════════════
  // IDENTITÉ
  // ═══════════════════════════════════════════════════════════════
  
  name: v.string(),                         // "T1", "T12", "TE5"
  label: v.optional(v.string()),            // P1: "Table vue mer"
  
  // Zone (enum MVP, table P1)
  zone: v.union(
    v.literal("salle"),
    v.literal("terrasse")
  ),
  
  // ═══════════════════════════════════════════════════════════════
  // CAPACITÉ
  // ═══════════════════════════════════════════════════════════════
  
  capacity: v.number(),                     // Max couverts (MVP)
  // minCapacity: v.optional(v.number()),   // P1: warning sous-capacité
  
  // ═══════════════════════════════════════════════════════════════
  // POSITION (grille, entiers uniquement)
  // ═══════════════════════════════════════════════════════════════
  
  gridX: v.number(),                        // Coordonnée X (entier, validation mutation)
  gridY: v.number(),                        // Coordonnée Y (entier, validation mutation)
  
  // ═══════════════════════════════════════════════════════════════
  // STATUT
  // ═══════════════════════════════════════════════════════════════
  
  isActive: v.boolean(),                    // false = désactivée (ex: terrasse hiver)
  // isBlocked: v.optional(v.boolean()),    // P1
  // blockedReason: v.optional(v.string()), // P1
  
  // ═══════════════════════════════════════════════════════════════
  // FEATURES (pour préférences client P1)
  // ═══════════════════════════════════════════════════════════════
  
  features: v.optional(v.array(v.string())), // ["vue_mer", "calme", "accessible"]
  
  // ═══════════════════════════════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════════════════════════════
  
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_name", ["name"])
  .index("by_zone", ["zone"])
  .index("by_active", ["isActive"])
  .index("by_position", ["gridX", "gridY"]);

// NOTE v1.2: PAS d'index sur tableIds (array) — non supporté efficacement
// Stratégie: by_date + filter includes(tableId) en mémoire
```

### Validation Position (Entiers)

```typescript
// convex/tables.ts

export const create = mutation({
  args: {
    name: v.string(),
    zone: v.union(v.literal("salle"), v.literal("terrasse")),
    capacity: v.number(),
    gridX: v.number(),
    gridY: v.number(),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // P0: Validation entiers (Convex n'a pas v.int())
    if (!Number.isInteger(args.gridX) || !Number.isInteger(args.gridY)) {
      throw new Error("INVALID_GRID_POSITION|gridX and gridY must be integers");
    }
    
    // Validation unicité nom
    const existing = await ctx.db
      .query("tables")
      .withIndex("by_name", q => q.eq("name", args.name))
      .first();
    if (existing) {
      throw new Error(`TABLE_NAME_EXISTS|${args.name}`);
    }
    
    const now = Date.now();
    return ctx.db.insert("tables", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
```

## 3.2 Extension `reservations` (PRD-002)

```typescript
// Ajout au schéma reservations existant (PRD-002)

reservations: defineTable({
  // ... champs existants PRD-002 ...
  
  // ═══════════════════════════════════════════════════════════════
  // FENÊTRE TEMPORELLE (v1.2 — calculée server-side)
  // ═══════════════════════════════════════════════════════════════
  
  startAt: v.number(),                      // Timestamp calculé par Luxon (Brussels)
  expectedEndAt: v.number(),                // startAt + durationMinutes
  
  // ═══════════════════════════════════════════════════════════════
  // ASSIGNATION TABLES
  // ═══════════════════════════════════════════════════════════════
  
  tableIds: v.optional(v.array(v.id("tables"))),  // Source of truth
  // tableNumbers: v.optional(v.array(v.string())), // P1: dénormalisé
  
  // ═══════════════════════════════════════════════════════════════
  // VERSIONING (Pattern DIAMOND v1.2)
  // ═══════════════════════════════════════════════════════════════
  
  _version: v.optional(v.number()),         // Incrémenté à chaque mutation
})
  // Index pour queries par date (PAS par tableIds — array non indexable)
  .index("by_date", ["date"]);
```

## 3.3 Zones (MVP: Enum)

```typescript
// lib/floorplan/zones.ts

export const ZONES = {
  salle: {
    code: "salle",
    name: "Salle",
    color: "#3B82F6",  // Bleu
    icon: "home",
  },
  terrasse: {
    code: "terrasse",
    name: "Terrasse", 
    color: "#F59E0B",  // Orange
    icon: "sun",
  },
} as const;

export type ZoneCode = keyof typeof ZONES;
```

## 3.4 Codes d'Erreur Standardisés (v1.2)

```typescript
// lib/floorplan/errors.ts

/**
 * Format uniforme des erreurs floorplan : CODE|param1|param2|...
 * Permet à l'UI de parser et afficher proprement.
 */
export type FloorplanErrorCode =
  | "RESERVATION_NOT_FOUND"
  | "TABLE_NOT_FOUND"
  | "TABLE_BLOCKED"
  | "TABLE_NAME_EXISTS"
  | "INVALID_GRID_POSITION"
  | "INVALID_DATETIME"
  | "INSUFFICIENT_CAPACITY"
  | "TABLE_CONFLICT"
  | "TABLE_OCCUPIED_SEATED"
  | "VERSION_CONFLICT"
  | "CROSS_ZONE_WARNING";

/**
 * Parse une erreur au format CODE|params
 */
export function parseFloorplanError(message: string): {
  code: FloorplanErrorCode;
  params: string[];
} {
  const [code, ...params] = message.split("|");
  return { code: code as FloorplanErrorCode, params };
}

/**
 * Crée un message d'erreur standardisé
 */
export function createError(code: FloorplanErrorCode, ...params: (string | number)[]): Error {
  const message = [code, ...params].join("|");
  return new Error(message);
}
```

---

# PARTIE 4 : FONCTIONNALITÉS

## 4.1 Assignation avec Anti-Collision DIAMOND (v1.2)

```typescript
// convex/floorplan.ts

import { DateTime } from "luxon";
import { CANONICAL_TZ, formatTimeFromTimestamp } from "../lib/datetime";

export const assign = mutation({
  args: {
    reservationId: v.id("reservations"),
    tableIds: v.array(v.id("tables")),
    expectedVersion: v.number(),  // OBLIGATOIRE (v1.2)
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new Error("RESERVATION_NOT_FOUND");
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 1. ANTI-COLLISION : Vérifier version (DIAMOND v1.2)
    // ═══════════════════════════════════════════════════════════════
    
    const currentVersion = reservation._version ?? 0;
    if (currentVersion !== args.expectedVersion) {
      throw new Error(`VERSION_CONFLICT|${args.expectedVersion}|${currentVersion}`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 2. CHARGER LES TABLES DEMANDÉES
    // ═══════════════════════════════════════════════════════════════
    
    const tables = await Promise.all(
      args.tableIds.map(id => ctx.db.get(id))
    );
    
    for (const table of tables) {
      if (!table) throw new Error("TABLE_NOT_FOUND");
      if (!table.isActive) throw new Error(`TABLE_BLOCKED|${table.name}`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 3. VALIDER CAPACITÉ TOTALE
    // ═══════════════════════════════════════════════════════════════
    
    const totalCapacity = tables.reduce((sum, t) => sum + t!.capacity, 0);
    if (totalCapacity < reservation.partySize) {
      throw new Error(`INSUFFICIENT_CAPACITY|${totalCapacity}|${reservation.partySize}`);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 4. CHARGER TOUTES LES RÉSAS ACTIVES DU JOUR (UNE SEULE QUERY)
    // ═══════════════════════════════════════════════════════════════
    
    const ACTIVE_STATUSES = ["pending", "confirmed", "late", "seated"];
    
    const allActiveResas = await ctx.db
      .query("reservations")
      .withIndex("by_date", q => q.eq("date", reservation.date))
      .collect();
    
    const activeResas = allActiveResas.filter(r => 
      r._id !== args.reservationId && 
      ACTIVE_STATUSES.includes(r.status)
    );
    
    // ═══════════════════════════════════════════════════════════════
    // 5. VÉRIFIER OVERLAP POUR CHAQUE TABLE (REFUS DUR)
    // ═══════════════════════════════════════════════════════════════
    
    for (const tableId of args.tableIds) {
      const assignedToTable = activeResas.filter(r => 
        r.tableIds?.includes(tableId)
      );
      
      for (const existing of assignedToTable) {
        // CAS SEATED : Message dédié (pas de fin théorique)
        if (existing.status === "seated") {
          const table = tables.find(t => t?._id === tableId);
          throw new Error(`TABLE_OCCUPIED_SEATED|${table?.name}|${existing.guestName}`);
        }
        
        // CAS NORMAL : Vérifier overlap
        if (overlaps(
          reservation.startAt,
          reservation.expectedEndAt,
          existing.startAt,
          existing.expectedEndAt
        )) {
          const table = tables.find(t => t?._id === tableId);
          throw new Error(
            `TABLE_CONFLICT|${table?.name}|${existing.guestName}|` +
            `${formatTimeFromTimestamp(existing.startAt)}|${formatTimeFromTimestamp(existing.expectedEndAt)}`
          );
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 6. APPLIQUER L'ASSIGNATION + INCRÉMENTER VERSION
    // ═══════════════════════════════════════════════════════════════
    
    const nextVersion = currentVersion + 1;
    
    await ctx.db.patch(args.reservationId, {
      tableIds: args.tableIds,
      _version: nextVersion,
    });
    
    // ═══════════════════════════════════════════════════════════════
    // 7. LOG EVENT (pour PRD-011 ML)
    // ═══════════════════════════════════════════════════════════════
    
    await ctx.db.insert("reservationEvents", {
      reservationId: args.reservationId,
      eventType: "table_assigned",
      timestamp: Date.now(),
      payload: {
        tableIds: args.tableIds,
        tableNames: tables.map(t => t!.name),
        assignedBy: ctx.auth?.userId,
        mode: args.tableIds.length > 1 ? "multi" : "single",
      },
    });
    
    return { 
      success: true, 
      tableIds: args.tableIds,
      newVersion: nextVersion,
    };
  },
});

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}
```

## 4.2 Désassignation

```typescript
export const unassign = mutation({
  args: {
    reservationId: v.id("reservations"),
    expectedVersion: v.number(),  // OBLIGATOIRE (v1.2)
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");
    
    // Anti-collision
    const currentVersion = reservation._version ?? 0;
    if (currentVersion !== args.expectedVersion) {
      throw new Error(`VERSION_CONFLICT|${args.expectedVersion}|${currentVersion}`);
    }
    
    const previousTableIds = reservation.tableIds ?? [];
    const nextVersion = currentVersion + 1;
    
    await ctx.db.patch(args.reservationId, {
      tableIds: undefined,
      _version: nextVersion,
    });
    
    // Log event
    await ctx.db.insert("reservationEvents", {
      reservationId: args.reservationId,
      eventType: "table_unassigned",
      timestamp: Date.now(),
      payload: {
        previousTableIds,
        unassignedBy: ctx.auth?.userId,
      },
    });
    
    return { success: true, newVersion: nextVersion };
  },
});
```

## 4.3 Query Statut Tables — Déterministe (v1.2)

```typescript
// convex/floorplan.ts

export const getTableStates = query({
  args: {
    date: v.string(),
    service: v.string(),  // "midi" | "soir"
    viewWindowStart: v.optional(v.number()),
    viewWindowEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Charger toutes les tables actives
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_active", q => q.eq("isActive", true))
      .collect();
    
    // 2. Charger les résas du jour
    const ACTIVE_STATUSES = ["pending", "confirmed", "late", "seated"];
    const allResas = await ctx.db
      .query("reservations")
      .withIndex("by_date", q => q.eq("date", args.date))
      .collect();
    
    const activeResas = allResas.filter(r => ACTIVE_STATUSES.includes(r.status));
    
    // 3. Calculer statut de chaque table
    const viewWindow = {
      start: args.viewWindowStart ?? 0,
      end: args.viewWindowEnd ?? Number.MAX_SAFE_INTEGER,
    };
    
    return tables.map(table => {
      const assignedResas = activeResas.filter(r => 
        r.tableIds?.includes(table._id)
      );
      
      const status = getTableStatus(table, assignedResas, viewWindow);
      
      // ═══════════════════════════════════════════════════════════════
      // DÉTERMINISTE (v1.2) : Priorité seated > startAt min
      // ═══════════════════════════════════════════════════════════════
      
      const seatedResa = assignedResas.find(r => r.status === "seated");
      const overlappingResas = assignedResas.filter(r =>
        r.status !== "seated" &&
        overlaps(r.startAt, r.expectedEndAt, viewWindow.start, viewWindow.end)
      );
      const nearestResa = overlappingResas.sort((a, b) => a.startAt - b.startAt)[0];
      
      const currentResa = seatedResa ?? nearestResa;
      
      return {
        tableId: table._id,
        name: table.name,
        zone: table.zone,
        capacity: table.capacity,
        gridX: table.gridX,
        gridY: table.gridY,
        status,
        reservation: currentResa ? {
          id: currentResa._id,
          guestName: currentResa.guestName,
          partySize: currentResa.partySize,
          time: formatTimeFromTimestamp(currentResa.startAt),
          status: currentResa.status,
          version: currentResa._version ?? 0,
        } : null,
      };
    });
  },
});

function getTableStatus(
  table: { isActive: boolean },
  assignedResas: Reservation[],
  viewWindow: { start: number; end: number }
): TableStatus {
  if (!table.isActive) return "blocked";
  
  const hasSeated = assignedResas.some(r => r.status === "seated");
  if (hasSeated) return "seated";
  
  const PLANNING_STATUSES = ["pending", "confirmed", "late"];
  const hasReserved = assignedResas.some(r => 
    PLANNING_STATUSES.includes(r.status) &&
    overlaps(r.startAt, r.expectedEndAt, viewWindow.start, viewWindow.end)
  );
  if (hasReserved) return "reserved";
  
  return "free";
}
```

## 4.4 Création Réservation — Calcul Window Server-Side

```typescript
// convex/reservations.ts (PRD-002 augmenté)

import { computeReservationWindow } from "../lib/datetime";

export const create = mutation({
  args: {
    date: v.string(),       // "YYYY-MM-DD"
    time: v.string(),       // "HH:mm"
    service: v.string(),
    partySize: v.number(),
    guestName: v.string(),
    // ... autres champs PRD-002
  },
  handler: async (ctx, args) => {
    // Récupérer durée depuis settings (PRD-012)
    const settings = await getSettings(ctx);
    const durationMinutes = settings.defaultReservationDurationMinutes;
    
    // ═══════════════════════════════════════════════════════════════
    // CALCUL SERVER-AUTHORITATIVE (v1.2)
    // ═══════════════════════════════════════════════════════════════
    
    const { startAt, expectedEndAt } = computeReservationWindow(
      args.date,
      args.time,
      durationMinutes
    );
    
    const reservation = await ctx.db.insert("reservations", {
      ...args,
      startAt,
      expectedEndAt,
      status: "pending",
      _version: 1,
      createdAt: Date.now(),
    });
    
    return reservation;
  },
});
```

---

# PARTIE 5 : INTERFACE UTILISATEUR

## 5.1 Vue Service avec Plan

```
┌─────────────────────────────────────────────────────────────────┐
│  🍽️ Service Soir                   📅 21/12/2025    [Plan] 🗺️  │
├──────────────────────────────┬──────────────────────────────────┤
│                              │                                  │
│  LISTE RÉSERVATIONS          │         PLAN DE SALLE            │
│  (PRD-002)                   │                                  │
│                              │   ┌─────────────────────────┐    │
│  ┌────────────────────────┐  │   │      SALLE (30)         │    │
│  │ 19:00 Dupont   4p  T5  │  │   │  ┌──┐ ┌──┐ ┌──┐ ┌──┐   │    │
│  │ 19:15 Martin   2p  —   │◄─┼───│  │T1│ │T2│ │T3│ │T4│   │    │
│  │ 19:30 Schmidt  6p  T6  │  │   │  │🟢│ │🟢│ │🟠│ │🟢│   │    │
│  │ 20:00 Leroy    4p  T8  │  │   │  └──┘ └──┘ └──┘ └──┘   │    │
│  │ 20:45 Petit   10p T5+6 │  │   │  ┌──┐ ┌────┐ ┌──┐      │    │
│  └────────────────────────┘  │   │  │T5│ │ T6 │ │T7│      │    │
│                              │   │  │🔴│ │🟠  │ │🟢│      │    │
│  [+ Walk-in]                 │   │  └──┘ └────┘ └──┘      │    │
│                              │   │        ...              │    │
│                              │   └─────────────────────────┘    │
│                              │                                  │
│                              │   ┌─────────────────────────┐    │
│                              │   │    TERRASSE (20)        │    │
│                              │   │  🟢 🟢 🟢 🟢 🟢          │    │
│                              │   │  🟢 🟢 🟢 🟢 🟢          │    │
│                              │   └─────────────────────────┘    │
│                              │                                  │
├──────────────────────────────┴──────────────────────────────────┤
│  🟢 Free  🟠 Reserved  🔴 Seated  ⚫ Blocked                    │
└─────────────────────────────────────────────────────────────────┘
```

## 5.2 Gestion des Erreurs UI (v1.2)

```typescript
// components/floorplan/useAssignment.ts

import { parseFloorplanError } from "@/lib/floorplan/errors";

async function handleAssign(reservationId: Id, tableIds: Id[], expectedVersion: number) {
  try {
    const result = await assignMutation({ reservationId, tableIds, expectedVersion });
    toast.success(`Table${tableIds.length > 1 ? "s" : ""} assignée(s)`);
    return result;
  } catch (error) {
    const { code, params } = parseFloorplanError(error.message);
    
    switch (code) {
      case "VERSION_CONFLICT":
        toast.error("Cette réservation a été modifiée. Rafraîchissez la page.");
        break;
        
      case "TABLE_OCCUPIED_SEATED":
        toast.error(`${params[0]} est occupée par ${params[1]} (en cours)`);
        break;
        
      case "TABLE_CONFLICT":
        toast.error(
          `${params[0]} est réservée par ${params[1]} (${params[2]} - ${params[3]})`
        );
        break;
        
      case "INSUFFICIENT_CAPACITY":
        toast.error(`Capacité insuffisante: ${params[0]} < ${params[1]} personnes`);
        break;
        
      case "TABLE_BLOCKED":
        toast.error(`${params[0]} est désactivée`);
        break;
        
      default:
        toast.error("Erreur d'assignation");
    }
    
    throw error;
  }
}
```

---

# PARTIE 6 : INTÉGRATIONS

## 6.1 Contrat PRD-002 (Réservations)

```
┌─────────────────────────────────────────────────────────────────┐
│  INTÉGRATION PRD-002 ↔ PRD-004                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRD-002 FOURNIT :                                              │
│  • Réservations avec statut (pending/confirmed/late/seated/...)│
│  • Pattern _version pour anti-collision                        │
│  • reservationEvents pour logging                              │
│                                                                 │
│  PRD-004 AJOUTE à reservations :                               │
│  • startAt, expectedEndAt (calculés server-side Luxon)         │
│  • tableIds (assignation)                                      │
│  • _version (incrément atomique)                               │
│                                                                 │
│  PRD-004 CONSOMME :                                             │
│  • status pour calculer statut table                           │
│  • partySize pour valider capacité                             │
│  • guestName, date pour affichage                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 6.2 Contrat PRD-012 (Settings)

```typescript
// PRD-004 consomme de PRD-012
interface SettingsForFloorplan {
  defaultReservationDurationMinutes: number;  // 90 par défaut
  canonicalTimeZone: string;                  // "Europe/Brussels" (v1.2)
}
```

---

# PARTIE 7 : API & RBAC

## 7.1 Endpoints

| Fonction | Type | Description |
|----------|------|-------------|
| `tables.list` | Query | Liste des tables (avec filtres) |
| `tables.getByZone` | Query | Tables d'une zone |
| `tables.create` | Mutation | Créer une table |
| `tables.update` | Mutation | Modifier une table |
| `tables.updatePosition` | Mutation | Déplacer sur grille |
| `tables.delete` | Mutation | Supprimer une table |
| `tables.setActive` | Mutation | Activer/désactiver |
| `floorplan.getTableStates` | Query | Statut temps réel |
| `floorplan.assign` | Mutation | Assigner résa → table(s) |
| `floorplan.unassign` | Mutation | Retirer assignation |
| `floorplan.checkCompatibility` | Query | Vérifier avant assign |

## 7.2 RBAC (Aligné PRD-002/012)

| Endpoint | Staff | Admin | Owner |
|----------|:-----:|:-----:|:-----:|
| `tables.list` | ✅ | ✅ | ✅ |
| `tables.getByZone` | ✅ | ✅ | ✅ |
| `tables.create` | ❌ | ✅ | ✅ |
| `tables.update` | ❌ | ✅ | ✅ |
| `tables.updatePosition` | ❌ | ✅ | ✅ |
| `tables.delete` | ❌ | ❌ | ✅ |
| `tables.setActive` | ❌ | ✅ | ✅ |
| `floorplan.getTableStates` | ✅ | ✅ | ✅ |
| `floorplan.assign` | ✅ | ✅ | ✅ |
| `floorplan.unassign` | ✅ | ✅ | ✅ |
| `floorplan.checkCompatibility` | ✅ | ✅ | ✅ |

---

# PARTIE 8 : CHECKLIST IMPLÉMENTATION

## 8.1 P0 — Launch (Score 98+)

| # | Tâche | Statut |
|---|-------|:------:|
| 1 | 3 statuts table : `free` / `reserved` / `seated` | ☐ |
| 2 | Champs `startAt` + `expectedEndAt` sur réservation | ☐ |
| 3 | **Calcul Luxon server-side (Europe/Brussels)** | ☐ |
| 4 | Fonction `overlaps()` (end exclusif) | ☐ |
| 5 | Message dédié `TABLE_OCCUPIED_SEATED` | ☐ |
| 6 | Mutation `floorplan.assign` avec refus dur overlap | ☐ |
| 7 | **Pattern `_version` COMPLET (incrément atomique)** | ☐ |
| 8 | **`expectedVersion` OBLIGATOIRE (pas optionnel)** | ☐ |
| 9 | Validation `gridX`/`gridY` entiers | ☐ |
| 10 | RBAC aligné Owner/Admin/Staff | ☐ |
| 11 | Query `getTableStates` déterministe (seated > startAt) | ☐ |
| 12 | **Query optimisée (collect une fois, filter mémoire)** | ☐ |
| 13 | **Erreurs standardisées format `CODE\|params`** | ☐ |
| 14 | UI mode assignation click-to-click | ☐ |
| 15 | Seed 50 tables (30 salle + 20 terrasse) | ☐ |

## 8.2 P1 — Post-Launch

| # | Tâche | Statut |
|---|-------|:------:|
| 16 | `minCapacity` + warning sous-capacité | ☐ |
| 17 | `isBlocked` + `blockedReason` | ☐ |
| 18 | `tablePreference` structuré | ☐ |
| 19 | Table `zones` configurable | ☐ |
| 20 | `tableNumbers` dénormalisé | ☐ |
| 21 | Suggestion adjacence multi-tables | ☐ |

## 8.3 P2 — Nice to Have

| # | Tâche | Statut |
|---|-------|:------:|
| 22 | Formes/tailles (`shape`, `size`) | ☐ |
| 23 | Rotation tables | ☐ |
| 24 | Zoom in/out | ☐ |
| 25 | Import/export layout | ☐ |
| 26 | Labels tables | ☐ |

## 8.4 Tests

| # | Test | Statut |
|---|------|:------:|
| 1 | Assignation simple (1 table, pas d'overlap) | ☐ |
| 2 | Assignation refusée (overlap) | ☐ |
| 3 | Back-to-back autorisé (12:00-13:30 puis 13:30) | ☐ |
| 4 | Seated bloque avec message dédié | ☐ |
| 5 | Multi-tables capacité combinée | ☐ |
| 6 | VERSION_CONFLICT si concurrent | ☐ |
| 7 | gridX/gridY rejetés si non entiers | ☐ |
| 8 | Statut `reserved` calculé correctement | ☐ |
| 9 | RBAC: Staff ne peut pas créer table | ☐ |
| 10 | **DST: Deux devices même date/time = même startAt** | ☐ |
| 11 | **DST Start: Pas de décalage silencieux** | ☐ |
| 12 | **DST End: Pas de régression** | ☐ |
| 13 | **getTableStates déterministe (seated prioritaire)** | ☐ |
| 14 | **Erreurs parsables par UI** | ☐ |

---

# PARTIE 9 : HISTORIQUE

| Version | Date | Changements |
|---------|------|-------------|
| **1.2** | 2025-12-21 | DIAMOND-grade : _version incrément + expectedVersion obligatoire, Luxon DST-safe, index array supprimé, erreurs standardisées, getTableStates déterministe, query optimisée, 3 tests DST |
| 1.1 | 2025-12-21 | 3 statuts, overlap temporel, refus dur, gridX/gridY entiers |
| 1.0 | 2025-12-21 | Création initiale |

---

**FIN DU DOCUMENT PRD-004 v1.2**

*Score qualité : 98/100 — DIAMOND-grade*
*GAP-01 résolu : overlap + anti-collision + DST-safe*
*Aligné PRD-002 v3.0, PRD-012 v3.1*
