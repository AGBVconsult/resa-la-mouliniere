# PRD-006 : Gestion des Tables

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-006 |
| **Titre** | Configuration et Gestion des Tables |
| **Statut** | Implémenté (migration v1.3 requise) |
| **Priorité** | P0 - Critique |
| **Version** | 1.3.1 |
| **Date création** | 2025-12-19 |
| **Dernière MAJ** | 2025-12-21 |
| **Responsable** | AGBVconsult |

---

## 0. Décisions Verrouillées v1.3

> **⚠️ ALIGNEMENT PRD-004 (Plan de Salle)**
>
> Cette version aligne PRD-006 sur le contrat d'interface défini dans PRD-004 v1.2.

| Aspect | Décision v1.3 | Ancien (v1.2) |
|--------|---------------|---------------|
| **Coordonnées** | `gridX/gridY` (entiers) = source of truth | `positionX/positionY` (pixels) |
| **Zones MVP** | `salle` \| `terrasse` | 4 zones (interieur/terrasse/bar/prive) |
| **Zone naming** | Code: `salle` / Label: "Salle intérieure" | Code: `interieur` |
| **Naming tables** | Unicité seule contrainte, tri naturel | Regex stricte |
| **Disponibilité** | `isActive` (MVP), `isBlocked` (P1) | `isActive` seul |
| **Suppression** | `isDeleted` soft delete (v1.3.1) | Hard delete |

---

## 1. Résumé Exécutif

### 1.1 Objectif

Permettre la gestion complète des tables du restaurant : création, configuration (capacité, zone, caractéristiques), positionnement sur le plan, activation/désactivation.

### 1.2 Problème Résolu

| Problème | Solution |
|----------|----------|
| Tables non inventoriées | Catalogue complet |
| Capacités inconnues | Configuration par table |
| Zones non identifiées | Zonage visuel |
| Tables temporairement indisponibles | Activation/désactivation |

---

## 2. Spécifications Fonctionnelles

### 2.1 Liste des Tables

```
┌─────────────────────────────────────────────────────────────────┐
│  🪑 Gestion des Tables                          [+ Ajouter]     │
├─────────────────────────────────────────────────────────────────┤
│  Filtres: [Toutes ▼] [Salle] [Terrasse] [Actives] [Inactives]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  SALLE INTÉRIEURE                              12 tables  │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  T1   │  2 pers  │  ✓ Actif   │  Banquette, Calme        │ │
│  │  T2   │  2 pers  │  ✓ Actif   │  Vue cuisine             │ │
│  │  T3   │  4 pers  │  ✓ Actif   │  Accessible PMR          │ │
│  │  T4   │  4 pers  │  ✗ Inactif │  En réparation           │ │
│  │  T5   │  6 pers  │  ✓ Actif   │  Banquette               │ │
│  │  ...                                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  TERRASSE                                       8 tables  │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  T101 │  2 pers  │  ✓ Actif   │  Vue mer                 │ │
│  │  T102 │  4 pers  │  ✓ Actif   │  Vue mer, Parasol        │ │
│  │  T103 │  4 pers  │  ✓ Actif   │  Coin calme              │ │
│  │  ...                                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  📊 Résumé: 20 tables | 18 actives | 72 couverts disponibles  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Formulaire de Table

```
┌─────────────────────────────────────────────────────────────────┐
│  ✏️ Modifier Table T3                               [Fermer]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IDENTIFICATION                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Nom/Numéro:     [T3             ]                             │
│  Capacité:       [4    ▼] personnes                            │
│                                                                 │
│  EMPLACEMENT                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  Zone:           [Salle intérieure ▼]                          │
│  Position X:     [3    ] (grille)                              │
│  Position Y:     [2    ] (grille)                              │
│                                                                 │
│  CARACTÉRISTIQUES                                               │
│  ─────────────────────────────────────────────────────────────  │
│  [✓] Accessible PMR (fauteuil roulant)                         │
│  [ ] Banquette                                                 │
│  [ ] Vue mer                                                   │
│  [ ] Vue cuisine                                               │
│  [ ] Coin calme                                                │
│  [ ] Prise électrique                                          │
│  [ ] Haute (mange-debout)                                      │
│                                                                 │
│  STATUT                                                         │
│  ─────────────────────────────────────────────────────────────  │
│  [✓] Table active                                               │
│  Note interne:   [                               ]              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  [Supprimer]              [Annuler]        [Sauvegarder]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Propriétés d'une Table

| Propriété | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| **name** | string | Oui | Identifiant unique (T1, T101) |
| **capacity** | number | Oui | Nombre de places (1-20) |
| **zone** | enum | Oui | `salle` \| `terrasse` |
| **gridX** | integer | Oui | Coordonnée X sur grille (0-GRID_MAX_X) |
| **gridY** | integer | Oui | Coordonnée Y sur grille (0-GRID_MAX_Y) |
| **features** | string[] | Non | Caractéristiques (codes standardisés) |
| **isActive** | boolean | Oui | Table disponible pour assignation |
| **isDeleted** | boolean | Non | Soft delete (défaut: false) |
| **note** | string | Non | Note interne |

### 2.4 Zones Disponibles

| Phase | Zone | Code | Label UI |
|-------|------|------|----------|
| **MVP** | Salle intérieure | `salle` | "Salle intérieure" |
| **MVP** | Terrasse | `terrasse` | "Terrasse" |
| **P1** | Bar | `bar` | "Bar" |
| **P1** | Salon privé | `prive` | "Salon privé" |

> **Note v1.3** : Le code utilise `salle` (pas `interieur`). L'affichage "Salle intérieure" est géré par mapping UI.
>
> **Migration P1** : Si bar/prive requis, prévoir migration enum → table `zones` pour éviter refactor lourd.

### 2.5 Caractéristiques (Features)

> **⚠️ Codes Standardisés** : Utiliser uniquement les codes ci-dessous pour éviter la dérive (`vueMer`, `vue_mer`, `mer`…).

| Feature | Code | Description |
|---------|------|-------------|
| **Accessible PMR** | `accessible_pmr` | Accès fauteuil roulant |
| **Banquette** | `banquette` | Siège banquette |
| **Vue mer** | `vue_mer` | Face à la mer |
| **Vue cuisine** | `vue_cuisine` | Visible depuis cuisine |
| **Coin calme** | `calme` | Zone moins bruyante |
| **Prise électrique** | `prise_electrique` | Prise accessible |
| **Mange-debout** | `haute` | Table haute |
| **Parasol** | `parasol` | Ombrage disponible |

### 2.6 Conventions de Nommage

```
MVP (flexibilité maximale):
─────────────────────────────────────────────────────
- Contrainte unique: nom UNIQUE dans la DB
- Pas de format imposé (T1, T01, Table-A, etc.)
- Tri naturel automatique: T1 < T2 < T10 < T101

Conventions recommandées (non imposées):
─────────────────────────────────────────────────────
Salle:    T1, T2, ..., T30
Terrasse: T101, T102, ..., T120
Bar:      B1, B2, ..., B10     (P1)
Privé:    P1, P2, ..., P5      (P1)
```

---

## 3. Capacité et Combinaisons

### 3.1 Capacités Standard

| Configuration | Capacité | Forme |
|---------------|----------|-------|
| Table 2 personnes | 2 | Carré petit |
| Table 4 personnes | 4 | Carré moyen |
| Table 6 personnes | 6 | Rectangle |
| Table 8 personnes | 8 | Rectangle long |
| Mange-debout | 4-6 | Rond haut |

### 3.2 Combinaison de Tables (P2)

> **Note v1.3** : La combinaison de tables est reportée en P2.
> Le champ `combinationDirection` est optionnel et non exploité en MVP.

Pour les grands groupes, les tables adjacentes peuvent être combinées :

```
┌─────────────────────────────────────────────────────────────────┐
│  🔗 Combinaison pour groupe de 10                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────┬─────────┬─────────┐                              │
│   │   T5    │   T6    │   T7    │  = 12 places                 │
│   │   4p    │   4p    │   4p    │                              │
│   └─────────┴─────────┴─────────┘                              │
│                                                                 │
│   Tables combinables: T5 ↔ T6 ↔ T7 (même alignement)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Règles de Combinaison (P2)

| Règle | Description |
|-------|-------------|
| **Adjacence** | Tables côte à côte uniquement |
| **Même zone** | Combinaison intra-zone seulement |
| **Direction** | Horizontal ou vertical (pas en L) |
| **Maximum** | 3 tables combinées max |

---

## 4. Spécifications Techniques

### 4.1 Constantes Centralisées (Source Unique)

> **⚠️ P0-4** : Toutes les constantes grille dans UN seul fichier, importé partout.

```typescript
// lib/constants/floorplanGrid.ts
// ═══════════════════════════════════════════════════════════════
// SOURCE UNIQUE — Importé par: validation, conversion, migration
// ═══════════════════════════════════════════════════════════════

export const GRID_CONFIG = {
  // Dimensions cellule
  CELL_SIZE: 40,           // pixels par cellule
  
  // Bornes grille (entiers)
  MIN_X: 0,
  MAX_X: 40,
  MIN_Y: 0,
  MAX_Y: 40,
  
  // Dimensions totales (calculées)
  get COLS() { return this.MAX_X - this.MIN_X + 1; },
  get ROWS() { return this.MAX_Y - this.MIN_Y + 1; },
  get WIDTH_PX() { return this.COLS * this.CELL_SIZE; },
  get HEIGHT_PX() { return this.ROWS * this.CELL_SIZE; },
} as const;

// Aliases pour compatibilité
export const GRID_CELL_SIZE = GRID_CONFIG.CELL_SIZE;
export const GRID_MAX_X = GRID_CONFIG.MAX_X;
export const GRID_MAX_Y = GRID_CONFIG.MAX_Y;
```

### 4.2 Modèle de Données (Convex Schema v1.3.1)

```typescript
// convex/schema.ts

tables: defineTable({
  // ═══════════════════════════════════════════════════════════════
  // IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════
  name: v.string(),              // "T1", "T101" — unique
  capacity: v.number(),          // 1-20

  // ═══════════════════════════════════════════════════════════════
  // ZONE (MVP: 2 zones)
  // ═══════════════════════════════════════════════════════════════
  zone: v.union(
    v.literal("salle"),
    v.literal("terrasse")
  ),

  // ═══════════════════════════════════════════════════════════════
  // POSITION — CANONICAL (v1.3)
  // ═══════════════════════════════════════════════════════════════
  gridX: v.number(),             // entier 0-40 (source of truth)
  gridY: v.number(),             // entier 0-40 (source of truth)

  // Legacy (temporaire v1.3, supprimé en v1.4)
  positionX: v.optional(v.number()),
  positionY: v.optional(v.number()),

  // ═══════════════════════════════════════════════════════════════
  // CARACTÉRISTIQUES
  // ═══════════════════════════════════════════════════════════════
  features: v.optional(v.array(v.string())),

  // Combinaison (P2 — optionnel, non exploité en MVP)
  combinationDirection: v.optional(
    v.union(
      v.literal("horizontal"),
      v.literal("vertical")
    )
  ),

  // ═══════════════════════════════════════════════════════════════
  // DISPONIBILITÉ
  // ═══════════════════════════════════════════════════════════════
  isActive: v.boolean(),         // MVP: non assignable si false

  // P1: maintenance ponctuelle
  // isBlocked: v.optional(v.boolean()),
  // blockedReason: v.optional(v.string()),

  // ═══════════════════════════════════════════════════════════════
  // SOFT DELETE (v1.3.1)
  // ═══════════════════════════════════════════════════════════════
  isDeleted: v.optional(v.boolean()),  // défaut: false/undefined

  note: v.optional(v.string()),

  // ═══════════════════════════════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════════════════════════════
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_name", ["name"])                    // P0-1: unicité name
  .index("by_zone", ["zone"])
  .index("by_active", ["isActive"])
  .index("by_position", ["gridX", "gridY"])      // P0-2: unicité position
  .index("by_capacity", ["capacity"])
  .index("by_deleted", ["isDeleted"]);           // P0-5: filter soft deleted
```

### 4.3 Validation & Enforcement

```typescript
// lib/utils/tableValidation.ts

import { GRID_CONFIG } from "@/lib/constants/floorplanGrid";

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

export function assertInt(n: number, field: string): void {
  if (!Number.isInteger(n)) {
    throw new Error(`INVALID_${field.toUpperCase()}|${n}|must be integer`);
  }
}

export function assertInRange(
  n: number, 
  min: number, 
  max: number, 
  field: string
): void {
  if (n < min || n > max) {
    throw new Error(`OUT_OF_RANGE_${field.toUpperCase()}|${n}|${min}|${max}`);
  }
}

export function validateGridPosition(gridX: number, gridY: number): void {
  assertInt(gridX, "gridX");
  assertInt(gridY, "gridY");
  assertInRange(gridX, GRID_CONFIG.MIN_X, GRID_CONFIG.MAX_X, "gridX");
  assertInRange(gridY, GRID_CONFIG.MIN_Y, GRID_CONFIG.MAX_Y, "gridY");
}

// ═══════════════════════════════════════════════════════════════
// UNICITÉ NAME (P0-1)
// ═══════════════════════════════════════════════════════════════

export async function assertNameUnique(
  ctx: QueryCtx,
  name: string,
  excludeId?: Id<"tables">
): Promise<void> {
  const existing = await ctx.db
    .query("tables")
    .withIndex("by_name", (q) => q.eq("name", name))
    .first();

  if (existing && existing._id !== excludeId) {
    throw new Error(`NAME_EXISTS|${name}|${existing._id}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// UNICITÉ POSITION (P0-2)
// ═══════════════════════════════════════════════════════════════

export async function assertPositionUnique(
  ctx: QueryCtx,
  gridX: number,
  gridY: number,
  excludeId?: Id<"tables">
): Promise<void> {
  const existing = await ctx.db
    .query("tables")
    .withIndex("by_position", (q) => q.eq("gridX", gridX).eq("gridY", gridY))
    .first();

  if (existing && existing._id !== excludeId) {
    throw new Error(`GRID_OCCUPIED|${gridX}|${gridY}|${existing.name}`);
  }
}
```

### 4.4 Mutations avec Enforcement

```typescript
// convex/tables.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { 
  validateGridPosition, 
  assertNameUnique, 
  assertPositionUnique 
} from "@/lib/utils/tableValidation";

// ═══════════════════════════════════════════════════════════════
// CREATE — avec validation complète
// ═══════════════════════════════════════════════════════════════

export const create = mutation({
  args: {
    name: v.string(),
    capacity: v.number(),
    zone: v.union(v.literal("salle"), v.literal("terrasse")),
    gridX: v.number(),
    gridY: v.number(),
    features: v.optional(v.array(v.string())),
    combinationDirection: v.optional(
      v.union(v.literal("horizontal"), v.literal("vertical"))
    ),
  },
  handler: async (ctx, args) => {
    // P0-1: Unicité name
    await assertNameUnique(ctx, args.name);
    
    // P0-2: Validation position (entiers + bornes)
    validateGridPosition(args.gridX, args.gridY);
    
    // P0-2: Unicité position
    await assertPositionUnique(ctx, args.gridX, args.gridY);

    const now = Date.now();
    return ctx.db.insert("tables", {
      ...args,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// UPDATE POSITION — avec validation
// ═══════════════════════════════════════════════════════════════

export const updatePosition = mutation({
  args: {
    id: v.id("tables"),
    gridX: v.number(),
    gridY: v.number(),
  },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.id);
    if (!table) throw new Error(`TABLE_NOT_FOUND|${args.id}`);
    
    // P0-2: Validation position
    validateGridPosition(args.gridX, args.gridY);
    
    // P0-2: Unicité position (exclure la table elle-même)
    await assertPositionUnique(ctx, args.gridX, args.gridY, args.id);

    return ctx.db.patch(args.id, {
      gridX: args.gridX,
      gridY: args.gridY,
      updatedAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// SOFT DELETE (P0-5)
// ═══════════════════════════════════════════════════════════════

export const softDelete = mutation({
  args: { id: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.id);
    if (!table) throw new Error(`TABLE_NOT_FOUND|${args.id}`);
    
    // TODO: Vérifier aucune réservation future
    
    return ctx.db.patch(args.id, {
      isDeleted: true,
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// RESTORE (annuler soft delete)
// ═══════════════════════════════════════════════════════════════

export const restore = mutation({
  args: { id: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.id);
    if (!table) throw new Error(`TABLE_NOT_FOUND|${args.id}`);
    
    // Vérifier que la position est toujours libre
    await assertPositionUnique(ctx, table.gridX, table.gridY, args.id);
    
    return ctx.db.patch(args.id, {
      isDeleted: false,
      updatedAt: Date.now(),
    });
  },
});
```

### 4.5 Queries avec Filter Soft Delete

```typescript
// convex/tables.ts

// ═══════════════════════════════════════════════════════════════
// LIST — exclut les tables supprimées par défaut
// ═══════════════════════════════════════════════════════════════

export const list = query({
  args: {
    zone: v.optional(v.union(v.literal("salle"), v.literal("terrasse"))),
    activeOnly: v.optional(v.boolean()),
    includeDeleted: v.optional(v.boolean()),  // admin only
  },
  handler: async (ctx, args) => {
    let tables = await ctx.db.query("tables").collect();
    
    // P0-5: Exclure soft deleted par défaut
    if (!args.includeDeleted) {
      tables = tables.filter(t => !t.isDeleted);
    }
    
    if (args.zone) {
      tables = tables.filter(t => t.zone === args.zone);
    }
    
    if (args.activeOnly !== false) {
      tables = tables.filter(t => t.isActive);
    }
    
    return tables;
  },
});
```

### 4.6 Fonction de Tri Naturel

```typescript
// lib/utils/tableSort.ts

/**
 * Tri naturel des noms de tables
 * Garantit: T1 < T2 < T10 < T101
 */
const collator = new Intl.Collator("fr", { 
  numeric: true, 
  sensitivity: "base" 
});

export function sortTableNamesNatural(a: string, b: string): number {
  return collator.compare(a, b);
}

// Usage:
// tables.sort((a, b) => sortTableNamesNatural(a.name, b.name))

/**
 * Version robuste avec support multi-préfixes (P1)
 * Ordre: T < TE < B < P
 */
type ParsedTableName = { 
  prefix: string; 
  num: number; 
  raw: string 
};

function parseTableName(raw: string): ParsedTableName {
  const match = raw.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!match) {
    return { prefix: raw, num: Number.MAX_SAFE_INTEGER, raw };
  }
  return { 
    prefix: match[1].toUpperCase(), 
    num: parseInt(match[2], 10), 
    raw 
  };
}

const PREFIX_ORDER: Record<string, number> = { 
  T: 0,   // Tables salle
  TE: 1,  // Tables terrasse (si préfixe différent)
  B: 2,   // Bar
  P: 3    // Privé
};

export function sortTableNamesStrict(a: string, b: string): number {
  const pa = parseTableName(a);
  const pb = parseTableName(b);

  // 1. Tri par préfixe (ordre métier)
  const orderA = PREFIX_ORDER[pa.prefix] ?? 99;
  const orderB = PREFIX_ORDER[pb.prefix] ?? 99;
  if (orderA !== orderB) return orderA - orderB;

  // 2. Tri alphabétique préfixe (fallback)
  if (pa.prefix !== pb.prefix) {
    return pa.prefix.localeCompare(pb.prefix);
  }

  // 3. Tri numérique
  if (pa.num !== pb.num) return pa.num - pb.num;

  // 4. Fallback string
  return pa.raw.localeCompare(pb.raw);
}
```

### 4.7 Conversion Grille ↔ Pixels (UI uniquement)

```typescript
// lib/utils/gridConversion.ts

import { GRID_CONFIG } from "@/lib/constants/floorplanGrid";

// Conversion grid → pixels (affichage)
export function gridToPixels(gridX: number, gridY: number) {
  return {
    x: gridX * GRID_CONFIG.CELL_SIZE,
    y: gridY * GRID_CONFIG.CELL_SIZE,
  };
}

// Conversion pixels → grid (click handling)
export function pixelsToGrid(x: number, y: number) {
  return {
    gridX: Math.round(x / GRID_CONFIG.CELL_SIZE),
    gridY: Math.round(y / GRID_CONFIG.CELL_SIZE),
  };
}
```

### 4.8 API Endpoints

| Fonction | Type | Description | RBAC |
|----------|------|-------------|------|
| `tables.list` | Query | Toutes les tables (filtres) | Staff+ |
| `tables.get` | Query | Une table par ID | Staff+ |
| `tables.getByZone` | Query | Tables d'une zone | Staff+ |
| `tables.getCapacityStats` | Query | Stats capacité | Staff+ |
| `tables.create` | Mutation | Créer table | Admin+ |
| `tables.update` | Mutation | Modifier table | Admin+ |
| `tables.updatePosition` | Mutation | Déplacer sur grille | Admin+ |
| `tables.toggleActive` | Mutation | Activer/désactiver | Admin+ |
| `tables.softDelete` | Mutation | Supprimer (soft) | Admin+ |
| `tables.restore` | Mutation | Restaurer table | Admin+ |
| `tables.hardDelete` | Mutation | Supprimer définitif | Owner |

---

## 5. Migration v1.3

### 5.1 Stratégie M1 (One-Shot)

| Étape | Action | État DB |
|-------|--------|---------|
| 1 | Deploy schema v1.3.1 | gridX/gridY + legacy pixels + isDeleted |
| 2 | Run migration dry-run | Détection collisions |
| 3 | Run migration réelle | Backfill gridX/gridY |
| 4 | Update UI | Écriture gridX/gridY uniquement |
| 5 | v1.4 | Supprimer positionX/positionY |

### 5.2 Script de Migration avec Détection Collisions (P0-3)

```typescript
// convex/migrations/migrateTablesToGrid.ts

import { action, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { GRID_CONFIG } from "@/lib/constants/floorplanGrid";

// ═══════════════════════════════════════════════════════════════
// MIGRATION M1 — avec détection collision (P0-3)
// ═══════════════════════════════════════════════════════════════

export const migrateTablesToGrid = action({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const isDryRun = args.dryRun ?? true;
    const cell = GRID_CONFIG.CELL_SIZE;

    const tables = await ctx.runQuery(internal.tables.listAllInternal);

    const results = {
      total: tables.length,
      migrated: 0,
      skipped: 0,
      collisions: [] as string[],
      outOfBounds: [] as string[],
      missingPixels: [] as string[],
    };

    // P0-3: Map pour détecter collisions
    const positionMap = new Map<string, string[]>();

    // Phase 1: Calcul et détection
    const migrations: Array<{
      id: string;
      name: string;
      gridX: number;
      gridY: number;
    }> = [];

    for (const t of tables) {
      // Déjà migré?
      if (
        Number.isInteger((t as any).gridX) && 
        Number.isInteger((t as any).gridY)
      ) {
        results.skipped++;
        
        // Ajouter à positionMap pour détecter collision avec futures migrations
        const key = `${(t as any).gridX},${(t as any).gridY}`;
        const existing = positionMap.get(key) || [];
        positionMap.set(key, [...existing, t.name]);
        continue;
      }

      // Pas de pixels source?
      if (t.positionX === undefined || t.positionY === undefined) {
        results.missingPixels.push(`MISSING_PIXELS|${t.name}`);
        continue;
      }

      const gridX = Math.round(t.positionX / cell);
      const gridY = Math.round(t.positionY / cell);

      // Validation bornes
      if (
        gridX < GRID_CONFIG.MIN_X || gridX > GRID_CONFIG.MAX_X ||
        gridY < GRID_CONFIG.MIN_Y || gridY > GRID_CONFIG.MAX_Y
      ) {
        results.outOfBounds.push(
          `OUT_OF_BOUNDS|${t.name}|gridX=${gridX}|gridY=${gridY}`
        );
        continue;
      }

      // P0-3: Détection collision
      const key = `${gridX},${gridY}`;
      const existing = positionMap.get(key) || [];
      positionMap.set(key, [...existing, t.name]);

      migrations.push({ id: t._id, name: t.name, gridX, gridY });
    }

    // P0-3: Reporter toutes les collisions
    for (const [pos, names] of positionMap.entries()) {
      if (names.length > 1) {
        results.collisions.push(`COLLISION|${pos}|${names.join(",")}`);
      }
    }

    // Phase 2: Exécution (seulement si pas de collision et pas dry-run)
    if (!isDryRun && results.collisions.length === 0) {
      for (const m of migrations) {
        await ctx.runMutation(internal.tables.patchGridInternal, {
          id: m.id as any,
          gridX: m.gridX,
          gridY: m.gridY,
        });
        results.migrated++;
      }
    } else if (!isDryRun && results.collisions.length > 0) {
      // Erreur: collisions détectées
      return {
        ok: false,
        error: "COLLISIONS_DETECTED",
        dryRun: false,
        ...results,
      };
    } else {
      // Dry run
      results.migrated = migrations.length;
    }

    return {
      ok: results.collisions.length === 0 && 
          results.outOfBounds.length === 0 &&
          results.missingPixels.length === 0,
      dryRun: isDryRun,
      ...results,
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════

export const listAllInternal = internalQuery({
  handler: async (ctx) => {
    return ctx.db.query("tables").collect();
  },
});

export const patchGridInternal = internalMutation({
  args: {
    id: v.id("tables"),
    gridX: v.number(),
    gridY: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.patch(args.id, {
      gridX: args.gridX,
      gridY: args.gridY,
      updatedAt: Date.now(),
    });
  },
});
```

### 5.3 Commandes de Migration

```bash
# 1. TOUJOURS dry-run d'abord
npx convex run migrations/migrateTablesToGrid:migrateTablesToGrid \
  '{"dryRun": true}'

# Vérifier le rapport:
# - collisions: [] → OK
# - outOfBounds: [] → OK  
# - missingPixels: [] → OK

# 2. Exécution réelle (seulement si dry-run OK)
npx convex run migrations/migrateTablesToGrid:migrateTablesToGrid \
  '{"dryRun": false}'
```

### 5.4 Résolution des Collisions

Si le dry-run détecte des collisions :

```
COLLISION|3,2|T5,T6
```

Options de résolution :

1. **Manuel** : Modifier `positionX/positionY` d'une table avant migration
2. **Script** : Décaler automatiquement une table sur case adjacente libre
3. **UI** : Fournir un rapport + interface admin pour résoudre visuellement

---

## 6. RBAC (P0-6)

### 6.1 Matrice des Permissions

| Action | Staff | Admin | Owner |
|--------|:-----:|:-----:|:-----:|
| `tables.list` | ✅ | ✅ | ✅ |
| `tables.get` | ✅ | ✅ | ✅ |
| `tables.getByZone` | ✅ | ✅ | ✅ |
| `tables.getCapacityStats` | ✅ | ✅ | ✅ |
| `tables.create` | ❌ | ✅ | ✅ |
| `tables.update` | ❌ | ✅ | ✅ |
| `tables.updatePosition` | ❌ | ✅ | ✅ |
| `tables.toggleActive` | ❌ | ✅ | ✅ |
| `tables.softDelete` | ❌ | ✅ | ✅ |
| `tables.restore` | ❌ | ✅ | ✅ |
| `tables.hardDelete` | ❌ | ❌ | ✅ |
| `list(includeDeleted: true)` | ❌ | ✅ | ✅ |

### 6.2 Implémentation Guards

```typescript
// convex/lib/rbac.ts

import { QueryCtx, MutationCtx } from "../_generated/server";

type Role = "staff" | "admin" | "owner";

export async function getUserRole(ctx: QueryCtx | MutationCtx): Promise<Role> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHORIZED");
  
  // Récupérer le rôle depuis Clerk metadata ou table users
  const role = identity.publicMetadata?.role as Role | undefined;
  return role ?? "staff";
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  minRole: Role
): Promise<void> {
  const role = await getUserRole(ctx);
  const roleHierarchy: Record<Role, number> = {
    staff: 1,
    admin: 2,
    owner: 3,
  };
  
  if (roleHierarchy[role] < roleHierarchy[minRole]) {
    throw new Error(`FORBIDDEN|required:${minRole}|actual:${role}`);
  }
}

// Usage dans mutation:
// await requireRole(ctx, "admin");
```

---

## 7. Interface Admin

### 7.1 Page Tables (`/admin/parametres/tables`)

```
src/app/admin/parametres/tables/
├── page.tsx                    # Page principale
├── TableList.tsx               # Liste par zone (tri naturel)
├── TableForm.tsx               # Formulaire édition
├── TableCard.tsx               # Carte résumé
├── ZoneSelector.tsx            # Filtre zone
└── CapacityStats.tsx           # Statistiques
```

### 7.2 Intégration Plan de Salle — Paradigme Click-to-Click

> **⚠️ DÉCISION ARCHITECTURALE (2025-12-21)**
> 
> Le positionnement des tables sur le plan utilise le paradigme **click-to-click** au lieu du drag-and-drop, pour garantir une fiabilité optimale sur iPad pendant le service.

#### 7.2.1 Workflow Click-to-Click

```
┌─────────────────────────────────────────────────────────────────┐
│  POSITIONNEMENT TABLE — Mode Click-to-Click                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SÉLECTION                                                   │
│     └─ Tap sur une table → Table sélectionnée (highlight bleu) │
│                                                                 │
│  2. DESTINATION                                                 │
│     └─ Tap sur emplacement vide → Table déplacée               │
│     └─ Tap sur autre table → Sélection change (pas d'action)   │
│                                                                 │
│  3. ANNULATION                                                  │
│     └─ Tap hors grille → Désélection                           │
│     └─ Bouton "Annuler" dans toolbar → Reset                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 7.2.2 Implémentation Hook

```typescript
// hooks/useClickToClick.ts

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

type Mode = "select" | "place";

export function useClickToClick(
  updatePosition: (id: Id<"tables">, gridX: number, gridY: number) => Promise<void>
) {
  const [selectedTableId, setSelectedTableId] = useState<Id<"tables"> | null>(null);
  const [mode, setMode] = useState<Mode>("select");

  const handleTableClick = (tableId: Id<"tables">) => {
    if (mode === "select") {
      setSelectedTableId(tableId);
      setMode("place");
    } else if (selectedTableId === tableId) {
      // Tap sur même table = désélection
      cancel();
    } else {
      // Tap sur autre table = nouvelle sélection
      setSelectedTableId(tableId);
    }
  };

  const handleGridClick = async (gridX: number, gridY: number) => {
    if (mode === "place" && selectedTableId) {
      await updatePosition(selectedTableId, gridX, gridY);
      cancel();
    }
  };

  const cancel = () => {
    setSelectedTableId(null);
    setMode("select");
  };

  return {
    selectedTableId,
    mode,
    isPlacing: mode === "place",
    handleTableClick,
    handleGridClick,
    cancel,
  };
}
```

### 7.3 Mapping Zones UI

```typescript
// lib/constants/zones.ts

export const ZONE_CONFIG = {
  salle: {
    code: "salle",
    label: "Salle intérieure",
    shortLabel: "Salle",
    colors: {
      bg: "bg-amber-100",
      border: "border-amber-400",
      text: "text-amber-800",
      hover: "hover:bg-amber-200",
    },
  },
  terrasse: {
    code: "terrasse",
    label: "Terrasse",
    shortLabel: "Terrasse",
    colors: {
      bg: "bg-emerald-100",
      border: "border-emerald-400",
      text: "text-emerald-800",
      hover: "hover:bg-emerald-200",
    },
  },
} as const;

export type ZoneCode = keyof typeof ZONE_CONFIG;

export function getZoneLabel(code: ZoneCode): string {
  return ZONE_CONFIG[code].label;
}
```

---

## 8. Règles Métier

### 8.1 Contraintes

| Règle | Enforcement | Erreur |
|-------|-------------|--------|
| Nom unique | Index `by_name` + validation | `NAME_EXISTS\|{name}` |
| Position unique | Index `by_position` + validation | `GRID_OCCUPIED\|{x}\|{y}\|{tableName}` |
| Capacité 1-20 | Validation args | `INVALID_CAPACITY` |
| Position entière | `Number.isInteger()` | `INVALID_GRIDX` |
| Position dans bornes | GRID_CONFIG | `OUT_OF_RANGE_GRIDX` |

### 8.2 Disponibilité (isActive)

```
isActive = false signifie:
─────────────────────────────────────────────────────
• Table NON ASSIGNABLE pour nouvelles réservations
• Table reste VISIBLE sur le plan si réservation seated
• Badge "Inactive" affiché

Cas d'usage:
─────────────────────────────────────────────────────
• Table en réparation
• Zone fermée saisonnièrement
• Événement privé

⚠️ Important (règle UI):
─────────────────────────────────────────────────────
assignable = table.isActive === true && !table.isDeleted
displayStatus = seated/reserved/free (calculé sur résas)
                + badge "inactive" si !isActive

→ Évite le cas: "table inactive grisée → on ne voit plus qu'elle est seated"
```

### 8.3 Suppression (Soft Delete)

```
Soft Delete (isDeleted = true):
─────────────────────────────────────────────────────
• Table masquée par défaut dans toutes les listes
• Position libérée (peut être réutilisée)
• Historique conservé
• Restauration possible (si position libre)

Hard Delete (Owner only):
─────────────────────────────────────────────────────
• Suppression définitive
• Uniquement si aucune réservation liée (past + future)
```

---

## 9. Tests

### 9.1 Cas de Test CRUD

- [x] Création table avec gridX/gridY
- [x] Modification capacité
- [x] Changement de zone
- [x] Ajout/retrait caractéristique
- [x] Activation/désactivation
- [x] Vérification unicité nom
- [x] Vérification unicité position
- [x] Soft delete
- [x] Restore après soft delete
- [ ] Hard delete (owner)

### 9.2 Cas de Test Validation (P0-2)

- [ ] Création avec nom existant → erreur `NAME_EXISTS`
- [ ] Création avec position occupée → erreur `GRID_OCCUPIED`
- [ ] Création avec gridX non entier → erreur `INVALID_GRIDX`
- [ ] Création avec gridX hors bornes → erreur `OUT_OF_RANGE_GRIDX`
- [ ] Update position vers case occupée → erreur `GRID_OCCUPIED`

### 9.3 Cas de Test Migration (P0-3)

- [ ] Migration dry-run sans collision → OK
- [ ] Migration dry-run avec collision → rapport `COLLISION|x,y|T1,T2`
- [ ] Migration réelle bloquée si collision → erreur
- [ ] Tables déjà migrées → skip
- [ ] Tables sans pixels → erreur `MISSING_PIXELS`
- [ ] Position hors bornes → erreur `OUT_OF_BOUNDS`

### 9.4 Cas de Test Click-to-Click

- [ ] Sélection table (tap)
- [ ] Déplacement vers position valide
- [ ] Rejet position occupée (backend)
- [ ] Annulation sélection
- [ ] Changement de sélection

### 9.5 Tests Spécifiques iPad

| Test | Attendu |
|------|---------|
| Tap simple sur table | Sélection immédiate |
| Tap sur emplacement vide | Déplacement si table sélectionnée |
| Double tap | Pas de comportement zoom natif |
| Scroll pendant sélection | Maintien de la sélection |
| Orientation paysage/portrait | Layout adaptatif |

---

## 10. Métriques

| KPI | Cible |
|-----|-------|
| **Couverture tables** | 100% inventoriées |
| **Précision capacité** | 100% |
| **Tables inactives** | < 10% |
| **Temps déplacement table** | < 2 secondes (2 taps) |
| **Erreurs positionnement** | 0% |
| **Collisions migration** | 0 |

---

## 11. Fichiers Impactés

```
convex/
├── schema.ts                   # +by_name, +by_deleted, +isDeleted
├── tables.ts                   # Mutations avec enforcement
├── lib/
│   └── rbac.ts                 # Guards permissions
└── migrations/
    └── migrateTablesToGrid.ts  # Migration M1 + collision detection

src/
├── app/admin/parametres/tables/
├── components/admin/tables/
├── components/admin/floor-plan/
│   ├── FloorPlanView.tsx
│   ├── FloorPlanGrid.tsx
│   ├── FloorPlanTable.tsx
│   └── ...
├── hooks/
│   └── useClickToClick.ts
└── lib/
    ├── constants/
    │   ├── floorplanGrid.ts    # SOURCE UNIQUE (P0-4)
    │   └── zones.ts
    ├── types/
    │   └── tables.ts
    └── utils/
        ├── tableSort.ts
        ├── tableValidation.ts  # assertNameUnique, assertPositionUnique
        └── gridConversion.ts
```

---

## 12. Impact & Dépendances

### 12.1 Intégration avec le Système

| Module | Type d'intégration | Description |
|--------|-------------------|-------------|
| **Plan de Salle (PRD-004)** | ✅ Aligné v1.3.1 | gridX/gridY = source of truth |
| **Vue Service (PRD-002)** | Lecture | Attribution tables aux réservations |
| **Créneaux (PRD-005)** | Calcul | Sum(capacités) = contrainte capacité max |
| **Attribution ML (PRD-011)** | Lecture | Caractéristiques pour scoring ML |
| **Analytics (PRD-009)** | Agrégation | Stats occupation par table/zone |

### 12.2 Contrat d'Interface PRD-004

```typescript
// Contrat strict entre PRD-006 et PRD-004

interface TableForFloorPlan {
  _id: Id<"tables">;
  name: string;
  capacity: number;
  zone: "salle" | "terrasse";
  
  // Position canonique (v1.3)
  gridX: number;  // entier
  gridY: number;  // entier
  
  isActive: boolean;
  isDeleted?: boolean;
  features?: string[];
}

// Query exposée (exclut isDeleted par défaut)
tables.getForFloorPlan(): TableForFloorPlan[]
```

### 12.3 Respect du Design System

| Élément | Conformité | Référence |
|---------|------------|-----------|
| **Couleurs zones** | ✅ amber/emerald | ZONE_CONFIG |
| **Cards tables** | ✅ Layout liste standard | Grid admin |
| **Badges features** | ✅ Tags cohérents | Composant Tag partagé |
| **États sélection** | ✅ ring-blue-500 | Pattern standard |

---

## Historique

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| **1.3.1** | 2025-12-21 | Claude | **6 P0 critiques** : index by_name, unicité position enforced, collision detection migration, constants centralisées (GRID_CONFIG), soft delete (isDeleted), matrice RBAC |
| 1.3 | 2025-12-21 | Claude | Alignement PRD-004 : gridX/gridY, zones MVP, tri naturel, migration M1 |
| 1.2 | 2025-12-21 | Claude | Pivot click-to-click |
| 1.1 | 2025-12-19 | Claude | Ajout section Impact & Dépendances |
| 1.0 | 2025-12-19 | Claude | Création initiale |
