# CONTRACTS — MVP Réservations

Stack verrouillée : Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind v4 + shadcn/ui ; Backend Convex ; Auth Clerk ; Emails Resend ; Anti-spam Cloudflare Turnstile.

Ce fichier est la **source de vérité unique**. Toute implémentation doit suivre **exactement** les noms, formats, statuts, signatures et invariants ci-dessous.

---

## Changelog (dernière mise à jour)

- Weekly Templates : ajout table `weeklyTemplates` (§5.13), endpoints CRUD (§6.6), cron `slots.generateFromTemplates` (§7).
- Special Periods : ajout tables `specialPeriods` (§5.10) et `slotOverrides` (§5.11), règle de priorité MANUAL > PERIOD > SLOT (§5.12), endpoints CRUD (§6.5).
- Secrets Turnstile : `turnstileSecretKey` reste en DB mais n’est jamais renvoyé ; ajout de `admin.updateSecrets` (owner-only).
- Concurrence : `reservations._cancel` requiert `expectedVersion` et incrémente `version` (note: implémenté comme `version` car Convex réserve les champs `_*`).
- Token manage : renommage `manageTokenExpireBeforeSlotMs` et formule unique `expiresAt = slotStartAt - manageTokenExpireBeforeSlotMs`.
- Tokens : 1 doc `reservationTokens` par `(reservationId,type)` ; rotation par update du doc.
- Slots : un slot est **effectivement ouvert** si `isOpen=true` ET `capacity>0` ; le DTO `Slot.isOpen` reflète `effectiveOpen`.
- Jobs : `dailyFinalize` => `confirmed->noshow` et `seated->completed`.
- Rate-limit : best-effort par IP, fallback fingerprint.
- Admin : ajout `reservations.adminCancel` + enqueue emails (validated/refused/cancelled).
- Staff : règles de masquage déterministes email/téléphone.
- Erreurs : `SLOT_TAKEN.meta.reason` standardisé.
- Rate-limit : `dayKey` calculé côté serveur (timezone restaurant), fingerprint stable sans Turnstile.
- `_cancel` : préconditions `pending|confirmed` (sinon `VALIDATION_ERROR`).
- `getByToken` : règles `TOKEN_INVALID`/`TOKEN_EXPIRED` explicites.
- Tokens : rotation via `rotatedAt` (pas de mise à jour de `createdAt`).
- `admin.getSettings` : autorisation explicite `admin|owner`.
- `_create` : upsert du doc `reservationTokens` (reservationId,type=manage) contracté.
- Rate-limit : définition explicite de `dayKey` (dateKey “aujourd’hui” serveur, timezone restaurant).
- Temps : définition explicite de `slotStartAt`.
- `getByToken` : `now` est l’heure serveur en ms.
- `_create` : `rotatedAt` initialisé à `null` lors de l’upsert token.

## 1) Décisions verrouillées

- **Next.js 15 App Router uniquement** : routes sous `/app/**`, pas de Pages Router.
- **Auth Admin = Clerk** : RBAC par rôles (`owner|admin|staff`) via claims ; pas de mot de passe stocké dans l’app.
- **Turnstile et Resend uniquement via Convex Actions** (jamais depuis Query/Mutation).
- **MVP mono-restaurant** : une seule entité “restaurant” active ; **toutes** les tables portent `restaurantId`.
- **UI multilingue** : tout message visible côté client/admin = `messageKey` (jamais de texte brut en base ni dans les erreurs).
- **MVP sans paiement/dépôt**.
- **MVP admin** : pas de création “phone/walk-in” via UI admin (sources possibles côté DB, mais non exposées par l’UI).

---

## 2) Formats & clés de temps

### 2.1 Timezone

- `restaurant.timezone` : IANA TZ string.
- **DEFAULT** : `Europe/Brussels`.
- Toutes les conversions “date/heure” pour les réservations/slots se font dans la timezone du restaurant.

### 2.2 Clés

- `dateKey` : string au format exact `YYYY-MM-DD`.
- `timeKey` : string au format exact `HH:MM` en 24h, minutes sur 2 chiffres (ex `18:30`).
- `service` : union string `"lunch" | "dinner"`.
- `slotKey` : string **exactement** `${dateKey}#${service}#${timeKey}`.

### 2.3 Règles de cohérence

- `slotKey` doit être dérivable sans ambiguïté : un `slotKey` implique exactement un `dateKey`, un `service`, un `timeKey`.
- Toutes les écritures en DB doivent stocker **les 4 champs** : `dateKey`, `timeKey`, `service`, `slotKey`.

Notion contractuelle (slots) :
- `effectiveOpen = (slots.isOpen === true) AND (slots.capacity > 0)`.
- Un slot est considéré **fermé** si `effectiveOpen=false` (y compris si `slots.isOpen=true` mais `slots.capacity===0`).

Définition de `slotStartAt` :
- `slotStartAt` = timestamp serveur (ms) dérivé de (`dateKey`, `timeKey`, `restaurant.timezone`).

Définition de `dayKey` :
- `dayKey` = `dateKey` `"YYYY-MM-DD"` représentant “aujourd’hui”, calculé côté serveur en `restaurant.timezone`.

---

## 3) Statuts + transitions autorisées + règles de groupe

### 3.1 Reservation.status (exhaustif)

`ReservationStatus` =
- `"pending"`
- `"confirmed"`
- `"seated"`
- `"completed"`
- `"noshow"`
- `"cancelled"`
- `"refused"`

### 3.2 Transitions autorisées (machine d’états)

Les seules transitions valides sont :

- `pending` -> `confirmed`
- `pending` -> `refused`
- `pending` -> `cancelled`
- `confirmed` -> `seated`
- `confirmed` -> `cancelled`
- `seated` -> `completed`
- `confirmed` -> `noshow` (**uniquement via job dailyFinalize**, voir section 7)

Transitions interdites (non exhaustif, donc **toutes** celles non listées ci-dessus sont interdites) :

- `completed` -> *(anything)*
- `noshow` -> *(anything)*
- `cancelled` -> *(anything)*
- `refused` -> *(anything)*

### 3.3 Règles de groupe (création)

Définitions :
- `partySize = adults + childrenCount + babyCount` (calcul serveur, voir modèle).

Règles :
- Si `partySize <= 4` : création en `confirmed` (immédiat).
- Si `5 <= partySize <= 15` : création en `pending` (validation admin requise).
- Si `partySize >= 16` : création de **groupRequest** (pas de réservation créée via widget).

---

## 4) Codes d’erreur normalisés

### 4.1 Shape

Toutes les erreurs “métier” renvoyées à l’UI (widget/admin) doivent respecter **exactement** :

- `code`: string (enum ci-dessous)
- `messageKey`: string (clé i18n)
- `meta?`: object JSON sérialisable (optionnel)

Shape : `{ code, messageKey, meta? }`.

### 4.2 Codes (liste complète)

- `VALIDATION_ERROR` (`messageKey`: `error.validation`)
- `TURNSTILE_FAILED` (`messageKey`: `error.turnstileFailed`)
- `RATE_LIMITED` (`messageKey`: `error.rateLimited`)
- `SLOT_TAKEN` (`messageKey`: `error.slotTaken`)
- `INSUFFICIENT_CAPACITY` (`messageKey`: `error.insufficientCapacity`)
- `TOKEN_INVALID` (`messageKey`: `error.tokenInvalid`)
- `TOKEN_EXPIRED` (`messageKey`: `error.tokenExpired`)
- `VERSION_CONFLICT` (`messageKey`: `error.versionConflict`)
- `TABLE_CONFLICT` (`messageKey`: `error.tableConflict`)
- `FORBIDDEN` (`messageKey`: `error.forbidden`)
- `NOT_FOUND` (`messageKey`: `error.notFound`)
- `SAME_TYPE_OVERLAP` (`messageKey`: `error.sameTypeOverlap`)

Meta standardisée (quand applicable) :
- `VALIDATION_ERROR.meta`: `{ fieldErrors: Record<string,string> }` où les valeurs sont des `messageKey`.
- `RATE_LIMITED.meta`: `{ retryAfterMs: number }`.
- `SLOT_TAKEN.meta`: `{ slotKey: string, reason?: "closed" | "taken" }`.
- `INSUFFICIENT_CAPACITY.meta`: `{ slotKey: string, requestedPartySize: number, remainingCapacity: number }`.
- `VERSION_CONFLICT.meta`: `{ expectedVersion: number, actualVersion: number }`.
- `TABLE_CONFLICT.meta`: `{ slotKey: string, tableIds: string[] }`.
- `SAME_TYPE_OVERLAP.meta`: `{ existingPeriodId: string, existingPeriodName: string }`.

---

## 5) Modèle de données (Convex — tables logiques)

Notation :
- `Id<"table">` = type Convex Id.
- `ts` = timestamp en millisecondes Unix (number).
- Tous les documents ont `_id` et `_creationTime` (Convex).
- Les champs “obligatoires” ci-dessous sont requis pour chaque document.

### 5.1 restaurants

**Objectif** : source de la timezone et du contexte MVP.

Champs :
- `name: string`
- `timezone: string` (IANA TZ) (**DEFAULT** `Europe/Brussels`)
- `isActive: boolean` (**DEFAULT** `true`)

Indexes :
- `by_isActive` sur `isActive`

Invariants :
- **MVP** : exactement 1 restaurant actif (`isActive=true`).

### 5.2 settings

**Objectif** : paramètres globaux par restaurant.

Champs :
- `restaurantId: Id<"restaurants">`
- `publicWidgetEnabled: boolean` (**DEFAULT** `true`)
- `turnstileSiteKey: string` (public)
- `turnstileSecretKey: string` (secret, jamais renvoyé)
- `resendFromEmail: string` (**DEFAULT** `"no-reply@" + domain`) (format email)
- `resendFromName: string` (**DEFAULT** = `restaurant.name`)
- `maxPartySizeWidget: number` (**DEFAULT** `15`)
- `manageTokenExpireBeforeSlotMs: number` (**DEFAULT** `2 * 60 * 60 * 1000`)
- `rateLimit: { windowMs: number, maxRequests: number }` (**DEFAULT** `{ windowMs: 60_000, maxRequests: 12 }`)

Migration note (**DEFAULT** MVP) :
- Ancien champ `tokenTtlMsManage` renommé en `manageTokenExpireBeforeSlotMs`.
- La sémantique est un **offset avant le slot** (pas un TTL depuis création).

Indexes :
- `by_restaurantId` sur `restaurantId` (**UNIQUE**)

Invariants :
- Un seul document `settings` par `restaurantId`.

### 5.3 slots

**Objectif** : disponibilité “slot-level” (source de vérité capacité et ouverture).

Champs :
- `restaurantId: Id<"restaurants">`
- `dateKey: string`
- `service: "lunch" | "dinner"`
- `timeKey: string`
- `slotKey: string` (voir section 2)
- `isOpen: boolean` (**DEFAULT** `true`)
- `capacity: number` (>= 0) (**DEFAULT** `0` jusqu’à seed)
- `maxGroupSize: number | null` (**DEFAULT** `15`) (null = pas de limite)
- `largeTableAllowed: boolean` (**DEFAULT** `false`) (garde-fou MVP)
- `updatedAt: ts`

Indexes :
- `by_restaurant_slotKey` sur `(restaurantId, slotKey)` (**UNIQUE**)
- `by_restaurant_date_service` sur `(restaurantId, dateKey, service)`

Invariants :
- `slotKey` doit correspondre exactement à `(dateKey, service, timeKey)`.
- Si `effectiveOpen=false` : aucune création de réservation (widget/admin) ne doit être possible sur ce slot.

### 5.4 tables

**Objectif** : plan de salle et capacités par table.

Champs :
- `restaurantId: Id<"restaurants">`
- `name: string`
- `zone: "dining" | "terrace"`
- `capacity: number` (>= 1)
- `gridX: number` (int >= 0)
- `gridY: number` (int >= 0)
- `isActive: boolean` (**DEFAULT** `true`)
- `updatedAt: ts`

Indexes :
- `by_restaurant_name` sur `(restaurantId, name)` (**UNIQUE**)
- `by_restaurant_isActive` sur `(restaurantId, isActive)`

Invariants :
- `name` unique par restaurant.
- Les tables inactives ne peuvent pas être assignées.

### 5.5 reservations

**Objectif** : réservation principale.

Champs :
- `restaurantId: Id<"restaurants">`
- `dateKey: string`
- `service: "lunch" | "dinner"`
- `timeKey: string`
- `slotKey: string`

- `adults: number` (>= 1)
- `childrenCount: number` (>= 0)
- `babyCount: number` (>= 0)
- `partySize: number` (**computed serveur** = `adults + childrenCount + babyCount`)

- `firstName: string`
- `lastName: string`
- `email: string`
- `phone: string`
- `language: "fr" | "nl" | "en" | "de" | "it"`

- `status: ReservationStatus`
- `source: "online" | "admin" | "phone" | "walkin"` (**DEFAULT** `"online"` pour widget)

- `tableIds: Id<"tables">[]` (**DEFAULT** `[]`)

- `_version: number` (**DEFAULT** `1`)
- `createdAt: ts`
- `updatedAt: ts`

- `cancelledAt: ts | null` (**DEFAULT** `null`)
- `refusedAt: ts | null` (**DEFAULT** `null`)
- `seatedAt: ts | null` (**DEFAULT** `null`)
- `completedAt: ts | null` (**DEFAULT** `null`)
- `noshowAt: ts | null` (**DEFAULT** `null`)

Indexes :
- `by_restaurant_slotKey` sur `(restaurantId, slotKey)`
- `by_restaurant_date_service` sur `(restaurantId, dateKey, service)`
- `by_restaurant_status` sur `(restaurantId, status)`

Invariants critiques :
- **Anti sur-capacité slot** : pour tout `(restaurantId, slotKey)`, la somme des `partySize` des réservations en statuts `pending|confirmed|seated` doit être `<= slots.capacity`.
- **Anti double-booking tables** : pour tout `(restaurantId, slotKey)`, aucune table ne peut apparaître dans `tableIds` de 2 réservations différentes en statuts `pending|confirmed|seated`.
- **Optimistic concurrency** : toute mutation “state change” exige `expectedVersion`; succès => `_version` incrémenté de +1.
- `partySize` est **toujours recalculé serveur** ; jamais trust côté client.

### 5.6 reservationTokens

**Objectif** : accès client “manage reservation” via URL.

Champs :
- `reservationId: Id<"reservations">`
- `token: string` (unguessable)
- `type: "manage"`
- `expiresAt: ts`
- `usedAt: ts | null` (**DEFAULT** `null`)
- `rotatedAt: ts | null` (**DEFAULT** `null`)
- `createdAt: ts`

Indexes :
- `by_token` sur `token` (**UNIQUE**)
- `by_reservation_type` sur `(reservationId, type)` (**UNIQUE**)

Invariants :
- `token` doit être généré via CSPRNG.
- **Un seul doc** `reservationTokens` par `(reservationId, type)`.
- Rotation : pour régénérer un token, mettre à jour le même document (`token`, `expiresAt`, `usedAt=null`, `rotatedAt=now`).
- Actif = `usedAt=null` ET `expiresAt > now`.
- Formule unique : `expiresAt = slotStartAt - settings.manageTokenExpireBeforeSlotMs`.

### 5.7 groupRequests

**Objectif** : demandes de groupe (>=16) sans création de réservation immédiate.

Champs :
- `restaurantId: Id<"restaurants">`
- `partySize: number` (>= 16)
- `preferredDateKey: string`
- `preferredService: "lunch" | "dinner"`
- `firstName: string`
- `lastName: string`
- `email: string`
- `phone: string`
- `message: string` (texte libre)
- `language: "fr" | "nl" | "en" | "de" | "it"`
- `status: "pending" | "contacted" | "converted" | "declined"` (**DEFAULT** `"pending"`)
- `reservationId: Id<"reservations"> | null` (**DEFAULT** `null`)
- `createdAt: ts`
- `updatedAt: ts`

Indexes :
- `by_restaurant_status` sur `(restaurantId, status)`
- `by_restaurant_preferredDate` sur `(restaurantId, preferredDateKey, preferredService)`

Invariants :
- `partySize >= 16` strict.

Invariants supplémentaires :
- Une `groupRequest` ne crée **jamais** de `reservation` automatiquement.
- La conversion en réservation (si elle existe) se fait uniquement via un flux admin (hors MVP UI), et doit définir `reservationId` puis `status="converted"`.

### 5.8 emailJobs

**Objectif** : outbox email + retry.

Champs :
- `restaurantId: Id<"restaurants">`
- `type: "reservation.confirmed" | "reservation.pending" | "reservation.validated" | "reservation.refused" | "reservation.cancelled" | "reservation.reminder" | "reservation.review"`
- `to: string`
- `subjectKey: string` (messageKey)
- `templateKey: string` (messageKey / identifiant template)
- `templateData: Record<string, unknown>` (JSON)
- `icsBase64: string | null` (**DEFAULT** `null`)
- `status: "queued" | "sent" | "failed"` (**DEFAULT** `"queued"`)
- `attemptCount: number` (**DEFAULT** `0`)
- `nextRetryAt: ts | null` (**DEFAULT** `null`)
- `lastAttemptAt: ts | null` (**DEFAULT** `null`)
- `lastErrorCode: string | null` (**DEFAULT** `null`)
- `dedupeKey: string` (idempotence email)
- `createdAt: ts`
- `updatedAt: ts`

Indexes :
- `by_status_nextRetryAt` sur `(status, nextRetryAt)`
- `by_dedupeKey` sur `dedupeKey` (**UNIQUE**)

Invariants :
- `dedupeKey` doit être stable et unique par “intent d’email” (ex : `reservationId#type#version`).

### 5.9 idempotencyKeys

**Objectif** : idempotence stricte des Actions.

Champs :
- `key: string` (**UNIQUE**, fourni par client)
- `action: "reservations.create" | "reservations.cancelByToken" | "groupRequests.create"`
- `requestHash: string` (sha256 hex) — hash des inputs pertinents
- `resultData: Record<string, unknown>` (JSON sérialisable)
- `expiresAt: ts`
- `createdAt: ts`

Indexes :
- `by_key` sur `key` (**UNIQUE**)
- `by_expiresAt` sur `expiresAt`

Invariants :
- Si une `key` existe :
  - si `requestHash` diffère => erreur `VALIDATION_ERROR` (meta `{ fieldErrors: { idemKey: "error.validation" } }`).
  - sinon => retourner exactement `resultData`.

### 5.10 specialPeriods

**Objectif** : périodes spéciales (vacances, fermetures, événements) avec règles d'override.

Champs :
- `restaurantId: Id<"restaurants">`
- `name: string` (2-50 caractères)
- `type: "holiday" | "closure" | "event"`
- `startDate: string` (format `YYYY-MM-DD`)
- `endDate: string` (format `YYYY-MM-DD`, max 365 jours après startDate)
- `applyRules: object`
  - `status: "open" | "modified" | "closed"`
    - `open` : annotation uniquement, pas d'override créé
    - `modified` : override avec capacité/maxGroupSize modifiés
    - `closed` : override avec `isOpen=false`
  - `services: ("lunch" | "dinner")[]` (au moins un requis)
  - `activeDays: number[]` (1-7 ISO weekday, au moins un requis)
  - `overrideCapacity?: number` (seulement si status=modified)
  - `maxGroupSize?: number | null` (seulement si status=modified)
  - `largeTableAllowed?: boolean` (seulement si status=modified)
- `createdBy: string` (userId Clerk)
- `createdAt: ts`
- `updatedAt: ts`

Indexes :
- `by_restaurant` sur `restaurantId`
- `by_restaurant_type` sur `(restaurantId, type)`
- `by_restaurant_dates` sur `(restaurantId, startDate, endDate)`

Invariants :
- `endDate >= startDate`.
- `endDate - startDate <= 365 jours`.
- Chevauchement inter-types : OK (résolu par priorité).
- Chevauchement intra-type : INTERDIT (erreur `SAME_TYPE_OVERLAP`).
- Priorité types : `event` (1) > `holiday` (2) > `closure` (3).

### 5.11 slotOverrides

**Objectif** : overrides par slot (manuels ou générés par période).

Champs :
- `restaurantId: Id<"restaurants">`
- `slotKey: string` (format `${dateKey}#${service}#${timeKey}`)
- `origin: "manual" | "period"`
- `patch: object`
  - `isOpen?: boolean`
  - `capacity?: number`
  - `maxGroupSize?: number | null`
  - `largeTableAllowed?: boolean`
- `specialPeriodId?: Id<"specialPeriods">` (requis si origin="period")
- `createdAt: ts`
- `updatedAt: ts`

Indexes :
- `by_restaurant_slotKey` sur `(restaurantId, slotKey)`
- `by_restaurant_origin` sur `(restaurantId, origin)`
- `by_specialPeriodId` sur `specialPeriodId`

Invariants :
- Un seul override par `(restaurantId, slotKey, origin)`.
- Si `origin="period"`, `specialPeriodId` est requis.
- Si `origin="manual"`, `specialPeriodId` doit être absent.

### 5.12 Règle de priorité des slots

Lors de la résolution d'un slot effectif :

```
MANUAL (slotOverrides origin="manual")
  > PERIOD (slotOverrides origin="period")
    > SLOT (table slots)
```

Algorithme :
1. Charger le slot de base depuis `slots`.
2. Charger les overrides depuis `slotOverrides` pour ce `slotKey`.
3. Appliquer dans l'ordre : d'abord `period`, puis `manual` (le dernier gagne).
4. Le slot effectif = slot de base avec les patches appliqués.

Génération d'overrides (matérialisation) :
- Quand une période est créée/modifiée :
  - Lister toutes les dates dans `[startDate, endDate]`.
  - Filtrer `dayOfWeek(date) ∈ activeDays`.
  - Pour chaque `service` dans `applyRules.services` :
    - Récupérer les slots existants pour ce `dateKey+service`.
    - Pour chaque slot (donc chaque `timeKey`) :
      - Construire `slotKey = ${dateKey}#${service}#${timeKey}`.
      - Si override `origin="manual"` existe déjà → NE PAS TOUCHER.
      - Sinon → upsert override `origin="period"` avec `specialPeriodId`.
  - Si `status="open"` → NE PAS créer d'override (annotation seulement).
- Quand une période est supprimée :
  - Supprimer TOUS les overrides `origin="period"` avec `specialPeriodId = X`.

### 5.13 weeklyTemplates

**Objectif** : templates hebdomadaires pour génération automatique des slots.

Champs :
- `restaurantId: Id<"restaurants">`
- `dayOfWeek: number` (1-7, ISO: 1=Lundi, 7=Dimanche)
- `service: "lunch" | "dinner"`
- `isOpen: boolean` (**DEFAULT** `true`)
- `slots: array` d'objets :
  - `timeKey: string` (format `HH:MM`)
  - `capacity: number` (1-50, **DEFAULT** `8`)
  - `isActive: boolean` (**DEFAULT** `true`)
  - `largeTableAllowed: boolean` (**DEFAULT** `false`)
  - `maxGroupSize: number | null` (**DEFAULT** `15`)
- `updatedAt: ts`
- `updatedBy: string` (userId Clerk)

Indexes :
- `by_restaurant` sur `restaurantId`
- `by_restaurant_day_service` sur `(restaurantId, dayOfWeek, service)` (**UNIQUE**)

Invariants :
- Un seul document par `(restaurantId, dayOfWeek, service)`.
- `dayOfWeek` : 1-7 strict (ISO weekday).
- `slots` : trié par `timeKey` (ordre chronologique).
- `slots[].timeKey` : unique dans le tableau (pas de doublon).

Créneaux par défaut (seed) :
- **lunch** : `12:00`, `12:30`, `13:00` (capacity=8, isActive=true)
- **dinner** : `18:00`, `18:30`, `19:00` (capacity=8, isActive=true)

---

## 6) API Convex (noms EXACTS)

Conventions :
- Toutes les entrées/sorties sont sérialisables JSON.
- Les `messageKey` sont renvoyées telles quelles ; l’UI traduit.
- `expectedVersion` est requis pour toute mutation qui modifie une réservation.

### 6.1 Types de sortie communs

- `Slot` : `{ slotKey: string, dateKey: string, service: "lunch"|"dinner", timeKey: string, isOpen: boolean, capacity: number, remainingCapacity: number, maxGroupSize: number | null }`
  - Règle : `Slot.isOpen` reflète `effectiveOpen` (pas `slots.isOpen` brut).
- `DayState` : `{ dateKey: string, lunch: { isOpen: boolean }, dinner: { isOpen: boolean } }`
- `ReservationPII` : `{ firstName: string, lastName: string, email: string, phone: string }`
- `ReservationBase` :
  - `{ _id: Id<"reservations">, restaurantId: Id<"restaurants">, dateKey: string, service: "lunch"|"dinner", timeKey: string, slotKey: string, adults: number, childrenCount: number, babyCount: number, partySize: number, language: "fr"|"nl"|"en"|"de"|"it", status: ReservationStatus, source: "online"|"admin"|"phone"|"walkin", tableIds: Id<"tables">[], _version: number, createdAt: number, updatedAt: number, cancelledAt: number|null, refusedAt: number|null, seatedAt: number|null, completedAt: number|null, noshowAt: number|null }`
- `ReservationAdmin` : `ReservationBase & ReservationPII`
- `ReservationStaff` : `ReservationBase & { firstName: string, lastName: string, emailMasked: string, phoneMasked: string }`
- `ReservationView` :
  - `{ reservation: ReservationAdmin, token: { token: string, expiresAt: number } }`
- `Table` : `{ _id: Id<"tables">, name: string, zone: "dining"|"terrace", capacity: number, gridX: number, gridY: number, isActive: boolean }`
- `TableWithState` : `{ table: Table, assignedReservationId: Id<"reservations"> | null }`
- `SettingsPublic` : `{ restaurantId: Id<"restaurants">, publicWidgetEnabled: boolean, turnstileSiteKey: string, maxPartySizeWidget: number, timezone: string }`
- `SettingsAdmin` : `SettingsPublic & { resendFromEmail: string, resendFromName: string, manageTokenExpireBeforeSlotMs: number, rateLimit: { windowMs: number, maxRequests: number } }`

### 6.2 Queries
- `availability.getDay(args: { dateKey: string, partySize: number }) -> { lunch: Slot[], dinner: Slot[] }`
- `availability.getMonth(args: { year: number, month: number, partySize: number }) -> DayState[]` (month = 1..12)

- `reservations.getByToken(args: { token: string }) -> ReservationView`
  - Préconditions / Erreurs (retours normalisés, l’UI traduit via `messageKey`) :
    - `now` = heure serveur en ms (pas un input client).
    - token introuvable => `TOKEN_INVALID`
    - `usedAt != null` => `TOKEN_INVALID`
    - `expiresAt <= now` => `TOKEN_EXPIRED`

- `reservations.listByService(args: { dateKey: string, service: "lunch"|"dinner" }) -> (ReservationAdmin[] | ReservationStaff[])`
  - Autorisation : `staff|admin|owner`.
  - Règle : si rôle `admin|owner`, renvoyer `ReservationAdmin[]`, sinon renvoyer `ReservationStaff[]`.

- `reservations.listPending(args: { dateKey?: string }) -> ReservationAdmin[]`
  - Autorisation : `admin|owner`.

- `reservations.getAdmin(args: { reservationId: Id<"reservations"> }) -> ReservationAdmin`
  - Autorisation : `admin|owner`.

- `reservations.getStaff(args: { reservationId: Id<"reservations"> }) -> ReservationStaff`
  - Autorisation : `staff|admin|owner`.
  - Règle : si rôle `staff` (sans `admin|owner`), renvoyer uniquement email/phone masqués.

- `floor.getTables(args: { dateKey: string, service: "lunch"|"dinner", timeKey?: string }) -> TableWithState[]`
  - Règle : si `timeKey` est omis, l’état “assignedReservationId” est `null` (mode plan) ; si fourni, calcule pour le `slotKey`.

- `admin.getSettings(args: { }) -> SettingsAdmin`
  - Autorisation : `admin|owner`.
- `widget.getSettings(args: { lang: "fr"|"nl"|"en"|"de"|"it" }) -> SettingsPublic`

### 6.3 Mutations (DB only)

Mutations internes (non appelées depuis l’UI) :

- `reservations._create(args: { restaurantId: Id<"restaurants">, dateKey: string, service: "lunch"|"dinner", timeKey: string, adults: number, childrenCount: number, babyCount: number, firstName: string, lastName: string, email: string, phone: string, language: "fr"|"nl"|"en"|"de"|"it", source: "online"|"admin"|"phone"|"walkin" }) -> { reservationId: Id<"reservations">, status: ReservationStatus, manageToken: string, tokenExpiresAt: number }`
  - Règle : `tokenExpiresAt = slotStartAt - settings.manageTokenExpireBeforeSlotMs`.
  - Règle : upsert du doc `reservationTokens` pour `(reservationId, type="manage")` (UNIQUE) avec `token=manageToken`, `expiresAt=tokenExpiresAt`, `usedAt=null`, `rotatedAt=null`.

- `reservations._cancel(args: { reservationId: Id<"reservations">, cancelledBy: "token"|"admin", now: number, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }`
  - Préconditions : status in `pending|confirmed` (sinon `VALIDATION_ERROR`).
  - Effets : `status -> cancelled`, `cancelledAt=now`, `_version=_version+1`.

Mutations admin (auth Clerk requise) :

- `reservations.adminConfirm(args: { reservationId: Id<"reservations">, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }`
  - Autorisation : `admin|owner`.
  - Préconditions : status == `pending`.
  - Effets email (outbox DB) : créer `emailJobs` type `reservation.validated`.

- `reservations.adminRefuse(args: { reservationId: Id<"reservations">, reasonKey: string, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }`
  - Autorisation : `admin|owner`.
  - Préconditions : status == `pending`.
  - Effets email (outbox DB) : créer `emailJobs` type `reservation.refused`.

- `reservations.adminCancel(args: { reservationId: Id<"reservations">, expectedVersion: number, now: number }) -> { reservationId: Id<"reservations">, newVersion: number }`
  - Autorisation : `admin|owner`.
  - Préconditions : status in `pending|confirmed` (sinon `VALIDATION_ERROR`).
  - Effets : appeler `reservations._cancel({ cancelledBy:"admin", now, expectedVersion })`.
  - Effets email (outbox DB) : créer `emailJobs` type `reservation.cancelled`.

- `reservations.checkIn(args: { reservationId: Id<"reservations">, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }`
  - Autorisation : `staff|admin|owner`.
  - Préconditions : status == `confirmed`.

- `reservations.checkOut(args: { reservationId: Id<"reservations">, expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }`
  - Autorisation : `staff|admin|owner`.
  - Préconditions : status == `seated`.

- `floor.assignTables(args: { reservationId: Id<"reservations">, tableIds: Id<"tables">[], expectedVersion: number }) -> { reservationId: Id<"reservations">, newVersion: number }`
  - Autorisation : `admin|owner`.
  - Préconditions : status in `pending|confirmed|seated`.
  - Règles : rejeter avec `TABLE_CONFLICT` si une table est déjà assignée à une autre réservation sur le même `slotKey`.

- `floor.upsertTable(args: { tableId?: Id<"tables">, restaurantId: Id<"restaurants">, name: string, zone: "dining"|"terrace", capacity: number, gridX: number, gridY: number, isActive: boolean }) -> { tableId: Id<"tables"> }`
  - Autorisation : `admin|owner`.

- `availability.adminOverrideSlot(args: { slotKey: string, restaurantId: Id<"restaurants">, patch: { isOpen?: boolean, capacity?: number, maxGroupSize?: number|null, largeTableAllowed?: boolean } }) -> { slotKey: string }`
  - Autorisation : `owner`.

- `admin.updateSettings(args: { patch: Partial<SettingsAdmin> }) -> { ok: true }`
  - Autorisation : `owner`.

- `admin.updateSecrets(args: { patch: { turnstileSecretKey?: string } }) -> { ok: true }`
  - Autorisation : `owner`.
  - Règle : `turnstileSecretKey` n’est jamais renvoyé par aucune Query.

### 6.4 Actions (réseau externe)

- `reservations.create(args: { payload: { dateKey: string, service: "lunch"|"dinner", timeKey: string, adults: number, childrenCount: number, babyCount: number, firstName: string, lastName: string, email: string, phone: string, language: "fr"|"nl"|"en"|"de"|"it" }, turnstileToken: string, idemKey: string }) -> ({ kind: "reservation", reservationId: Id<"reservations">, status: ReservationStatus, manageUrlPath: string } | { kind: "groupRequest", groupRequestId: Id<"groupRequests"> })`
  - Turnstile : vérifier `turnstileToken` (secret via settings).
  - Rate-limit : best-effort.
    - `rateLimitKey = ip` si disponible, sinon `hash(userAgent + acceptLanguage + dayKey)`.
    - `dayKey` = `today` calculé côté serveur en timezone restaurant.
    - Note : ce n’est pas une barrière de sécurité ; Turnstile reste la barrière principale.
  - Idempotence : `idemKey` obligatoire, stockée dans `idempotencyKeys` (action `reservations.create`).
  - Règles :
    - si `partySize >= 16` => créer `groupRequests` (status `pending`) et retourner `{ kind: "groupRequest", groupRequestId }`.
    - sinon (partySize <= 15) :
      - si slot fermé (`effectiveOpen=false`) => erreur `SLOT_TAKEN` avec `meta.reason="closed"`.
      - si capacité insuffisante => erreur `INSUFFICIENT_CAPACITY`.
  - Emails :
    - si `kind="reservation"` => enqueue `emailJobs` selon statut (`confirmed` => `reservation.confirmed`, `pending` => `reservation.pending`).
    - si `kind="groupRequest"` => **DEFAULT** aucun email (le suivi est manuel).

- `groupRequests.create(args: { payload: { partySize: number, preferredDateKey: string, preferredService: "lunch"|"dinner", firstName: string, lastName: string, email: string, phone: string, message: string, language: "fr"|"nl"|"en"|"de"|"it" }, turnstileToken: string, idemKey: string }) -> { groupRequestId: Id<"groupRequests"> }`
  - Turnstile : vérifier `turnstileToken`.
  - Rate-limit : best-effort.
    - `rateLimitKey = ip` si disponible, sinon `hash(userAgent + acceptLanguage + dayKey)`.
    - `dayKey` = `today` calculé côté serveur en timezone restaurant.
    - Note : ce n’est pas une barrière de sécurité ; Turnstile reste la barrière principale.
  - Idempotence : `idemKey` obligatoire, stockée dans `idempotencyKeys` avec `action="groupRequests.create"`.
  - Validation : `partySize >= 16` sinon `VALIDATION_ERROR`.

- `reservations.cancelByToken(args: { token: string, idemKey: string }) -> { reservationId: Id<"reservations"> }`
  - Auth : par token (reservationTokens).
  - Idempotence : `idemKey` obligatoire (action `reservations.cancelByToken`).
  - Préconditions : token valide et non expiré, réservation en `pending|confirmed`.
  - Effets :
    - `now` (**DEFAULT**) = heure serveur en ms (pas d’input client).
    - lire la réservation, récupérer `_version`.
    - appeler `reservations._cancel({ reservationId, cancelledBy:"token", now, expectedVersion:_version })`.
    - invalidate token (`usedAt=now`).
  - Emails : enqueue `reservation.cancelled`.

- `email.processQueue(args: { now: number }) -> { processedCount: number }`
  - Worker : envoie les jobs `queued` dont `nextRetryAt` est null ou <= now.

- `email.sendJob(args: { jobId: Id<"emailJobs"> }) -> { ok: true }`
  - Intégration Resend : envoi réel.

### 6.5 Special Periods (admin)

Types de sortie :
- `SpecialPeriod` : `{ _id: Id<"specialPeriods">, restaurantId: Id<"restaurants">, name: string, type: "holiday"|"closure"|"event", startDate: string, endDate: string, applyRules: { status: "open"|"modified"|"closed", services: ("lunch"|"dinner")[], activeDays: number[], overrideCapacity?: number, maxGroupSize?: number|null, largeTableAllowed?: boolean }, createdBy: string, createdAt: number, updatedAt: number }`
- `PreviewImpact` : `{ totalSlots: number, affectedSlots: number, byService: { lunch: number, dinner: number }, byDate: { dateKey: string, count: number }[] }`

Queries :
- `specialPeriods.list(args: { type?: "holiday"|"closure"|"event", year?: number }) -> SpecialPeriod[]`
  - Autorisation : `admin|owner`.
  - Filtres optionnels par type et/ou année.

- `specialPeriods.get(args: { periodId: Id<"specialPeriods"> }) -> SpecialPeriod`
  - Autorisation : `admin|owner`.

- `specialPeriods.previewImpact(args: { startDate: string, endDate: string, applyRules: { status: "open"|"modified"|"closed", services: ("lunch"|"dinner")[], activeDays: number[] } }) -> PreviewImpact`
  - Autorisation : `admin|owner`.
  - Calcule le nombre de slots impactés sans créer d'overrides.

Mutations :
- `specialPeriods.create(args: { name: string, type: "holiday"|"closure"|"event", startDate: string, endDate: string, applyRules: { status: "open"|"modified"|"closed", services: ("lunch"|"dinner")[], activeDays: number[], overrideCapacity?: number, maxGroupSize?: number|null, largeTableAllowed?: boolean } }) -> { periodId: Id<"specialPeriods"> }`
  - Autorisation : `admin|owner`.
  - Validation :
    - `name` : 2-50 caractères.
    - `startDate`, `endDate` : format YYYY-MM-DD.
    - `endDate >= startDate`.
    - `endDate - startDate <= 365 jours`.
    - `services` : au moins un.
    - `activeDays` : au moins un, valeurs 1-7.
    - Chevauchement intra-type : erreur `SAME_TYPE_OVERLAP`.
  - Effets : génère les `slotOverrides` selon §5.12.

- `specialPeriods.update(args: { periodId: Id<"specialPeriods">, name?: string, startDate?: string, endDate?: string, applyRules?: { status?: "open"|"modified"|"closed", services?: ("lunch"|"dinner")[], activeDays?: number[], overrideCapacity?: number, maxGroupSize?: number|null, largeTableAllowed?: boolean } }) -> { periodId: Id<"specialPeriods"> }`
  - Autorisation : `admin|owner`.
  - Validation : mêmes règles que create.
  - Effets : supprime les anciens overrides `origin="period"` puis régénère.

- `specialPeriods.remove(args: { periodId: Id<"specialPeriods"> }) -> { ok: true }`
  - Autorisation : `admin|owner`.
  - Effets : supprime la période ET tous les `slotOverrides` avec `specialPeriodId = periodId`.

Codes d'erreur spécifiques :
- `SAME_TYPE_OVERLAP` (`messageKey`: `error.sameTypeOverlap`) : chevauchement de dates avec une période du même type.

### 6.6 Weekly Templates (admin)

Types de sortie :
- `WeeklyTemplate` : `{ _id: Id<"weeklyTemplates">, restaurantId: Id<"restaurants">, dayOfWeek: number, service: "lunch"|"dinner", isOpen: boolean, slots: { timeKey: string, capacity: number, isActive: boolean, largeTableAllowed: boolean, maxGroupSize: number|null }[], updatedAt: number, updatedBy: string }`

Queries :
- `weeklyTemplates.list(args: { }) -> WeeklyTemplate[]`
  - Autorisation : `admin|owner`.
  - Retourne tous les templates du restaurant.

- `weeklyTemplates.get(args: { dayOfWeek: number, service: "lunch"|"dinner" }) -> WeeklyTemplate | null`
  - Autorisation : `admin|owner`.

Mutations :
- `weeklyTemplates.upsert(args: { dayOfWeek: number, service: "lunch"|"dinner", isOpen: boolean, slots: { timeKey: string, capacity: number, isActive: boolean, largeTableAllowed: boolean, maxGroupSize: number|null }[] }) -> { templateId: Id<"weeklyTemplates"> }`
  - Autorisation : `owner`.
  - Validation :
    - `dayOfWeek` : 1-7.
    - `slots[].timeKey` : format `HH:MM`, unique dans le tableau.
    - `slots[].capacity` : 1-50.
  - Effets : trie `slots` par `timeKey` avant sauvegarde.

- `weeklyTemplates.addSlot(args: { dayOfWeek: number, service: "lunch"|"dinner", slot: { timeKey: string, capacity: number, isActive?: boolean, largeTableAllowed?: boolean, maxGroupSize?: number|null } }) -> { templateId: Id<"weeklyTemplates"> }`
  - Autorisation : `owner`.
  - Validation : `timeKey` ne doit pas exister (erreur `VALIDATION_ERROR` sinon).
  - Effets : ajoute le slot et trie par `timeKey`.

- `weeklyTemplates.updateSlot(args: { dayOfWeek: number, service: "lunch"|"dinner", timeKey: string, patch: { capacity?: number, isActive?: boolean, largeTableAllowed?: boolean, maxGroupSize?: number|null } }) -> { templateId: Id<"weeklyTemplates"> }`
  - Autorisation : `owner`.
  - Erreur : `NOT_FOUND` si `timeKey` n'existe pas.

- `weeklyTemplates.removeSlot(args: { dayOfWeek: number, service: "lunch"|"dinner", timeKey: string }) -> { templateId: Id<"weeklyTemplates"> }`
  - Autorisation : `owner`.
  - Erreur : `NOT_FOUND` si `timeKey` n'existe pas.

- `weeklyTemplates.toggleDay(args: { dayOfWeek: number, service: "lunch"|"dinner", isOpen: boolean }) -> { templateId: Id<"weeklyTemplates"> }`
  - Autorisation : `owner`.

- `weeklyTemplates.seedDefaults(args: { }) -> { created: number }`
  - Autorisation : `owner`.
  - Crée les 14 templates par défaut (7 jours × 2 services) s'ils n'existent pas.
  - Retourne le nombre de templates créés.

---

## 7) Cron/Jobs (Convex)

- `*/1 * * * *` : `email.processQueue({ now })`
  - Objectif : envoyer + retry (backoff DEFAULT).

- `0 3 * * *` : `jobs.dailyFinalize({ dateKey: string, now: number })` (**DEFAULT** : dateKey = “hier” en timezone restaurant)
  - Objectif :
    - si `status="confirmed"` et slot passé : `status -> noshow`, `noshowAt=now`, `_version+1`.
    - si `status="seated"` et slot passé : **DEFAULT** `status -> completed`, `completedAt=now`, `_version+1`.

- `0 4 * * *` : `jobs.cleanup({ now: number })`
  - Objectif : purge :
    - `reservationTokens` expirés (`expiresAt <= now`)
    - `idempotencyKeys` expirées (`expiresAt <= now`)
    - `emailJobs` en `sent` de plus de 90 jours (**DEFAULT**)

- `0 6 * * *` : `slots.generateFromTemplates({ daysAhead: number })` (**DEFAULT** `daysAhead=30`)
  - Objectif : générer les slots futurs depuis les templates.
  - Algorithme :
    1. Pour chaque `dateKey` dans `[today, today+daysAhead]` :
       - `dayOfWeek = getDayOfWeek(dateKey)` (ISO 1-7)
       - Pour chaque `service` (`lunch`, `dinner`) :
         - Récupérer template `(restaurantId, dayOfWeek, service)`
         - Si template inexistant ou `isOpen=false` → skip
         - Pour chaque slot actif (`isActive=true`) dans `template.slots` :
           - Construire `slotKey = ${dateKey}#${service}#${timeKey}`
           - Si slot existe déjà dans `slots` → skip (ne jamais écraser)
           - Sinon → créer slot avec valeurs du template
  - Règle : ne jamais écraser un slot existant.
  - Règle : ne jamais écraser un `slotOverride` `origin="manual"`.

---

## 8) RBAC Clerk (owner/admin/staff)

Rôles : `owner | admin | staff`.

Domaines et permissions :

- **Reservations**
  - `staff` :
    - lecture des réservations du jour (listByService) avec PII **masquée** (email et phone masqués).
      - Email masking (**DEFAULT**) :
        - split `local@domain`.
        - `localPrefix = first min(3, len(local)) chars`.
        - résultat : `${localPrefix}***@${domain}`.
        - si email invalide/absent : `"***"`.
      - Phone masking (**DEFAULT**) :
        - extraire `digits`.
        - si `len(digits) <= 3` : `"***"`.
        - sinon : `"*" * (len(digits)-3) + last3digits`.
    - check-in / check-out.
  - `admin` :
    - lecture complète PII.
    - confirmer/refuser pending.
    - annulation (adminCancel).
    - assignation tables.
  - `owner` : tout `admin` + accès settings + overrides.

- **Floor (tables)**
  - `staff` : lecture plan uniquement.
  - `admin` : upsert tables + assignation.
  - `owner` : tout.

- **Settings / Availability Overrides**
  - `staff` : aucun accès.
  - `admin` : lecture settings non sensibles uniquement.
  - `owner` : lecture/écriture complète (inclut secrets Turnstile).

Secrets :
- `turnstileSecretKey` n’est jamais renvoyé par `admin.getSettings`, `widget.getSettings`, ni aucune autre Query.

Invariant : toute route `/admin/**` exige session Clerk valide.

---

## 9) Routes UI (Next.js App Router)

### 9.1 Publiques

- `/widget?lang=fr|nl|en|de|it`
  - Contraintes iframe :
    - doit fonctionner en `<iframe>` (pas de navigation top-level imposée).
    - CSP/headers **DEFAULT** : autoriser `frame-ancestors *` en MVP (à restreindre plus tard).

- `/reservation/[token]`
  - Gestion client : affichage réservation + annulation (via action `reservations.cancelByToken`).

### 9.2 Admin

- `/admin/login` (Clerk)
- `/admin`
- `/admin/reservations`
- `/admin/floor`
- `/admin/settings`

Invariants routes :
- Toute page `/admin/**` redirige vers `/admin/login` si non authentifié.
- L’UI admin ne propose pas de création “phone/walkin”.

---

## 10) Checklist de cohérence (12 points)

1. `slotKey` est toujours `${dateKey}#${service}#${timeKey}` (aucune variante).
2. `partySize` est recalculé serveur et jamais trust du client.
3. Règles de groupe appliquées strictement : <=4 confirmed, 5–15 pending, >=16 groupRequest.
4. Toutes les erreurs UI respectent `{ code, messageKey, meta? }` et uniquement la liste section 4.
5. Turnstile est vérifié uniquement dans une Action (jamais Query/Mutation).
6. Resend est appelé uniquement dans une Action (jamais Query/Mutation).
7. Idempotence obligatoire sur `reservations.create`, `reservations.cancelByToken` et `groupRequests.create` via `idempotencyKeys`.
8. `effectiveOpen` est la règle unique d’ouverture slot : `isOpen=true` ET `capacity>0`; le DTO `Slot.isOpen` reflète `effectiveOpen`.
9. Contrainte capacité slot : somme `pending|confirmed|seated` <= `slots.capacity`.
10. Contrainte tables : aucune table assignée à 2 réservations sur le même `slotKey`.
11. Concurrence : toutes les mutations qui modifient une réservation utilisent `expectedVersion` et incrémentent `_version` (inclut `_cancel` et `adminCancel`).
12. Sécurité/PII :
    - `turnstileSecretKey` n’est jamais renvoyé par une Query ; mise à jour via `admin.updateSecrets` (owner-only).
    - rate-limit best-effort suit la clé `rateLimitKey` définie (IP sinon fingerprint).
    - `dailyFinalize` applique `confirmed->noshow` et `seated->completed`.
    - staff voit email/phone masqués selon les règles déterministes.
    - `SLOT_TAKEN.meta.reason` est renseigné à `"closed"` quand `effectiveOpen=false`.
