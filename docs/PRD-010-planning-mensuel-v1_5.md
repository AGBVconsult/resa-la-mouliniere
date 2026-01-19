# PRD-010 : Planning Mensuel

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-010 |
| **Titre** | Calendrier Planning - Vue Mensuelle |
| **Statut** | 🔧 Alignement en cours (3 fixes requis) |
| **Priorité** | P1 - Haute |
| **Version** | 1.5 |
| **Date création** | 2025-12-19 |
| **Dernière MAJ** | 2025-12-22 |
| **Responsable** | AGBVconsult |
| **Score Qualité** | 92/100 → 98/100 après fixes |

---

## Changelog

| Version | Date | Changements |
|---------|------|-------------|
| **1.5** | 2025-12-22 | Consolidation des 3 fixes avec spécifications complètes, correction encodage |
| 1.4 | 2025-12-22 | 3 fixes alignement : (1) cascade server-side `getMonthEffective`, (2) timezone Luxon Brussels, (3) libellé `👥 x/y` couverts |
| 1.3 | 2025-12-22 | Alignement UI implémentée : labels "Déj/Dîn", format "R x/y", données simples |
| 1.2 | 2025-12-22 | Décisions occupancy (2 métriques), late (P1 analytics) |
| 1.1 | 2025-12-21 | Corrections timezone, cascade, capacityEffective |
| 1.0 | 2025-12-19 | Création initiale |

---

## Statut de Validation

```
┌─────────────────────────────────────────────────────────────────┐
│  STATUT VALIDATION v1.5                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ P0 UI implémenté et exploitable                            │
│                                                                 │
│  ❌ Production-ready aligné patterns — 3 FIXES REQUIS :        │
│                                                                 │
│  [ ] Fix 1 — Cascade PERIOD server-side (getMonthEffective)    │
│  [ ] Fix 2 — Timezone Brussels canonique (Luxon)               │
│  [ ] Fix 3 — Libellé compteur 👥 couverts (PRD)                │
│                                                                 │
│  Une fois les 3 fixes appliqués → Production-ready 98/100      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Décisions Verrouillées (v1.5)

```
┌─────────────────────────────────────────────────────────────────┐
│  DÉCISIONS VERROUILLÉES v1.5                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  P0 — IMPLÉMENTÉ                                               │
│  ─────────────────                                              │
│  Q1 — Labels services : "Déj" / "Dîn" (texte)                  │
│  Q2 — Format compteur : "👥 x/y" (couverts/capacité)           │
│  Q3 — Grille : 7 colonnes Lun-Dim                              │
│  Q4 — Navigation : chevrons + "Aujourd'hui"                    │
│  Q5 — Override : modal par jour avec toggles créneaux          │
│  Q6 — État fermé : "Fermé" si 2 services fermés                │
│                                                                 │
│  FIXES REQUIS (pour Production-ready)                          │
│  ────────────────────────────────────                          │
│  F1 — Cascade server-side : MANUAL > PERIOD > TEMPLATE         │
│  F2 — Timezone : Luxon Brussels authoritative                  │
│  F3 — Libellé : 👥 = couverts (pas "réservations")             │
│                                                                 │
│  P1 — FUTUR                                                    │
│  ────────────                                                   │
│  Q7 — Pending distinct : breakdown confirmed/pending           │
│  Q8 — 2 métriques occupation : rate + potential                │
│  Q9 — Notes jour : dayNotes table                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# PARTIE 1 : VISION & SCOPE

## 1.1 Objectif

Fournir une vue calendrier mensuelle permettant de visualiser d'un coup d'œil les réservations, la capacité restante, les fermetures et événements spéciaux pour chaque jour.

## 1.2 Problème Résolu

| Problème | Solution |
|----------|----------|
| Pas de vision d'ensemble | Calendrier mensuel |
| Planification difficile | Vue capacité par jour |
| Fermetures mal identifiées | Marquage visuel "Fermé" |
| Navigation temporelle lente | Mois rapide avec "Aujourd'hui" |
| Override créneaux | Modal par jour avec toggles |

## 1.3 Utilisateurs Cibles

| Utilisateur | Rôle | Actions |
|-------------|------|---------|
| **Owner** | Propriétaire | Vue complète + overrides |
| **Admin** | Gestionnaire | Vue complète + overrides |
| **Staff** | Personnel service | Vue complète (lecture) |

---

# PARTIE 2 : 3 FIXES REQUIS

## 2.1 Fix 1 — Cascade Server-Side (CRITIQUE)

### Problème Actuel

Le client fait actuellement la cascade Template → Manual, mais **PERIOD est ignoré** :

```typescript
// ❌ Client fait la cascade (incomplet)
// Template → Manual (PERIOD manquant !)

let midiClosed = closedDaysData?.closedDays?.midi.includes(dayOfWeek);
const override = closedDaysData?.dailyOverrides?.[dateStr];
if (override?.midi !== undefined) {
  midiClosed = !override.midi;
}
// ⚠️ PERIOD (specialPeriods / dailySlots origin="period") ignoré !
```

### Solution : `planning.getMonthEffective`

Créer une query Convex qui résout la cascade **MANUAL > PERIOD > TEMPLATE** côté serveur :

```typescript
// convex/planning.ts

import { query } from "./_generated/server";
import { v } from "convex/values";
import { DateTime } from "luxon";

// ═══════════════════════════════════════════════════════════════
// QUERY : Vue mensuelle effective (cascade résolue server-side)
// ═══════════════════════════════════════════════════════════════
export const getMonthEffective = query({
  args: { 
    year: v.number(), 
    month: v.number() 
  },
  handler: async (ctx, { year, month }) => {
    // Récupérer timezone depuis settings (PRD-012)
    const settings = await ctx.db.query("settings").first();
    const timezone = settings?.timezone ?? "Europe/Brussels";
    
    // Calculer range du mois
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = DateTime.fromISO(startDate, { zone: timezone })
      .endOf("month")
      .toISODate()!;
    
    // Fetch toutes les sources en parallèle
    const [reservations, dailySlots, weeklyTemplates] = await Promise.all([
      // Réservations avec statuts actifs
      ctx.db.query("reservations")
        .withIndex("by_date", q => q.gte("date", startDate).lte("date", endDate))
        .collect()
        .then(rows => rows.filter(r => 
          ["pending", "confirmed", "late", "seated", "completed"].includes(r.status)
        )),
      
      // Tous les dailySlots (manual + period)
      ctx.db.query("dailySlots")
        .withIndex("by_date", q => q.gte("date", startDate).lte("date", endDate))
        .collect(),
      
      // Templates hebdomadaires
      ctx.db.query("weeklyTemplates").collect(),
    ]);
    
    // Construire résultat par date
    const result: Record<string, {
      midi: ServiceEffective;
      soir: ServiceEffective;
    }> = {};
    
    // Itérer sur chaque jour du mois
    let current = DateTime.fromISO(startDate, { zone: timezone });
    const end = DateTime.fromISO(endDate, { zone: timezone });
    
    while (current <= end) {
      const dateStr = current.toISODate()!;
      const dayOfWeek = current.weekday; // 1=Monday, 7=Sunday (ISO)
      
      result[dateStr] = {
        midi: resolveServiceEffective(
          dateStr, "midi", dayOfWeek,
          dailySlots, weeklyTemplates, reservations
        ),
        soir: resolveServiceEffective(
          dateStr, "soir", dayOfWeek,
          dailySlots, weeklyTemplates, reservations
        ),
      };
      
      current = current.plus({ days: 1 });
    }
    
    return result;
  },
});

// ═══════════════════════════════════════════════════════════════
// HELPER : Résoudre effective pour un service
// Cascade : MANUAL > PERIOD > TEMPLATE (PRD-007)
// ═══════════════════════════════════════════════════════════════
interface ServiceEffective {
  isOpen: boolean;
  capacityEffective: number;
  covers: number;
  source: "manual" | "period" | "template";
}

function resolveServiceEffective(
  dateStr: string,
  service: "midi" | "soir",
  dayOfWeek: number,
  dailySlots: DailySlot[],
  weeklyTemplates: WeeklyTemplate[],
  reservations: Reservation[]
): ServiceEffective {
  
  // 1. Chercher MANUAL override (priorité max)
  const manualSlot = dailySlots.find(
    s => s.date === dateStr && s.service === service && s.origin === "manual"
  );
  
  if (manualSlot) {
    return {
      isOpen: manualSlot.isOpen,
      capacityEffective: manualSlot.capacityOverride ?? getTemplateCapacity(dayOfWeek, service, weeklyTemplates),
      covers: sumCovers(dateStr, service, reservations),
      source: "manual",
    };
  }
  
  // 2. Chercher PERIOD override
  const periodSlot = dailySlots.find(
    s => s.date === dateStr && s.service === service && s.origin === "period"
  );
  
  if (periodSlot) {
    return {
      isOpen: periodSlot.isOpen,
      capacityEffective: periodSlot.capacityOverride ?? getTemplateCapacity(dayOfWeek, service, weeklyTemplates),
      covers: sumCovers(dateStr, service, reservations),
      source: "period",
    };
  }
  
  // 3. Fallback TEMPLATE
  const template = weeklyTemplates.find(
    t => t.dayOfWeek === dayOfWeek && t.service === service
  );
  
  return {
    isOpen: template?.isOpen ?? false,
    capacityEffective: template?.defaultCapacity ?? 0,
    covers: sumCovers(dateStr, service, reservations),
    source: "template",
  };
}

function getTemplateCapacity(
  dayOfWeek: number,
  service: "midi" | "soir",
  templates: WeeklyTemplate[]
): number {
  const template = templates.find(
    t => t.dayOfWeek === dayOfWeek && t.service === service
  );
  return template?.defaultCapacity ?? 0;
}

function sumCovers(
  dateStr: string,
  service: "midi" | "soir",
  reservations: Reservation[]
): number {
  return reservations
    .filter(r => r.date === dateStr && r.service === service)
    .reduce((sum, r) => sum + r.partySize, 0);
}
```

### Règles d'Implémentation Fix 1

| Aspect | Règle | Source |
|--------|-------|--------|
| **Timezone** | `settings.timezone` (défaut `Europe/Brussels`) | PRD-012 |
| **Périodes** | Lire `dailySlots origin="period"` (pas de réinvention) | PRD-007 |
| **Index** | `by_date` (pas `by_date_range`) | PRD-007 |
| **Statuts inclus** | pending, confirmed, late, seated, completed | PRD-002 |
| **Statuts exclus** | cancelled, refused | PRD-002 |
| **Noshow réhabilité** | `markedNoshowAt != null && completedAt != null` → compté dans covers | PRD-009 |

### Client Simplifié (post-Fix 1)

```typescript
// page.tsx — APRÈS migration

const monthData = useQuery(api.planning.getMonthEffective, { year, month });

// Plus de cascade client ! Juste affichage :
const getServiceData = (day: number) => {
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const dayData = monthData?.[dateStr];
  
  if (!dayData) {
    return { lunch: null, dinner: null, isClosed: true, isLoading: true };
  }
  
  return {
    lunch: { 
      current: dayData.midi.covers, 
      max: dayData.midi.capacityEffective, 
      closed: !dayData.midi.isOpen 
    },
    dinner: { 
      current: dayData.soir.covers, 
      max: dayData.soir.capacityEffective, 
      closed: !dayData.soir.isOpen 
    },
    isClosed: !dayData.midi.isOpen && !dayData.soir.isOpen,
    isLoading: false,
  };
};
```

### Cleanup Post-Migration

```typescript
// ❌ À SUPPRIMER après migration :
// - getMonthStats
// - getClosedDays  
// - DEFAULT_CAPACITY constant
// - Logique cascade dans getServiceData()
```

**Effort estimé** : ~2h

---

## 2.2 Fix 2 — Timezone Brussels Canonique

### Problème Actuel

Le code dépend du timezone navigateur :

```typescript
// ❌ Dépend du timezone navigateur
const now = new Date();
setCurrentDate(now);
setTodayDate(now);
```

### Solution : Luxon Brussels Authoritative

```typescript
// page.tsx — CORRIGÉ

import { DateTime } from "luxon";

const TIMEZONE = "Europe/Brussels"; // ou depuis settings

// Valeurs initiales stables pour SSR
const [currentDate, setCurrentDate] = useState<DateTime | null>(null);
const [todayDate, setTodayDate] = useState<DateTime | null>(null);
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  // Initialiser avec timezone Brussels (pas navigateur)
  const nowBrussels = DateTime.now().setZone(TIMEZONE);
  setCurrentDate(nowBrussels.startOf("month"));
  setTodayDate(nowBrussels.startOf("day"));
  setIsClient(true);
}, []);

// Navigation
const goToPreviousMonth = () => {
  if (currentDate) {
    setCurrentDate(currentDate.minus({ months: 1 }));
  }
};

const goToNextMonth = () => {
  if (currentDate) {
    setCurrentDate(currentDate.plus({ months: 1 }));
  }
};

const goToToday = () => {
  const nowBrussels = DateTime.now().setZone(TIMEZONE);
  setCurrentDate(nowBrussels.startOf("month"));
};

// Extraire year/month pour la query
const year = currentDate?.year ?? 2025;
const month = currentDate?.month ?? 1;

// Vérifier si un jour est "aujourd'hui"
const isToday = (day: number): boolean => {
  if (!todayDate || !currentDate) return false;
  return (
    day === todayDate.day &&
    currentDate.month === todayDate.month &&
    currentDate.year === todayDate.year
  );
};

// Formater le label du mois
const currentMonthLabel = currentDate
  ? currentDate.setLocale("fr").toFormat("MMMM yyyy")
  : "";
```

### Avantage

- Un utilisateur hors Belgique (ou device mal configuré) verra toujours le calendrier aligné sur Brussels
- Le bouton "Aujourd'hui" pointe vers le jour Brussels, pas le jour local
- Cohérent avec PRD-012 (`settings.timezone`)

**Effort estimé** : ~30min

---

## 2.3 Fix 3 — Libellé Compteur

### Problème Actuel

```
PRD v1.3 : "R x/y (réservations/capacité)"
UI réelle : 👥 x/y (icône personne)

→ Confusion : "R" suggère "réservations" mais x = couverts
```

### Solution : Clarifier le PRD

```
AVANT (ambigu) :
  R x/y = réservations / capacité

APRÈS (clair) :
  👥 x/y = couverts réservés / capacité (par service)
  
  👥 = icône personne (couverts)
  x  = somme des partySize (statuts actifs)
  y  = capacityEffective du service
```

### Exemple UI

```
┌─────────────────────┐
│  20              ⚙️ │
│  Déj ████▒▒  👥14/24│
│  Dîn ██▒▒▒▒  👥 8/24│
└─────────────────────┘

14 couverts réservés sur 24 de capacité (midi)
 8 couverts réservés sur 24 de capacité (soir)
```

**Effort estimé** : ~5min

---

# PARTIE 3 : SPÉCIFICATIONS UI

## 3.1 Vue Calendrier Mensuel

```
┌─────────────────────────────────────────────────────────────────┐
│  décembre 2025                          [<] Aujourd'hui [>]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     Lun       Mar       Mer       Jeu       Ven       Sam   Dim│
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│  │    1    │    2    │    3    │    4    │    5 ⚙️ │    6 ⚙️ │    7 ⚙️ │
│  │         │         │         │         │ Déj ▓▓▒ │ Déj ███ │ Déj ███ │
│  │  Fermé  │  Fermé  │  Fermé  │  Fermé  │ Dîn ▓▒▒ │ Dîn ▓▓▒ │ Dîn ▓▓▒ │
│  │         │         │         │         │👥 0/24  │👥 0/24  │👥 0/24  │
│  ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│  │   20 ⚙️ │   21 ⚙️ │   27 ⚙️ │   28 ⚙️ │         │         │         │
│  │ Déj ███ │ Déj ███ │ Déj ███ │ Déj ▒▒▒ │         │         │         │
│  │ Dîn ███ │ Dîn ▓▓▒ │ Dîn ███ │ Dîn ▒▒▒ │         │         │         │
│  │👥14/24  │👥 6/24  │👥 8/16  │👥 0/24  │         │         │         │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3.2 Éléments par Cellule Jour

| Élément | Description | Exemple |
|---------|-------------|---------|
| **Numéro jour** | Date du mois | `20` |
| **Icône settings** | ⚙️ Roue crantée | Ouvre modal |
| **Label Déj** | Service midi | `Déj` |
| **Label Dîn** | Service soir | `Dîn` |
| **Barre Déj** | Jauge occupation midi | `███▒▒` |
| **Barre Dîn** | Jauge occupation soir | `██▒▒▒` |
| **Compteur Déj** | 👥 couverts/capacité midi | `👥14/24` |
| **Compteur Dîn** | 👥 couverts/capacité soir | `👥 8/24` |
| **Fermé** | Si 2 services fermés | `Fermé` |

### Structure Cellule Jour

```
┌─────────────────────────┐
│  20                  ⚙️ │  ← Numéro jour + icône settings
│  Déj ████▒▒    👥14/24 │  ← Service midi : barre + compteur
│  Dîn ██▒▒▒▒    👥 8/24 │  ← Service soir : barre + compteur
└─────────────────────────┘
```

> **Note** : Chaque service a sa propre barre d'occupation et son propre compteur.

## 3.3 Format du Compteur (Corrigé v1.5)

```
👥 x/y

👥   = Icône personne (couverts)
x    = Couverts réservés (sum partySize, statuts actifs)
y    = Capacité effective du service
```

**Statuts comptés** : pending, confirmed, late, seated, completed
**Statuts exclus** : cancelled, refused, noshow (sauf réhabilité)

---

# PARTIE 4 : MODAL OVERRIDE JOUR

## 4.1 Hiérarchie des Toggles (3 Niveaux)

```
┌─────────────────────────────────────────────────────────────────┐
│  HIÉRARCHIE DES TOGGLES                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Niveau 1 : JOUR COMPLET                                       │
│  └── Toggle unique : Ouvre/Ferme les 2 services                │
│                                                                 │
│  Niveau 2 : SERVICE (Déjeuner / Dîner)                         │
│  └── Toggle par service : Ouvre/Ferme tous les créneaux        │
│                                                                 │
│  Niveau 3 : CRÉNEAU                                            │
│  └── Toggle par créneau : Active/Désactive individuellement    │
│      + Bouton (+) pour ajouter un créneau                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Wireframe Détaillé

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Samedi 20 Décembre 2025                                            ✕  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Jour complet                                        [●─────]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │                               │  │                               │  │
│  │  Déjeuner          [●─────]  │  │  Dîner             [●─────]   │  │
│  │                               │  │                               │  │
│  │  Créneaux horaires       (+) │  │  Créneaux horaires        (+) │  │
│  │  ─────────────────────────── │  │  ───────────────────────────  │  │
│  │                               │  │                               │  │
│  │  ┌─────────────────────────┐ │  │  ┌─────────────────────────┐  │  │
│  │  │ 🕐 12:00   👥 [8]  [●] │ │  │  │ 🕐 18:00   👥 [8]  [●] │  │  │
│  │  └─────────────────────────┘ │  │  └─────────────────────────┘  │  │
│  │                               │  │                               │  │
│  │  ┌─────────────────────────┐ │  │  ┌─────────────────────────┐  │  │
│  │  │ 🕐 12:15   👥 [8]  [○] │ │  │  │ 🕐 18:15   👥 [8]  [○] │  │  │
│  │  └─────────────────────────┘ │  │  └─────────────────────────┘  │  │
│  │                               │  │                               │  │
│  │  ┌─────────────────────────┐ │  │  ┌─────────────────────────┐  │  │
│  │  │ 🕐 12:30   👥 [8]  [●] │ │  │  │ 🕐 18:30   👥 [8]  [●] │  │  │
│  │  └─────────────────────────┘ │  │  └─────────────────────────┘  │  │
│  │                               │  │                               │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                                    [Annuler]  [Enregistrer]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Comportement des Toggles

| Action | Effet |
|--------|-------|
| **Toggle Jour OFF** | Ferme les 2 services (Déj + Dîn) |
| **Toggle Jour ON** | Rouvre selon template (PRD-005) |
| **Toggle Service OFF** | Ferme tous les créneaux du service |
| **Toggle Service ON** | Rouvre créneaux selon template |
| **Toggle Créneau OFF** | Désactive ce créneau uniquement |
| **Toggle Créneau ON** | Réactive ce créneau |
| **Bouton (+)** | Ajoute un créneau ad-hoc |

## 4.4 Persistence des Overrides

```typescript
// Mutation : dailySlots.upsertOverride
mutation({
  args: {
    date: v.string(),           // "2025-12-20"
    service: v.union(v.literal("midi"), v.literal("soir")),
    isOpen: v.boolean(),
    capacityOverride: v.optional(v.number()),
    origin: v.literal("manual"), // Toujours "manual" pour override UI
  },
  handler: async (ctx, args) => {
    // Upsert dans dailySlots
    const existing = await ctx.db.query("dailySlots")
      .withIndex("by_date_service", q => 
        q.eq("date", args.date).eq("service", args.service)
      )
      .filter(q => q.eq(q.field("origin"), "manual"))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        isOpen: args.isOpen,
        capacityOverride: args.capacityOverride,
      });
    } else {
      await ctx.db.insert("dailySlots", {
        date: args.date,
        service: args.service,
        isOpen: args.isOpen,
        capacityOverride: args.capacityOverride,
        origin: "manual",
      });
    }
  },
});
```

---

# PARTIE 5 : DATA MODEL

## 5.1 Tables Consommées

| Table | Champs utilisés | PRD Source |
|-------|-----------------|------------|
| **reservations** | date, service, partySize, status | PRD-002 |
| **dailySlots** | date, service, isOpen, capacityOverride, origin | PRD-007 |
| **weeklyTemplates** | dayOfWeek, service, isOpen, defaultCapacity | PRD-005 |
| **settings** | timezone | PRD-012 |

## 5.2 Cascade de Disponibilité

```
┌─────────────────────────────────────────────────────────────────┐
│  CASCADE DE DISPONIBILITÉ (PRD-007)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. MANUAL  — dailySlots origin="manual" (priorité max)        │
│  2. PERIOD  — dailySlots origin="period" (special periods)     │
│  3. TEMPLATE — weeklyTemplates (fallback)                      │
│                                                                 │
│  Résolution : UNE SEULE FOIS côté serveur                      │
│  Client reçoit : isOpen + capacityEffective + covers (final)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5.3 Types

```typescript
interface MonthEffectiveResponse {
  [dateStr: string]: {
    midi: ServiceEffective;
    soir: ServiceEffective;
  };
}

interface ServiceEffective {
  isOpen: boolean;
  capacityEffective: number;
  covers: number;
  source: "manual" | "period" | "template";
}
```

---

# PARTIE 6 : CHECKLIST IMPLÉMENTATION

## 6.1 Fixes Requis (Bloquants)

| # | Fix | Type | Effort | Statut |
|---|-----|------|--------|:------:|
| **F1** | `planning.getMonthEffective` server-side | Backend | ~2h | ☐ |
| **F2** | Timezone Luxon Brussels | Client | ~30min | ☐ |
| **F3** | Libellé 👥 couverts | PRD/UI | ~5min | ☐ |

## 6.2 P0 — Déjà Implémenté ✅

| # | Tâche | Statut |
|---|-------|:------:|
| 1 | Grille 7 colonnes Lun-Dim | ✅ |
| 2 | Navigation mois (chevrons + Aujourd'hui) | ✅ |
| 3 | Labels "Déj" / "Dîn" | ✅ |
| 4 | Barres occupation vertes | ✅ |
| 5 | État "Fermé" pour jours fermés | ✅ |
| 6 | Icône ⚙️ settings par jour | ✅ |
| 7 | Modal override avec toggles | ✅ |
| 8 | Capacité éditable par créneau | ✅ |
| 9 | SSR hydratation guard | ✅ |

## 6.3 Cleanup Post-Migration

| # | Tâche | Statut |
|---|-------|:------:|
| 10 | Supprimer `getMonthStats` | ☐ |
| 11 | Supprimer `getClosedDays` | ☐ |
| 12 | Supprimer `DEFAULT_CAPACITY` | ☐ |
| 13 | Simplifier `getServiceData()` | ☐ |
| 14 | Déplacer `getServiceData` après `if (!isCurrentMonth)` | ☐ |

## 6.4 P1 — Futur

| # | Tâche | Statut |
|---|-------|:------:|
| 15 | Pending distinct (breakdown) | ☐ |
| 16 | Affichage pourcentage "(x%)" | ☐ |
| 17 | 2 métriques occupation | ☐ |
| 18 | Notes jour (dayNotes) | ☐ |
| 19 | Badges périodes spéciales (🎄) | ☐ |

---

# PARTIE 7 : RBAC

| Action | Owner | Admin | Staff |
|--------|:-----:|:-----:|:-----:|
| Voir calendrier | ✅ | ✅ | ✅ |
| Voir modal override | ✅ | ✅ | ❌ |
| Modifier override | ✅ | ✅ | ❌ |
| Fermer jour/service | ✅ | ✅ | ❌ |

---

# PARTIE 8 : TESTS

## 8.1 Tests Unitaires (Fix 1)

```typescript
describe("resolveServiceEffective", () => {
  it("should prioritize MANUAL over PERIOD", () => {
    const dailySlots = [
      { date: "2025-12-25", service: "midi", origin: "manual", isOpen: false },
      { date: "2025-12-25", service: "midi", origin: "period", isOpen: true },
    ];
    
    const result = resolveServiceEffective("2025-12-25", "midi", 4, dailySlots, [], []);
    
    expect(result.source).toBe("manual");
    expect(result.isOpen).toBe(false);
  });

  it("should prioritize PERIOD over TEMPLATE", () => {
    const dailySlots = [
      { date: "2025-12-25", service: "midi", origin: "period", isOpen: false, capacityOverride: 30 },
    ];
    const templates = [
      { dayOfWeek: 4, service: "midi", isOpen: true, defaultCapacity: 50 },
    ];
    
    const result = resolveServiceEffective("2025-12-25", "midi", 4, dailySlots, templates, []);
    
    expect(result.source).toBe("period");
    expect(result.isOpen).toBe(false);
    expect(result.capacityEffective).toBe(30);
  });

  it("should fallback to TEMPLATE when no overrides", () => {
    const templates = [
      { dayOfWeek: 4, service: "midi", isOpen: true, defaultCapacity: 50 },
    ];
    
    const result = resolveServiceEffective("2025-12-25", "midi", 4, [], templates, []);
    
    expect(result.source).toBe("template");
    expect(result.capacityEffective).toBe(50);
  });

  it("should sum covers from active status reservations", () => {
    const reservations = [
      { date: "2025-12-25", service: "midi", status: "confirmed", partySize: 4 },
      { date: "2025-12-25", service: "midi", status: "pending", partySize: 2 },
      { date: "2025-12-25", service: "midi", status: "cancelled", partySize: 6 },
    ];
    
    const result = resolveServiceEffective("2025-12-25", "midi", 4, [], [], reservations);
    
    expect(result.covers).toBe(6); // 4 + 2, pas 6 (cancelled exclu)
  });
});
```

## 8.2 Tests E2E

```typescript
describe("Planning Calendar", () => {
  it("should display month grid with correct timezone", async ({ page }) => {
    await page.goto("/admin/planning");
    // Vérifier que le mois affiché correspond à Brussels, pas au navigateur
    await expect(page.getByText(/décembre 2025/i)).toBeVisible();
  });

  it("should show covers with 👥 icon", async ({ page }) => {
    await page.goto("/admin/planning");
    // Vérifier format 👥 x/y
    await expect(page.getByText(/👥\s*\d+\/\d+/)).toBeVisible();
  });

  it("should apply PERIOD override from special period", async ({ page }) => {
    // Créer une période spéciale qui ferme le 24/12
    // Vérifier que le calendrier affiche "Fermé" pour le 24/12
    await page.goto("/admin/planning");
    await expect(page.locator("[data-day='24']")).toContainText("Fermé");
  });
});
```

---

# PARTIE 9 : INTÉGRATIONS

| PRD | Intégration | Direction |
|-----|-------------|-----------|
| **PRD-002** | Statuts réservations (8 statuts) | → Planning |
| **PRD-005** | weeklyTemplates (capacités) | → Planning |
| **PRD-007** | dailySlots (overrides MANUAL/PERIOD) | → Planning |
| **PRD-009** | Noshow réhabilité (markedNoshowAt + completedAt) | → Planning |
| **PRD-012** | settings.timezone | → Planning |

---

## Historique

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| **1.5** | 2025-12-22 | Claude | Consolidation des 3 fixes avec spécifications complètes, correction encodage |
| 1.4 | 2025-12-22 | Claude | 3 fixes alignement : (1) cascade server-side `getMonthEffective`, (2) timezone Luxon Brussels, (3) libellé `👥 x/y` couverts |
| 1.3 | 2025-12-22 | Claude | Alignement UI implémentée |
| 1.2 | 2025-12-22 | Claude | Décisions occupancy, late |
| 1.1 | 2025-12-21 | Claude | Corrections timezone, cascade |
| 1.0 | 2025-12-19 | Claude | Création initiale |

---

**FIN DU DOCUMENT PRD-010 v1.5**

*Score qualité : 92/100 → 98/100 après fixes*
*🔧 3 fixes requis pour Production-ready*
*✅ P0 UI validé et exploitable*
