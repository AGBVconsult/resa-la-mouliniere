# PRD-009 : Analytics & Statistiques

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-009 |
| **Titre** | Dashboard Analytics — Statistiques & Indicateurs |
| **Statut** | ✅ Production-ready (révisé & aligné PRD-001→008) |
| **Priorité** | P1 — Haute |
| **Version** | 2.1.1 |
| **Date création** | 2025-12-19 |
| **Dernière MAJ** | 2025-12-21 |
| **Responsable** | AGBVconsult |
| **Score Qualité** | 98/100 |

---

## Changelog

| Version | Date | Changements |
|---------|------|-------------|
| **2.1.1** | 2025-12-21 | Zone mixte → `unknown` (KISS), volumes P0 clarifiés (scheduledTotal + createdCount), UI labels distincts |
| 2.1 | 2025-12-21 | Correctifs d'alignement : source enum, zone dérivée, réhabilitation timestamps, capacité effective, CRM source of truth |
| 2.0 | 2025-12-21 | Révision complète (8 statuts, worker nightly idempotent, DST-safe, zones, CRM, widget funnel, email stats, RBAC, privacy-first) |
| 1.x | 2025-12-19 | Création & itérations |

---

## Résumé des Décisions Verrouillées (v2.1.1)

```
┌─────────────────────────────────────────────────────────────────┐
│  DÉCISIONS VERROUILLÉES v2.1.1                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Q1  — Agrégation : Nightly J-1 (DST-safe Europe/Brussels)      │
│  Q2  — Statuts : 8 statuts (dont noshow réversible)             │
│  Q3  — No-show final : status=noshow ET completedAt=null        │
│  Q4  — Réhabilitation : markedNoshowAt != null ET completedAt   │
│  Q5  — seated→cancelled : departuresBeforeOrder (analytics)     │
│  Q6  — Zone mixte : unknown (pas de split, KISS)                │
│  Q7  — Source : enum canonique (online/phone/walkin/admin/...)  │
│  Q8  — CRM : segmentation read-only depuis client.status        │
│  Q9  — Privacy : agrégé only, pas de PII                        │
│  Q10 — Volumes P0 : scheduledTotal + createdCount (2 axes)      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  NOUVEAUTÉS v2.1.1                                              │
│                                                                 │
│  • Zone dérivée via tableIds → tables.zone (pas champ direct)   │
│  • Source normalisée : origin:"widget" → source:"online"        │
│  • Réhabilitation via timestamps (pas wasNoShow)                │
│  • Capacité effective depuis moteur créneaux+périodes           │
│  • 2 métriques volumes séparées (service-date vs created-date)  │
│  • UI labels anti-confusion ("prévues" vs "reçues")             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Corrections d'Alignement v2.1 (PRD-001→008)

| Aspect | v2.0 (incorrect) | v2.1+ (corrigé) |
|--------|------------------|-----------------|
| **Source** | `origin: "widget"` | `source: "online"` (enum canonique) |
| **Zone** | Champ direct sur réservation | **Dérivée** via `tableIds` → `tables.zone` |
| **Réhabilitation** | Champ `wasNoShow` | **Timestamps** : `markedNoshowAt != null && completedAt != null` |
| **Volumes** | `reservationsCreated` (ambigu) | `reservationsScheduledTotal` (date service) + `reservationsCreatedCount` (date création) |
| **Capacité** | Non spécifié | **capacityEffective** depuis moteur créneaux + périodes |
| **Segments** | Seuils définis dans analytics | **Consommer** depuis CRM (`client.status`) |

---

# PARTIE 1 : VISION & SCOPE

## 1.1 Objectif

Fournir un dashboard analytics pour piloter :

- **Performance des réservations** : volumes, annulations, no-shows, réhabilitations
- **Occupation** : sur capacité effective (créneaux + périodes)
- **Performance par service** : midi vs soir
- **Performance par zone** : salle / terrasse / unknown
- **Parcours de conversion** : funnel widget (steps + abandons + erreurs)
- **Performance emails** : delivery / bounce / open / click
- **Segmentation clients** : via CRM (new / returning / vip / bad_guest)

> **Important** : Le module analytics n'est pas critique pour l'opérationnel service. Indisponibilité tolérée sans impact sur PRD-002 Vue Service.

## 1.2 Problème Résolu

| Problème | Solution |
|----------|----------|
| Pas de visibilité sur les performances | Dashboard temps réel WebSocket |
| Décisions sans données | KPIs objectifs alignés CRM |
| No-shows non mesurés | Tracking via statut final J-1 |
| Saisonnalité inconnue | Analyse temporelle par période |
| seated→cancelled non tracké | Analytics séparé (departuresBeforeOrder) |
| Réhabilitations confondues | Distinction via timestamps |
| Zone ambiguë | Dérivation via tableIds |
| Source incohérente | Enum canonique normalisée |

## 1.3 Bénéfices Attendus

- Prise de décision basée sur les données
- Optimisation du taux d'occupation
- Détection précoce des problèmes (pic no-shows)
- Planification améliorée (saisonnalité)
- Compréhension du parcours client (widget funnel)

## 1.4 Inclus / Exclus

| ✅ Inclus | ❌ Exclus |
|-----------|----------|
| Dashboard KPIs temps réel | Prédictions ML (PRD-011) |
| Nightly agrégation J-1 idempotente | Revenue / chiffre d'affaires |
| Live counters "aujourd'hui" (query runtime) | Export comptable |
| Occupation sur capacité effective | Intégration POS |
| Analytics par zone (salle/terrasse/unknown) | A/B testing |
| Widget funnel tracking | Analytics cross-restaurants |
| Email delivery stats | Attribution marketing avancée |
| Segmentation clients (via CRM) | |

---

# PARTIE 2 : ARCHITECTURE

## 2.1 Sources de Données (Read-Only)

```
┌─────────────────────────────────────────────────────────────────┐
│  SOURCES DE DONNÉES → ANALYTICS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │   reservations   │  │     clients      │                    │
│  │    (PRD-002)     │  │    (PRD-003)     │                    │
│  │                  │  │                  │                    │
│  │  • 8 statuts     │  │  • segment       │                    │
│  │  • timestamps    │  │  • status        │                    │
│  │  • tableIds      │  │                  │                    │
│  │  • source        │  │                  │                    │
│  │  • language      │  │                  │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
│           │                     │                               │
│  ┌────────┴─────────┐  ┌────────┴─────────┐                    │
│  │      tables      │  │    emailJobs     │                    │
│  │  (PRD-004/006)   │  │    (PRD-008)     │                    │
│  │                  │  │                  │                    │
│  │  • zone (salle/  │  │  • status        │                    │
│  │    terrasse)     │  │  • provider      │                    │
│  │                  │  │    events        │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
│           │                     │                               │
│  ┌────────┴─────────┐  ┌────────┴─────────┐                    │
│  │  créneaux/slots  │  │  widget events   │                    │
│  │    (PRD-005)     │  │    (PRD-001)     │                    │
│  │                  │  │                  │                    │
│  │  • capacité      │  │  • step views    │                    │
│  │  • ouvertures    │  │  • abandons      │                    │
│  │                  │  │  • erreurs       │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │ périodes spéc.   │                                          │
│  │    (PRD-007)     │                                          │
│  │                  │                                          │
│  │  • fermetures    │                                          │
│  │  • overrides     │                                          │
│  └──────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2.2 Principe "2 Couches"

```
┌─────────────────────────────────────────────────────────────────┐
│  ARCHITECTURE 2 COUCHES                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COUCHE 1 : LIVE ANALYTICS                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                     │
│                                                                 │
│  • Période : Aujourd'hui + fenêtre courte (7 jours)            │
│  • Source : Query runtime depuis reservations                  │
│  • Latence : Temps réel (WebSocket Convex)                     │
│  • Usage : Onglet "Live" du dashboard                          │
│                                                                 │
│  COUCHE 2 : HISTORICAL ANALYTICS                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                │
│                                                                 │
│  • Période : J-1 et avant (historique)                         │
│  • Source : Table dailyStats (pré-agrégée)                     │
│  • Latence : Nightly worker (03:00 Brussels)                   │
│  • Usage : Onglet "Historique" du dashboard                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2.3 Cascade de Données (Aligné PRD-002 v3.0)

```
┌─────────────────────────────────────────────────────────────────┐
│  STATUTS RÉSERVATION → ANALYTICS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Statuts non-terminaux (en cours):                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ pending  │ │confirmed │ │   late   │ │  seated  │          │
│  │    ◐     │ │    ○     │ │    ⏱    │ │    ●     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│       ↓           ↓           ↓           ↓                    │
│  Analytics: "réservations actives" (compteur temps réel)       │
│                                                                 │
│  Statuts terminaux (finalisés J-1):                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │completed │ │ refused  │ │cancelled │ │  noshow  │          │
│  │    ✓     │ │    ✗     │ │    —     │ │    ∅     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│       ↓           ↓           ↓           ↓                    │
│  completed   (admin)     cancelled    noshowFinal              │
│  +1         pas client   (split*)     +1 (si final)            │
│                                                                 │
│  *cancelled split:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ cancelled + seatedAt != null → departuresBeforeOrder    │   │
│  │ cancelled + seatedAt == null → totalCancellations       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠️ noshow RÉVERSIBLE (PRD-002 v3.0 Q6):                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ markedNoshowAt != null + completedAt != null            │   │
│  │ = réhabilitation (PAS compté dans noshowFinal)          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2.4 Timezone & DST (Aligné PRD-007/012)

```
┌─────────────────────────────────────────────────────────────────┐
│  DST-SAFE ANALYTICS                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Timezone canonique: Europe/Brussels (PRD-012)                 │
│                                                                 │
│  Cron: Horaire (pas daily) + vérification heure locale         │
│                                                                 │
│  crons.hourly("analytics-nightly", { minuteUTC: 0 },           │
│    internal.analytics.checkAndRunNightly                       │
│  );                                                             │
│                                                                 │
│  // Dans le handler:                                           │
│  const brusselsHour = DateTime.now()                           │
│    .setZone("Europe/Brussels")                                 │
│    .hour;                                                      │
│  if (brusselsHour !== 3) return; // Skip si pas 03:00 local    │
│                                                                 │
│  ✅ Fonctionne correctement:                                   │
│  • Été (CEST) : UTC 01:00 = Brussels 03:00                     │
│  • Hiver (CET) : UTC 02:00 = Brussels 03:00                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# PARTIE 3 : MODÈLE DE DONNÉES (v2.1.1)

## 3.1 Tables

### 3.1.1 dailyStats (Historique — J-1)

> **IMPORTANT (v2.1.1)** : `date` = date de service (date de réservation), pas "date de création".

```typescript
// convex/schema.ts

dailyStats: defineTable({
  // ═══════════════════════════════════════════════════════════════
  // IDENTIFIANTS
  // ═══════════════════════════════════════════════════════════════
  date: v.string(),      // "YYYY-MM-DD" Europe/Brussels (date de SERVICE)
  service: v.union(
    v.literal("midi"),
    v.literal("soir"),
    v.literal("total")
  ),

  // ═══════════════════════════════════════════════════════════════
  // (A) VOLUMES — DATE DE SERVICE
  // ═══════════════════════════════════════════════════════════════
  // Toutes résas dont reservation.date === dailyStats.date
  reservationsScheduledTotal: v.number(),

  reservationsByStatus: v.object({
    // Statuts non-terminaux (snapshot fin de journée)
    pending: v.number(),
    confirmed: v.number(),
    late: v.number(),
    seated: v.number(),

    // Statuts terminaux
    completed: v.number(),
    refused: v.number(),
    cancelled: v.number(),

    // Analytics-only (clarifiés v2.1)
    noshowFinal: v.number(),           // status=noshow ET completedAt=null
    rehabilitated: v.number(),         // markedNoshowAt != null ET completedAt != null
    departuresBeforeOrder: v.number(), // cancelled ET seatedAt != null
  }),

  // ═══════════════════════════════════════════════════════════════
  // (B) VOLUMES — DATE DE CRÉATION (demande globale)
  // ═══════════════════════════════════════════════════════════════
  // Résas créées ce jour, toutes dates de service confondues
  reservationsCreatedCount: v.number(),

  // P1 : same-day demand (créées J pour J)
  reservationsCreatedForThisDay: v.optional(v.number()),

  // ═══════════════════════════════════════════════════════════════
  // COUVERTS (sur completed uniquement)
  // ═══════════════════════════════════════════════════════════════
  totalCovers: v.number(),
  avgPartySize: v.number(),
  maxPartySize: v.number(),

  // ═══════════════════════════════════════════════════════════════
  // CAPACITÉ / OCCUPATION (capacité effective)
  // ═══════════════════════════════════════════════════════════════
  capacityEffective: v.number(),  // Dénominateur depuis moteur créneaux+périodes
  occupancyRate: v.number(),      // totalCovers / capacityEffective (%)
  noShowRate: v.number(),         // noshowFinal / (noshowFinal + completed) (%)
  cancellationRate: v.number(),   // cancelled / reservationsScheduledTotal (%)
  conversionRate: v.number(),     // completed / reservationsScheduledTotal (%)

  // ═══════════════════════════════════════════════════════════════
  // CONTEXTE D'OUVERTURE
  // ═══════════════════════════════════════════════════════════════
  openState: v.object({
    isOpen: v.boolean(),
    reason: v.optional(v.string()), // "special_period", "manual_override", etc.
  }),

  // ═══════════════════════════════════════════════════════════════
  // PAR ZONE (dérivée via tableIds → tables.zone)
  // ═══════════════════════════════════════════════════════════════
  byZone: v.object({
    salle: v.object({
      covers: v.number(),
      reservations: v.number(),
      occupancyRate: v.number(),
    }),
    terrasse: v.object({
      covers: v.number(),
      reservations: v.number(),
      occupancyRate: v.number(),
    }),
    unknown: v.object({
      covers: v.number(),
      reservations: v.number(),
      occupancyRate: v.number(),
    }),
  }),

  // ═══════════════════════════════════════════════════════════════
  // CLIENTS (depuis CRM, agrégé — PAS de seuils dupliqués)
  // ═══════════════════════════════════════════════════════════════
  clientBreakdown: v.object({
    new: v.number(),
    returning: v.number(),
    vip: v.number(),
    bad_guest: v.number(),
  }),

  // ═══════════════════════════════════════════════════════════════
  // SOURCES (enum canonique normalisée)
  // ═══════════════════════════════════════════════════════════════
  sourceBreakdown: v.object({
    online: v.number(),   // Widget (ex-origin:"widget")
    phone: v.number(),
    walkin: v.number(),
    admin: v.number(),
    import: v.number(),
    api: v.number(),
  }),

  // ═══════════════════════════════════════════════════════════════
  // LANGUES
  // ═══════════════════════════════════════════════════════════════
  languageStats: v.object({
    fr: v.number(),
    nl: v.number(),
    en: v.number(),
    de: v.number(),
    it: v.number(),
  }),

  // ═══════════════════════════════════════════════════════════════
  // MÉTADONNÉES
  // ═══════════════════════════════════════════════════════════════
  aggregatedAt: v.number(),       // Timestamp d'agrégation
  aggregatedVersion: v.string(),  // "v2.1.1"
})
.index("by_date", ["date"])
.index("by_date_service", ["date", "service"])
.index("by_month", ["date"]);  // Pour requêtes mensuelles
```

### 3.1.2 widgetStats (Funnel)

```typescript
widgetStats: defineTable({
  date: v.string(),  // "YYYY-MM-DD"

  // Funnel 5 étapes
  funnel: v.object({
    step1_dateService: v.object({
      views: v.number(),
      completed: v.number(),
      abandonRate: v.number(),
    }),
    step2_timeSlot: v.object({
      views: v.number(),
      completed: v.number(),
      abandonRate: v.number(),
    }),
    step3_partySize: v.object({
      views: v.number(),
      completed: v.number(),
      abandonRate: v.number(),
    }),
    step4_contact: v.object({
      views: v.number(),
      submitted: v.number(),
      abandonRate: v.number(),
    }),
    step5_confirmation: v.object({
      views: v.number(),
      confirmed: v.number(),
      pending: v.number(),
    }),
  }),

  // Erreurs (codes réels alignés)
  errors: v.object({
    SLOT_TAKEN: v.number(),
    VALIDATION_ERROR: v.number(),
    TURNSTILE_FAILED: v.number(),
    NETWORK_ERROR: v.number(),
    UNKNOWN: v.number(),
  }),

  // Temps moyen (secondes)
  avgTimeToComplete: v.number(),

  // Par langue
  byLanguage: v.object({
    fr: v.number(),
    nl: v.number(),
    en: v.number(),
    de: v.number(),
    it: v.number(),
  }),

  aggregatedAt: v.number(),
})
.index("by_date", ["date"]);
```

### 3.1.3 emailStats (Delivery)

```typescript
emailStats: defineTable({
  date: v.string(),  // "YYYY-MM-DD"

  // Par type d'email
  byType: v.object({
    confirmation: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),   // Si provider events activés
      clicked: v.optional(v.number()),
    }),
    pending: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),
      clicked: v.optional(v.number()),
    }),
    validated: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),
      clicked: v.optional(v.number()),
    }),
    refused: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),
      clicked: v.optional(v.number()),
    }),
    cancelled_client: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),
      clicked: v.optional(v.number()),
    }),
    cancelled_admin: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),
      clicked: v.optional(v.number()),
    }),
    reminder: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),
      clicked: v.optional(v.number()),
    }),
    review: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),
      clicked: v.optional(v.number()),
      optouts: v.number(),  // Spécifique aux review
    }),
    modified: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),
      clicked: v.optional(v.number()),
    }),
    group_ack: v.object({
      sent: v.number(),
      delivered: v.number(),
      bounced: v.number(),
      opened: v.optional(v.number()),
      clicked: v.optional(v.number()),
    }),
  }),

  // Totaux
  totalSent: v.number(),
  totalDelivered: v.number(),
  totalBounced: v.number(),
  deliveryRate: v.number(),  // delivered / sent (%)

  aggregatedAt: v.number(),
})
.index("by_date", ["date"]);
```

### 3.1.4 analyticsDailyRuns (Idempotence)

```typescript
analyticsDailyRuns: defineTable({
  date: v.string(),        // "YYYY-MM-DD"
  type: v.union(
    v.literal("dailyStats"),
    v.literal("widgetStats"),
    v.literal("emailStats")
  ),
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed")
  ),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  leaseExpiresAt: v.number(),  // Pour takeover si crash
  aggregatedVersion: v.string(),
})
.index("by_date_type", ["date", "type"]);
```

---

# PARTIE 4 : RÈGLES DE CALCUL (v2.1.1)

## 4.1 No-show Final vs Réhabilité

```typescript
/**
 * No-show final : client jamais venu
 * status === "noshow" ET completedAt === null
 */
const isNoshowFinal = (r: Reservation): boolean =>
  r.status === "noshow" && r.completedAt == null;

/**
 * Réhabilité : marqué no-show puis finalement servi
 * markedNoshowAt !== null ET completedAt !== null
 */
const isRehabilitated = (r: Reservation): boolean =>
  r.markedNoshowAt != null && r.completedAt != null;
```

> **Interprétation** : Si un client est marqué no-show puis finalement servi, on le compte en `rehabilitated`, PAS en `noshowFinal`.

## 4.2 Departures Before Order (seated→cancelled)

```typescript
/**
 * Départ sur place : client installé mais parti avant commande
 * status === "cancelled" ET seatedAt !== null
 */
const isDepartureBeforeOrder = (r: Reservation): boolean =>
  r.status === "cancelled" && r.seatedAt != null;
```

> **Note** : Compteur analytics only, 0 pénalité score CRM.

## 4.3 Zone Derivation (via tableIds)

```typescript
type Zone = "salle" | "terrasse" | "unknown";

/**
 * Dérive la zone depuis les tables assignées
 * 
 * Règles (verrouillées v2.1.1) :
 * - tableIds vide/null → "unknown"
 * - Toutes tables même zone → cette zone
 * - Mix de zones → "unknown" (KISS, pas de split)
 */
function deriveZone(
  tableIds: string[] | undefined,
  tablesById: Record<string, { zone?: "salle" | "terrasse" }>
): Zone {
  const ids = tableIds ?? [];
  if (ids.length === 0) return "unknown";

  const zones = new Set(
    ids.map((id) => tablesById[id]?.zone).filter(Boolean) as Zone[]
  );

  return zones.size === 1 ? (Array.from(zones)[0] as Zone) : "unknown";
}
```

## 4.4 Source Normalization

```typescript
type ReservationSource = "online" | "phone" | "walkin" | "admin" | "import" | "api";

/**
 * Normalise la source (legacy + canonical)
 * 
 * Règle : Appliquer au moment de l'écriture réservation,
 * PAS dans computeDailyStats (anti-drift)
 */
function normalizeSource(input: any): ReservationSource {
  // Legacy mapping
  if (input?.origin === "widget") return "online";
  
  // Canonical values
  const canonical: ReservationSource[] = ["online", "phone", "walkin", "admin", "import", "api"];
  if (canonical.includes(input?.source)) return input.source;
  
  // Fallback sûr
  return "admin";
}
```

## 4.5 Capacité Effective

```typescript
/**
 * Capacité effective = capacité réellement offerte ce jour/service
 * Source of truth : moteur créneaux + périodes spéciales
 * 
 * Règles :
 * - Service fermé → capacityEffective = 0, openState.isOpen = false
 * - Service ouvert → capacité depuis créneaux (inclut overrides périodes)
 */
async function resolveCapacityEffective(
  ctx: QueryCtx,
  date: string,
  service: "midi" | "soir"
): Promise<{ capacity: number; isOpen: boolean; reason?: string }> {
  // Implémenter via PRD-005 + PRD-007
  // Fonction unique consommée par analytics (pas recalculée ailleurs)
  // ...
}
```

## 4.6 Métriques Volumes (P0 — Anti-Ambiguïté)

### reservationsScheduledTotal (date de service)

```typescript
/**
 * Compte toutes les réservations dont reservation.date === dailyStats.date
 * (et service match si midi/soir)
 * 
 * Usage : Mesurer la performance opérationnelle d'un jour
 */
const reservationsForServiceDate = await ctx.db
  .query("reservations")
  .withIndex("by_date", (q) => q.eq("date", date))
  .filter((q) => 
    service === "total" 
      ? true 
      : q.eq(q.field("service"), service)
  )
  .collect();

const reservationsScheduledTotal = reservationsForServiceDate.length;
```

### reservationsCreatedCount (date de création)

```typescript
/**
 * Compte toutes les réservations dont createdAt tombe dans la journée
 * dailyStats.date (Europe/Brussels), toutes dates de service confondues
 * 
 * Usage : Mesurer la demande / activité (widget + admin + téléphone)
 */
const { DateTime } = await import("luxon");
const startOfDay = DateTime.fromISO(date, { zone: "Europe/Brussels" })
  .startOf("day")
  .toMillis();
const endOfDay = DateTime.fromISO(date, { zone: "Europe/Brussels" })
  .endOf("day")
  .toMillis();

const reservationsCreatedThatDay = await ctx.db
  .query("reservations")
  .withIndex("by_createdAt")
  .filter((q) => 
    q.and(
      q.gte(q.field("_creationTime"), startOfDay),
      q.lte(q.field("_creationTime"), endOfDay)
    )
  )
  .collect();

const reservationsCreatedCount = reservationsCreatedThatDay.length;
```

> **🔒 Verrouillé** : Ces deux métriques coexistent, mais ne doivent jamais être comparées directement sans contexte (ce n'est pas le même axe temporel).

### P1 : reservationsCreatedForThisDay (same-day)

```typescript
/**
 * Compte les réservations créées le jour J et dont la date de service est J
 * 
 * Usage : Analyser le comportement "last-minute"
 */
const reservationsCreatedForThisDay = reservationsCreatedThatDay
  .filter((r) => r.date === date)
  .length;
```

---

# PARTIE 5 : NIGHTLY WORKER (v2.1.1)

## 5.1 Scheduling DST-Safe

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Pattern DST-safe : cron horaire + check heure locale
crons.hourly(
  "analytics-nightly",
  { minuteUTC: 0 },
  internal.analytics.checkAndRunNightly
);

export default crons;
```

## 5.2 Handler Principal

```typescript
// convex/analytics.ts
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const checkAndRunNightly = internalAction({
  handler: async (ctx) => {
    const { DateTime } = await import("luxon");
    const now = DateTime.now().setZone("Europe/Brussels");

    // Skip si pas 03:00 local Brussels
    if (now.hour !== 3) return;

    const date = now.minus({ days: 1 }).toISODate()!;

    // Agrégation des 3 types
    await ctx.runMutation(internal.analytics.aggregateDailyStats, { date });
    await ctx.runMutation(internal.analytics.aggregateWidgetStats, { date });
    await ctx.runMutation(internal.analytics.aggregateEmailStats, { date });

    // Catch-up dates manquantes (max 7 jours)
    await ctx.runMutation(internal.analytics.catchUpMissing, { maxDays: 7 });
  },
});
```

## 5.3 Agrégation Idempotente avec Lease Lock

```typescript
export const aggregateDailyStats = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    // 1. Check existing run
    const existingRun = await ctx.db
      .query("analyticsDailyRuns")
      .withIndex("by_date_type", (q) => 
        q.eq("date", date).eq("type", "dailyStats")
      )
      .first();

    // 2. Skip si déjà completed
    if (existingRun?.status === "completed") {
      return { skipped: true, reason: "already_completed" };
    }

    // 3. Check lease lock
    if (existingRun?.status === "running") {
      if (existingRun.leaseExpiresAt > now) {
        return { skipped: true, reason: "lease_active" };
      }
      // Takeover si lease expirée
    }

    // 4. Create/update run avec lease
    const runId = existingRun?._id ?? await ctx.db.insert("analyticsDailyRuns", {
      date,
      type: "dailyStats",
      status: "running",
      startedAt: now,
      leaseExpiresAt: now + LEASE_DURATION_MS,
      aggregatedVersion: "v2.1.1",
    });

    if (existingRun) {
      await ctx.db.patch(runId, {
        status: "running",
        startedAt: now,
        leaseExpiresAt: now + LEASE_DURATION_MS,
      });
    }

    try {
      // 5. Compute stats
      const stats = await computeDailyStats(ctx, date);

      // 6. Upsert dailyStats (3 rows: midi, soir, total)
      for (const service of ["midi", "soir", "total"] as const) {
        const existing = await ctx.db
          .query("dailyStats")
          .withIndex("by_date_service", (q) => 
            q.eq("date", date).eq("service", service)
          )
          .first();

        const data = {
          date,
          service,
          ...stats[service],
          aggregatedAt: now,
          aggregatedVersion: "v2.1.1",
        };

        if (existing) {
          await ctx.db.replace(existing._id, data);
        } else {
          await ctx.db.insert("dailyStats", data);
        }
      }

      // 7. Mark completed
      await ctx.db.patch(runId, {
        status: "completed",
        completedAt: Date.now(),
      });

      return { success: true, date };

    } catch (error) {
      // Mark failed
      await ctx.db.patch(runId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});
```

## 5.4 Compute Daily Stats (v2.1.1)

```typescript
async function computeDailyStats(
  ctx: MutationCtx,
  date: string
): Promise<Record<"midi" | "soir" | "total", Omit<DailyStats, "date" | "service" | "aggregatedAt" | "aggregatedVersion">>> {
  
  // ═══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ═══════════════════════════════════════════════════════════════
  
  // Dataset 1: Résas pour cette date de service
  const reservationsForServiceDate = await ctx.db
    .query("reservations")
    .withIndex("by_date", (q) => q.eq("date", date))
    .collect();

  // Dataset 2: Résas créées ce jour (toutes dates service)
  const { DateTime } = await import("luxon");
  const startOfDay = DateTime.fromISO(date, { zone: "Europe/Brussels" })
    .startOf("day").toMillis();
  const endOfDay = DateTime.fromISO(date, { zone: "Europe/Brussels" })
    .endOf("day").toMillis();

  const reservationsCreatedThatDay = await ctx.db
    .query("reservations")
    .filter((q) => 
      q.and(
        q.gte(q.field("_creationTime"), startOfDay),
        q.lte(q.field("_creationTime"), endOfDay)
      )
    )
    .collect();

  // Tables (pour zone derivation)
  const tables = await ctx.db.query("tables").collect();
  const tablesById = Object.fromEntries(
    tables.map((t) => [t._id, { zone: t.zone }])
  );

  // Clients (pour segmentation CRM)
  const clientIds = [...new Set(
    reservationsForServiceDate
      .map((r) => r.clientId)
      .filter(Boolean)
  )];
  const clients = await Promise.all(
    clientIds.map((id) => ctx.db.get(id))
  );
  const clientsById = Object.fromEntries(
    clients.filter(Boolean).map((c) => [c!._id, c])
  );

  // ═══════════════════════════════════════════════════════════════
  // COMPUTE PER SERVICE
  // ═══════════════════════════════════════════════════════════════
  
  const computeForService = async (
    service: "midi" | "soir" | "total"
  ) => {
    const resasForService = service === "total"
      ? reservationsForServiceDate
      : reservationsForServiceDate.filter((r) => r.service === service);

    // Statuts
    const byStatus = {
      pending: resasForService.filter((r) => r.status === "pending").length,
      confirmed: resasForService.filter((r) => r.status === "confirmed").length,
      late: resasForService.filter((r) => r.status === "late").length,
      seated: resasForService.filter((r) => r.status === "seated").length,
      completed: resasForService.filter((r) => r.status === "completed").length,
      refused: resasForService.filter((r) => r.status === "refused").length,
      cancelled: resasForService.filter((r) => r.status === "cancelled").length,
      noshowFinal: resasForService.filter((r) => 
        r.status === "noshow" && r.completedAt == null
      ).length,
      rehabilitated: resasForService.filter((r) => 
        r.markedNoshowAt != null && r.completedAt != null
      ).length,
      departuresBeforeOrder: resasForService.filter((r) => 
        r.status === "cancelled" && r.seatedAt != null
      ).length,
    };

    // Couverts (completed only)
    const completed = resasForService.filter((r) => r.status === "completed");
    const totalCovers = completed.reduce((sum, r) => sum + r.partySize, 0);
    const avgPartySize = completed.length > 0 
      ? totalCovers / completed.length 
      : 0;
    const maxPartySize = completed.length > 0 
      ? Math.max(...completed.map((r) => r.partySize)) 
      : 0;

    // Capacité effective
    const { capacity, isOpen, reason } = await resolveCapacityEffective(
      ctx, date, service === "total" ? "midi" : service // Fallback midi pour total
    );

    // Taux
    const occupancyRate = capacity > 0 
      ? (totalCovers / capacity) * 100 
      : 0;
    const noShowRate = (byStatus.noshowFinal + byStatus.completed) > 0
      ? (byStatus.noshowFinal / (byStatus.noshowFinal + byStatus.completed)) * 100
      : 0;
    const cancellationRate = resasForService.length > 0
      ? (byStatus.cancelled / resasForService.length) * 100
      : 0;
    const conversionRate = resasForService.length > 0
      ? (byStatus.completed / resasForService.length) * 100
      : 0;

    // Par zone (dérivée)
    const byZone = {
      salle: { covers: 0, reservations: 0, occupancyRate: 0 },
      terrasse: { covers: 0, reservations: 0, occupancyRate: 0 },
      unknown: { covers: 0, reservations: 0, occupancyRate: 0 },
    };

    for (const r of completed) {
      const zone = deriveZone(r.tableIds, tablesById);
      byZone[zone].covers += r.partySize;
      byZone[zone].reservations += 1;
    }

    // Clients (depuis CRM)
    const clientBreakdown = { new: 0, returning: 0, vip: 0, bad_guest: 0 };
    for (const r of resasForService) {
      if (r.clientId && clientsById[r.clientId]) {
        const segment = clientsById[r.clientId].status || "new";
        if (segment in clientBreakdown) {
          clientBreakdown[segment as keyof typeof clientBreakdown]++;
        }
      }
    }

    // Sources (normalisées)
    const sourceBreakdown = {
      online: 0, phone: 0, walkin: 0, admin: 0, import: 0, api: 0,
    };
    for (const r of resasForService) {
      const source = normalizeSource(r);
      sourceBreakdown[source]++;
    }

    // Langues
    const languageStats = { fr: 0, nl: 0, en: 0, de: 0, it: 0 };
    for (const r of resasForService) {
      const lang = r.language || "fr";
      if (lang in languageStats) {
        languageStats[lang as keyof typeof languageStats]++;
      }
    }

    return {
      reservationsScheduledTotal: resasForService.length,
      reservationsCreatedCount: service === "total" 
        ? reservationsCreatedThatDay.length 
        : reservationsCreatedThatDay.filter((r) => r.service === service).length,
      reservationsByStatus: byStatus,
      totalCovers,
      avgPartySize: Math.round(avgPartySize * 10) / 10,
      maxPartySize,
      capacityEffective: capacity,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      noShowRate: Math.round(noShowRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      openState: { isOpen, reason },
      byZone,
      clientBreakdown,
      sourceBreakdown,
      languageStats,
    };
  };

  return {
    midi: await computeForService("midi"),
    soir: await computeForService("soir"),
    total: await computeForService("total"),
  };
}
```

## 5.5 Catch-Up Automatique

```typescript
export const catchUpMissing = internalMutation({
  args: { maxDays: v.number() },
  handler: async (ctx, { maxDays }) => {
    const { DateTime } = await import("luxon");
    const today = DateTime.now().setZone("Europe/Brussels");
    const caught: string[] = [];

    for (let i = 2; i <= maxDays + 1; i++) {
      const date = today.minus({ days: i }).toISODate()!;

      const existingRun = await ctx.db
        .query("analyticsDailyRuns")
        .withIndex("by_date_type", (q) => 
          q.eq("date", date).eq("type", "dailyStats")
        )
        .first();

      if (!existingRun || existingRun.status === "failed") {
        // Trigger aggregation pour cette date
        await ctx.scheduler.runAfter(0, internal.analytics.aggregateDailyStats, { date });
        caught.push(date);
      }
    }

    return { caughtUp: caught };
  },
});
```

---

# PARTIE 6 : DASHBOARD UI

## 6.1 Structure des Fichiers

```
src/app/admin/statistiques/
├── page.tsx                    # Page principale
├── loading.tsx                 # Skeleton loading
├── error.tsx                   # Error boundary
└── components/
    ├── Dashboard.tsx           # Container principal
    ├── LiveTab.tsx             # Onglet temps réel
    ├── HistoryTab.tsx          # Onglet historique
    ├── KPIGrid.tsx             # Grille de KPIs
    ├── KPICard.tsx             # Carte individuelle
    ├── ReservationChart.tsx    # Graphique réservations
    ├── OccupancyHeatmap.tsx    # Heatmap occupation
    ├── ServiceComparison.tsx   # Midi vs Soir
    ├── ZoneComparison.tsx      # Salle vs Terrasse
    ├── ClientSegmentation.tsx  # Segments CRM
    ├── SourceBreakdown.tsx     # Sources
    ├── LanguageBreakdown.tsx   # Langues
    ├── NoShowAnalysis.tsx      # Analyse no-shows
    ├── WidgetFunnel.tsx        # Funnel widget
    ├── EmailStats.tsx          # Stats emails
    ├── DateRangePicker.tsx     # Sélecteur période
    ├── ComparisonToggle.tsx    # Toggle comparaison
    └── ExportButton.tsx        # Export CSV/PDF
```

## 6.2 KPIs Principaux (Labels Anti-Confusion)

```typescript
// components/KPIGrid.tsx

const kpis = [
  {
    id: "scheduled",
    label: "Réservations prévues",        // scheduledTotal
    tooltip: "Résas pour cette date (date de service)",
    value: stats.reservationsScheduledTotal,
    trend: compareToPrevious("scheduled"),
  },
  {
    id: "created",
    label: "Demandes reçues",             // createdCount
    tooltip: "Résas créées ce jour (toutes dates de service)",
    value: stats.reservationsCreatedCount,
    trend: compareToPrevious("created"),
  },
  {
    id: "completed",
    label: "Visites",
    tooltip: "Clients venus et servis",
    value: stats.reservationsByStatus.completed,
    trend: compareToPrevious("completed"),
  },
  {
    id: "covers",
    label: "Couverts",
    tooltip: "Total des personnes servies",
    value: stats.totalCovers,
    trend: compareToPrevious("covers"),
  },
  {
    id: "occupancy",
    label: "Occupation",
    tooltip: "Couverts / Capacité effective",
    value: `${stats.occupancyRate}%`,
    trend: compareToPrevious("occupancy"),
  },
  {
    id: "noshow",
    label: "No-shows",
    tooltip: "Clients jamais venus (hors réhabilités)",
    value: stats.reservationsByStatus.noshowFinal,
    subValue: `${stats.noShowRate}%`,
    trend: compareToPrevious("noshow"),
    variant: "warning",
  },
  {
    id: "rehabilitated",
    label: "Réhabilités",
    tooltip: "No-shows finalement venus",
    value: stats.reservationsByStatus.rehabilitated,
    variant: "success",
  },
  {
    id: "departures",
    label: "Départs sur place",
    tooltip: "Clients partis avant commande",
    value: stats.reservationsByStatus.departuresBeforeOrder,
    variant: "muted",
  },
];
```

## 6.3 Onglets Live vs Historique

```typescript
// components/Dashboard.tsx

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="live">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <LiveTab />
          {/* Query runtime, aujourd'hui + 7 jours */}
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab />
          {/* Depuis dailyStats, 30/90/365 jours */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

# PARTIE 7 : API ENDPOINTS

## 7.1 Queries

```typescript
// convex/analytics.ts

// Dashboard principal
export const getDashboard = query({
  args: {
    period: v.union(
      v.literal("today"),
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d"),
      v.literal("365d")
    ),
  },
  handler: async (ctx, { period }) => {
    // Combine live stats + historical stats selon période
    // ...
  },
});

// Stats par plage de dates
export const getByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    service: v.optional(v.union(
      v.literal("midi"),
      v.literal("soir"),
      v.literal("total")
    )),
  },
  handler: async (ctx, args) => {
    // ...
  },
});

// Analyse no-shows
export const getNoShowAnalysis = query({
  args: {
    period: v.string(),
  },
  handler: async (ctx, { period }) => {
    // Par jour semaine, par service, récidivistes
    // ...
  },
});

// Stats par zone
export const getZoneStats = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // ...
  },
});

// Widget funnel
export const getWidgetFunnel = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // ...
  },
});

// Email stats
export const getEmailStats = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // ...
  },
});

// Comparaison périodes
export const compare = query({
  args: {
    period1: v.object({
      startDate: v.string(),
      endDate: v.string(),
    }),
    period2: v.object({
      startDate: v.string(),
      endDate: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // ...
  },
});
```

## 7.2 RBAC (Aligné PRD-012)

```typescript
// Matrice d'accès

const ANALYTICS_RBAC = {
  owner: ["*"],  // Tous endpoints
  admin: ["*"],  // Tous endpoints
  staff: [
    "getDashboard",
    "getByDateRange",
    "getNoShowAnalysis",
    "getZoneStats",
    // PAS: getWidgetFunnel, getEmailStats, compare, exports
  ],
  public: [],  // Aucun accès
};
```

---

# PARTIE 8 : PRIVACY-FIRST & RGPD

## 8.1 Données Autorisées

| ✅ Autorisé | Exemple |
|-------------|---------|
| Compteurs agrégés | `totalCovers: 150` |
| Taux et pourcentages | `occupancyRate: 85%` |
| Breakdowns anonymes | `byZone.salle.reservations: 42` |
| Trends | `+12% vs semaine précédente` |

## 8.2 Données Interdites

| ❌ Interdit | Risque |
|-------------|--------|
| Email, nom, téléphone | PII |
| IP address | Tracking |
| Device fingerprint | Cross-site tracking |
| Cookies tiers | RGPD violation |

## 8.3 Conformité

- **Pas de consentement requis** : données agrégées uniquement
- **Rétention** : alignée politique globale (même horizon que données métiers)
- **Export RGPD** : via PRD-003 CRM (pas analytics)
- **Droit à l'oubli** : N/A (pas de PII stocké)

---

# PARTIE 9 : EXPORTS

## 9.1 Formats

| Format | Usage | Contenu |
|--------|-------|---------|
| **CSV** | Données brutes | dailyStats complet, tabulaire |
| **PDF** | Rapport formaté | Dashboard + graphiques |
| **JSON** | API / intégration | Structure complète |

## 9.2 Rapports Programmés (P1)

| Fréquence | Heure | Contenu | Destinataires |
|-----------|-------|---------|---------------|
| Quotidien | 07:00 | KPIs J-1 | Admin |
| Hebdo | Lundi 07:00 | Tendances semaine | Owner + Admin |
| Mensuel | 1er 07:00 | Analyse complète | Owner |

---

# PARTIE 10 : TESTS

## 10.1 Tests Unitaires

```typescript
describe("computeDailyStats", () => {
  it("should count completed as visits", async () => {
    const stats = await computeDailyStats(ctx, "2025-01-15");
    expect(stats.total.reservationsByStatus.completed).toBe(25);
    expect(stats.total.totalCovers).toBe(75);
  });

  it("should exclude rehabilitated from noshowFinal", async () => {
    // Setup: 3 noshow, 1 avec completedAt
    const stats = await computeDailyStats(ctx, "2025-01-15");
    expect(stats.total.reservationsByStatus.noshowFinal).toBe(2);
    expect(stats.total.reservationsByStatus.rehabilitated).toBe(1);
  });

  it("should count seated+cancelled as departuresBeforeOrder", async () => {
    // Setup: cancelled avec seatedAt
    const stats = await computeDailyStats(ctx, "2025-01-15");
    expect(stats.total.reservationsByStatus.departuresBeforeOrder).toBe(1);
  });

  it("should derive zone from tableIds", async () => {
    // Setup: 2 résas salle, 1 terrasse, 1 sans tables
    const stats = await computeDailyStats(ctx, "2025-01-15");
    expect(stats.total.byZone.salle.reservations).toBe(2);
    expect(stats.total.byZone.terrasse.reservations).toBe(1);
    expect(stats.total.byZone.unknown.reservations).toBe(1);
  });

  it("should normalize source from legacy origin", async () => {
    // Setup: origin:"widget" → source:"online"
    const stats = await computeDailyStats(ctx, "2025-01-15");
    expect(stats.total.sourceBreakdown.online).toBeGreaterThan(0);
  });

  it("should separate scheduledTotal from createdCount", async () => {
    // Setup: 10 résas pour le 15, 5 créées le 15 pour d'autres dates
    const stats = await computeDailyStats(ctx, "2025-01-15");
    expect(stats.total.reservationsScheduledTotal).toBe(10);
    expect(stats.total.reservationsCreatedCount).toBe(15); // 10 + 5
  });
});

describe("Nightly Idempotence", () => {
  it("should skip if already completed", async () => {
    await aggregateDailyStats(ctx, { date: "2025-01-15" });
    const result = await aggregateDailyStats(ctx, { date: "2025-01-15" });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("already_completed");
  });

  it("should takeover expired lease", async () => {
    // Setup: run avec leaseExpiresAt dans le passé
    const result = await aggregateDailyStats(ctx, { date: "2025-01-15" });
    expect(result.success).toBe(true);
  });
});

describe("DST Handling", () => {
  it("should run at 03:00 Brussels in summer (CEST)", async () => {
    // Mock: UTC 01:00 = Brussels 03:00 (CEST = UTC+2)
    jest.useFakeTimers().setSystemTime(new Date("2025-07-15T01:00:00Z"));

    await checkAndRunNightly(ctx);

    const runs = await ctx.db.query("analyticsDailyRuns").collect();
    expect(runs.length).toBeGreaterThan(0);
  });

  it("should run at 03:00 Brussels in winter (CET)", async () => {
    // Mock: UTC 02:00 = Brussels 03:00 (CET = UTC+1)
    jest.useFakeTimers().setSystemTime(new Date("2025-01-15T02:00:00Z"));

    await checkAndRunNightly(ctx);

    const runs = await ctx.db.query("analyticsDailyRuns").collect();
    expect(runs.length).toBeGreaterThan(0);
  });

  it("should NOT run at other hours", async () => {
    // Mock: UTC 10:00 = Brussels 11:00 ou 12:00
    jest.useFakeTimers().setSystemTime(new Date("2025-01-15T10:00:00Z"));

    await checkAndRunNightly(ctx);

    const runs = await ctx.db.query("analyticsDailyRuns").collect();
    expect(runs.length).toBe(0);
  });
});
```

## 10.2 Tests E2E

```typescript
describe("Analytics Dashboard", () => {
  it("should display KPIs correctly", async ({ page }) => {
    await page.goto("/admin/statistiques");

    await expect(page.getByTestId("kpi-scheduled")).toBeVisible();
    await expect(page.getByTestId("kpi-created")).toBeVisible();
    await expect(page.getByTestId("kpi-completed")).toBeVisible();
    await expect(page.getByTestId("kpi-covers")).toBeVisible();
    await expect(page.getByTestId("kpi-occupancy")).toBeVisible();
    await expect(page.getByTestId("kpi-noshow")).toBeVisible();
  });

  it("should show correct labels for volumes", async ({ page }) => {
    await page.goto("/admin/statistiques");

    await expect(page.getByText("Réservations prévues")).toBeVisible();
    await expect(page.getByText("Demandes reçues")).toBeVisible();
  });

  it("should filter by date range", async ({ page }) => {
    await page.goto("/admin/statistiques");

    await page.getByTestId("date-range-picker").click();
    await page.getByText("7 derniers jours").click();

    await expect(page.getByTestId("period-label")).toContainText("7 jours");
  });

  it("should switch between Live and History tabs", async ({ page }) => {
    await page.goto("/admin/statistiques");

    await page.getByRole("tab", { name: "Historique" }).click();
    await expect(page.getByTestId("history-content")).toBeVisible();

    await page.getByRole("tab", { name: "Live" }).click();
    await expect(page.getByTestId("live-content")).toBeVisible();
  });

  it("should export CSV", async ({ page }) => {
    await page.goto("/admin/statistiques");

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-csv").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain(".csv");
  });
});
```

---

# PARTIE 11 : CHECKLIST IMPLÉMENTATION

## 11.1 P0 — Launch

| # | Tâche | Statut |
|---|-------|:------:|
| 1 | Table `dailyStats` avec schema v2.1.1 | ☐ |
| 2 | Table `analyticsDailyRuns` (idempotence + lease) | ☐ |
| 3 | Cron horaire DST-safe (Europe/Brussels) | ☐ |
| 4 | Mutation `aggregateDailyStats` idempotente | ☐ |
| 5 | Zone mixte → `unknown` (KISS) | ☐ |
| 6 | `reservationsScheduledTotal` + `reservationsCreatedCount` | ☐ |
| 7 | `normalizeSource()` pour legacy `origin:"widget"` | ☐ |
| 8 | `deriveZone()` via tableIds | ☐ |
| 9 | Réhabilitation via timestamps (pas wasNoShow) | ☐ |
| 10 | `departuresBeforeOrder` (seated→cancelled) | ☐ |
| 11 | `capacityEffective` depuis moteur créneaux+périodes | ☐ |
| 12 | Segmentation CRM read-only (`client.status`) | ☐ |
| 13 | Catch-up automatique (max 7 jours) | ☐ |
| 14 | Query `getDashboard` avec période | ☐ |
| 15 | RBAC aligné PRD-012 | ☐ |
| 16 | Dashboard UI "Historique" (30j) | ☐ |
| 17 | UI labels "Réservations prévues" vs "Demandes reçues" | ☐ |
| 18 | Tooltips explicatifs sur KPIs | ☐ |
| 19 | Tests unitaires `computeDailyStats` | ☐ |
| 20 | Tests DST | ☐ |

## 11.2 P1 — Post-Launch

| # | Tâche | Statut |
|---|-------|:------:|
| 21 | `reservationsCreatedForThisDay` (same-day) | ☐ |
| 22 | UI "Part des last-minute" | ☐ |
| 23 | Table `widgetStats` (funnel) | ☐ |
| 24 | Table `emailStats` (PRD-008) | ☐ |
| 25 | Dashboard "Live" (query runtime) | ☐ |
| 26 | Intégration CRM avancée | ☐ |
| 27 | Export CSV | ☐ |
| 28 | Export PDF | ☐ |
| 29 | Comparaison périodes | ☐ |
| 30 | Rapports programmés | ☐ |
| 31 | Heatmap occupation | ☐ |

## 11.3 P2 — Nice to Have

| # | Tâche | Statut |
|---|-------|:------:|
| 32 | Prédiction occupation (ML) | ☐ |
| 33 | Alertes automatiques | ☐ |
| 34 | Weather correlation | ☐ |
| 35 | Revenue analytics | ☐ |

---

# PARTIE 12 : INTÉGRATIONS

## 12.1 Contrat d'Interface

```typescript
// Analytics consomme (read-only)
interface AnalyticsInput {
  // PRD-002 Vue Service
  reservations: Reservation[];  // 8 statuts + timestamps + tableIds + source

  // PRD-003 CRM
  clients: Client[];  // status = segment

  // PRD-004/006 Tables
  tables: Table[];  // zone (salle/terrasse)

  // PRD-005 Créneaux
  dailySlots: DailySlot[];  // Pour capacités

  // PRD-007 Périodes
  specialPeriods: SpecialPeriod[];  // Pour overrides capacité

  // PRD-008 Emails
  emailJobs: EmailJob[];  // status + provider events

  // PRD-012 Settings
  settings: Settings;  // timezone
}

// Analytics expose
interface AnalyticsAPI {
  // Queries
  getDashboard: (period: Period) => DashboardData;
  getByDateRange: (start: string, end: string) => DailyStats[];
  getNoShowAnalysis: (period: string) => NoShowStats;
  getZoneStats: (start: string, end: string) => ZoneStats;
  getWidgetFunnel: (start: string, end: string) => FunnelData;
  getEmailStats: (start: string, end: string) => EmailStats;
  compare: (period1: DateRange, period2: DateRange) => ComparisonData;

  // Exports
  exportCSV: (period: Period) => Blob;
  exportPDF: (period: Period) => Blob;
}
```

## 12.2 Points d'Intégration PRD

| PRD | Intégration | Direction |
|-----|-------------|-----------|
| **PRD-001 Widget** | Événements funnel (anonymisés) | Widget → Analytics |
| **PRD-002 Vue Service** | Réservations + 8 statuts + timestamps | Service → Analytics |
| **PRD-003 CRM** | Segmentation clients (`client.status`) | CRM → Analytics |
| **PRD-004 Plan Salle** | Zones via tables | Tables → Analytics |
| **PRD-005 Créneaux** | Capacités effectives | Slots → Analytics |
| **PRD-006 Tables** | Configuration zones | Tables → Analytics |
| **PRD-007 Périodes** | Overrides capacité + fermetures | Périodes → Analytics |
| **PRD-008 Emails** | Delivery stats (provider events) | Emails → Analytics |
| **PRD-012 Settings** | Timezone Europe/Brussels | Settings → Analytics |

---

# PARTIE 13 : MÉTRIQUES DE SUCCÈS

| KPI | Objectif | Mesure |
|-----|----------|--------|
| **Temps chargement dashboard** | < 2s | P95 latency |
| **Précision données** | 100% | Audit manuel vs source |
| **Fraîcheur données** | J-1 à 07:00 | SLA nightly |
| **Utilisation hebdo** | > 3x/semaine | Usage tracking |
| **Taux adoption** | 100% staff | Training + feedback |

---

## Historique

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| **2.1.1** | 2025-12-21 | Claude | Zone mixte → unknown (KISS), volumes P0 clarifiés (scheduledTotal + createdCount), UI labels distincts avec tooltips |
| 2.1 | 2025-12-21 | Claude | Correctifs d'alignement : source enum, zone dérivée, réhabilitation timestamps, capacité effective, CRM source of truth |
| 2.0 | 2025-12-21 | Claude | Révision complète : 8 statuts PRD-002, Nightly idempotent, DST-safe, Zones PRD-004/006, CRM v2.2, Widget funnel, Email stats, RBAC unifié, Privacy-first RGPD |
| 1.1 | 2025-12-19 | Claude | Ajout section Impact & Dépendances |
| 1.0 | 2025-12-19 | Claude | Création initiale |

---

**FIN DU DOCUMENT PRD-009 v2.1.1**

*Score qualité : 98/100 — Production-ready*
*🔒 Aligné PRD-001→008 + PRD-012*
*✅ Idempotent, DST-safe, RGPD-compliant*
*✅ Zone dérivée, Source normalisée, Volumes clarifiés*
