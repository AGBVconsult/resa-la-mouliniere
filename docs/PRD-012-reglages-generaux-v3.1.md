# PRD-012 : Réglages Généraux

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-012 |
| **Titre** | Réglages Généraux - Paramètres Système |
| **Statut** | À implémenter |
| **Priorité** | P0 - Critique (Fondation) |
| **Version** | 3.1 (finale) |
| **Date création** | 2025-12-20 |
| **Dernière MAJ** | 2025-12-20 |
| **Responsable** | AGBVconsult |

---

## 1. Résumé Exécutif

### 1.1 Objectif

Centraliser tous les paramètres configurables du système dans une interface unique, permettant d'ajuster le comportement de l'application sans intervention technique.

### 1.2 Problème Résolu

| Problème | Solution |
|----------|----------|
| Paramètres codés en dur | Configuration dynamique |
| Modification = redéploiement | Changement temps réel |
| Pas de traçabilité | Historique des modifications |
| Valeurs dispersées | Source unique de vérité |

### 1.3 Bénéfices Attendus

- Autonomie opérationnelle (pas de dev requis)
- Flexibilité saisonnière (ajuster seuils)
- Traçabilité complète (audit log)
- Cohérence système (paramètres centralisés)

---

## 2. Modules Dépendants

Ce PRD est la **fondation** de tous les autres modules :

| PRD | Paramètres Consommés | Note |
|-----|----------------------|------|
| PRD-001 Widget | Langues, `largeGroupThreshold`, `contactUsThreshold`, délais | ⚠️ `pendingThreshold` NON exposé — statut décidé côté backend |
| PRD-003 CRM | Seuils VIP/Régulier/Bad Guest, rétention données | |
| PRD-005 Créneaux | Capacité défaut, délais min/max, `largeGroupThreshold` | |
| PRD-008 Emails | Expéditeur, horaires envoi, `notifications.*` | |
| PRD-011 Attribution | Seuil grand groupe | |

### 2.1 Clarification PRD-001 (Widget)

Le widget **ne consomme PAS** `pendingThreshold` directement. La logique est :

```
Widget                           Backend (mutation createReservation)
──────                           ────────────────────────────────────
1. Affiche créneaux              
   (filtrés par largeGroupThreshold)
                                 
2. Envoie réservation ──────────▶ 3. Évalue pendingThreshold
                                    - partySize > pending? → status=pending
                                    - sinon → status=confirmed
                                 
4. Reçoit statut ◀──────────────  5. Retourne {status, message}
```

Cela garantit que `pendingThreshold` reste privé (jamais exposé au client).

---

## 3. Spécifications Fonctionnelles

### 3.1 Vue d'Ensemble Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ Réglages Généraux                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🏠 Restaurant                                            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Nom            │ La Moulinière                          │   │
│  │ Adresse        │ Visserskaai 14, 8400 Oostende          │   │
│  │ Téléphone      │ (non renseigné)                        │   │
│  │ Email          │ info@lamouliniere.be                   │   │
│  │ Fuseau horaire │ Europe/Brussels                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🌐 Langues                                               │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Widget         │ NL, FR, EN, DE, IT                     │   │
│  │ Langue défaut  │ NL                                     │   │
│  │ Admin          │ FR (fixe)                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📅 Réservations                                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Capacité créneau (défaut)     │ 8 couverts             │   │
│  │ Durée réservation             │ 1h30                   │   │
│  │ Délai minimum                 │ 5 minutes              │   │
│  │ Délai maximum                 │ 2 mois                 │   │
│  │ Seuil pending (validation)    │ > 4 personnes          │   │
│  │ Seuil grand groupe            │ ≥ 6 personnes          │   │
│  │ Seuil "contactez-nous"        │ > 15 personnes         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👥 CRM                                                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Seuil VIP                     │ 10 visites             │   │
│  │ Seuil Régulier                │ 3 visites              │   │
│  │ Seuil Bad Guest               │ 2 no-shows             │   │
│  │ Conservation données          │ 5 ans                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️ No-Show                                               │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Délai marquage                │ 45 minutes             │   │
│  │ Alerte récidiviste            │ 2 no-shows             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✉️ Emails                                                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Email expéditeur              │ noreply@lamouliniere.be│   │
│  │ Nom expéditeur                │ La Moulinière          │   │
│  │ Heure rappel (midi)           │ 10:00                  │   │
│  │ Heure rappel (soir)           │ 16:00                  │   │
│  │ Délai email review            │ J+1 à 06:00            │   │
│  │ Email alertes admin           │ info@lamouliniere.be   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔔 Notifications                                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │ EMAILS CLIENT                                           │   │
│  │ ├─ Confirmation réservation       [✓]                  │   │
│  │ ├─ Rappel                         [✓]                  │   │
│  │ ├─ Demande d'avis                 [✓]                  │   │
│  │ ├─ Annulation                     [✓]                  │   │
│  │ └─ Pending (grand groupe)         [✓]                  │   │
│  │                                                         │   │
│  │ ALERTES ADMIN                                           │   │
│  │ ├─ Nouvelle réservation           [✓]                  │   │
│  │ ├─ Réservation modifiée           [✓]                  │   │
│  │ ├─ Annulation                     [✓]                  │   │
│  │ ├─ No-show                        [✓]                  │   │
│  │ └─ Client récidiviste             [✓]                  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Dernière modification: 20/12/2025 14:32 par Benjamin          │
│                                                                 │
│  [Restaurer valeurs par défaut]              [Sauvegarder]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Sections de Paramètres

#### 3.2.1 Restaurant

| Paramètre | Type | Défaut | Validation |
|-----------|------|--------|------------|
| `restaurantName` | string | "La Moulinière" | Min 2, max 100 caractères |
| `address` | string | "Visserskaai 14, 8400 Oostende" | Min 5, max 200 caractères |
| `phone` | string | "" | Format international (espaces autorisés) ou vide |
| `email` | string | "info@lamouliniere.be" | Format email valide |
| `timezone` | string | "Europe/Brussels" | Timezone IANA valide |

#### 3.2.2 Langues

| Paramètre | Type | Défaut | Validation |
|-----------|------|--------|------------|
| `widgetLanguages` | string[] | ["nl", "fr", "en", "de", "it"] | Min 1 langue |
| `widgetDefaultLanguage` | string | "nl" | Doit être dans widgetLanguages |
| `adminLanguage` | string | "fr" | **FR uniquement** (fixe, non modifiable) |

##### Logique de Détection Automatique (Widget)

```
1. Lire header Accept-Language du navigateur
2. Extraire le code langue principal (ex: "fr-BE" → "fr")
3. Si code ∈ widgetLanguages → utiliser cette langue
4. Sinon → utiliser widgetDefaultLanguage (NL)
```

##### Ordre d'Affichage du Sélecteur

L'ordre est **alphabétique dans la langue active du widget** :

| Langue Active | Ordre Affiché |
|---------------|---------------|
| **NL** | Duits, Engels, Frans, Italiaans, Nederlands |
| **FR** | Allemand, Anglais, Français, Italien, Néerlandais |
| **EN** | Dutch, English, French, German, Italian |
| **DE** | Deutsch, Englisch, Französisch, Italienisch, Niederländisch |
| **IT** | Francese, Inglese, Italiano, Olandese, Tedesco |

#### 3.2.3 Réservations

| Paramètre | Type | Défaut | Validation | Description |
|-----------|------|:------:|------------|-------------|
| `defaultSlotCapacity` | number | 8 | 1-100 | Couverts par créneau |
| `defaultReservationDurationMinutes` | number | 90 | 30-240 | Durée en minutes |
| `minBookingDelayMinutes` | number | 5 | 0-1440 | Délai min avant créneau |
| `maxBookingAdvanceMonths` | number | 2 | 1-12 | Mois à l'avance |
| `pendingThreshold` | number | 4 | 1-50 | Au-dessus (>) → pending |
| `largeGroupThreshold` | number | 6 | 2-50 | Seuil filtrage créneaux grands groupes |
| `contactUsThreshold` | number | 15 | 5-100 | Au-dessus (>) → message contact |

##### Table de Décision — Logique Réservation

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOGIQUE RÉSERVATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ÉTAPE 1 : FILTRAGE CRÉNEAUX (visibilité widget)               │
│  ─────────────────────────────────────────────────              │
│  Si partySize >= largeGroupThreshold (6)                        │
│     ET créneau.largeTableAllowed = false                        │
│     → Créneau NON AFFICHÉ dans le widget                        │
│                                                                 │
│  Note: largeGroupThreshold ne détermine PAS le statut           │
│        de la réservation, uniquement la visibilité.             │
│                                                                 │
│  ÉTAPE 2 : STATUT RÉSERVATION (backend, après sélection)       │
│  ─────────────────────────────────────────────────              │
│  Évaluation par ORDRE DE PRIORITÉ (première condition vraie):  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Priorité │ Condition              │ Statut    │ Action  │   │
│  ├──────────┼────────────────────────┼───────────┼─────────┤   │
│  │    1     │ partySize > 15         │ BLOQUÉ    │ Message │   │
│  │          │ (contactUsThreshold)   │           │ contact │   │
│  ├──────────┼────────────────────────┼───────────┼─────────┤   │
│  │    2     │ partySize > 4          │ PENDING   │ Attente │   │
│  │          │ (pendingThreshold)     │           │ valid.  │   │
│  ├──────────┼────────────────────────┼───────────┼─────────┤   │
│  │    3     │ Sinon                  │ CONFIRMED │ Auto    │   │
│  └──────────┴────────────────────────┴───────────┴─────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

##### Contraintes Cross-Field (Validation)

```
pendingThreshold (4) < largeGroupThreshold (6) ≤ contactUsThreshold (15)
```

#### 3.2.4 CRM

| Paramètre | Type | Défaut | Validation | Description |
|-----------|------|:------:|------------|-------------|
| `vipThreshold` | number | 10 | 1-100 | Visites pour VIP |
| `regularThreshold` | number | 3 | 1-50 | Visites pour Régulier |
| `badGuestThreshold` | number | 2 | 1-10 | No-shows pour Bad Guest |
| `dataRetentionYears` | number | 5 | 1-10 | Années conservation (informatif, pas de purge auto) |

#### 3.2.5 No-Show

| Paramètre | Type | Défaut | Validation | Description |
|-----------|------|:------:|------------|-------------|
| `noShowDelayMinutes` | number | 45 | 15-120 | Délai avant marquage |
| `noShowAlertThreshold` | number | 2 | 1-10 | No-shows pour alerte |

#### 3.2.6 Emails

| Paramètre | Type | Défaut | Validation |
|-----------|------|--------|------------|
| `senderEmail` | string | "noreply@lamouliniere.be" | Format email |
| `senderName` | string | "La Moulinière" | Min 2, max 50 |
| `reminderTimeMidi` | string | "10:00" | Format HH:MM |
| `reminderTimeSoir` | string | "16:00" | Format HH:MM |
| `reviewSendTime` | string | "06:00" | Format HH:MM |
| `reviewDelayDays` | number | 1 | 0-7 |
| `adminNotificationEmail` | string | "info@lamouliniere.be" | Format email |

#### 3.2.7 Notifications

| Paramètre | Type | Défaut | Description |
|-----------|------|:------:|-------------|
| **Emails Client** ||||
| `notifications.emailConfirmation` | boolean | true | Confirmation réservation |
| `notifications.emailReminder` | boolean | true | Rappel J-0 |
| `notifications.emailReview` | boolean | true | Demande d'avis |
| `notifications.emailCancellation` | boolean | true | Confirmation annulation |
| `notifications.emailPending` | boolean | true | Grand groupe en attente |
| **Alertes Admin** ||||
| `notifications.adminNewReservation` | boolean | true | Nouvelle réservation |
| `notifications.adminModification` | boolean | true | Réservation modifiée |
| `notifications.adminCancellation` | boolean | true | Annulation |
| `notifications.adminNoShow` | boolean | true | No-show détecté |
| `notifications.adminRecidiviste` | boolean | true | Client récidiviste |

---

## 4. Spécifications Techniques

### 4.1 Invariant Singleton

**RÈGLE CRITIQUE** : Il doit exister **exactement 1 document** `settings` avec `key = "global"`.

| Règle | Description |
|-------|-------------|
| Unicité garantie | Index `by_key` + auto-cicatrisation |
| Toute lecture/écriture | Cible ce singleton via helper `getSettingsSafe()` |
| En cas d'absence | `_initialize` (internal) le crée |
| Multi-doc détecté | Garde le plus récent, supprime les autres, log alerte |

### 4.2 Schéma Convex

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ========================================
  // UTILISATEURS (RBAC)
  // ========================================
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("staff")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkUserId"])
    .index("by_email", ["email"]),

  // ========================================
  // SETTINGS (Singleton)
  // ========================================
  settings: defineTable({
    // Clé singleton
    key: v.literal("global"),

    // Restaurant
    restaurantName: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    timezone: v.string(),

    // Langues
    widgetLanguages: v.array(v.string()),
    widgetDefaultLanguage: v.string(),
    adminLanguage: v.string(),

    // Réservations
    defaultSlotCapacity: v.number(),
    defaultReservationDurationMinutes: v.number(),
    minBookingDelayMinutes: v.number(),
    maxBookingAdvanceMonths: v.number(),
    pendingThreshold: v.number(),
    largeGroupThreshold: v.number(),
    contactUsThreshold: v.number(),

    // CRM
    vipThreshold: v.number(),
    regularThreshold: v.number(),
    badGuestThreshold: v.number(),
    dataRetentionYears: v.number(),

    // No-Show
    noShowDelayMinutes: v.number(),
    noShowAlertThreshold: v.number(),

    // Emails
    senderEmail: v.string(),
    senderName: v.string(),
    reminderTimeMidi: v.string(),
    reminderTimeSoir: v.string(),
    reviewSendTime: v.string(),
    reviewDelayDays: v.number(),
    adminNotificationEmail: v.string(),

    // Notifications
    notifications: v.object({
      emailConfirmation: v.boolean(),
      emailReminder: v.boolean(),
      emailReview: v.boolean(),
      emailCancellation: v.boolean(),
      emailPending: v.boolean(),
      adminNewReservation: v.boolean(),
      adminModification: v.boolean(),
      adminCancellation: v.boolean(),
      adminNoShow: v.boolean(),
      adminRecidiviste: v.boolean(),
    }),

    // Métadonnées
    updatedAt: v.number(),
    updatedBy: v.string(),
    updatedByUserId: v.optional(v.string()), // clerkUserId pour audit
  }).index("by_key", ["key"]),

  // ========================================
  // HISTORIQUE DES MODIFICATIONS
  // ========================================
  settingsHistory: defineTable({
    settingsId: v.id("settings"),
    changes: v.array(
      v.object({
        field: v.string(),
        oldValue: v.any(),
        newValue: v.any(),
      })
    ),
    modifiedBy: v.string(),
    modifiedByUserId: v.optional(v.string()),
    modifiedByRole: v.string(),
    modifiedAt: v.number(),
  }).index("by_date", ["modifiedAt"]),

  // ========================================
  // JOBS RUNS (Idempotence Crons)
  // ========================================
  jobRuns: defineTable({
    jobName: v.string(),
    localDate: v.string(),
    targetTime: v.string(),
    status: v.union(
      v.literal("started"),
      v.literal("completed"),
      v.literal("failed")
    ),
    sentCount: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_job_date_time", ["jobName", "localDate", "targetTime"])
    .index("by_date", ["createdAt"]),
});
```

### 4.3 Valeurs par Défaut

```typescript
// convex/lib/defaultSettings.ts

export const DEFAULT_SETTINGS = {
  key: "global" as const,

  // Restaurant
  restaurantName: "La Moulinière",
  address: "Visserskaai 14, 8400 Oostende",
  phone: "",
  email: "info@lamouliniere.be",
  timezone: "Europe/Brussels",

  // Langues
  widgetLanguages: ["nl", "fr", "en", "de", "it"],
  widgetDefaultLanguage: "nl",
  adminLanguage: "fr",

  // Réservations
  defaultSlotCapacity: 8,
  defaultReservationDurationMinutes: 90,
  minBookingDelayMinutes: 5,
  maxBookingAdvanceMonths: 2,
  pendingThreshold: 4,
  largeGroupThreshold: 6,
  contactUsThreshold: 15,

  // CRM
  vipThreshold: 10,
  regularThreshold: 3,
  badGuestThreshold: 2,
  dataRetentionYears: 5,

  // No-Show
  noShowDelayMinutes: 45,
  noShowAlertThreshold: 2,

  // Emails
  senderEmail: "noreply@lamouliniere.be",
  senderName: "La Moulinière",
  reminderTimeMidi: "10:00",
  reminderTimeSoir: "16:00",
  reviewSendTime: "06:00",
  reviewDelayDays: 1,
  adminNotificationEmail: "info@lamouliniere.be",

  // Notifications
  notifications: {
    emailConfirmation: true,
    emailReminder: true,
    emailReview: true,
    emailCancellation: true,
    emailPending: true,
    adminNewReservation: true,
    adminModification: true,
    adminCancellation: true,
    adminNoShow: true,
    adminRecidiviste: true,
  },
} as const;
```

### 4.4 Constantes Partagées

```typescript
// src/lib/constants/validation.ts

export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const PHONE_REGEX = /^(\+\d{1,3}[\s.-]?)?(\d[\s.-]?){9,15}$|^$/;

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, "");
}
```

### 4.5 API Endpoints

```typescript
// convex/settings.ts

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_SETTINGS } from "./lib/defaultSettings";
import { settingsSchema, settingsUpdateSchema } from "./lib/validations";

// ========================================
// RBAC
// ========================================

type UserRole = "owner" | "admin" | "staff";

interface AuthenticatedUser {
  name: string;
  email: string;
  clerkUserId: string;
  role: UserRole;
}

async function getAuthenticatedUser(ctx: any): Promise<AuthenticatedUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (!user) return null;

  return {
    name: user.name,
    email: user.email,
    clerkUserId: user.clerkUserId,
    role: user.role,
  };
}

function canReadSettings(role: UserRole): boolean {
  return ["owner", "admin", "staff"].includes(role);
}

function canWriteSettings(role: UserRole): boolean {
  return ["owner", "admin"].includes(role);
}

function canReadHistory(role: UserRole): boolean {
  return ["owner", "admin"].includes(role);
}

// ========================================
// SINGLETON SAFE (Auto-cicatrisation)
// ========================================

async function getSettingsSafe(ctx: any) {
  const docs = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", "global"))
    .collect();

  if (docs.length === 0) {
    return null;
  }

  if (docs.length === 1) {
    return docs[0];
  }

  // Multi-doc détecté : garder le plus récent, supprimer les autres
  console.warn(`[SETTINGS] Multi-doc détecté (${docs.length}). Auto-cicatrisation...`);
  
  const sorted = docs.sort((a: any, b: any) => b.updatedAt - a.updatedAt);
  const keep = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    await ctx.db.delete(sorted[i]._id);
    console.warn(`[SETTINGS] Document supprimé: ${sorted[i]._id}`);
  }

  return keep;
}

// Même logique pour jobRuns
async function getJobRunSafe(ctx: any, jobName: string, localDate: string, targetTime: string) {
  const docs = await ctx.db
    .query("jobRuns")
    .withIndex("by_job_date_time", (q: any) =>
      q.eq("jobName", jobName).eq("localDate", localDate).eq("targetTime", targetTime)
    )
    .collect();

  if (docs.length === 0) return null;
  if (docs.length === 1) return docs[0];

  // Multi-doc : garder le premier créé
  console.warn(`[JOBRUNS] Multi-doc détecté pour ${jobName}/${localDate}/${targetTime}`);
  const sorted = docs.sort((a: any, b: any) => a.createdAt - b.createdAt);
  
  for (let i = 1; i < sorted.length; i++) {
    await ctx.db.delete(sorted[i]._id);
  }

  return sorted[0];
}

// ========================================
// WHITELIST PUBLIQUE
// ========================================

const PUBLIC_SETTINGS_KEYS = [
  "restaurantName",
  "address",
  "phone",
  "email",
  "timezone",
  "widgetLanguages",
  "widgetDefaultLanguage",
  "minBookingDelayMinutes",
  "maxBookingAdvanceMonths",
  "contactUsThreshold",
  "defaultReservationDurationMinutes",
  "largeGroupThreshold",
] as const;

function filterPublicSettings(settings: typeof DEFAULT_SETTINGS) {
  const result: Record<string, any> = {};
  for (const key of PUBLIC_SETTINGS_KEYS) {
    result[key] = key === "phone" ? (settings[key] ?? "") : settings[key];
  }
  return result;
}

// ========================================
// QUERIES PUBLIQUES
// ========================================

export const getPublicSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettingsSafe(ctx);
    return filterPublicSettings(settings ?? DEFAULT_SETTINGS);
  },
});

// ========================================
// QUERIES PRIVÉES
// ========================================

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || !canReadSettings(user.role)) {
      throw new Error("Authentification requise");
    }

    const settings = await getSettingsSafe(ctx);
    return settings ?? { ...DEFAULT_SETTINGS, _id: null };
  },
});

export const getValue = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || !canReadSettings(user.role)) {
      throw new Error("Authentification requise");
    }

    const settings = await getSettingsSafe(ctx);
    const data = settings ?? DEFAULT_SETTINGS;
    return data[key as keyof typeof data];
  },
});

export const getHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || !canReadHistory(user.role)) {
      throw new Error("Permission refusée : accès historique réservé aux admin/owner");
    }

    return await ctx.db
      .query("settingsHistory")
      .withIndex("by_date")
      .order("desc")
      .take(limit);
  },
});

// ========================================
// MUTATIONS INTERNES
// ========================================

/**
 * Initialise les settings
 * ⚠️ INTERNAL : appelé par script seed ou premier accès admin
 */
export const _initialize = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await getSettingsSafe(ctx);
    if (existing) {
      return existing._id;
    }

    settingsSchema.parse(DEFAULT_SETTINGS);

    return await ctx.db.insert("settings", {
      ...DEFAULT_SETTINGS,
      updatedAt: Date.now(),
      updatedBy: "system",
    });
  },
});

// ========================================
// MUTATIONS
// ========================================

export const update = mutation({
  args: {
    updates: v.record(v.string(), v.any()),
  },
  handler: async (ctx, { updates }) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || !canWriteSettings(user.role)) {
      throw new Error("Permission refusée : rôle owner ou admin requis");
    }

    let settings = await getSettingsSafe(ctx);

    if (!settings) {
      const id = await ctx.db.insert("settings", {
        ...DEFAULT_SETTINGS,
        updatedAt: Date.now(),
        updatedBy: user.name,
        updatedByUserId: user.clerkUserId,
      });
      settings = await ctx.db.get(id);
    }

    // 1. Valider les updates avec schema strict (rejette clés inconnues)
    const parsedUpdatesResult = settingsUpdateSchema.strict().safeParse(updates);
    if (!parsedUpdatesResult.success) {
      const err = parsedUpdatesResult.error.errors[0];
      throw new Error(`Clé invalide : ${err.path.join(".")} - ${err.message}`);
    }
    const parsedUpdates = parsedUpdatesResult.data;

    // 2. Merger avec les settings actuels
    const merged = { ...settings, ...parsedUpdates };

    // 3. Valider l'état final complet (cross-field)
    const finalResult = settingsSchema.safeParse(merged);
    if (!finalResult.success) {
      const err = finalResult.error.errors[0];
      throw new Error(`Validation : ${err.path.join(".")} - ${err.message}`);
    }

    // 4. Calculer les changements
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    for (const [key, newValue] of Object.entries(parsedUpdates)) {
      const oldValue = settings[key as keyof typeof settings];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field: key, oldValue, newValue });
      }
    }

    // 5. Historique
    if (changes.length > 0) {
      await ctx.db.insert("settingsHistory", {
        settingsId: settings._id,
        changes,
        modifiedBy: user.name,
        modifiedByUserId: user.clerkUserId,
        modifiedByRole: user.role,
        modifiedAt: Date.now(),
      });
    }

    // 6. Patch uniquement les clés parsées
    await ctx.db.patch(settings._id, {
      ...parsedUpdates,
      updatedAt: Date.now(),
      updatedBy: user.name,
      updatedByUserId: user.clerkUserId,
    });

    return { success: true, changesCount: changes.length };
  },
});

export const resetToDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user || !canWriteSettings(user.role)) {
      throw new Error("Permission refusée : rôle owner ou admin requis");
    }

    settingsSchema.parse(DEFAULT_SETTINGS);

    const settings = await getSettingsSafe(ctx);

    if (!settings) {
      return await ctx.db.insert("settings", {
        ...DEFAULT_SETTINGS,
        updatedAt: Date.now(),
        updatedBy: user.name,
        updatedByUserId: user.clerkUserId,
      });
    }

    const changes = Object.entries(DEFAULT_SETTINGS)
      .filter(([key]) => key !== "key")
      .map(([key, newValue]) => ({
        field: key,
        oldValue: settings[key as keyof typeof settings],
        newValue,
      }))
      .filter((c) => JSON.stringify(c.oldValue) !== JSON.stringify(c.newValue));

    if (changes.length > 0) {
      await ctx.db.insert("settingsHistory", {
        settingsId: settings._id,
        changes,
        modifiedBy: `${user.name} (reset)`,
        modifiedByUserId: user.clerkUserId,
        modifiedByRole: user.role,
        modifiedAt: Date.now(),
      });
    }

    await ctx.db.patch(settings._id, {
      ...DEFAULT_SETTINGS,
      updatedAt: Date.now(),
      updatedBy: user.name,
      updatedByUserId: user.clerkUserId,
    });

    return { success: true, resetCount: changes.length };
  },
});
```

### 4.6 Validation Zod

```typescript
// convex/lib/validations.ts

import { z } from "zod";

export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const PHONE_REGEX = /^(\+\d{1,3}[\s.-]?)?(\d[\s.-]?){9,15}$|^$/;

const timeSchema = z.string().regex(TIME_REGEX, "Format HH:MM invalide");
const phoneSchema = z.string().regex(PHONE_REGEX, "Format téléphone invalide").default("");

export const settingsSchema = z
  .object({
    key: z.literal("global"),

    restaurantName: z.string().min(2).max(100),
    address: z.string().min(5).max(200),
    phone: phoneSchema,
    email: z.string().email(),
    timezone: z.string().min(1),

    widgetLanguages: z.array(z.enum(["nl", "fr", "en", "de", "it"])).min(1),
    widgetDefaultLanguage: z.enum(["nl", "fr", "en", "de", "it"]),
    adminLanguage: z.literal("fr"),

    defaultSlotCapacity: z.number().int().min(1).max(100),
    defaultReservationDurationMinutes: z.number().int().min(30).max(240),
    minBookingDelayMinutes: z.number().int().min(0).max(1440),
    maxBookingAdvanceMonths: z.number().int().min(1).max(12),
    pendingThreshold: z.number().int().min(1).max(50),
    largeGroupThreshold: z.number().int().min(2).max(50),
    contactUsThreshold: z.number().int().min(5).max(100),

    vipThreshold: z.number().int().min(1).max(100),
    regularThreshold: z.number().int().min(1).max(50),
    badGuestThreshold: z.number().int().min(1).max(10),
    dataRetentionYears: z.number().int().min(1).max(10),

    noShowDelayMinutes: z.number().int().min(15).max(120),
    noShowAlertThreshold: z.number().int().min(1).max(10),

    senderEmail: z.string().email(),
    senderName: z.string().min(2).max(50),
    reminderTimeMidi: timeSchema,
    reminderTimeSoir: timeSchema,
    reviewSendTime: timeSchema,
    reviewDelayDays: z.number().int().min(0).max(7),
    adminNotificationEmail: z.string().email(),

    notifications: z.object({
      emailConfirmation: z.boolean(),
      emailReminder: z.boolean(),
      emailReview: z.boolean(),
      emailCancellation: z.boolean(),
      emailPending: z.boolean(),
      adminNewReservation: z.boolean(),
      adminModification: z.boolean(),
      adminCancellation: z.boolean(),
      adminNoShow: z.boolean(),
      adminRecidiviste: z.boolean(),
    }),
  })
  .refine((data) => data.pendingThreshold < data.largeGroupThreshold, {
    message: "pendingThreshold doit être < largeGroupThreshold",
    path: ["pendingThreshold"],
  })
  .refine((data) => data.largeGroupThreshold <= data.contactUsThreshold, {
    message: "largeGroupThreshold doit être ≤ contactUsThreshold",
    path: ["largeGroupThreshold"],
  });

export const settingsUpdateSchema = settingsSchema.omit({ key: true }).partial();

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
```

### 4.7 Hook React

```typescript
// src/hooks/useSettings.ts

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback } from "react";
import { toast } from "sonner";

export function useSettings() {
  const settings = useQuery(api.settings.get);
  const history = useQuery(api.settings.getHistory, { limit: 20 });

  const updateMutation = useMutation(api.settings.update);
  const resetMutation = useMutation(api.settings.resetToDefaults);

  const updateSettings = useCallback(
    async (updates: Record<string, any>) => {
      try {
        const result = await updateMutation({ updates });
        toast.success(`${result.changesCount} paramètre(s) mis à jour`);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur";
        toast.error(message);
        throw error;
      }
    },
    [updateMutation]
  );

  const resetToDefaults = useCallback(async () => {
    try {
      const result = await resetMutation();
      toast.success("Paramètres restaurés");
      return result;
    } catch (error) {
      toast.error("Erreur lors de la restauration");
      throw error;
    }
  }, [resetMutation]);

  return {
    settings,
    history,
    isLoading: settings === undefined,
    updateSettings,
    resetToDefaults,
  };
}

export function usePublicSettings() {
  const settings = useQuery(api.settings.getPublicSettings);
  return { settings, isLoading: settings === undefined };
}
```

---

## 5. Bootstrap & Initialisation

### 5.1 Point d'Entrée

Convex n'a pas de "boot hook" automatique. L'initialisation doit être déclenchée explicitement.

**Options de bootstrap** :

| Option | Description | Recommandation |
|--------|-------------|----------------|
| **Script seed** | `npx convex run settings:_initialize` | ✅ Au déploiement |
| **Premier accès admin** | Layout admin appelle `_initialize` | ✅ Fallback |
| **Cron gate** | Vérifie + init si absent | ⚠️ Moins propre |

### 5.2 Script Seed Recommandé

```bash
# À exécuter après premier déploiement
npx convex run settings:_initialize
npx convex run users:seedOwner --args '{"clerkUserId": "user_xxx", "email": "benjamin@lamouliniere.be", "name": "Benjamin"}'
```

### 5.3 Fallback Premier Accès Admin

```typescript
// src/app/admin/layout.tsx

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function AdminLayout({ children }) {
  const initialize = useMutation(api.settings._initialize);

  useEffect(() => {
    // Assure que settings existe au premier accès
    initialize().catch(() => {
      // Ignore si déjà initialisé
    });
  }, []);

  return <>{children}</>;
}
```

---

## 6. Jobs Planifiés (Crons)

### 6.1 Architecture DST-Proof

```
┌─────────────────────────────────────────────────────────────────┐
│  Cron interval (1 min) ──▶ Gate ──▶ Exécution si conditions OK │
│                              │                                  │
│                              ▼                                  │
│                    ┌──────────────────┐                        │
│                    │ 1. Lire settings │                        │
│                    │ 2. Calc heure    │                        │
│                    │    locale        │                        │
│                    │ 3. Check fenêtre │                        │
│                    │ 4. Check toggle  │                        │
│                    │ 5. Check jobRuns │                        │
│                    └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Implémentation

```typescript
// convex/crons.ts

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Cron toutes les 1 minute - fiable
crons.interval(
  "emailJobsGate",
  { minutes: 1 },
  internal.emailJobs.checkAndExecute
);

export default crons;
```

```typescript
// convex/emailJobs.ts

import { internalMutation } from "./_generated/server";

export const checkAndExecute = internalMutation({
  args: {},
  handler: async (ctx) => {
    const settings = await getSettingsSafe(ctx);
    if (!settings) {
      console.warn("[CRON] Settings absent, skip");
      return;
    }

    const now = new Date();
    const localTime = now.toLocaleTimeString("fr-BE", {
      timeZone: settings.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const localDate = now.toLocaleDateString("fr-CA", {
      timeZone: settings.timezone,
    });

    const jobs = [
      {
        name: "reminderMidi",
        targetTime: settings.reminderTimeMidi,
        toggle: settings.notifications.emailReminder,
        handler: sendRemindersMidi,
      },
      {
        name: "reminderSoir",
        targetTime: settings.reminderTimeSoir,
        toggle: settings.notifications.emailReminder,
        handler: sendRemindersSoir,
      },
      {
        name: "reviewRequest",
        targetTime: settings.reviewSendTime,
        toggle: settings.notifications.emailReview,
        handler: sendReviewRequests,
      },
    ];

    for (const job of jobs) {
      // Check toggle notification
      if (!job.toggle) continue;

      // Check fenêtre horaire (±1 min pour cron 1min)
      if (!isWithinWindow(localTime, job.targetTime, 1)) continue;

      // Check idempotence
      const existingRun = await getJobRunSafe(ctx, job.name, localDate, job.targetTime);
      if (existingRun) continue;

      // Marquer démarré
      const runId = await ctx.db.insert("jobRuns", {
        jobName: job.name,
        localDate,
        targetTime: job.targetTime,
        status: "started",
        sentCount: 0,
        createdAt: Date.now(),
      });

      // Exécuter
      try {
        const sentCount = await job.handler(ctx, localDate, settings);
        await ctx.db.patch(runId, {
          status: "completed",
          sentCount,
          completedAt: Date.now(),
        });
      } catch (error) {
        await ctx.db.patch(runId, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown",
          completedAt: Date.now(),
        });
      }
    }
  },
});

function isWithinWindow(current: string, target: string, windowMinutes: number): boolean {
  const [cH, cM] = current.split(":").map(Number);
  const [tH, tM] = target.split(":").map(Number);
  return Math.abs(cH * 60 + cM - (tH * 60 + tM)) <= windowMinutes;
}

// Stubs - implémentés dans PRD-008
async function sendRemindersMidi(ctx: any, date: string, settings: any): Promise<number> {
  return 0;
}
async function sendRemindersSoir(ctx: any, date: string, settings: any): Promise<number> {
  return 0;
}
async function sendReviewRequests(ctx: any, date: string, settings: any): Promise<number> {
  return 0;
}
```

### 6.3 Gate Toggles Notifications

**RÈGLE** : Chaque job vérifie son toggle `notifications.*` avant d'envoyer.

| Job | Toggle vérifié |
|-----|----------------|
| `reminderMidi` | `notifications.emailReminder` |
| `reminderSoir` | `notifications.emailReminder` |
| `reviewRequest` | `notifications.emailReview` |

### 6.4 Stratégie Échec : SKIP

| Scénario | Comportement |
|----------|--------------|
| Job rate | Ignoré, pas de rattrapage |
| Job échoue | Status "failed", pas de retry |
| Doublon | Bloqué par jobRuns |

---

## 7. Sécurité

### 7.1 Ségrégation Public/Privé

| Niveau | Query | Auth | Données |
|--------|-------|:----:|---------|
| **Public** | `getPublicSettings` | ❌ | Whitelist |
| **Privé** | `get`, `getValue` | ✅ | Tout |
| **Audit** | `getHistory` | ✅ | owner/admin only |

### 7.2 RBAC Unifié

| Endpoint | owner | admin | staff | non auth |
|----------|:-----:|:-----:|:-----:|:--------:|
| `getPublicSettings` | ✅ | ✅ | ✅ | ✅ |
| `get` | ✅ | ✅ | ✅ | ❌ |
| `getValue` | ✅ | ✅ | ✅ | ❌ |
| `getHistory` | ✅ | ✅ | ❌ | ❌ |
| `update` | ✅ | ✅ | ❌ | ❌ |
| `resetToDefaults` | ✅ | ✅ | ❌ | ❌ |
| `_initialize` | — | — | — | internal |

### 7.3 Validation Serveur

**RÈGLE** : Toute mutation :
1. Parse `updates` avec `settingsUpdateSchema.strict()` (rejette clés inconnues)
2. Parse état mergé avec `settingsSchema` (cross-field)
3. Patch uniquement les clés parsées

---

## 8. Tests

### 8.1 Tests Unitaires

```typescript
describe("Settings Validation", () => {
  it("should validate DEFAULT_SETTINGS", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });

  it("should reject unknown keys in strict mode", () => {
    const result = settingsUpdateSchema.strict().safeParse({
      unknownKey: "value",
    });
    expect(result.success).toBe(false);
  });

  it("should reject cross-field violation", () => {
    const result = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      pendingThreshold: 10,
      largeGroupThreshold: 6,
    });
    expect(result.success).toBe(false);
  });
});
```

### 8.2 Tests Settings Absent + Multi-Doc

```typescript
describe("Settings Singleton", () => {
  it("should return DEFAULT_SETTINGS when settings absent", async () => {
    // Aucun doc settings en DB
    const result = await convex.query(api.settings.getPublicSettings);
    expect(result.restaurantName).toBe("La Moulinière");
    expect(result.defaultSlotCapacity).toBeUndefined(); // Pas dans whitelist
  });

  it("should auto-heal when multi-doc detected", async () => {
    // Simuler 2 docs (test interne)
    // Après appel, il ne doit rester qu'1 doc
    const settings = await getSettingsSafe(ctx);
    const allDocs = await ctx.db.query("settings").collect();
    expect(allDocs.length).toBe(1);
  });
});

describe("JobRuns Idempotence", () => {
  it("should not create duplicate job run", async () => {
    // Premier appel crée le job
    await checkAndExecute(ctx);
    
    // Deuxième appel ne crée pas de doublon
    await checkAndExecute(ctx);
    
    const runs = await ctx.db
      .query("jobRuns")
      .withIndex("by_job_date_time")
      .collect();
    
    expect(runs.length).toBe(1);
  });
});
```

### 8.3 Tests E2E Sécurité

```typescript
test("public settings should NOT expose pendingThreshold", async () => {
  const publicSettings = await convex.query(api.settings.getPublicSettings);
  expect(publicSettings).not.toHaveProperty("pendingThreshold");
  expect(publicSettings).not.toHaveProperty("vipThreshold");
  expect(publicSettings).not.toHaveProperty("notifications");
});

test("update should reject unknown keys", async () => {
  await expect(
    convex.mutation(api.settings.update, {
      updates: { hackerKey: "malicious" },
    })
  ).rejects.toThrow(/Clé invalide/);
});
```

---

## 9. Fichiers Impactés

```
convex/
├── schema.ts
├── settings.ts
├── emailJobs.ts
├── crons.ts
└── lib/
    ├── defaultSettings.ts
    └── validations.ts

src/
├── app/admin/
│   ├── layout.tsx (bootstrap)
│   └── parametres/reglages/
│       ├── page.tsx
│       └── *.tsx
├── hooks/useSettings.ts
└── lib/constants/validation.ts
```

---

## 10. Contrat d'Interface

```typescript
// Widget (public, non authentifié)
const { settings } = usePublicSettings();
// ✅ settings.largeGroupThreshold
// ❌ settings.pendingThreshold (n'existe pas)

// Admin (authentifié)
const { settings, updateSettings } = useSettings();
await updateSettings({ pendingThreshold: 5 });

// Backend (mutation createReservation)
const settings = await getSettingsSafe(ctx);
const status = partySize > settings.pendingThreshold ? "pending" : "confirmed";
```

---

## Historique

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| 3.1 | 2025-12-20 | Claude | Singleton auto-heal, updates strict, cron 1min, metadata userId, bootstrap doc, toggle gate, tests absent/multi-doc |
| 3.0 | 2025-12-20 | Claude | Crons DST-proof, RBAC unifié, validation Zod |
| 2.0 | 2025-12-20 | Claude | Règles métier, RBAC |
| 1.0 | 2025-12-20 | Claude | Création |
