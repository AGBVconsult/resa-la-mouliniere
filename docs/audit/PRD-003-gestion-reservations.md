# PRD-003 — Gestion des Reservations

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Source** : `convex/reservations.ts` (1327 lignes), `convex/lib/stateMachine.ts`, `convex/lib/errors.ts`

---

## 1. Vue d'ensemble

Le module de reservations est le coeur du systeme. Il gere :
- La creation de reservations (widget client + admin)
- La modification par le client via token
- L'annulation (client via token ou admin)
- Les transitions de statut (machine d'etats)
- La gestion de la concurrence optimiste (version)
- L'integration CRM (creation/mise a jour automatique de fiche client)
- Les notifications (emails + push Pushover)

**Fichier principal** : `convex/reservations.ts`

---

## 2. Machine d'etats des reservations

### 2.1 Statuts

| Statut | Description |
|--------|-------------|
| `pending` | En attente de validation admin (partySize 5-15) |
| `confirmed` | Confirmee (auto si partySize <= 4, ou admin) |
| `cardPlaced` | Carte placee sur la table (etape intermediaire) |
| `seated` | Client installe (check-in) |
| `completed` | Repas termine (check-out) |
| `noshow` | Absent (auto via dailyFinalize ou marquage admin) |
| `cancelled` | Annulee (client ou admin) |
| `refused` | Refusee par l'admin |
| `incident` | Incident signale |

### 2.2 Transitions valides

Source : `convex/lib/stateMachine.ts`

```
pending    → confirmed, refused, cancelled
confirmed  → cardPlaced, seated, cancelled, noshow, completed
cardPlaced → seated, cancelled, noshow, incident, confirmed
seated     → completed, incident, noshow, confirmed, cancelled
completed  → seated, confirmed, incident, cancelled
noshow     → seated, confirmed, cancelled
cancelled  → confirmed
refused    → confirmed, cancelled
incident   → seated, completed, cancelled
```

### 2.3 Regles de statut initial (creation)

| Condition | Statut initial | Raison |
|-----------|---------------|--------|
| `partySize <= 4` | `confirmed` | Confirmation automatique |
| `partySize 5-15` | `pending` | Validation admin requise |
| `partySize >= 16` | N/A | Route vers `groupRequests` |

---

## 3. Actions publiques (depuis le widget)

### 3.1 `reservations.create` (Action)

**Type** : Convex Action (reseau externe autorise)
**Authentification** : Aucune (public), protege par Turnstile + rate-limiting

**Pipeline d'execution** :

1. **Validation inputs** : dateKey (YYYY-MM-DD), timeKey (HH:MM), adults >= 1
2. **Hash de requete** : `computeRequestHash(payload)`
3. **Idempotence** : Verifie `idemKey` dans `idempotencyKeys`
   - Si trouvee + meme hash → retourne resultat cache
   - Si trouvee + hash different → erreur `INVALID_INPUT`
4. **Chargement settings** : `settings.getSecretsInternal` (interne)
5. **Turnstile** : Verification serveur du token anti-bot
6. **Routage par taille** :
   - `partySize >= 16` → `groupRequests._insert` → retourne `{ kind: "groupRequest" }`
   - `partySize < 16` → `reservations._create` → retourne `{ kind: "reservation" }`
7. **Stockage idempotence** : Resultat stocke pour 24h

**Retour** :
```typescript
type ReservationCreateResult =
  | { kind: "reservation"; reservationId: Id; status: ReservationStatus; manageUrlPath: string }
  | { kind: "groupRequest"; groupRequestId: Id }
```

**Erreurs possibles** :
- `INVALID_INPUT` : Format dateKey/timeKey invalide, adults < 1
- `TURNSTILE_FAILED` : Verification anti-bot echouee
- `SETTINGS_NOT_FOUND` : Pas de restaurant actif configure
- `SLOT_NOT_FOUND` : Creneau inexistant
- `SLOT_TAKEN` : Creneau ferme (reason="closed") ou max groupe depasse (reason="taken")
- `INSUFFICIENT_CAPACITY` : Capacite insuffisante

### 3.2 `reservations._create` (Mutation interne)

**Pipeline d'execution detaille** :

1. **Construire slotKey** : `makeSlotKey({dateKey, service, timeKey})`
2. **Charger slot** : Via index `by_restaurant_slotKey` (`.first()` pour resilience)
3. **Appliquer overrides** :
   - Charger tous les `slotOverrides` pour ce slotKey
   - Appliquer `period` d'abord (priorite basse)
   - Appliquer `manual` ensuite (priorite haute)
   - Resultat : `effectiveIsOpen`, `effectiveCapacity`, `effectiveMaxGroupSize`
4. **Verifier effectiveOpen** : `isOpen === true AND capacity > 0`
5. **Calculer partySize** : `adults + childrenCount + babyCount` (serveur)
6. **Verifier maxGroupSize** : Si defini et partySize depasse → erreur
7. **Calculer capacite restante** : Somme partySize des reservations actives (pending/confirmed/cardPlaced/seated)
8. **Verifier capacite** : partySize <= remainingCapacity
9. **Determiner statut** : <= 4 → confirmed, > 4 → pending
10. **Formater noms/telephone** : `capitalizeName()`, `formatPhoneNumber()`
11. **Creer/mettre a jour fiche client CRM** : `getOrCreateClientIdFromReservation()`
12. **Inserer reservation** : Avec `version: 1`, `tableIds: []`
13. **Generer token de gestion** : CSPRNG, expiration = slotStart - offset
14. **Logger evenement** : `reservationEvents` type "created"
15. **Enqueue email** : confirmed → `reservation.confirmed`, pending → `reservation.pending`
16. **Notification admin** (si pending) :
    - Email admin si `adminNotificationEmail` configure
    - Push Pushover si active

### 3.3 `reservations.cancelByToken` (Action)

**Authentification** : Par token de gestion

**Pipeline** :
1. Hash requete + check idempotence
2. Lookup token via `_getTokenByValue`
3. Verification : token existe, non utilise (`usedAt === null`)
4. **Pas de verification d'expiration** — un client qui annule est toujours preferable a un no-show
5. Charger reservation, verifier `canCancel(status)` — seul `cancelled` est non-annulable
6. Appeler `_cancel` (mutation interne)
7. Invalider token (`usedAt = now`)
8. Stocker idempotence (24h)
9. Enqueue email `reservation.cancelled`

### 3.4 `reservations.updateByToken` (Action)

**Authentification** : Par token de gestion

**Pipeline** :
1. Validation inputs (dateKey, timeKey, adults)
2. Hash requete + check idempotence
3. Lookup token, verification (existe, non utilise)
4. **Pas de verification d'expiration** — modification preferee au no-show
5. Verification `canModify(status)` — cancelled/completed/noshow non-modifiables
6. Charger settings (timezone, appUrl)
7. Appeler `_update` (mutation interne)
8. Stocker idempotence (24h)

### 3.5 `reservations._update` (Mutation interne)

**Pipeline** :
1. Charger reservation, verifier version (concurrence optimiste)
2. Verifier `canModify(status)`
3. Construire nouveau slotKey
4. Charger nouveau slot, verifier effectiveOpen
5. Verifier maxGroupSize
6. Calculer capacite (exclure la reservation en cours du calcul)
7. Determiner nouveau statut (meme logique que create)
8. Patcher reservation (dateKey, service, timeKey, partySize, note, status, version+1)
9. Logger evenement "updated"
10. Enqueue email confirmation/pending

### 3.6 `reservations._cancel` (Mutation interne)

**Pipeline** :
1. Charger reservation
2. Verifier version (concurrence optimiste)
3. Verifier `canCancel(status)`
4. Patcher : status="cancelled", cancelledAt=now, version+1
5. Logger evenement "status_change" (si cancelledBy="token")

---

## 4. Queries

### 4.1 `reservations.getByToken` (Query)

Retourne une reservation via token de gestion.

**Verifications** :
- Token existe
- Token non utilise (`usedAt === null`)
- **Pas de verification d'expiration** pour la consultation

**Retour** : `{ reservation: ReservationAdmin, token: { token, expiresAt } }`

### 4.2 Queries deprecated

Les queries suivantes sont deprecated et redirigent vers `admin.ts` :
- `listByService` → `admin.listReservations`
- `listPending` → `admin.listReservations` avec filtre status
- `getAdmin` → `admin.getReservation`
- `getStaff` → `admin.getReservation`

### 4.3 Mutations deprecated

- `adminConfirm` → `admin.updateReservation` avec status "confirmed"
- `adminRefuse` → `admin.updateReservation` avec status "refused"
- `adminCancel` → `admin.updateReservation` avec status "cancelled"
- `checkIn` → `admin.updateReservation` avec status "seated"
- `checkOut` → `admin.updateReservation` avec status "completed"

---

## 5. Gestion CRM automatique

A chaque creation de reservation, le systeme :

1. **Normalise le telephone** : Supprime caracteres non-numeriques, ajoute "+"
2. **Recherche client existant** : Par `primaryPhone` (index unique)
3. **Si existant** :
   - Met a jour firstName/lastName si manquants
   - Ajoute email si manquant
   - Fusionne emails dans le tableau `emails`
   - Met a jour `searchText` (full-text normalise)
4. **Si nouveau** :
   - Cree fiche client complete avec scores a 0
   - Statut initial : "new"
   - Source acquisition = source de la reservation

---

## 6. Concurrence optimiste

Toutes les mutations qui modifient une reservation utilisent le pattern :

```typescript
// Verification
if (reservation.version !== expectedVersion) {
  throw Errors.VERSION_CONFLICT(expectedVersion, reservation.version);
}
// Mutation
await ctx.db.patch(reservationId, { ..., version: reservation.version + 1 });
```

Cela previent les conflits quand plusieurs administrateurs modifient la meme reservation simultanement.

---

## 7. Idempotence

Les 3 actions publiques sont idempotentes :

| Action | Cle idempotence | Duree cache |
|--------|----------------|-------------|
| `reservations.create` | `idemKey` (fourni par client) | 24h |
| `reservations.updateByToken` | `idemKey` (fourni par client) | 24h |
| `reservations.cancelByToken` | `idemKey` (fourni par client) | 24h |

**Mecanisme** :
1. Client genere un UUID (`idemKey`) cote widget
2. Action calcule `requestHash` (SHA-256 des inputs)
3. Verification dans `idempotencyKeys` :
   - Cle trouvee + meme hash → retourne resultat stocke (replay)
   - Cle trouvee + hash different → erreur (cle reutilisee avec inputs differents)
   - Cle non trouvee → execution normale, puis stockage

---

## 8. Notifications

### 8.1 Emails (via queue `emailJobs`)

| Evenement | Type email | Declencheur |
|-----------|-----------|-------------|
| Reservation confirmee | `reservation.confirmed` | `_create` (partySize <= 4) |
| Reservation en attente | `reservation.pending` | `_create` (partySize 5-15) |
| Annulation client | `reservation.cancelled` | `cancelByToken` |
| Modification client | `reservation.confirmed/pending` | `_update` via `updateByToken` |
| Notification admin | `admin.notification` | `_create` (si pending + email configure) |

### 8.2 Push Pushover

| Evenement | Type | Priorite | Son |
|-----------|------|---------|-----|
| Reservation pending | `pending_reservation` | 1 (high) | cashregister |
| Annulation | `cancellation` | 1 | falling |
| Modification | `modification` | 1 | bike |

---

## 9. Formatage et normalisation

| Fonction | Description | Exemple |
|----------|-------------|---------|
| `capitalizeName()` | Premiere lettre majuscule par mot | "jean-pierre" → "Jean-Pierre" |
| `formatPhoneNumber()` | Normalisation via libphonenumber-js | "+32 470 12 34 56" |
| `normalizeEmail()` | Lowercase + trim + NFD normalize | "User@Gmail.COM" → "user@gmail.com" |
| `normalizePhone()` | Garde uniquement +digits | "+32470123456" |

---

## 10. Gestion des tokens

- **Generation** : `generateSecureToken()` — CSPRNG
- **Expiration** : `slotStartAt - manageTokenExpireBeforeSlotMs`
- **Unicite** : 1 token par (reservationId, type="manage")
- **Invalidation** : `usedAt = now` apres annulation
- **Pas d'expiration pour consultation/annulation** : Design delibere — un client qui agit est toujours preferable a un no-show
- **Rotation** : Sur re-creation (idempotent — retourne le token existant)

---

## 11. Groupes (>= 16 personnes)

Quand `partySize >= 16` dans `reservations.create` :
- Pas de reservation creee
- Insertion dans `groupRequests` avec status "pending"
- Pas d'email automatique (suivi manuel)
- Retour `{ kind: "groupRequest", groupRequestId }`

Cycle de vie groupRequests : `pending → contacted → converted | declined`

---

## 12. Logs et audit

Chaque action genere un `reservationEvent` :

| Action | eventType | performedBy |
|--------|-----------|-------------|
| Creation | `created` | "client" |
| Modification client | `updated` | "client" |
| Annulation client | `status_change` | "client" |
| Actions admin | `status_change` | userId admin |
| dailyFinalize | `status_change` | "system" |

Les logs ne contiennent jamais de PII — seuls les identifiants et slotKeys sont logges en console.

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
