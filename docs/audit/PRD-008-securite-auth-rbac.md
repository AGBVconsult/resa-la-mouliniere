# PRD-008 — Securite, Authentification & RBAC

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Sources** : `src/auth.ts`, `src/middleware.ts`, `convex/lib/rbac.ts`, `convex/lib/errors.ts`, `convex/lib/idempotency.ts`, `convex/lib/tokens.ts`

---

## 1. Vue d'ensemble

La securite repose sur 4 couches :

| Couche | Mecanisme | Scope |
|--------|-----------|-------|
| **Authentification** | NextAuth v5 (Credentials) | Routes admin |
| **Middleware** | Next.js Edge middleware | Protection routes /admin* |
| **RBAC** | `requireRole()` simplifie | Mutations/queries Convex |
| **Anti-bot** | Cloudflare Turnstile | Widget public |

---

## 2. Authentification

### 2.1 Provider

- **NextAuth v5** avec `Credentials` provider
- **Mono-utilisateur** : un seul couple email/password configure via variables d'environnement

### 2.2 Configuration (`src/auth.ts`)

```typescript
authorize(credentials) {
  if (email === process.env.AUTH_EMAIL && password === process.env.AUTH_PASSWORD) {
    return { id: "1", email, name: "Admin", role: "owner" }
  }
  return null
}
```

### 2.3 Variables d'environnement

| Variable | Description |
|----------|-------------|
| `AUTH_EMAIL` | Email de l'administrateur |
| `AUTH_PASSWORD` | Mot de passe de l'administrateur |
| `AUTH_SECRET` | Secret JWT pour signer les tokens de session |

### 2.4 Callbacks JWT/Session

Le role `owner` est propage dans le JWT et la session :

```
User → JWT token (role: "owner") → Session (session.user.role: "owner")
```

### 2.5 Page de connexion

Route : `/admin/login` — formulaire email/mot de passe simple.

---

## 3. Middleware de protection

### 3.1 Fichier : `src/middleware.ts`

```typescript
matcher: ["/admin/:path*", "/admin-mobile/:path*", "/admin-tablette/:path*"]
```

### 3.2 Logique

| Condition | Action |
|-----------|--------|
| Route admin + non authentifie + pas login page + pas API auth | Redirect `/admin/login` |
| Route admin + authentifie | Passe |
| Route non-admin (widget, reservation/*) | Pas de protection |

### 3.3 Routes protegees

- `/admin/*` — Interface desktop
- `/admin-mobile/*` — Interface mobile
- `/admin-tablette/*` — Interface tablette

### 3.4 Routes publiques

- `/widget/*` — Widget de reservation
- `/reservation/*` — Gestion par token
- `/api/auth/*` — NextAuth endpoints

---

## 4. RBAC (Role-Based Access Control)

### 4.1 Hierarchie des roles

| Role | Niveau | Description |
|------|--------|-------------|
| `staff` | 1 | Personnel de salle (lecture, actions basiques) |
| `manager` | 2 | Responsable (modification clients, notes) |
| `admin` | 3 | Administrateur (CRUD complet, secrets) |
| `owner` | 4 | Proprietaire (tout, dont secrets et seeding) |

### 4.2 Implementation actuelle (mono-utilisateur)

**Important** : L'app etant mono-utilisateur, `requireRole()` retourne toujours `"owner"` sans verification.

```typescript
export async function requireRole(_ctx, _minRole): Promise<Role> {
  return "owner";
}
```

La vraie protection est assuree par le middleware Next.js qui empeche l'acces non-authentifie aux routes admin.

### 4.3 Matrice d'acces par endpoint

| Endpoint | Role min | Effectif |
|----------|----------|----------|
| `admin.listReservations` | admin | owner |
| `admin.updateReservation` | admin | owner |
| `admin.createReservation` | admin | owner |
| `admin.updateSecrets` | owner | owner |
| `slots.seedRange` | owner | owner |
| `slots.updateSlot` | admin | owner |
| `clients.list` | staff | owner |
| `clients.update` | manager | owner |
| `clients.merge` | admin | owner |
| `clients.delete` | admin | owner |
| `clients.addNote` | staff | owner |
| `clients.deleteNote` | manager | owner |

### 4.4 Extraction du role (pour future multi-utilisateur)

`getRoleFromIdentity()` cherche le role dans plusieurs emplacements du token JWT :

```
identity.role → tokenClaims.role → claims.role → publicMetadata.role
→ privateMetadata.role → unsafeMetadata.role → customClaims.role
→ default: "staff"
```

---

## 5. Protection anti-bot (Turnstile)

### 5.1 Widget client

Cloudflare Turnstile est utilise sur le widget de reservation (`Step3Contact`) :

1. Le widget Turnstile genere un `turnstileToken` cote client
2. Le token est envoye dans l'action `reservations.create`
3. Verification serveur via API Cloudflare (`siteverify`)
4. Si echec → `Errors.TURNSTILE_FAILED()`

### 5.2 Configuration

| Variable | Description |
|----------|-------------|
| `turnstileSiteKey` | Cle publique (settings, expose au widget) |
| `turnstileSecretKey` | Cle secrete (settings, jamais expose) |

### 5.3 Pas de Turnstile pour

- Reservations admin (`admin.createReservation`)
- Imports (`admin.importReservation`)
- Modifications/annulations par token

---

## 6. Gestion des erreurs

### 6.1 Pattern AppError

Toutes les erreurs sont des `ConvexError<AppError>` :

```typescript
type AppError = {
  code: ErrorCode,    // Code machine standardise
  messageKey: string, // Cle i18n pour affichage client
  meta?: Record<string, Value>, // Donnees contextuelles
}
```

### 6.2 Codes d'erreur

| Code | Description | Usage |
|------|-------------|-------|
| `FORBIDDEN` | Acces refuse | Auth, RBAC |
| `NOT_FOUND` | Ressource introuvable | Restaurant, slot, reservation, settings |
| `VALIDATION_ERROR` | Input invalide | Format date, capacite, statut |
| `SLOT_TAKEN` | Creneau indisponible | Ferme ou groupe trop grand |
| `INSUFFICIENT_CAPACITY` | Capacite depassee | Plus de place |
| `RATE_LIMITED` | Trop de requetes | Rate limit depasse |
| `TURNSTILE_FAILED` | Anti-bot echoue | Verification Cloudflare |
| `TOKEN_INVALID` | Token invalide | Token inexistant ou utilise |
| `TOKEN_EXPIRED` | Token expire | Token hors delai |
| `VERSION_CONFLICT` | Conflit de version | Concurrence optimiste |
| `TABLE_CONFLICT` | Conflit de table | Double-booking table |
| `SAME_TYPE_OVERLAP` | Chevauchement periodes | Periodes speciales |

### 6.3 Logging securise

Les logs ne contiennent jamais de PII :
- Pas d'email, nom, telephone dans les logs console
- Seuls les identifiants (reservationId, slotKey, jobId) sont logges
- Exception : le log d'auth en dev (`[AUTH] Tentative de connexion`)

---

## 7. Idempotence

### 7.1 Mecanisme

| Composant | Description |
|-----------|-------------|
| `idemKey` | UUID genere cote client |
| `requestHash` | Hash djb2 canonicalise des inputs |
| `idempotencyKeys` | Table de stockage (TTL 24h) |

### 7.2 Algorithme de hash

```typescript
function computeRequestHash(inputs) {
  // 1. Canonicalisation recursive (tri des cles, recursion arrays/objects)
  const canonical = JSON.stringify(canonicalize(inputs));
  // 2. Hash djb2
  let hash = 5381;
  for (char in canonical) hash = ((hash << 5) + hash) ^ charCode;
  return (hash >>> 0).toString(16).padStart(8, "0");
}
```

### 7.3 Actions protegees

| Action | Key |
|--------|-----|
| `reservations.create` | `idemKey` |
| `reservations.updateByToken` | `idemKey` |
| `reservations.cancelByToken` | `idemKey` |

### 7.4 Comportement

| Situation | Resultat |
|-----------|----------|
| Cle inconnue | Execution normale, stockage resultat |
| Cle trouvee + meme hash | Retour resultat stocke (replay) |
| Cle trouvee + hash different | Erreur `INVALID_INPUT` |
| Cle expiree (>24h) | Traitee comme inconnue |

---

## 8. Tokens de gestion

### 8.1 Generation

`generateSecureToken()` — CSPRNG (crypto-secure random)

### 8.2 Stockage

Table `reservationTokens` :
- `token` : Valeur unique
- `type` : "manage"
- `expiresAt` : `slotStartAt - manageTokenExpireBeforeSlotMs`
- `usedAt` : null (actif) | timestamp (invalide)
- `rotatedAt` : null | timestamp

### 8.3 Regles

| Operation | Verification expiration | Raison |
|-----------|------------------------|--------|
| Consultation | Non | Toujours permettre la lecture |
| Modification | Non | Preferer modification a no-show |
| Annulation | Non | Preferer annulation a no-show |

Design delibere : un client qui agit est toujours preferable a un no-show.

---

## 9. Concurrence optimiste

### 9.1 Pattern

```typescript
if (reservation.version !== expectedVersion) {
  throw Errors.VERSION_CONFLICT(expectedVersion, reservation.version);
}
await ctx.db.patch(id, { ..., version: reservation.version + 1 });
```

### 9.2 Endpoints proteges

Tous les endpoints qui modifient une reservation :
- `admin.updateReservation`
- `admin.updateReservationFull`
- `admin.cancelByClient`
- `reservations._update`
- `reservations._cancel`

---

## 10. Secrets et configuration

### 10.1 Secrets (jamais exposes au client)

| Secret | Stockage | Usage |
|--------|----------|-------|
| `AUTH_EMAIL` | Env var | Login admin |
| `AUTH_PASSWORD` | Env var | Login admin |
| `AUTH_SECRET` | Env var | Signature JWT |
| `turnstileSecretKey` | Settings DB | Verification Turnstile serveur |
| `resendApiKey` | Settings DB | Envoi emails Resend |
| `pushoverApiToken` | Settings DB | Push notifications |
| `pushoverUserKey` | Settings DB | Push notifications |

### 10.2 Configuration publique (exposee au widget)

| Config | Source |
|--------|--------|
| `turnstileSiteKey` | Settings DB → `widget.getSettings` |
| `publicWidgetEnabled` | Settings DB → `widget.getSettings` |
| `maxPartySizeWidget` | Settings DB → `widget.getSettings` |

### 10.3 Separation secrets

- `admin.getSettings` : Retourne settings **sans** secrets
- `settings.getSecretsInternal` : Retourne tout (interne uniquement)
- `admin.updateSecrets` : MAJ secrets (owner uniquement)

---

## 11. CSP et headers securite

Le `next.config.ts` definit des headers de securite specifiques pour le widget (iframe embedding) et l'admin.

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
