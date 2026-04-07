# PRD-007 — Emails, Notifications & CRM

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Sources** : `convex/emails.ts` (988 lignes), `convex/notifications.ts` (123 lignes), `convex/clients.ts` (1005 lignes), `convex/lib/email/`, `convex/lib/pushover.ts`

---

## 1. Vue d'ensemble

Le systeme de communication et CRM comprend 3 sous-systemes :

1. **Queue d'emails** : Queue asynchrone avec retry, deduplication, templates multilangues
2. **Notifications push** : Pushover pour alertes admin en temps reel
3. **CRM clients** : Gestion fiches client, scoring, historique, notes

---

## 2. Queue d'emails

### 2.1 Architecture

```
Declencheur (mutation) → enqueue(emailJob) → scheduler(processQueue, 100ms)
                              │
                              ▼
                    emailJobs table (status: queued)
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            processQueue (Action)   Cron toutes les 2 min
                    │
                    ▼
            renderTemplate(type, lang, data) → HTML
                    │
                    ▼
            sendEmail(resendApiKey, {from, to, subject, html})
                    │
              ┌─────┴─────┐
              ▼           ▼
          _markSent    _markFailure → retry avec backoff
```

### 2.2 Types d'emails

| Type | Declencheur | Moment |
|------|-------------|--------|
| `reservation.confirmed` | `_create` (partySize <= 4) ou `updateByToken` | Immediat |
| `reservation.pending` | `_create` (partySize 5-15) | Immediat |
| `reservation.validated` | `admin.updateReservation` (pending → confirmed) | Immediat |
| `reservation.refused` | `admin.updateReservation` (→ refused) | Immediat |
| `reservation.cancelled` | `cancelByToken` ou `admin.cancelByClient` | Immediat |
| `reservation.cancelled_by_restaurant` | `admin.updateReservation` (→ cancelled) | Immediat |
| `reservation.modified` | `updateByToken` | Immediat |
| `reservation.reminder` | Cron `enqueueReminders` | H-2 avant reservation |
| `reservation.noshow` | Cron `sendNoshowEmails` | Batch 16h et 22h |
| `reservation.review` | Cron `enqueueReviewEmails` | J+1 a 06:30 |
| `admin.notification` | `_create` (si pending + email configure) | Immediat |

### 2.3 Idempotence (deduplication)

Chaque email a un `dedupeKey` unique :

| Format | Exemple |
|--------|---------|
| `email:{type}:{reservationId}:{version}` | `email:reservation.confirmed:abc123:1` |
| `reminder:{reservationId}` | `reminder:abc123` |
| `review:{reservationId}` | `review:abc123` |

Si un job avec le meme `dedupeKey` existe (queued ou sent), l'insertion retourne le job existant sans creer de doublon.

### 2.4 Lifecycle d'un emailJob

```
queued → (processQueue) → sent
                        → failed (apres MAX_ATTEMPTS)
                        → queued (retry avec backoff)
```

**Retry** :
- Backoff exponentiel (`computeBackoffMs`)
- Maximum `MAX_ATTEMPTS` tentatives
- `shouldMarkFailed()` determine si on abandonne
- Rate limit Resend respecte : 600ms entre chaque envoi

### 2.5 Rendering

```typescript
renderTemplate(type: EmailJobType, language: Language, data: TemplateData)
→ { subject: string, html: string }
```

- Templates HTML par type et langue
- Donnees contextuelles : nom, date, heure, liens de gestion
- Liens : `manageUrl`, `editUrl`, `cancelUrl` (base sur `appUrl` + token)

### 2.6 Envoi (Resend)

```typescript
sendEmail(apiKey, { from, to, subject, html })
→ { success: boolean, messageId?: string, errorCode?: string }
```

- Provider : **Resend** (API HTTP)
- From : `{resendFromName} <{resendFromEmail}>` (ex: "La Mouliniere <no-reply@...>")
- Rate limit : 2 req/s → delai 600ms entre envois

### 2.7 Operations automatisees

| Operation | Cron | Description |
|-----------|------|-------------|
| `enqueueReminders` | Toutes les 15 min | Rappels H-2 pour reservations confirmees |
| `sendNoshowEmails` | 16h et 22h | Emails no-show differes (permet correction erreur) |
| `enqueueReviewEmails` | 06:30 | Avis J+1 pour reservations completees hier |
| `processQueue` | Toutes les 2 min | Traitement queue + trigger immediat a l'enqueue |
| `cleanup` | Quotidien | Suppression sent > 90 jours, failed > retention |
| `reaper` | Toutes les 5 min | Reset jobs bloques (stuck > 10 min) |

### 2.8 Rappels (H-2)

- **Fenetre** : reservation entre now+1h45 et now+2h15 (30 min de marge)
- **Filtre** : status `confirmed` uniquement, date du jour
- **Deduplication** : `reminder:{reservationId}` — un seul rappel par reservation

### 2.9 Emails no-show

- **Differes** : Pas d'email immediat au marquage no-show
- **Raison** : Permet a l'admin de corriger une erreur avant envoi
- **Batch** : 16h (fin lunch) et 22h (fin dinner)
- **Filtre** : status `noshow`, date du jour

### 2.10 Emails avis (review)

- **Timing** : J+1 a 06:30
- **Filtre** : status `completed`, date hier
- **Exclusions** : Reservations ayant eu un statut noshow, cancelled, refused, ou incident dans leur historique
- **Deduplication** : `review:{reservationId}`

### 2.11 Cleanup et reaper

**Cleanup** :
- Supprime `sent` > 90 jours
- Supprime `failed` > retention configuree
- Batch de 200, se re-schedule si batch plein

**Reaper** :
- Detecte jobs stuck (queued + lastAttemptAt > 10 min)
- Si max attempts → mark failed avec `REAPER_STUCK_MAX_ATTEMPTS`
- Sinon → reset nextRetryAt=now pour retry immediat

### 2.12 Stats operationnelles

`emails.getOpsStats` retourne :
- Nombre queued, sent, failed (cap 1000)
- Estimation stuck jobs
- Failures recentes (24h)

---

## 3. Notifications push (Pushover)

### 3.1 Configuration

| Setting | Description |
|---------|-------------|
| `pushoverEnabled` | Activer/desactiver les notifications |
| `pushoverUserKey` | Cle utilisateur Pushover |
| `pushoverApiToken` | Token API application |

### 3.2 Types de notifications

| Type | Titre | Son | Priorite |
|------|-------|-----|---------|
| `pending_reservation` | "Reservation en attente" | `cashregister` | 1 (high) |
| `cancellation` | "Annulation" | `falling` | 1 |
| `modification` | "Modification" | `bike` | 1 |

**Priorite 1** = bypass "Ne pas deranger" sur iPhone.

### 3.3 Contenu

```
{Nom} — {partySize} pers.
{DD/MM} a {HH:MM}
{note si presente}
```

Avec lien vers `{appUrl}/admin/reservations?date={dateKey}`.

### 3.4 Declenchement

Via `ctx.scheduler.runAfter(0, internal.notifications.sendAdminPushNotification, ...)` depuis les mutations de reservation.

---

## 4. CRM Clients

### 4.1 Modele client

**Cle primaire** : `primaryPhone` (index unique normalise)

**Champs principaux** :
- Identite : firstName, lastName, primaryPhone, phones[], email, emails[]
- CRM : clientStatus, score, scoreVersion, scoreBreakdown
- Compteurs : totalVisits, totalNoShows, totalCancellations, totalLateCancellations, totalRehabilitatedNoShows, totalDeparturesBeforeOrder
- Preferences : preferredLanguage, preferredZone, preferredTable, dietaryRestrictions[]
- Comportement : isLateClient, isSlowClient, isBlacklisted
- Agregations : totalReservations, avgPartySize, avgMealDurationMinutes, avgDelayMinutes
- Notes : notes[] (max 50), tags[]
- RGPD : marketingConsent, deletedAt (soft delete)
- Recherche : searchText (full-text normalise NFD)

### 4.2 Scoring (v1)

```typescript
score = (totalVisits × 10) + (totalNoShows × -50) + (totalLateCancellations × -20)
```

| Metrique | Points |
|----------|--------|
| Visite completee | +10 |
| No-show | -50 |
| Annulation tardive | -20 |

### 4.3 Statuts client

| Statut | Condition |
|--------|-----------|
| `bad_guest` | isBlacklisted OU totalNoShows >= 2 |
| `vip` | totalVisits >= 5 ET totalNoShows === 0 |
| `regular` | totalVisits >= 3 |
| `new` | Defaut |

Evaluation dans cet ordre (bad_guest prioritaire).

### 4.4 Endpoints CRM

| Endpoint | Auth | Description |
|----------|------|-------------|
| `clients.list` | staff | Liste paginee avec filtres (status, needsRebuild) |
| `clients.get` | staff | Detail client + 50 dernieres reservations |
| `clients.getByPhone` | staff | Lookup par telephone |
| `clients.search` | staff | Recherche full-text (nom, email, telephone) |
| `clients.getOrCreate` | staff | Upsert par telephone |
| `clients.update` | manager | MAJ champs client |
| `clients.addNote` | staff | Ajouter une note (preference/incident/info/alert) |
| `clients.deleteNote` | manager | Supprimer une note |
| `clients.rebuildStats` | admin | Recalcul complet depuis ledger + reservations |
| `clients.merge` | admin | Fusionner deux fiches (reservations + ledger transferes) |
| `clients.delete` | admin | Soft delete avec raison |
| `clients.export` | admin | Export donnees client (RGPD) |
| `clients.importFromCSV` | admin | Import CSV (upsert par telephone) |
| `clients.listAllTags` | staff | Tags uniques utilises |

### 4.5 Roles et masquage

| Role | Telephone | Acces |
|------|-----------|-------|
| `staff` | Masque (`+324** ***`) | Lecture seule (partiel) |
| `manager` | Complet | Lecture + modification |
| `admin` | Complet | Tout (merge, delete, export, import) |

### 4.6 Notes client

| Champ | Description |
|-------|-------------|
| `id` | UUID genere (`timestamp-random`) |
| `content` | Texte (1-1000 caracteres) |
| `type` | preference / incident / info / alert |
| `author` | Subject du JWT |
| `createdAt` | Timestamp |

Maximum 50 notes (FIFO — les plus anciennes sont supprimees).

### 4.7 Fusion de clients (`merge`)

1. Fusionner telephones et emails (Set union)
2. Transferer toutes les reservations du source vers target
3. Transferer tous les ledger entries du source vers target
4. Soft-delete source (deletedAt, reason="merged")
5. Flag target `needsRebuild = true`
6. Log audit CRM

### 4.8 Rebuild stats (`rebuildStats`)

Recalcul complet depuis les donnees brutes :

1. **Depuis clientLedger** : totalVisits, totalNoShows, totalCancellations, etc.
2. **Depuis reservations** :
   - totalReservations
   - lastTableId, preferredTableId (table la plus frequente)
   - preferredService (lunch/dinner le plus frequent)
   - avgPartySize
   - avgMealDurationMinutes (completedAt - seatedAt)
   - avgDelayMinutes (depuis reservationEvents "seated")
3. **Score et status** recalcules
4. `needsRebuild = false`

### 4.9 Import CSV

Colonnes attendues : Prenom, Nom, Telephone_International, email, Reservations

- Upsert par telephone (cle primaire)
- Client existant : merge emails, max(totalVisits)
- Nouveau client : creation avec score calcule
- Retour : `{ created, updated, errors[] }`

### 4.10 Flag `needsRebuild`

Ce flag est active quand :
- Reservation antedatee modifiee (changement statut sur reservation passee)
- Fusion manuelle de clients
- Changement detecte necessitant recalcul

L'admin peut filtrer `needsRebuild: true` dans la liste clients et declencher `rebuildStats` individuellement.

---

## 5. Client Ledger

Table `clientLedger` — journal d'evenements CRM :

| Champ | Description |
|-------|-------------|
| `clientId` | Reference client |
| `reservationId` | Reference reservation |
| `outcome` | completed / noshow / cancelled / late_cancelled / completed_rehabilitated / departure_before_order |
| `dateKey` | Date de la reservation |
| `source` | "cron" / "admin" |
| `createdAt` | Timestamp |

Alimente par le cron `dailyFinalize` (voir PRD-011).

---

## 6. Invariants

1. Un email ne peut etre envoye qu'une seule fois par `dedupeKey`
2. Les emails no-show sont toujours differes (jamais immediats)
3. Le scoring v1 est deterministe et reproductible depuis le ledger
4. Le telephone est la cle primaire client (normalise +digits)
5. Le soft delete preserve toutes les donnees (RGPD export possible)
6. Les notes sont limitees a 50 par client (FIFO)
7. La recherche full-text utilise `searchText` normalise (NFD, lowercase, trim)
8. Pushover priority=1 bypass le mode silencieux

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
