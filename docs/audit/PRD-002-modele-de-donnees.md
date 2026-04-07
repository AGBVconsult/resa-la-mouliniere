# PRD-002 — Modele de Donnees (Schema Convex)

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Source** : `convex/schema.ts` (696 lignes, 17 tables + 3 sous-tables)

---

## 1. Vue d'ensemble

Le schema Convex definit **20 tables** reparties en 5 domaines fonctionnels :

| Domaine | Tables |
|---------|--------|
| **Core restaurant** | `restaurants`, `settings` |
| **Reservations** | `reservations`, `reservationEvents`, `reservationTokens`, `groupRequests`, `bookingDrafts`, `idempotencyKeys` |
| **Creneaux** | `slots`, `weeklyTemplates`, `specialPeriods`, `slotOverrides` |
| **Salle & Tables** | `tables`, `assignmentLogs` |
| **CRM & Communication** | `clients`, `clientLedger`, `crmDailyFinalizations`, `clientMessages`, `tags`, `emailJobs` |

### Types enumeres partages

| Nom | Valeurs |
|-----|---------|
| `service` | `"lunch"`, `"dinner"` |
| `language` | `"fr"`, `"nl"`, `"en"`, `"de"`, `"it"`, `"es"` |
| `reservationStatus` | `"pending"`, `"confirmed"`, `"cardPlaced"`, `"seated"`, `"completed"`, `"noshow"`, `"cancelled"`, `"refused"`, `"incident"` |
| `reservationSource` | `"online"`, `"admin"`, `"phone"`, `"walkin"` |
| `tableZone` | `"salle"`, `"terrasse"`, `"dining"`(deprecated), `"terrace"`(deprecated) |
| `emailJobType` | 11 types (voir section 2.9) |
| `emailJobStatus` | `"queued"`, `"sent"`, `"failed"` |
| `groupRequestStatus` | `"pending"`, `"contacted"`, `"converted"`, `"declined"` |
| `idempotencyAction` | `"reservations.create"`, `"reservations.updateByToken"`, `"reservations.cancelByToken"`, `"groupRequests.create"` |

---

## 2. Tables detaillees

### 2.1 `restaurants`

Entite restaurant (mono-restaurant MVP).

| Champ | Type | Description |
|-------|------|-------------|
| `name` | `string` | Nom du restaurant |
| `timezone` | `string` | Fuseau IANA (defaut: `Europe/Brussels`) |
| `isActive` | `boolean` | Restaurant actif |

- **Index** : `by_isActive` sur `[isActive]`
- **Invariant** : 1 seul doc `isActive=true` en prod

---

### 2.2 `settings`

Configuration globale par restaurant (1:1 avec restaurants).

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `publicWidgetEnabled` | `boolean` | Widget public actif |
| `appUrl` | `string?` | URL base liens emails |
| `turnstileSiteKey` | `string` | Cle publique Turnstile |
| `turnstileSecretKey` | `string` | **Secret** — jamais en Query |
| `resendApiKey` | `string?` | Cle API Resend |
| `resendFromEmail` | `string` | Expediteur email |
| `resendFromName` | `string` | Nom expediteur |
| `adminNotificationEmail` | `string?` | Email notifs admin |
| `pushoverUserKey` | `string?` | Pushover User Key |
| `pushoverApiToken` | `string?` | Pushover API Token |
| `pushoverEnabled` | `boolean?` | Toggle push notifs |
| `maxPartySizeWidget` | `number` | Max groupe widget (15) |
| `manageTokenExpireBeforeSlotMs` | `number` | Offset expiration token |
| `rateLimit` | `{windowMs, maxRequests}` | Rate limiting |
| `progressiveFilling` | `object?` | Remplissage progressif |

- **Index** : `by_restaurantId` sur `[restaurantId]`

---

### 2.3 `slots`

Creneaux horaires — source de verite capacite.

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `dateKey` | `string` | Date YYYY-MM-DD |
| `service` | `service` | lunch/dinner |
| `timeKey` | `string` | Heure HH:MM |
| `slotKey` | `string` | `{dateKey}#{service}#{timeKey}` |
| `isOpen` | `boolean` | Ouvert |
| `capacity` | `number` | Capacite max |
| `maxGroupSize` | `number|null` | Max groupe |
| `largeTableAllowed` | `boolean` | Grande table |
| `updatedAt` | `number` | Timestamp MAJ |
| `createdByPeriodId` | `Id<"specialPeriods">?` | Periode creatrice |

- **Index** : `by_restaurant_slotKey`, `by_restaurant_date_service`, `by_createdByPeriodId`
- **Invariant** : `effectiveOpen = isOpen AND capacity > 0`
- **Priorite overrides** : `MANUAL > PERIOD > SLOT (base)`

---

### 2.4 `tables`

Tables physiques du plan de salle.

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `name` | `string` | Nom unique |
| `zone` | `tableZone` | Zone |
| `capacity` | `number` | Places |
| `positionX`, `positionY` | `number?` | Position grille |
| `gridX`, `gridY` | `number?` | **Deprecated** |
| `width`, `height` | `number?` | Dimensions cellules |
| `combinationDirection` | `"horizontal"|"vertical"|"none"?` | Combinaison |
| `isActive` | `boolean` | Active |
| `createdAt` | `number?` | Creation |
| `updatedAt` | `number` | MAJ |

- **Index** : `by_restaurant_name`, `by_restaurant_isActive`, `by_restaurant_zone`

---

### 2.5 `reservations`

Document central — reservation complete avec PII.

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `dateKey` | `string` | Date |
| `service` | `service` | Service |
| `timeKey` | `string` | Heure |
| `slotKey` | `string` | Cle creneau |
| `clientId` | `Id<"clients">?` | FK CRM |
| `adults` | `number` | Adultes (>=1) |
| `childrenCount` | `number` | Enfants |
| `babyCount` | `number` | Bebes |
| `partySize` | `number` | Calcule serveur |
| `firstName`, `lastName` | `string` | Nom |
| `email`, `phone` | `string` | Contact |
| `language` | `language` | Langue |
| `note` | `string?` | Note |
| `options` | `string[]?` | Options |
| `status` | `reservationStatus` | Statut |
| `source` | `reservationSource` | Origine |
| `referralSource` | `string?` | Marketing |
| `tableIds` | `Id<"tables">[]` | Tables assignees |
| `primaryTableId` | `Id<"tables">?` | Table primaire |
| `version` | `number` | Concurrence optimiste |
| `createdAt`, `updatedAt` | `number` | Timestamps |
| `cancelledAt`, `refusedAt`, `seatedAt`, `completedAt`, `noshowAt` | `number|null` | Timestamps statut |
| `markedNoshowAt` | `number|null?` | Marquage no-show |

- **Index** : `by_restaurant_slotKey`, `by_restaurant_date_service`, `by_restaurant_status`
- **Invariants** :
  1. Somme partySize actifs <= slot.capacity
  2. Pas de double-booking tables sur meme slotKey
  3. `version` incremente a chaque mutation
  4. `partySize` recalcule serveur

---

### 2.6 `reservationEvents`

Audit trail — analytics et ponctualite.

| Champ | Type | Description |
|-------|------|-------------|
| `reservationId` | `Id<"reservations">` | FK |
| `restaurantId` | `Id<"restaurants">` | FK |
| `eventType` | `"status_change"|"table_assignment"|"created"|"updated"` | Type |
| `fromStatus`, `toStatus` | `string?` | Transition |
| `scheduledTime` | `string?` | Heure prevue HH:MM |
| `actualTime` | `number` | Timestamp reel |
| `delayMinutes` | `number?` | Retard (+=tard) |
| `performedBy` | `string?` | Auteur ou "system" |
| `metadata` | `any?` | JSON libre |
| `createdAt` | `number` | Timestamp |

- **Index** : `by_reservation`, `by_restaurant_date`, `by_eventType`

---

### 2.7 `reservationTokens`

Tokens de gestion client (annulation/modification via URL).

| Champ | Type | Description |
|-------|------|-------------|
| `reservationId` | `Id<"reservations">` | FK |
| `token` | `string` | CSPRNG unique |
| `type` | `"manage"` | Type (seul existant) |
| `expiresAt` | `number` | Expiration |
| `usedAt` | `number|null` | Utilisation |
| `rotatedAt` | `number|null` | Rotation |
| `createdAt` | `number` | Creation |

- **Index** : `by_token` (unique), `by_reservation_type` (unique), `by_expiresAt`

---

### 2.8 `groupRequests`

Demandes de groupe >= 16 personnes.

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `partySize` | `number` | Taille (>=16) |
| `preferredDateKey`, `preferredService` | `string`, `service` | Preference |
| `firstName`, `lastName`, `email`, `phone` | `string` | Contact |
| `message` | `string` | Message libre |
| `language` | `language` | Langue |
| `status` | `groupRequestStatus` | Statut suivi |
| `reservationId` | `Id<"reservations">|null` | FK si convertie |
| `createdAt`, `updatedAt` | `number` | Timestamps |

- **Index** : `by_restaurant_status`, `by_restaurant_preferredDate`

---

### 2.9 `emailJobs`

Queue d'envoi email (outbox pattern + retry backoff).

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `type` | `emailJobType` | Type email |
| `to` | `string` | Destinataire |
| `subjectKey`, `templateKey` | `string` | Cles i18n |
| `templateData` | `any` | Donnees template |
| `icsBase64` | `string|null` | Piece jointe ICS |
| `status` | `emailJobStatus` | queued/sent/failed |
| `attemptCount` | `number` | Tentatives |
| `nextRetryAt` | `number|null` | Prochain retry |
| `lastAttemptAt` | `number|null` | Dernier essai |
| `lastErrorCode` | `string|null` | Code erreur |
| `dedupeKey` | `string` | Deduplication (unique) |
| `createdAt`, `updatedAt` | `number` | Timestamps |

- **Index** : `by_status_nextRetryAt`, `by_dedupeKey` (unique)
- **Types email** : `reservation.confirmed`, `.pending`, `.validated`, `.refused`, `.cancelled`, `.modified`, `.reminder`, `.noshow`, `.review`, `.cancelled_by_restaurant`, `admin.notification`

---

### 2.10 `idempotencyKeys`

Idempotence stricte des actions publiques.

| Champ | Type | Description |
|-------|------|-------------|
| `key` | `string` | Cle unique client |
| `action` | `idempotencyAction` | Action |
| `requestHash` | `string` | SHA-256 inputs |
| `resultData` | `any` | Resultat stocke |
| `expiresAt` | `number` | Expiration |
| `createdAt` | `number` | Creation |

- **Index** : `by_key` (unique), `by_expiresAt`

---

### 2.11 `specialPeriods`

Periodes speciales (vacances, fermetures, evenements).

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `name` | `string` | 2-50 car. |
| `type` | `"holiday"|"closure"|"event"` | Type |
| `startDate`, `endDate` | `string` | YYYY-MM-DD (max 365j) |
| `applyRules` | `object` | Regles d'application |
| `.status` | `"open"|"modified"|"closed"` | Effet creneaux |
| `.services` | `service[]` | Services concernes |
| `.activeDays` | `number[]` | Jours ISO 1-7 |
| `.overrideCapacity` | `number?` | Capacite override |
| `.maxGroupSize` | `number|null?` | Max groupe |
| `.lunchSlots`, `.dinnerSlots` | `SlotConfig[]?` | Creneaux custom |
| `.lunchActiveDays`, `.dinnerActiveDays` | `number[]?` | Jours par service |
| `createdBy` | `string` | Auteur |
| `stats` | `object?` | Statistiques |
| `deletedAt`, `deletedBy` | `number?`, `string?` | Soft delete |
| `notes`, `tags` | `string?`, `string[]?` | Meta |
| `isRecurring` | `boolean?` | Annuel |
| `recurringSourceId` | `Id?` | Periode source |
| `createdAt`, `updatedAt` | `number` | Timestamps |

- **Index** : `by_restaurant`, `by_restaurant_type`, `by_restaurant_dates`

---

### 2.12 `slotOverrides`

Overrides par creneau (manuels ou periodes).

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `slotKey` | `string` | Cle creneau |
| `origin` | `"manual"|"period"` | Source |
| `patch` | `{isOpen?, capacity?, maxGroupSize?, largeTableAllowed?}` | Patch |
| `specialPeriodId` | `Id<"specialPeriods">?` | FK (si period) |
| `createdAt`, `updatedAt` | `number` | Timestamps |

- **Index** : `by_restaurant_slotKey`, `by_restaurant_origin`, `by_specialPeriodId`
- **Priorite** : `MANUAL > PERIOD > SLOT base`

---

### 2.13 `weeklyTemplates`

Templates hebdomadaires pour generation automatique.

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `dayOfWeek` | `number` | 1-7 (ISO: 1=Lun) |
| `service` | `service` | Service |
| `isOpen` | `boolean` | Ouvert |
| `slots[]` | `array` | Liste creneaux |
| `.timeKey` | `string` | HH:MM |
| `.capacity` | `number` | 1-50 |
| `.isActive` | `boolean` | Actif |
| `.largeTableAllowed` | `boolean` | Grande table |
| `.maxGroupSize` | `number|null` | Max groupe |
| `updatedAt` | `number` | MAJ |
| `updatedBy` | `string` | Auteur |

- **Index** : `by_restaurant`, `by_restaurant_day_service` (unique logique)
- **Invariant** : 14 templates max (7j x 2 services), slots tries par timeKey

---

### 2.14 `clients`

Fiche CRM client complete.

| Champ | Type | Description |
|-------|------|-------------|
| `primaryPhone` | `string` | Identifiant unique |
| `phones` | `string[]?` | Telephones secondaires |
| `firstName`, `lastName` | `string?` | Nom |
| `email` | `string?` | Email principal |
| `emails` | `string[]?` | Emails secondaires |
| `searchText` | `string` | Full-text normalise |
| `preferredLanguage` | `language?` | Langue preferee |
| **Compteurs** | | |
| `totalVisits`, `totalNoShows`, `totalRehabilitatedNoShows` | `number` | Stats visites |
| `totalCancellations`, `totalLateCancellations` | `number` | Stats annulations |
| `totalDeparturesBeforeOrder` | `number` | Departs |
| `totalReservations` | `number?` | Total |
| **Scoring** | | |
| `score` | `number` | visits*10 - noshows*50 - lateCancels*20 |
| `scoreVersion` | `string` | Version algo |
| `scoreBreakdown` | `object?` | Detail |
| `clientStatus` | `"new"|"regular"|"vip"|"bad_guest"` | Statut |
| `isBlacklisted` | `boolean?` | Blackliste |
| **Preferences** | | |
| `dietaryRestrictions`, `preferredZone`, `preferredTable` | various | Preferences |
| `preferredTableId`, `preferredService` | various | Preferences FK |
| `tags` | `string[]?` | Tags |
| `notes` | `Note[]?` | Notes (preference/incident/info/alert) |
| **Comportement** | | |
| `avgPartySize`, `avgMealDurationMinutes`, `avgDelayMinutes` | `number?` | Moyennes |
| `isLateClient`, `isSlowClient` | `boolean?` | Flags |
| `lastTableId` | `Id<"tables">?` | Derniere table |
| **Marketing** | | |
| `marketingConsent`, `acquisitionSource` | various | Marketing |
| **Lifecycle** | | |
| `needsRebuild`, `deletedAt`, `deletedBy` | various | Admin |
| `firstSeenAt`, `lastVisitAt`, `lastUpdatedAt` | `number` | Dates |

- **Index** : `by_primaryPhone` (unique), `by_email`, `by_lastVisitAt`, `by_score`, `by_status`, `by_needsRebuild`, `by_deletedAt`
- **Search index** : `search_client` sur `searchText` filtrable par `clientStatus`, `preferredLanguage`, `deletedAt`
- **Statut** : new (<3 visites), regular (>=3), vip (>=5 + 0 noshows), bad_guest (>=2 noshows ou blackliste)

---

### 2.15 `crmDailyFinalizations`

Suivi finalisations CRM quotidiennes.

| Champ | Type | Description |
|-------|------|-------------|
| `dateKey` | `string` | Date traitee |
| `status` | `"running"|"success"|"failed"` | Statut |
| `leaseExpiresAt` | `number` | Lock |
| `lockOwner` | `string?` | Proprietaire |
| `startedAt`, `finishedAt` | `number` | Timestamps |
| `processedReservations`, `processedClients` | `number` | Compteurs |
| `errorMessage` | `string?` | Erreur |
| `attempt` | `number` | Tentative |
| `version` | `string` | Version CRM |

- **Index** : `by_dateKey`, `by_status`

---

### 2.16 `clientLedger`

Journal des outcomes — source de verite scoring.

| Champ | Type | Description |
|-------|------|-------------|
| `dateKey` | `string` | Date |
| `clientId` | `Id<"clients">` | FK |
| `reservationId` | `Id<"reservations">` | FK |
| `outcome` | `"completed"|"completed_rehabilitated"|"noshow"|"cancelled"|"late_cancelled"|"departure_before_order"` | Resultat |
| `points` | `number` | Points |
| `createdAt` | `number` | Timestamp |

- **Index** : `by_clientId`, `by_dateKey`, `by_reservationId`
- **Points** : completed=+10, rehabilitated=+10, noshow=-50, late_cancelled=-20, cancelled=0, departure=0

---

### 2.17 `assignmentLogs`

Logs attribution tables — shadow learning ML (Phase 2).

Champs principaux :
- **Versioning** : `schemaVersion=4`, `scoringVersion` (V0/V1/V2)
- **Reservation snapshot** : restaurantId, reservationId, date, time, service, partySize, partySizeCategory, children/babies
- **Tables snapshot** : `tablesSnapshot` (available/taken counts, hash, IDs)
- **Service occupancy** : totalCovers, totalCapacity, occupancyRate, zoneOccupancies
- **Choix humain** : assignedTables, names, zone, capacity, isAdjacent, assignedBy, method (manual_click/suggestion_accepted/auto_vip/full_auto)
- **ML Prediction** (optional) : predictedSet, confidence, alternatives, scoringDetails
- **Shadow metrics** (optional) : exactSetMatch, partialMatchRatio, adjacencyMatch, zoneMatch, errorSeverity
- **Feedback** (optional) : outcome, timestamps, tableChanged

- **Index** : `by_reservation`, `by_date`, `by_date_service`, `by_scoring_version`, `by_zone`, `by_created`

---

### 2.18 `bookingDrafts`

Brouillons de reservation (tracking abandons).

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `sessionId` | `string` | ID session widget |
| `firstName`...`phone` | `string` | Contact |
| `adults`, `childrenCount`, `babyCount` | `number` | Composition |
| `dateKey`, `service`, `timeKey` | optional | Choix |
| `lastStep` | `number` | Etape atteinte |
| `referralSource` | `string?` | Marketing |
| `expiresAt` | `number` | Auto-expiration 7j |

- **Index** : `by_sessionId` (unique), `by_restaurant_date`, `by_expiresAt`

---

### 2.19 `clientMessages`

Messages bidirectionnels restaurant-client.

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | `Id<"restaurants">` | FK |
| `clientId` | `Id<"clients">` | FK |
| `direction` | `"outbound"|"inbound"` | Sens |
| `body` | `string` | Contenu |
| `emailMessageId` | `string?` | ID Resend |
| `emailTo` | `string?` | Destinataire |
| `emailStatus` | `"sent"|"delivered"|"failed"?` | Statut |
| `sentBy` | `string?` | Auteur (outbound) |
| `createdAt` | `number` | Timestamp |

- **Index** : `by_client`, `by_restaurant_client`, `by_emailMessageId`

---

### 2.20 `tags`

Tags globaux partages pour clients.

| Champ | Type | Description |
|-------|------|-------------|
| `name` | `string` | Nom unique |
| `createdAt` | `number` | Creation |
| `createdBy` | `string?` | Auteur |

- **Index** : `by_name` (unique)

---

## 3. Relations principales

```
restaurants ──1:1──► settings
     │
     ├──1:N──► slots ◄──── slotOverrides (par slotKey)
     │              ▲
     │              │ (generation)
     │    weeklyTemplates ─────┘
     │              ▲
     │              │ (overrides)
     │    specialPeriods ──► slotOverrides (origin=period)
     │
     ├──1:N──► tables ──► assignmentLogs
     │
     ├──1:N──► reservations ──► reservationEvents
     │              │           ──► reservationTokens
     │              │           ──► bookingDrafts (pre-reservation)
     │              │           ──► groupRequests (>=16 pers.)
     │              │
     │              └───────────► emailJobs (notifications)
     │
     └──1:N──► clients ──► clientLedger
                    │      ──► clientMessages
                    │      ──► tags (many-to-many via array)
                    │
                    └──── idempotencyKeys (transversal)
                    └──── crmDailyFinalizations (orchestration)
```

---

## 4. Formats cles

| Format | Pattern | Exemple |
|--------|---------|---------|
| `dateKey` | `YYYY-MM-DD` | `2026-04-07` |
| `timeKey` | `HH:MM` | `19:30` |
| `slotKey` | `{dateKey}#{service}#{timeKey}` | `2026-04-07#dinner#19:30` |
| `dedupeKey` (email) | `{reservationId}#{type}#{version}` | `abc123#reservation.confirmed#1` |

---

*Document genere le 2026-04-07 — Etat exact du schema Convex.*
