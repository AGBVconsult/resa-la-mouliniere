# Sprint 0 — Sécurisation et intégrité (2026-09-21)

Ce document décrit les changements du sprint 0 et **les actions de déploiement
obligatoires** : sans elles, l'interface admin ne pourra plus lire Convex.

## 1. Ce qui change

| Sujet | Avant | Après |
|---|---|---|
| Accès backend Convex | `requireRole` renvoyait toujours `owner` : toutes les fonctions étaient publiques | Convex vérifie un JWT RS256 émis par l'app (`convex/auth.config.ts`), `requireRole` lit le rôle de l'identité vérifiée |
| Fonctions sans garde | `floorplan.*`, `clientMessages.*`, `bookingDrafts.list` | Gardées (`staff` en lecture, `admin` en écriture) |
| `admin.updateSettings` | Stub public renvoyant `ok: true` sans rien faire | Réservé `owner`, lève une erreur explicite « non implémenté » |
| Édition de réservation (`admin.updateReservationFull`) | `slotKey` écrit avec `:` (invisible pour la capacité), `partySize` sans bébés, aucun contrôle | `makeSlotKey` / `computePartySize`, contrôle créneau + capacité si créneau ou taille changent, tables libérées si jour/service change, téléphone normalisé et client CRM re-rattaché, événement journalisé |
| Création admin (`admin.createReservation`) | Ignorait les overrides manuels/périodes et le statut `cardPlaced` | Même résolution de créneau que le widget |
| Webhook `/inbound-email` | Aucune vérification | Signature Svix (Resend) obligatoire, rejet si secret absent |
| Login admin | Comparaison en clair, identifiants dans les logs, session 30 j | Comparaison en temps constant, hash PBKDF2 optionnel, aucun log d'identifiant, session 7 j |
| Widget | Crash React si `publicWidgetEnabled` passe à `false` | Retour anticipé déplacé après les hooks |
| Scripts | PII réelle et URL de prod en dur | Données fictives, URL depuis l'environnement, jeton signé pour l'import |
| Données | Réservations corrompues en base | Migration `migrations:repairReservationInvariants` |

## 2. Déploiement — à faire dans cet ordre

### 2.1 Générer la clé de signature

```bash
node scripts/generate-convex-jwt-key.mjs
```

Copier la valeur `CONVEX_JWT_PRIVATE_KEY=…` dans les variables d'environnement
Vercel (Production + Preview) et dans `.env.local`.

### 2.2 Variables Vercel (Next.js)

| Variable | Valeur |
|---|---|
| `CONVEX_JWT_PRIVATE_KEY` | sortie du script ci-dessus |
| `CONVEX_AUTH_ISSUER` | origine publique de l'app, ex. `https://resa.lamouliniere.be` (sans slash final) |
| `AUTH_URL` | même origine |
| `AUTH_PASSWORD_HASH` | `node scripts/hash-password.mjs` puis supprimer `AUTH_PASSWORD` |

### 2.3 Variables Convex (dashboard > Settings > Environment variables)

```bash
npx convex env set CONVEX_AUTH_ISSUER https://resa.lamouliniere.be
npx convex env set RESEND_WEBHOOK_SECRET whsec_xxx   # "Signing secret" du webhook Resend
```

`convex/auth.config.ts` refuse le déploiement si `CONVEX_AUTH_ISSUER` est absent.

### 2.4 Déployer

1. Déployer Next.js (Vercel) **d'abord** : l'endpoint `https://<app>/api/convex/jwks`
   doit répondre `200` avec une clé avant que Convex ne l'interroge.
2. `npx convex deploy` (ou push automatique).
3. Se connecter sur `/admin/login` : la page affiche « Connexion sécurisée… » puis
   l'interface. Un écran « Session non reconnue par le backend » signale une
   variable manquante ou un `CONVEX_AUTH_ISSUER` différent entre Vercel et Convex.

### 2.5 Réparer les données existantes

```bash
npx convex run migrations:repairReservationInvariants '{"dryRun":true}'   # aperçu dans les logs
npx convex run migrations:repairReservationInvariants '{}'                # correction
```

La migration parcourt la table par pages de 200 et se replanifie elle-même.

### 2.6 Purger l'historique git (à décider)

Une ligne client réelle (nom, téléphone, e-mail) et l'URL de production
figuraient dans `scripts/import-clients-csv.ts` et `scripts/csv-to-json.ts`
depuis leur création. Le contenu est corrigé, mais l'historique git les
contient toujours. Pour les retirer définitivement : `git filter-repo` sur ces
deux fichiers, puis force-push et re-clone par tous les contributeurs. Cette
opération est irréversible et n'a **pas** été faite dans ce sprint.

## 3. Fonctionnement du pont NextAuth → Convex

```
navigateur ── session NextAuth (cookie JWE) ──► GET /api/convex/token
                                                   │ auth() OK → JWT RS256 (1 h)
                                                   ▼
ConvexProviderWithAuth.fetchAccessToken ──► Convex vérifie la signature
                                             via GET /api/convex/jwks
                                             (issuer = CONVEX_AUTH_ISSUER, aud = "convex")
                                                   ▼
                              ctx.auth.getUserIdentity() → { subject, role, email }
                                                   ▼
                              requireRole(ctx, "admin") → OK / FORBIDDEN
```

- Les pages publiques (widget, `/reservation/[token]`) n'ont pas de session :
  Convex reste anonyme et seules les fonctions sans `requireRole` sont accessibles.
- Les layouts admin sont enveloppés dans `ConvexAuthGate` : aucune query admin
  ne part avant que Convex ait accepté le jeton.
- Rotation de clé : générer une nouvelle clé, redéployer Next puis Convex ;
  les jetons vivent 1 h.

## 4. Reste à faire (hors sprint 0)

Voir le rapport d'audit du 2026-09-21 : machine d'états unifiée, fuseau
horaire unique, périodes spéciales matérialisées, index `by_clientId`, file
d'e-mails exclusive, tests `convex-test`, CI.
