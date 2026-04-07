# PRD-011 — Crons, Jobs & Maintenance

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Sources** : `convex/crons.ts` (122 lignes), `convex/jobs.ts` (187 lignes), `convex/crm.ts` (657 lignes), `convex/weeklyTemplates.ts` (generateFromTemplates)

---

## 1. Vue d'ensemble

Le systeme utilise les cron jobs natifs Convex pour planifier des taches de maintenance automatiques. Les jobs couvrent 4 domaines :

1. **Emails** : Queue processing, rappels, avis, no-show, cleanup, reaper
2. **Reservations** : Finalisation quotidienne (noshow/completed)
3. **CRM** : Finalisation clients, purge RGPD
4. **Slots** : Generation depuis templates hebdomadaires

---

## 2. Tableau des crons

| Nom | Schedule | Handler | Description |
|-----|----------|---------|-------------|
| `process-email-queue` | Toutes les 1 min | `emails.processQueue` | Traitement queue emails |
| `enqueue-reminders` | Toutes les 15 min | `emails.enqueueReminders` | Rappels H-2 |
| `enqueue-reviews` | 06:30 UTC | `emails.enqueueReviewEmails` | Avis J+1 |
| `email-cleanup` | 04:00 UTC | `emails.cleanup` | Nettoyage emails >90j |
| `email-reaper` | Toutes les 1h | `emails.reaper` | Reset jobs bloques |
| `daily-finalize` | 03:00 UTC | `jobs.dailyFinalize` | confirmed→noshow, seated→completed |
| `send-noshow-emails-afternoon` | 15:00 UTC (~16h BE) | `emails.sendNoshowEmails` | Emails no-show batch |
| `send-noshow-emails-evening` | 21:00 UTC (~22h BE) | `emails.sendNoshowEmails` | Emails no-show batch |
| `daily-cleanup` | 04:00 UTC | `jobs.cleanup` | Purge tokens/idempotency expires |
| `crm-nightly-check` | Toutes les 1h (min 0) | `crm.nightlyCheck` | Finalisation CRM (execute a 4h locale) |
| `crm-purge-old-clients` | 1er du mois, 02:00 UTC | `crm.purgeOldClients` | Anonymisation RGPD 3 ans |
| `generate-slots-from-templates` | 01:00 UTC | `weeklyTemplates.generateFromTemplates` | Generation slots 180 jours |

---

## 3. Daily Finalize (`jobs.dailyFinalize`)

### 3.1 Execution

- **Heure** : 03:00 UTC (04:00 heure locale Bruxelles en hiver)
- **Scope** : Reservations de la veille

### 3.2 Actions

| Statut source | Statut cible | Raison |
|---------------|-------------|--------|
| `confirmed` (hier) | `noshow` | Client ne s'est pas presente |
| `seated` (hier) | `completed` | Service termine (auto-close) |

### 3.3 Details

Pour chaque reservation modifiee :
- Patch du statut + timestamp (`noshowAt`/`markedNoshowAt`/`completedAt`)
- Increment `version`
- Insert `reservationEvent` (performedBy: "system", metadata: raison)

### 3.4 Note sur `markedNoshowAt`

Le champ `markedNoshowAt` est specifiquement set par dailyFinalize. Il permet de distinguer un noshow automatique (cron) d'un noshow manuel (admin). Ce champ est utilise par le CRM pour detecter les "completed_rehabilitated" (reservation marquee noshow puis remise en completed).

---

## 4. Cleanup (`jobs.cleanup`)

### 4.1 Execution

- **Heure** : 04:00 UTC quotidien
- **Batch** : 500 elements max par type

### 4.2 Actions

| Cible | Condition | Action |
|-------|-----------|--------|
| `reservationTokens` | `expiresAt < now` | Delete |
| `idempotencyKeys` | `expiresAt < now` | Delete |

---

## 5. CRM Nightly Check (`crm.nightlyCheck`)

### 5.1 Mecanisme DST-safe

Le cron tourne **toutes les heures** en UTC. Le handler verifie l'heure locale :

```typescript
const brusselsHour = getHourInTimezone(new Date(now), timezone);
if (brusselsHour !== 4) return { skipped: true };
```

Cela garantit l'execution a 4h heure locale quelle que soit l'heure d'ete/hiver.

### 5.2 Catch-up

`finalizeWithCatchUp()` detecte les jours manques (max 7 jours) :
1. Recupere la derniere `crmDailyFinalizations` en status "success"
2. Calcule les dates manquantes entre `lastSuccess + 1` et `yesterday`
3. Traite chaque date manquee sequentiellement

### 5.3 Locking (lease)

Chaque date est protegee par un systeme de lease :

| Champ | Valeur |
|-------|--------|
| `LEASE_DURATION_MS` | 15 minutes |
| `lockOwner` | "crm" |
| `status` | running / success / failed |

Si un job est `running` et le lease est expire → reprise.
Si un job est `failed` → retry avec increment `attempt`.

### 5.4 Table `crmDailyFinalizations`

| Champ | Description |
|-------|-------------|
| `dateKey` | Date traitee |
| `status` | running / success / failed |
| `leaseExpiresAt` | Expiration du lease |
| `lockOwner` | Proprietaire du lock |
| `startedAt` | Debut traitement |
| `finishedAt` | Fin traitement |
| `processedReservations` | Nombre de reservations traitees |
| `processedClients` | Nombre de clients mis a jour |
| `attempt` | Numero de tentative |
| `version` | Version CRM (v2.2) |
| `errorMessage` | Message erreur si failed |

### 5.5 Traitement par reservation (`processDateReservations`)

Pour chaque reservation du dateKey :

1. **Skip** si pas de telephone
2. **Skip** si ledger entry existe deja pour cette reservation (idempotent)
3. **getOrCreate** client par telephone
4. **Determiner outcome** :

| Status reservation | Outcome ledger |
|-------------------|----------------|
| `completed` (sans markedNoshowAt) | `completed` |
| `completed` (avec markedNoshowAt) | `completed_rehabilitated` |
| `noshow` | `noshow` |
| `cancelled` (seated→cancelled) | `departure_before_order` |
| `cancelled` (isLateCancellation) | `late_cancelled` |
| `cancelled` (autre) | `cancelled` |

5. **Insert** `clientLedger` entry avec points
6. **Recalculer** stats client (incrementales, pas rebuild complet)

### 5.6 Calcul des stats client

Apres le ledger, pour chaque client touche :
- **Totals** : incrementation depuis les entries du jour
- **Aggregations** recalculees depuis toutes les reservations :
  - `totalReservations`
  - `lastTableId`, `preferredTableId` (table la plus frequente)
  - `preferredService` (lunch/dinner)
  - `avgPartySize`
  - `avgMealDurationMinutes` (15-480 min, exclusion aberrations)
  - `avgDelayMinutes` (depuis reservationEvents seated)
- **Score** et **clientStatus** recalcules

### 5.7 Points par outcome

| Outcome | Points |
|---------|--------|
| `completed` | +10 |
| `completed_rehabilitated` | +10 |
| `noshow` | -50 |
| `late_cancelled` | -20 |
| `cancelled` | 0 |
| `departure_before_order` | 0 |

---

## 6. Purge RGPD (`crm.purgeOldClients`)

### 6.1 Execution

- **Schedule** : 1er du mois, 02:00 UTC
- **Seuil** : Clients sans visite depuis 3 ans

### 6.2 Anonymisation

```typescript
{
  firstName: "ANONYMISE",
  lastName: "ANONYMISE",
  email: undefined,
  primaryPhone: `ANON-${client._id}`,
  phones: [],
  emails: [],
  notes: [],
  searchText: "",
  deletedAt: now,
  deletionReason: "purge_3y",
}
```

### 6.3 Nettoyage associe

- Suppression des `clientLedger` entries du client
- Suppression des `crmDailyFinalizations` de plus de 90 jours

---

## 7. Generation de slots (`weeklyTemplates.generateFromTemplates`)

### 7.1 Execution

- **Heure** : 01:00 UTC quotidien
- **Horizon** : 180 jours (6 mois)

### 7.2 Algorithme

Pour chaque jour dans [today, today+180] :
1. Determiner le jour de la semaine (ISO: 1=lundi)
2. Pour chaque service (lunch, dinner) :
3. Chercher le template hebdomadaire correspondant
4. Si template absent ou ferme → skip
5. Pour chaque slot actif du template :
   - Si slot existe deja + a un override → skip
   - Si slot existe deja + cree par period → skip
   - Si slot existe deja + besoin de MAJ → patch
   - Si slot n'existe pas → insert

### 7.3 Protection des overrides

La generation respecte les overrides existants :
- Override manual → slot non touche
- Override period → slot non touche
- Slot cree par `createdByPeriodId` → slot non touche

### 7.4 `ensureSlotsForDate` (lazy)

Mutation appelee a la demande (ouverture DaySettingsPopup, navigation par date) :
- Meme logique que `generateFromTemplates` mais pour une seule date
- Ferme les slots dont le template n'existe plus (sans supprimer, car reservations possibles)
- Cree les slots manquants
- Met a jour les slots existants si le template a change

---

## 8. Force Finalize (`crm.forceFinalize`)

Mutation interne pour traitement manuel d'une date specifique :

```typescript
crm.forceFinalize({ dateKey: "2026-04-05" })
```

Usage : correction apres incident, retraitement d'un jour manque.

---

## 9. Chronologie quotidienne

| Heure (BE) | Job | Description |
|------------|-----|-------------|
| 02:00 | `generate-slots-from-templates` | Generation slots 180j |
| 04:00 | `daily-finalize` | confirmed→noshow, seated→completed |
| ~04:00 | `crm-nightly-check` | Finalisation CRM + catch-up |
| 05:00 | `email-cleanup` + `daily-cleanup` | Nettoyage emails, tokens, idempotency |
| 07:30 | `enqueue-reviews` | Avis J+1 pour completed d'hier |
| continu | `process-email-queue` (1min) | Envoi emails |
| continu | `enqueue-reminders` (15min) | Rappels H-2 |
| continu | `email-reaper` (1h) | Reset jobs bloques |
| ~16:00 | `send-noshow-emails-afternoon` | Emails no-show lunch |
| ~22:00 | `send-noshow-emails-evening` | Emails no-show dinner |

---

## 10. Invariants

1. `dailyFinalize` ne traite que les reservations de la veille (pas du jour meme)
2. Les emails no-show sont toujours differes (16h et 22h, jamais immediats)
3. Le CRM catch-up couvre max 7 jours de retard
4. Le lease CRM expire apres 15 minutes (protection contre crash)
5. La purge RGPD anonymise au lieu de supprimer (conservation structure)
6. La generation de slots respecte les overrides manuels et periodes
7. `ensureSlotsForDate` ferme les slots obsoletes au lieu de les supprimer
8. Les crons UTC sont adaptes a l'heure locale via verification dans le handler (DST-safe)

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
