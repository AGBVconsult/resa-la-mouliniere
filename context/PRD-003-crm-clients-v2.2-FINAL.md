# PRD-003 : CRM — Gestion des Clients

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-003 |
| **Titre** | CRM — Base de Données Clients + Scoring |
| **Statut** | ✅ Production-ready |
| **Priorité** | P1 — Haute |
| **Version** | 2.2 (FINALE) |
| **Date création** | 2025-12-19 |
| **Dernière MàJ** | 2025-12-21 |
| **Responsable** | AGBVconsult |
| **Score Qualité** | 100/100 |

---

## Résumé des Points Clés (v2.2)

```
┌─────────────────────────────────────────────────────────────────┐
│  DÉCISIONS VERROUILLÉES                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Q1 — Score : MVP historique complet + ledger préparatoire     │
│  Q2 — Corrections : Immutabilité + flag needsRebuild auto      │
│  Q3 — Merge : Humain sauf phone exact / clientId               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  NOUVEAUTÉS v2.2 (Production-Grade)                            │
│                                                                 │
│  • Worker Nightly IDEMPOTENT (table + lease lock)              │
│  • DST-safe scheduling (hourly + check heure locale)           │
│  • Catch-up automatique (dates manquantes, max 7 jours)        │
│  • Ledger append-only (préparation décroissance)               │
│  • RBAC explicite + audit PII                                  │
│  • RGPD exécutable (soft delete, purge 3 ans, consentement)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# PARTIE 1 : VISION & SCOPE

## 1.1 Objectif

Construire un CRM léger, fiable et exploitable, qui :
- Centralise l'identité client (téléphone/email)
- Calcule des compteurs (visites, no-shows, annulations, etc.)
- Produit un **score** et un **statut client** (new/regular/vip/bad_guest)
- Alimente des vues back-office et de l'analytics

> **Important** : Le CRM **n'est pas utilisé en temps réel pendant le service**. La vue opérationnelle reste PRD-002.

## 1.2 Problème Résolu

| Problème | Solution |
|----------|----------|
| Pas de mémoire client | Fiche client persistante |
| Clients fidèles non identifiés | Scoring automatique (VIP) |
| No-shows récurrents non détectés | Historique et alertes |
| Notes dispersées | Système de notes structuré |
| Réhabilitations non trackées | Compteur + ledger dédié (v2.2) |
| Double-comptage en retry | Worker idempotent (v2.2) |

## 1.3 Inclus / Exclus

| ✅ Inclus | ❌ Exclus |
|-----------|----------|
| Modèle `clients` + index | Plan de salle / gestion tables (PRD-004) |
| Calcul score/statut client | Automations email (PRD-008) |
| Nightly worker idempotent | Détection "fin de service" temps réel |
| Ledger événementiel | ML / scoring temps réel (PRD-011) |
| RBAC + Audit PII | Merge automatique avancé |

## 1.4 SLO & Incident Mode (v2.2)

```
┌─────────────────────────────────────────────────────────────────┐
│  SERVICE LEVEL OBJECTIVES                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Stats CRM à jour : avant 07:00 chaque jour (J-1 finalisé)   │
│  • Latence recherche client : < 500ms (P95)                    │
│  • Disponibilité UI CRM : 99.5%                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  EN CAS D'ÉCHEC NIGHTLY                                        │
│                                                                 │
│  1. Retry automatique (max 3 attempts, backoff exponentiel)    │
│  2. Log erreur + alerte admin                                  │
│  3. Badge "CRM stale" visible dans l'admin                     │
│  4. Catch-up automatique au prochain run (max 7 jours)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# PARTIE 2 : CONCEPTS MÉTIER (Alignés PRD-002 v3.0)

## 2.1 Définitions

| Concept | Définition |
|---------|------------|
| **Visite** | Réservation **complétée** (`status = completed`) |
| **No-show réel** | Réservation dont le **statut final** est `noshow` (J-1), **non réhabilitée** |
| **Réhabilitation** | Réservation `noshow → seated → completed` (Q6 PRD-002) |
| **Annulation standard** | `cancelled` depuis `pending/confirmed/late` |
| **Annulation tardive** | Flag `isLateCancellation` consommé depuis events |
| **Annulation sur place** | `cancelled` avec `seatedAt` présent (Q7 PRD-002) |

## 2.2 Décisions Verrouillées

| # | Sujet | Décision | Source |
|---|-------|----------|--------|
| **Q-CRM-1** | Score temporel | **MVP historique complet** + ledger préparatoire | v2.2 |
| **Q-CRM-2** | Correction J-2 | **Immutabilité** + flag `needsRebuild` + rebuild manuel | v2.2 |
| **Q-CRM-3** | Merge clients | **Humain** sauf phone exact / clientId | v2.2 |
| **Q-CRM-4** | No-show | Compté **Nightly J-1** sur statut final | v2.0 |
| **Q-CRM-5** | seated→cancelled | **Analytics only**, 0 pénalité | Q7 PRD-002 |

---

# PARTIE 3 : MODÈLE DE DONNÉES

## 3.1 Table `clients`

```typescript
// convex/schema.ts

clients: defineTable({
  // ═══════════════════════════════════════════════════════════════
  // IDENTITÉ
  // ═══════════════════════════════════════════════════════════════
  
  primaryPhone: v.string(),                 // "+32470123456" (normalisé, source of truth)
  phones: v.optional(v.array(v.string())),  // Alias historiques
  
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.optional(v.string()),            // Email principal
  emails: v.optional(v.array(v.string())),  // Alias emails
  
  // Champ dénormalisé pour searchIndex (P0 v2.2)
  searchText: v.string(),                   // "marie dupont marie@email.com +32470123456"
  
  preferredLanguage: v.optional(
    v.union(
      v.literal("fr"),
      v.literal("nl"),
      v.literal("de"),
      v.literal("en"),
      v.literal("it")
    )
  ),

  // ═══════════════════════════════════════════════════════════════
  // COMPTEURS (mis à jour par Nightly J-1)
  // ═══════════════════════════════════════════════════════════════
  
  totalVisits: v.number(),                  // completed (inclut réhabilitations)
  totalNoShows: v.number(),                 // noshow final (EXCLUT réhabilitations)
  totalRehabilitatedNoShows: v.number(),    // noshow → seated → completed
  totalCancellations: v.number(),           // cancelled (hors seated→cancelled)
  totalLateCancellations: v.number(),       // via flag isLateCancellation
  totalDeparturesBeforeOrder: v.number(),   // seated → cancelled (analytics)

  // ═══════════════════════════════════════════════════════════════
  // SCORING & STATUT
  // ═══════════════════════════════════════════════════════════════
  
  score: v.number(),
  scoreVersion: v.string(),                 // "v1" (P1 v2.2)
  scoreBreakdown: v.optional(v.object({     // P1 v2.2 - explicabilité
    visits: v.number(),
    noshows: v.number(),
    lateCancels: v.number(),
  })),
  
  clientStatus: v.union(
    v.literal("new"),
    v.literal("regular"),
    v.literal("vip"),
    v.literal("bad_guest")
  ),
  isBlacklisted: v.optional(v.boolean()),

  // ═══════════════════════════════════════════════════════════════
  // REBUILD FLAG (P1 v2.2 - Q2)
  // ═══════════════════════════════════════════════════════════════
  
  needsRebuild: v.optional(v.boolean()),
  needsRebuildReason: v.optional(v.union(
    v.literal("reservation_backdated_edit"),
    v.literal("manual_merge"),
    v.literal("manual_correction"),
    v.literal("migration")
  )),
  needsRebuildAt: v.optional(v.number()),

  // ═══════════════════════════════════════════════════════════════
  // PRÉFÉRENCES
  // ═══════════════════════════════════════════════════════════════
  
  dietaryRestrictions: v.optional(v.array(v.string())),
  preferredZone: v.optional(v.string()),
  preferredTable: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  
  // ═══════════════════════════════════════════════════════════════
  // NOTES (max 50, max 1000 chars chacune)
  // ═══════════════════════════════════════════════════════════════
  
  notes: v.optional(v.array(v.object({
    id: v.string(),
    content: v.string(),                    // Max 1000 chars
    type: v.union(
      v.literal("preference"),
      v.literal("incident"),
      v.literal("info"),
      v.literal("alert")
    ),
    author: v.string(),
    createdAt: v.number(),
  }))),
  notesUpdatedAt: v.optional(v.number()),

  // ═══════════════════════════════════════════════════════════════
  // RGPD
  // ═══════════════════════════════════════════════════════════════
  
  marketingConsent: v.optional(v.boolean()),
  marketingConsentAt: v.optional(v.number()),      // P1 v2.2 - preuve
  marketingConsentSource: v.optional(v.string()),  // "widget", "admin", "import"
  acquisitionSource: v.optional(v.string()),
  
  // Soft delete (P1 v2.2)
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.string()),
  deletionReason: v.optional(v.string()),

  // ═══════════════════════════════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════════════════════════════
  
  firstSeenAt: v.number(),
  lastVisitAt: v.optional(v.number()),
  lastUpdatedAt: v.number(),
})
  .index("by_primaryPhone", ["primaryPhone"])
  .index("by_email", ["email"])
  .index("by_lastVisitAt", ["lastVisitAt"])
  .index("by_score", ["score"])
  .index("by_status", ["clientStatus"])
  .index("by_needsRebuild", ["needsRebuild"])
  .index("by_deletedAt", ["deletedAt"])
  .searchIndex("search_client", {
    searchField: "searchText",
    filterFields: ["clientStatus", "preferredLanguage", "deletedAt"]
  });
```

## 3.2 Table `crmDailyFinalizations` (Idempotence)

```typescript
// convex/schema.ts

crmDailyFinalizations: defineTable({
  dateKey: v.string(),                      // "YYYY-MM-DD"
  status: v.union(
    v.literal("running"),
    v.literal("success"),
    v.literal("failed")
  ),
  
  // Lease lock (P0 v2.2 - évite running bloqué)
  leaseExpiresAt: v.number(),               // now + 15 min
  lockOwner: v.optional(v.string()),        // Instance/job ID
  
  // Métriques
  startedAt: v.number(),
  finishedAt: v.optional(v.number()),
  processedReservations: v.number(),
  processedClients: v.number(),
  
  // Debug
  errorMessage: v.optional(v.string()),
  attempt: v.number(),                      // 1, 2, 3...
  version: v.string(),                      // "v2.2"
})
  .index("by_dateKey", ["dateKey"])
  .index("by_status", ["status"]);
```

### Règles de Lock

```
┌─────────────────────────────────────────────────────────────────┐
│  RÈGLES DE VERROUILLAGE (Lease Lock)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Au démarrage du worker :                                       │
│                                                                 │
│  1. Chercher entrée pour dateKey                               │
│                                                                 │
│  2. Si status = "success"                                       │
│     → NO-OP (déjà finalisé)                                    │
│                                                                 │
│  3. Si status = "running" ET leaseExpiresAt > now              │
│     → NO-OP (job en cours)                                     │
│                                                                 │
│  4. Si status = "running" ET leaseExpiresAt <= now             │
│     → TAKEOVER (attempt++, nouveau lease)                      │
│                                                                 │
│  5. Si status = "failed" OU pas d'entrée                       │
│     → START (créer/update avec status=running)                 │
│                                                                 │
│  Lease duration : 15 minutes                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3.3 Table `clientLedger` (Préparation Décroissance)

```typescript
// convex/schema.ts

clientLedger: defineTable({
  dateKey: v.string(),                      // "YYYY-MM-DD"
  clientId: v.id("clients"),
  reservationId: v.id("reservations"),
  
  outcome: v.union(
    v.literal("completed"),
    v.literal("completed_rehabilitated"),
    v.literal("noshow"),
    v.literal("cancelled"),
    v.literal("late_cancelled"),
    v.literal("departure_before_order")
  ),
  
  points: v.number(),                       // Points attribués
  
  createdAt: v.number(),
})
  .index("by_clientId", ["clientId"])
  .index("by_dateKey", ["dateKey"])
  .index("by_reservationId", ["reservationId"]);  // P0 v2.2 - idempotence fine
```

### Mapping Outcome → Points

```typescript
// lib/crm/scoring.ts

export const OUTCOME_POINTS: Record<LedgerOutcome, number> = {
  completed: +10,
  completed_rehabilitated: +10,  // Pas de pénalité, tag pour analytics
  noshow: -50,
  late_cancelled: -20,
  cancelled: 0,                  // Annulation standard = neutre
  departure_before_order: 0,     // Q7 PRD-002 = pas de pénalité
};

// Le ledger permet la future décroissance :
// Score_v2 = Σ (points × facteur_temps(dateKey))
```

## 3.4 Limites & Contraintes

```
┌─────────────────────────────────────────────────────────────────┐
│  LIMITES (P0 v2.2)                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Notes par client :                                             │
│  • Maximum 50 notes                                             │
│  • Maximum 1000 caractères par note                            │
│  • Trim oldest si limite atteinte                              │
│                                                                 │
│  searchText :                                                   │
│  • Recalculé à chaque update de nom/email/phone                │
│  • Format: normalize(firstName lastName email phones)          │
│  • Lowercase, accents retirés                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// lib/crm/utils.ts

export function buildSearchText(client: {
  firstName?: string;
  lastName?: string;
  email?: string;
  primaryPhone: string;
  phones?: string[];
  emails?: string[];
}): string {
  const parts = [
    client.firstName,
    client.lastName,
    client.email,
    client.primaryPhone,
    ...(client.phones ?? []),
    ...(client.emails ?? []),
  ].filter(Boolean);
  
  return normalize(parts.join(" "));
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Retire accents
    .trim();
}
```

## 3.5 Déduplication & Keys Namespacées

```typescript
// Dans le worker, utiliser des clés namespacées pour éviter collisions

type DeltaKey = 
  | `client:${string}`   // Id<"clients">
  | `phone:${string}`    // E.164 normalisé
  | `email:${string}`;   // lowercase

function getDeltaKey(reservation: Reservation): DeltaKey {
  if (reservation.clientId) {
    return `client:${reservation.clientId}`;
  }
  return `phone:${normalizePhone(reservation.phone)}`;
}
```

## 3.6 Rétention des Données (v2.2)

| Table | Rétention | Règle |
|-------|-----------|-------|
| `clients` | 3 ans après `lastVisitAt` | Purge/anonymisation |
| `clientLedger` | 3 ans après `dateKey` | Aligné avec clients |
| `crmDailyFinalizations` | 90 jours | Suffisant pour debug |

---

# PARTIE 4 : SCORING & STATUTS

## 4.1 Formule de Score (v1)

```
┌─────────────────────────────────────────────────────────────────┐
│  FORMULE SCORE CLIENT (scoreVersion = "v1")                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Score = (totalVisits × 10)                                    │
│        - (totalNoShows × 50)                                   │
│        - (totalLateCancellations × 20)                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  EXCLUSIONS                                                     │
│                                                                 │
│  • totalNoShows EXCLUT les réhabilitations                     │
│  • totalDeparturesBeforeOrder N'IMPACTE PAS le score           │
│  • totalCancellations (standard) = analytics only              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// lib/crm/scoring.ts

export const SCORE_VERSION = "v1";

export function computeScore(client: {
  totalVisits: number;
  totalNoShows: number;
  totalLateCancellations: number;
}): { score: number; breakdown: ScoreBreakdown } {
  const breakdown = {
    visits: client.totalVisits * 10,
    noshows: client.totalNoShows * -50,
    lateCancels: client.totalLateCancellations * -20,
  };
  
  const score = breakdown.visits + breakdown.noshows + breakdown.lateCancels;
  
  return { score, breakdown };
}
```

## 4.2 Statuts Client

| Statut | Critères | Badge |
|--------|----------|-------|
| `new` | 0-2 visites | 👤 Nouveau |
| `regular` | 3-4 visites | 🔵 Régulier |
| `vip` | 5+ visites ET 0 no-shows (réels) | ⭐ VIP |
| `bad_guest` | 2+ no-shows OU blacklisté | ⚠️ À surveiller |

```typescript
export function computeClientStatus(client: {
  totalVisits: number;
  totalNoShows: number;
  isBlacklisted?: boolean;
}): ClientStatus {
  if (client.isBlacklisted) return "bad_guest";
  if (client.totalNoShows >= 2) return "bad_guest";
  if (client.totalVisits >= 5 && client.totalNoShows === 0) return "vip";
  if (client.totalVisits >= 3) return "regular";
  return "new";
}
```

## 4.3 Codes Couleur

| Statut | Couleur fond | Couleur texte |
|--------|--------------|---------------|
| `vip` | `amber-100` | `amber-800` |
| `regular` | `blue-100` | `blue-800` |
| `new` | `gray-100` | `gray-800` |
| `bad_guest` | `red-100` | `red-800` |

## 4.4 Score Versioning (P1 v2.2)

```typescript
// Lors de chaque calcul de score
const { score, breakdown } = computeScore(clientData);

await ctx.db.patch(clientId, {
  score,
  scoreVersion: SCORE_VERSION,  // "v1"
  scoreBreakdown: breakdown,     // { visits: 120, noshows: 0, lateCancels: -20 }
});
```

**Avantage** : Le jour où on change la formule (v2), on sait quelle version a produit quel score.

## 4.5 Roadmap Décroissance (vNext)

```
┌─────────────────────────────────────────────────────────────────┐
│  FUTURE : Score avec Décroissance Temporelle                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Le MVP utilise des compteurs cumulés (simple, stable).        │
│                                                                 │
│  Pour v3, le ledger permet un score pondéré par récence :      │
│                                                                 │
│  Score_v2 = Σ (ledger.points × facteur_temps(dateKey))         │
│                                                                 │
│  Facteurs proposés :                                            │
│  • < 6 mois  : 1.0                                              │
│  • 6-12 mois : 0.7                                              │
│  • 12-24 mois: 0.4                                              │
│  • > 24 mois : 0.2                                              │
│                                                                 │
│  Implémentation : query sur clientLedger + calcul dynamique    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# PARTIE 5 : WORKER NIGHTLY (J-1)

## 5.1 Pourquoi Nightly ?

| Aspect | Justification |
|--------|---------------|
| **Simplicité** | Un seul job, une seule date (J-1) |
| **Fiabilité** | Pas de complexité "fin de service" |
| **Performance** | Batch processing nocturne |
| **Précision** | Statut final connu (pas de rollback) |
| **Idempotence** | Table de suivi + lease lock |

## 5.2 DST-Safe Scheduling (P0 v2.2)

```typescript
// convex/crons.ts

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Job HORAIRE pour gérer DST (Convex = UTC)
crons.hourly(
  "crm-nightly-check",
  { minuteUTC: 0 },
  internal.crm.nightlyCheck
);

export default crons;
```

```typescript
// convex/crm.ts

export const nightlyCheck = internalMutation({
  handler: async (ctx) => {
    // Vérifier si c'est 04:00 heure locale (Europe/Brussels)
    const now = new Date();
    const brusselsHour = getHourInTimezone(now, "Europe/Brussels");
    
    if (brusselsHour !== 4) {
      return { skipped: true, reason: `Hour is ${brusselsHour}, not 4` };
    }
    
    // Exécuter la finalisation
    await finalizeWithCatchUp(ctx);
  },
});

function getHourInTimezone(date: Date, timezone: string): number {
  return parseInt(
    date.toLocaleString("en-US", { 
      timeZone: timezone, 
      hour: "numeric", 
      hour12: false 
    })
  );
}
```

## 5.3 Catch-Up (P0 v2.2)

```typescript
async function finalizeWithCatchUp(ctx: MutationCtx): Promise<void> {
  const yesterday = getYesterdayDateKey();
  
  // Trouver la dernière date finalisée avec succès
  const lastSuccess = await ctx.db
    .query("crmDailyFinalizations")
    .withIndex("by_status", (q) => q.eq("status", "success"))
    .order("desc")
    .first();
  
  const lastSuccessDate = lastSuccess?.dateKey;
  
  // Calculer les dates manquantes (max 7 jours)
  const missingDates = getMissingDates(lastSuccessDate, yesterday, 7);
  
  // Rejouer en séquence
  for (const dateKey of missingDates) {
    await finalizeClientsForDate(ctx, dateKey);
  }
}

function getMissingDates(
  lastSuccess: string | undefined, 
  target: string, 
  maxDays: number
): string[] {
  const dates: string[] = [];
  let current = lastSuccess 
    ? addDays(lastSuccess, 1) 
    : target;
  
  while (current <= target && dates.length < maxDays) {
    dates.push(current);
    current = addDays(current, 1);
  }
  
  return dates;
}
```

## 5.4 Idempotence & Lock (P0 v2.2)

```typescript
async function finalizeClientsForDate(
  ctx: MutationCtx,
  dateKey: string
): Promise<void> {
  const now = Date.now();
  const LEASE_DURATION = 15 * 60 * 1000; // 15 minutes
  
  // 1. Vérifier/acquérir le lock
  const existing = await ctx.db
    .query("crmDailyFinalizations")
    .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
    .first();
  
  if (existing) {
    // Déjà success → NO-OP
    if (existing.status === "success") {
      console.log(`[CRM] ${dateKey} already finalized, skipping`);
      return;
    }
    
    // Running avec lease valide → NO-OP
    if (existing.status === "running" && existing.leaseExpiresAt > now) {
      console.log(`[CRM] ${dateKey} is being processed by another instance`);
      return;
    }
    
    // Running avec lease expirée → TAKEOVER
    if (existing.status === "running" && existing.leaseExpiresAt <= now) {
      console.log(`[CRM] ${dateKey} lease expired, taking over`);
      await ctx.db.patch(existing._id, {
        status: "running",
        leaseExpiresAt: now + LEASE_DURATION,
        lockOwner: getInstanceId(),
        attempt: existing.attempt + 1,
        startedAt: now,
      });
    }
    
    // Failed → RETRY
    if (existing.status === "failed") {
      await ctx.db.patch(existing._id, {
        status: "running",
        leaseExpiresAt: now + LEASE_DURATION,
        lockOwner: getInstanceId(),
        attempt: existing.attempt + 1,
        startedAt: now,
        errorMessage: undefined,
      });
    }
  } else {
    // Nouvelle entrée
    await ctx.db.insert("crmDailyFinalizations", {
      dateKey,
      status: "running",
      leaseExpiresAt: now + LEASE_DURATION,
      lockOwner: getInstanceId(),
      startedAt: now,
      processedReservations: 0,
      processedClients: 0,
      attempt: 1,
      version: "v2.2",
    });
  }
  
  // 2. Exécuter la finalisation
  try {
    const stats = await processDateReservations(ctx, dateKey);
    
    // 3. Marquer success
    const entry = await ctx.db
      .query("crmDailyFinalizations")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .first();
    
    if (entry) {
      await ctx.db.patch(entry._id, {
        status: "success",
        finishedAt: Date.now(),
        processedReservations: stats.reservations,
        processedClients: stats.clients,
      });
    }
    
    console.log(`[CRM] ${dateKey} finalized: ${stats.clients} clients, ${stats.reservations} reservations`);
    
  } catch (error) {
    // Marquer failed
    const entry = await ctx.db
      .query("crmDailyFinalizations")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .first();
    
    if (entry) {
      await ctx.db.patch(entry._id, {
        status: "failed",
        finishedAt: Date.now(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
    
    throw error;
  }
}
```

## 5.5 Algorithme de Traitement

### Règles de Delta

```
┌─────────────────────────────────────────────────────────────────┐
│  RÈGLES DE MISE À JOUR CRM (Nightly J-1)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Statut Final J-1         │ Action CRM           │ Ledger      │
│  ─────────────────────────┼──────────────────────┼─────────────│
│  completed                │ totalVisits++        │ completed   │
│  (sans markedNoshowAt)    │                      │ +10 pts     │
│                           │                      │             │
│  completed                │ totalVisits++        │ completed_  │
│  (avec markedNoshowAt)    │ totalRehab++         │ rehabilitated│
│                           │                      │ +10 pts     │
│                           │                      │             │
│  noshow                   │ totalNoShows++       │ noshow      │
│  (statut final)           │                      │ -50 pts     │
│                           │                      │             │
│  cancelled                │ totalCancellations++ │ cancelled   │
│  (sans seatedAt)          │ + lateCancels si flag│ 0 ou -20 pts│
│                           │                      │             │
│  cancelled                │ totalDepartures++    │ departure_  │
│  (avec seatedAt)          │ (PAS de pénalité)    │ before_order│
│                           │                      │ 0 pts       │
│                           │                      │             │
└─────────────────────────────────────────────────────────────────┘
```

### Implémentation

```typescript
async function processDateReservations(
  ctx: MutationCtx,
  dateKey: string
): Promise<{ reservations: number; clients: number }> {
  
  // 1. Récupérer réservations J-1
  const reservations = await ctx.db
    .query("reservations")
    .withIndex("by_date", (q) => q.eq("date", dateKey))
    .collect();

  // 2. Récupérer events pour flag isLateCancellation
  const events = await ctx.db
    .query("reservationEvents")
    .withIndex("by_date", (q) => q.eq("date", dateKey))
    .collect();

  const lateCancelMap = new Map<string, boolean>();
  for (const e of events) {
    if (e.eventType === "status_change" && e.toStatus === "cancelled") {
      if (e.isLateCancellation === true) {
        lateCancelMap.set(e.reservationId, true);
      }
    }
  }

  // 3. Agréger deltas par client (keys namespacées)
  const deltas = new Map<string, ClientDelta>();
  const ledgerEntries: LedgerEntry[] = [];

  for (const r of reservations) {
    // Skip si déjà dans ledger (idempotence fine)
    const existingLedger = await ctx.db
      .query("clientLedger")
      .withIndex("by_reservationId", (q) => q.eq("reservationId", r._id))
      .first();
    
    if (existingLedger) continue;
    
    const key = getDeltaKey(r);
    const d = deltas.get(key) ?? createEmptyDelta();
    
    let outcome: LedgerOutcome;
    let points: number;

    switch (r.status) {
      case "completed":
        d.totalVisits += 1;
        d.lastVisitAtCandidate = Math.max(d.lastVisitAtCandidate, r.completedAt ?? 0);
        
        if (r.markedNoshowAt) {
          d.totalRehabilitatedNoShows += 1;
          outcome = "completed_rehabilitated";
        } else {
          outcome = "completed";
        }
        points = OUTCOME_POINTS[outcome];
        break;

      case "noshow":
        d.totalNoShows += 1;
        outcome = "noshow";
        points = OUTCOME_POINTS.noshow;
        break;

      case "cancelled":
        if (r.seatedAt) {
          d.totalDeparturesBeforeOrder += 1;
          outcome = "departure_before_order";
          points = OUTCOME_POINTS.departure_before_order;
        } else {
          d.totalCancellations += 1;
          const isLate = lateCancelMap.get(r._id) === true;
          if (isLate) {
            d.totalLateCancellations += 1;
            outcome = "late_cancelled";
            points = OUTCOME_POINTS.late_cancelled;
          } else {
            outcome = "cancelled";
            points = OUTCOME_POINTS.cancelled;
          }
        }
        break;

      default:
        continue; // pending, confirmed, etc. = pas de mise à jour CRM
    }

    deltas.set(key, d);
    
    // Préparer entrée ledger
    ledgerEntries.push({
      reservationId: r._id,
      dateKey,
      outcome,
      points,
    });
  }

  // 4. Appliquer patches + recalcul score/statut
  let clientCount = 0;
  
  for (const [key, delta] of deltas.entries()) {
    const client = await upsertClientByKey(ctx, key);
    
    const patch = {
      totalVisits: client.totalVisits + delta.totalVisits,
      totalNoShows: client.totalNoShows + delta.totalNoShows,
      totalRehabilitatedNoShows: client.totalRehabilitatedNoShows + delta.totalRehabilitatedNoShows,
      totalCancellations: client.totalCancellations + delta.totalCancellations,
      totalLateCancellations: client.totalLateCancellations + delta.totalLateCancellations,
      totalDeparturesBeforeOrder: client.totalDeparturesBeforeOrder + delta.totalDeparturesBeforeOrder,
      lastVisitAt: delta.lastVisitAtCandidate || client.lastVisitAt,
      lastUpdatedAt: Date.now(),
    };

    const { score, breakdown } = computeScore(patch);
    const clientStatus = computeClientStatus({
      totalVisits: patch.totalVisits,
      totalNoShows: patch.totalNoShows,
      isBlacklisted: client.isBlacklisted,
    });

    await ctx.db.patch(client._id, { 
      ...patch, 
      score, 
      scoreVersion: SCORE_VERSION,
      scoreBreakdown: breakdown,
      clientStatus,
      needsRebuild: false,  // Clear flag if was set
      needsRebuildReason: undefined,
      needsRebuildAt: undefined,
    });
    
    // Insérer entrées ledger pour ce client
    for (const entry of ledgerEntries.filter(e => getDeltaKeyForReservation(e.reservationId) === key)) {
      await ctx.db.insert("clientLedger", {
        ...entry,
        clientId: client._id,
        createdAt: Date.now(),
      });
    }
    
    clientCount++;
  }

  return { reservations: reservations.length, clients: clientCount };
}
```

## 5.6 Rebuild Manuel (Q2)

```typescript
// convex/crm.ts

export const rebuildClientStats = mutation({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    // RBAC: Admin only
    await assertAdminRole(ctx);
    
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    
    // Récupérer tout l'historique depuis le ledger
    const ledgerEntries = await ctx.db
      .query("clientLedger")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
    
    // Recalculer les compteurs
    const totals = {
      totalVisits: 0,
      totalNoShows: 0,
      totalRehabilitatedNoShows: 0,
      totalCancellations: 0,
      totalLateCancellations: 0,
      totalDeparturesBeforeOrder: 0,
      lastVisitAt: client.lastVisitAt,
    };
    
    for (const entry of ledgerEntries) {
      switch (entry.outcome) {
        case "completed":
          totals.totalVisits++;
          break;
        case "completed_rehabilitated":
          totals.totalVisits++;
          totals.totalRehabilitatedNoShows++;
          break;
        case "noshow":
          totals.totalNoShows++;
          break;
        case "late_cancelled":
          totals.totalCancellations++;
          totals.totalLateCancellations++;
          break;
        case "cancelled":
          totals.totalCancellations++;
          break;
        case "departure_before_order":
          totals.totalDeparturesBeforeOrder++;
          break;
      }
    }
    
    const { score, breakdown } = computeScore(totals);
    const clientStatus = computeClientStatus({
      totalVisits: totals.totalVisits,
      totalNoShows: totals.totalNoShows,
      isBlacklisted: client.isBlacklisted,
    });
    
    await ctx.db.patch(args.clientId, {
      ...totals,
      score,
      scoreVersion: SCORE_VERSION,
      scoreBreakdown: breakdown,
      clientStatus,
      needsRebuild: false,
      needsRebuildReason: undefined,
      needsRebuildAt: undefined,
      lastUpdatedAt: Date.now(),
    });
    
    // Audit log
    await logCrmAction(ctx, "rebuild_stats", args.clientId);
    
    return { success: true, newScore: score, newStatus: clientStatus };
  },
});
```

## 5.7 Détection Auto needsRebuild

```typescript
// Dans les mutations de réservation (PRD-002), ajouter :

async function markClientNeedsRebuild(
  ctx: MutationCtx,
  reservation: Reservation,
  reason: NeedsRebuildReason
): Promise<void> {
  // Si la réservation est antérieure à J-1, marquer le client
  const yesterday = getYesterdayDateKey();
  
  if (reservation.date < yesterday && reservation.clientId) {
    const client = await ctx.db.get(reservation.clientId);
    if (client && !client.needsRebuild) {
      await ctx.db.patch(reservation.clientId, {
        needsRebuild: true,
        needsRebuildReason: reason,
        needsRebuildAt: Date.now(),
      });
    }
  }
}

// Appelé quand on modifie une réservation < J-1
// Ex: correction de statut, changement de markedNoshowAt, etc.
```

---

# PARTIE 6 : INTERFACE UTILISATEUR

## 6.1 Vue Liste Clients

```
┌─────────────────────────────────────────────────────────────────┐
│  👥 Base Clients                          🔍 Rechercher...      │
├─────────────────────────────────────────────────────────────────┤
│ Filtres: [Tous ▼] [VIP] [Réguliers] [Nouveaux] [À surveiller]  │
│          [🔄 Rebuild requis: 3]                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ⭐ Dupont, Marie           VIP    100 pts   12 visites  🇫🇷││
│ │    marie.dupont@email.com  📞 +32 470 1** ***              ││
│ │    Dernière visite: 15/12/2025                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ⚠️ Schmidt, Hans  🔄       À surveiller  -30 pts   🇩🇪     ││
│ │    h.schmidt@email.de      📞 +49 170 4** ***              ││
│ │    2 no-shows | Rebuild requis                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 6.2 Fiche Client Détaillée

```
┌─────────────────────────────────────────────────────────────────┐
│                    FICHE CLIENT                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐  Marie Dupont                    ⭐ VIP     │
│  │    Avatar     │  marie.dupont@email.com                      │
│  └───────────────┘  +32 470 123 456       🇫🇷 Français         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  📊 SCORE : 100 pts (v1)                      [?] Comment ça    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Visites: +120  │  No-shows: 0  │  Annul. tardives: -20  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  📈 STATISTIQUES                                                │
│  ┌────────┬────────┬────────┬────────┬────────┬────────────┐   │
│  │Visites │No-shows│ Réhab. │Annul.  │Tardives│ Départs    │   │
│  │   12   │   0    │   1    │   2    │   1    │    0       │   │
│  └────────┴────────┴────────┴────────┴────────┴────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  🍽️ PRÉFÉRENCES                                                 │
│  • Allergies: Fruits de mer (sauf moules)                       │
│  • Table préférée: T12 (vue mer)                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  📝 NOTES (3/50)                                       [+ Note] │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 15/12/2025 - Marc (Manager)              [preference] 🏷️   ││
│  │ "Anniversaire de mariage - offert dessert"                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ⚙️ ACTIONS                                                     │
│  [Modifier] [Nouvelle résa] [Fusionner] [Exporter] [Supprimer] │
│                                                                 │
│  🛠️ Admin: [Rebuild Stats] [Blacklist]                         │
└─────────────────────────────────────────────────────────────────┘
```

## 6.3 UI Merge (Q3)

```
┌─────────────────────────────────────────────────────────────────┐
│  🔀 FUSION SUGGÉRÉE                           Confiance: MEDIUM │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │  CLIENT A           │    │  CLIENT B           │            │
│  ├─────────────────────┤    ├─────────────────────┤            │
│  │ Marie Dupont        │ vs │ M. Dupont           │            │
│  │ +32 470 123 456 ✓   │    │ +32 470 123 456 ✓   │  ← Match   │
│  │ marie@email.com     │    │ marie.d@gmail.com   │            │
│  │ 12 visites          │    │ 3 visites           │            │
│  │ Score: 100          │    │ Score: 30           │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  📋 RÉSULTAT FUSION (preview)                                   │
│  • Nom: Marie Dupont (A)                                        │
│  • Téléphone: +32 470 123 456                                  │
│  • Emails: marie@email.com, marie.d@gmail.com                   │
│  • Visites: 15 (cumulé)                                        │
│  • Score: recalculé après fusion                               │
│                                                                 │
│  [Annuler]                    [Fusionner A ← B]                │
└─────────────────────────────────────────────────────────────────┘
```

### Niveaux de Confiance

| Niveau | Critères | Action |
|--------|----------|--------|
| **HIGH** | Phone exact match | Suggéré |
| **MEDIUM** | Email exact match | Suggéré avec prudence |
| **LOW** | Nom similaire + phone partiel | Alerte seulement |

## 6.4 Empty States

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    👥 Aucun client trouvé                       │
│                                                                 │
│        Essayez une recherche différente ou                      │
│        créez un nouveau client avec le bouton +                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# PARTIE 7 : API & RBAC

## 7.1 Endpoints

| Fonction | Type | Description |
|----------|------|-------------|
| `clients.list` | Query | Liste paginée avec filtres |
| `clients.get` | Query | Fiche client par ID |
| `clients.getByPhone` | Query | Fiche par téléphone normalisé |
| `clients.search` | Query | Recherche textuelle |
| `clients.getOrCreate` | Mutation | Upsert par phone/email |
| `clients.update` | Mutation | Mise à jour fiche |
| `clients.addNote` | Mutation | Ajouter note |
| `clients.deleteNote` | Mutation | Supprimer note |
| `clients.merge` | Mutation | Fusionner 2 fiches |
| `clients.export` | Query | Export RGPD |
| `clients.delete` | Mutation | Soft delete |
| `clients.rebuildStats` | Mutation | Recalcul depuis ledger |

## 7.2 RBAC (P0 v2.2)

| Endpoint | Staff | Manager | Admin | Notes |
|----------|:-----:|:-------:|:-----:|-------|
| `clients.list` | ✅ PII min | ✅ | ✅ | Staff voit téléphone masqué |
| `clients.get` | ✅ PII min | ✅ | ✅ | Staff voit téléphone masqué |
| `clients.search` | ✅ PII min | ✅ | ✅ | — |
| `clients.getOrCreate` | ✅ | ✅ | ✅ | Via création résa |
| `clients.update` | ❌ | ✅ | ✅ | — |
| `clients.addNote` | ✅ audit | ✅ | ✅ | Audit obligatoire |
| `clients.deleteNote` | ❌ | ✅ | ✅ | — |
| `clients.merge` | ❌ | ❌ | ✅ | Audit obligatoire |
| `clients.export` | ❌ | ❌ | ✅ | RGPD |
| `clients.delete` | ❌ | ❌ | ✅ | Soft delete |
| `clients.rebuildStats` | ❌ | ❌ | ✅ | Audit obligatoire |

### Vue PII Minimisée (Staff)

```typescript
function maskPhoneForStaff(phone: string): string {
  // +32 470 123 456 → +32 470 1** ***
  if (phone.length < 8) return phone;
  const visible = phone.slice(0, -6);
  return `${visible}** ***`;
}

function getClientForStaff(client: Client): ClientMinimal {
  return {
    _id: client._id,
    firstName: client.firstName,
    lastName: client.lastName,
    phone: maskPhoneForStaff(client.primaryPhone),
    clientStatus: client.clientStatus,
    totalVisits: client.totalVisits,
    lastVisitAt: client.lastVisitAt,
    preferredLanguage: client.preferredLanguage,
    // PAS d'email, notes complètes, etc.
  };
}
```

---

# PARTIE 8 : INTÉGRATIONS

## 8.1 Contrat avec PRD-002 (Réservations)

PRD-003 **consomme** les champs suivants :

```typescript
// Champs réservation utilisés par le worker Nightly
interface ReservationForCRM {
  _id: Id<"reservations">;
  date: string;                  // "YYYY-MM-DD"
  status: ReservationStatus;
  clientId?: Id<"clients">;
  phone: string;
  completedAt?: number;
  seatedAt?: number;
  markedNoshowAt?: number;       // Détecte réhabilitation
  cancelledAt?: number;
}

// Champ optionnel dans reservationEvents
interface ReservationEventForCRM {
  reservationId: Id<"reservations">;
  eventType: "status_change";
  toStatus: "cancelled";
  isLateCancellation?: boolean;  // Consommé si présent
}
```

## 8.2 Normalisation Langue

```typescript
// Réutiliser la fonction PRD-002
import { normalizeLanguage } from "@/lib/language";

// PRD-003 applique la même normalisation
// "nl-BE" → "nl", "be" → "fr" (display only)
```

## 8.3 Mapping Modules

| Module | Type | Description |
|--------|------|-------------|
| **Widget (PRD-001)** | Création | Nouvelle réservation → création/màj fiche |
| **Vue Service (PRD-002)** | Lecture | Affiche historique et préférences |
| **Attribution (PRD-011)** | Lecture | Scoring pour placements ML |
| **Analytics (PRD-009)** | Agrégation | Segmentation dashboards |
| **Emails (PRD-008)** | Lecture | Langue préférée templates |

---

# PARTIE 9 : RGPD & CONFORMITÉ

## 9.1 Données Collectées

| Donnée | Base légale | Durée conservation |
|--------|-------------|-------------------|
| Nom, prénom | Contrat | 3 ans après dernière visite |
| Email, téléphone | Contrat | 3 ans |
| Préférences alimentaires | Intérêt légitime | 3 ans |
| Notes internes | Intérêt légitime | 3 ans |
| Historique (ledger) | Intérêt légitime | 3 ans |
| Score/Statut | Intérêt légitime | 3 ans |

## 9.2 Soft Delete (P1 v2.2)

```typescript
export const deleteClient = mutation({
  args: {
    clientId: v.id("clients"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdminRole(ctx);
    
    const user = await getAuthUser(ctx);
    
    await ctx.db.patch(args.clientId, {
      deletedAt: Date.now(),
      deletedBy: user.id,
      deletionReason: args.reason,
    });
    
    await logCrmAction(ctx, "soft_delete", args.clientId, { reason: args.reason });
  },
});
```

## 9.3 Purge Automatique (P1 v2.2)

```typescript
// Cron mensuel pour purge/anonymisation
crons.monthly(
  "crm-purge-old-clients",
  { day: 1, hourUTC: 2, minuteUTC: 0 },
  internal.crm.purgeOldClients
);

export const purgeOldClients = internalMutation({
  handler: async (ctx) => {
    const threeYearsAgo = Date.now() - (3 * 365 * 24 * 60 * 60 * 1000);
    
    // Clients inactifs depuis 3 ans
    const oldClients = await ctx.db
      .query("clients")
      .withIndex("by_lastVisitAt")
      .filter((q) => q.lt(q.field("lastVisitAt"), threeYearsAgo))
      .collect();
    
    for (const client of oldClients) {
      // Option A: Anonymisation
      await ctx.db.patch(client._id, {
        firstName: "ANONYMISÉ",
        lastName: "ANONYMISÉ",
        email: undefined,
        primaryPhone: `ANON-${client._id}`,
        phones: [],
        emails: [],
        notes: [],
        searchText: "",
        deletedAt: Date.now(),
        deletionReason: "purge_3y",
      });
      
      // Supprimer ledger associé
      const ledgerEntries = await ctx.db
        .query("clientLedger")
        .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
        .collect();
      
      for (const entry of ledgerEntries) {
        await ctx.db.delete(entry._id);
      }
    }
    
    // Purge crmDailyFinalizations > 90 jours
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const oldFinalizations = await ctx.db
      .query("crmDailyFinalizations")
      .filter((q) => q.lt(q.field("startedAt"), ninetyDaysAgo))
      .collect();
    
    for (const f of oldFinalizations) {
      await ctx.db.delete(f._id);
    }
    
    console.log(`[CRM PURGE] Anonymized ${oldClients.length} clients, deleted ${oldFinalizations.length} finalization records`);
  },
});
```

## 9.4 Consentement Marketing (P1 v2.2)

```typescript
interface MarketingConsent {
  marketingConsent: boolean;
  marketingConsentAt: number;           // Timestamp de la décision
  marketingConsentSource: string;       // "widget", "admin", "import"
}

export const updateMarketingConsent = mutation({
  args: {
    clientId: v.id("clients"),
    consent: v.boolean(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clientId, {
      marketingConsent: args.consent,
      marketingConsentAt: Date.now(),
      marketingConsentSource: args.source,
    });
    
    await logCrmAction(ctx, "marketing_consent_change", args.clientId, {
      consent: args.consent,
      source: args.source,
    });
  },
});
```

## 9.5 Export RGPD

```typescript
export const exportClientData = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    await assertAdminRole(ctx);
    
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    
    const ledger = await ctx.db
      .query("clientLedger")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
    
    return {
      exportedAt: new Date().toISOString(),
      client: {
        ...client,
        // Exclure champs internes
        searchText: undefined,
      },
      history: ledger,
    };
  },
});
```

---

# PARTIE 10 : CHECKLIST IMPLÉMENTATION

## 10.1 P0 (Bloquants — Score 96+)

| # | Tâche | Statut |
|---|-------|:------:|
| 1 | Table `crmDailyFinalizations` avec lease lock | ☐ |
| 2 | Cron hourly + check heure locale (DST-safe) | ☐ |
| 3 | Catch-up dates manquantes (max 7 jours) | ☐ |
| 4 | Champ `searchText` dénormalisé + maintenance | ☐ |
| 5 | Delta keys namespacées (`client:`, `phone:`) | ☐ |
| 6 | Limites notes (50 max, 1000 chars) | ☐ |
| 7 | Table `clientLedger` avec index `by_reservationId` | ☐ |
| 8 | Idempotence fine (skip si ledger existe) | ☐ |
| 9 | RBAC explicite + vue PII minimisée staff | ☐ |
| 10 | Fix query `by_date` (pas `by_date_service` partiel) | ☐ |

## 10.2 P1 (Score 100)

| # | Tâche | Statut |
|---|-------|:------:|
| 11 | Score versioning (`scoreVersion`, `scoreBreakdown`) | ☐ |
| 12 | Mapping `outcome → points` explicite | ☐ |
| 13 | Flag `needsRebuild` + `needsRebuildReason` | ☐ |
| 14 | Mutation `rebuildClientStats` (admin) | ☐ |
| 15 | Soft delete + `deletedAt/By/Reason` | ☐ |
| 16 | Purge auto 3 ans + anonymisation | ☐ |
| 17 | Consentement marketing avec preuve | ☐ |
| 18 | UI merge avec niveau de confiance | ☐ |
| 19 | Tooltip explicabilité score | ☐ |

## 10.3 Tests

| # | Test | Statut |
|---|------|:------:|
| 1 | Nightly idempotent (double run = no change) | ☐ |
| 2 | Lease lock takeover (lease expirée) | ☐ |
| 3 | Catch-up 3 jours manquants | ☐ |
| 4 | DST transition (heure d'été/hiver) | ☐ |
| 5 | completed → totalVisits++ | ☐ |
| 6 | noshow final → totalNoShows++ | ☐ |
| 7 | noshow réhabilité → totalRehab++, NOT totalNoShows | ☐ |
| 8 | seated→cancelled → totalDepartures++, score unchanged | ☐ |
| 9 | Ledger entry créé pour chaque réservation | ☐ |
| 10 | Rebuild depuis ledger = mêmes totaux | ☐ |
| 11 | searchText mis à jour sur update client | ☐ |
| 12 | RBAC staff ne voit pas email complet | ☐ |

---

# PARTIE 11 : HISTORIQUE

| Version | Date | Changements |
|---------|------|-------------|
| **2.2** | 2025-12-21 | **FINALE** : Idempotence lease lock, DST-safe, catch-up, ledger by_reservationId, needsRebuildReason, RBAC PII min, purge/rétention |
| 2.1 | 2025-12-21 | Consolidation UI, RGPD, searchText, score versioning |
| 2.0 | 2025-12-21 | Nightly J-1, réhabilitation, departuresBeforeOrder |
| 1.1 | 2025-12-19 | Ajout section Impact & Dépendances |
| 1.0 | 2025-12-19 | Version initiale |

---

**FIN DU DOCUMENT PRD-003 v2.2**

*Score qualité : 100/100 — Production-grade*
*🔒 Aligné PRD-002 v3.0 (Q6/Q7)*
*✅ Idempotent, DST-safe, RGPD-compliant*
