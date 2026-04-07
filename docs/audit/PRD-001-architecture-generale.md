# PRD-001 — Architecture Generale & Vue d'Ensemble

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Statut** : Document d'audit — etat exact du code au moment de la redaction

---

## 1. Objectif du projet

Application web de gestion de reservations pour un restaurant unique (**La Mouliniere**). Le systeme couvre :

- **Widget client** : formulaire de reservation multi-etapes, embeddable en iframe
- **Interface admin desktop** : gestion des reservations, creneaux, plan de salle, CRM, periodes speciales, parametres
- **Interface admin tablette** : vue service optimisee tactile
- **Interface admin mobile** : vue simplifiee mobile
- **Backend temps reel** : Convex (BaaS serverless) avec queries reactives, mutations, actions, crons

---

## 2. Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Framework frontend** | Next.js (App Router) | 16.1.0 |
| **React** | React + React DOM | 19.2.3 |
| **Langage** | TypeScript (strict) | ^5 |
| **CSS** | Tailwind CSS | ^3.4.17 |
| **UI Components** | Radix UI (dialog, select, checkbox, switch, label, slot) | derniere |
| **Animations** | Framer Motion | ^12.23.26 |
| **Icones** | Lucide React | ^0.562.0 |
| **Backend / BaaS** | Convex | ^1.31.2 |
| **Auth admin** | NextAuth (next-auth v5 beta) + Credentials | ^5.0.0-beta.30 |
| **Emails** | Resend | ^6.6.0 |
| **Anti-spam** | Cloudflare Turnstile (@marsidev/react-turnstile) | ^1.4.0 |
| **Notifications push** | Pushover (API REST) | custom |
| **Formulaires** | React Hook Form + Zod v4 | ^7.69.0 / ^4.2.1 |
| **Dates** | date-fns + date-fns-tz | ^4.1.0 / ^3.2.0 |
| **Telephone** | libphonenumber-js | ^1.12.35 |
| **Calendrier** | react-day-picker | ^9.13.0 |
| **Drag & Drop** | @dnd-kit/core | ^6.3.1 |
| **Tests unitaires** | Vitest | ^4.0.16 |
| **Tests E2E** | Playwright | ^1.57.0 |
| **Deploiement frontend** | Vercel | - |
| **Deploiement backend** | Convex Cloud | - |

### Compilateur React

Le React Compiler est active dans `next.config.ts` :
```ts
reactCompiler: true,
```

---

## 3. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│                                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │
│  │  Widget   │  │ Admin Desktop│  │Admin Tablet│  │Admin Mobile│ │
│  │ (iframe)  │  │   /admin/*   │  │/admin-tab. │  │/admin-mob. │ │
│  └─────┬─────┘  └──────┬───────┘  └─────┬──────┘  └─────┬─────┘ │
└────────┼────────────────┼────────────────┼───────────────┼───────┘
         │                │                │               │
         ▼                ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS 16 (App Router)                      │
│                                                                   │
│  Middleware ──► Auth check (admin routes)                         │
│  CSP headers ──► Security headers par route                      │
│  API routes ──► /api/auth/* (NextAuth)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CONVEX CLOUD                                 │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │ Queries  │  │Mutations │  │ Actions  │  │   Cron Jobs      ││
│  │(reactif) │  │ (ACID)   │  │(side-eff)│  │  (planifies)     ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘│
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ HTTP     │  │ Internal │  │ Scheduler│                      │
│  │ Routes   │  │ Functions│  │          │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                   │
│  ═══════════════ DATABASE (Convex) ══════════════════════════   │
│  restaurants | settings | slots | tables | reservations          │
│  weeklyTemplates | specialPeriods | slotOverrides                │
│  clients | clientLedger | clientMessages | tags                  │
│  emailJobs | reservationTokens | idempotencyKeys                 │
│  reservationEvents | assignmentLogs | bookingDrafts              │
│  groupRequests | crmDailyFinalizations                           │
└─────────────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
  ┌────────────┐  ┌────────────┐  ┌────────────────┐
  │   Resend   │  │ Turnstile  │  │   Pushover     │
  │  (emails)  │  │(anti-spam) │  │(push notifs)   │
  └────────────┘  └────────────┘  └────────────────┘
```

---

## 4. Structure du code source

### 4.1 Arborescence racine

```
la-mouliniere/
├── convex/                    # Backend Convex (mutations, queries, actions, schema)
│   ├── _generated/            # Code genere par Convex CLI
│   ├── lib/                   # Utilitaires backend (errors, rbac, emails, scoring, etc.)
│   │   ├── email/             # Templates, retry, resend, ops
│   │   ├── adjacency.ts       # Calcul adjacence tables
│   │   ├── dateUtils.ts       # Utilitaires dates
│   │   ├── errors.ts          # Factory d'erreurs normalisees
│   │   ├── formatters.ts      # Formatage noms, telephones
│   │   ├── idempotency.ts     # Gestion cles idempotence
│   │   ├── pushover.ts        # Client Pushover API
│   │   ├── rateLimit.ts       # Rate limiting best-effort
│   │   ├── rbac.ts            # Role-Based Access Control
│   │   ├── scoring.ts         # Scoring ML tables
│   │   ├── setPredictor.ts    # Prediction sets de tables
│   │   ├── shadowMetrics.ts   # Metriques shadow learning
│   │   ├── snapshot.ts        # Snapshot etat tables
│   │   ├── stateMachine.ts    # Machine d'etats reservations
│   │   ├── tokens.ts          # Generation tokens securises
│   │   └── turnstile.ts       # Verification Cloudflare Turnstile
│   ├── schema.ts              # Schema complet de la DB (17 tables)
│   ├── admin.ts               # Mutations/queries admin
│   ├── availability.ts        # Queries disponibilite (widget + admin)
│   ├── reservations.ts        # CRUD reservations (create, cancel, status changes)
│   ├── slots.ts               # Gestion creneaux (CRUD, batch update, overrides)
│   ├── weeklyTemplates.ts     # Templates hebdomadaires + generation automatique
│   ├── specialPeriods.ts      # Periodes speciales (vacances, fermetures, events)
│   ├── tables.ts              # CRUD tables physiques
│   ├── floorplan.ts           # Plan de salle + etats tables
│   ├── clients.ts             # Gestion fiches clients CRM
│   ├── crm.ts                 # Finalisation CRM quotidienne + scoring
│   ├── emails.ts              # Queue emails + envoi via Resend
│   ├── notifications.ts       # Push notifications Pushover
│   ├── assignmentLogs.ts      # Logs attribution tables (shadow learning)
│   ├── bookingDrafts.ts       # Brouillons de reservation (abandons)
│   ├── clientMessages.ts      # Messages restaurant <-> client
│   ├── groupRequests.ts       # Demandes de groupe (>= 16 pers.)
│   ├── jobs.ts                # Jobs quotidiens (finalize, cleanup)
│   ├── planning.ts            # Vue planning mensuel
│   ├── settings.ts            # Queries settings internes
│   ├── crons.ts               # Configuration des cron jobs
│   ├── http.ts                # Routes HTTP (inbound email webhook)
│   ├── seed.ts                # Seed de la base de donnees
│   └── tags.ts                # Tags globaux clients
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Layout racine (ConvexProvider)
│   │   ├── page.tsx           # Page d'accueil (redirect)
│   │   ├── globals.css        # Styles globaux Tailwind
│   │   ├── widget/            # Widget public de reservation
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── components/    # 20+ composants widget
│   │   │   └── group-request/ # Formulaire demande de groupe
│   │   ├── reservation/       # Page gestion reservation (token)
│   │   ├── (admin)/admin/     # Interface admin desktop
│   │   │   ├── page.tsx       # Dashboard admin
│   │   │   ├── layout.tsx     # Layout admin (sidebar)
│   │   │   ├── reservations/  # Gestion reservations
│   │   │   ├── creneaux/      # Gestion creneaux hebdomadaires
│   │   │   ├── periodes/      # Periodes speciales
│   │   │   ├── clients/       # CRM clients
│   │   │   ├── planning/      # Planning mensuel
│   │   │   └── settings/      # Parametres
│   │   ├── admin-tablette/    # Interface tablette (service)
│   │   ├── admin-mobile/      # Interface mobile simplifiee
│   │   ├── (auth)/            # Pages auth (login)
│   │   └── api/               # API routes (NextAuth handlers)
│   ├── components/            # Composants partages
│   │   ├── ui/                # Composants shadcn/ui (button, dialog, input, etc.)
│   │   └── booking/           # Logique booking partagee (i18n, types, constants)
│   ├── lib/                   # Utilitaires frontend (utils, analytics, etc.)
│   ├── hooks/                 # Custom hooks React
│   ├── auth.ts                # Configuration NextAuth
│   └── middleware.ts          # Middleware auth admin
├── spec/
│   └── CONTRACTS.md           # Source de verite unique (contrats API)
├── docs/                      # Documentation projet
├── tests/                     # Tests unitaires (Vitest)
├── e2e/                       # Tests E2E (Playwright)
└── scripts/                   # Scripts utilitaires (generation contrats)
```

### 4.2 Modules Convex (fichiers backend)

| Fichier | Taille | Responsabilite |
|---------|--------|---------------|
| `admin.ts` | 53 KB | Queries/mutations admin (settings, reservations admin, etc.) |
| `reservations.ts` | 41 KB | CRUD reservations, create action, cancel, status changes |
| `weeklyTemplates.ts` | 38 KB | Templates hebdomadaires, generation automatique slots |
| `seed.ts` | 34 KB | Seed complet de la base de donnees |
| `specialPeriods.ts` | 32 KB | Periodes speciales avec generation d'overrides |
| `emails.ts` | 31 KB | Queue emails, envoi Resend, reminders, reviews |
| `clients.ts` | 30 KB | Fiches clients CRM, recherche, merge, stats |
| `slots.ts` | 29 KB | Gestion creneaux, batch update, toggle, overrides |
| `schema.ts` | 24 KB | Schema complet (17 tables, index, validateurs) |
| `tables.ts` | 21 KB | CRUD tables physiques, assignation |
| `crm.ts` | 20 KB | Finalisation CRM, scoring, ledger |
| `availability.ts` | 18 KB | Queries disponibilite (getDay, getMonth) |
| `floorplan.ts` | 17 KB | Plan de salle, etats tables par service |
| `assignmentLogs.ts` | 15 KB | Logs shadow learning attribution tables |
| `groupRequests.ts` | 12 KB | Demandes de groupe >= 16 personnes |
| `planning.ts` | 10 KB | Vue planning mensuel |
| `clientMessages.ts` | 7 KB | Messages bidirectionnels restaurant-client |
| `bookingDrafts.ts` | 5 KB | Brouillons de reservation (tracking abandons) |
| `jobs.ts` | 5 KB | Jobs quotidiens (dailyFinalize, cleanup) |
| `notifications.ts` | 4 KB | Push notifications Pushover |
| `crons.ts` | 3 KB | Configuration cron jobs (11 jobs) |
| `http.ts` | 3 KB | Routes HTTP (webhook email inbound) |
| `settings.ts` | 2 KB | Queries settings internes |
| `idempotency.ts` | 2 KB | Gestion cles idempotence |

---

## 5. Modele mono-restaurant

Le projet fonctionne en mode **mono-restaurant** :
- Une seule entite `restaurants` active (`isActive = true`)
- Toutes les tables portent un `restaurantId` pour preparer le multi-tenant
- La logique "find active restaurant" est repetee dans chaque mutation/query

---

## 6. Flux principaux

### 6.1 Reservation client (widget)

```
Client ──► Widget Step 1 (guests) ──► Step 1b (babies?)
  ──► Step 2 (date/heure) ──► Step 3 (contact)
  ──► Step 4 (politique) ──► Step 5 (infos pratiques)
  ──► Step 6 (confirmation)

  [Step 3 → bookingDrafts.save()]        # Tracking abandon
  [Step 6 → reservations.create()]       # Action Convex
    ├── Turnstile verification
    ├── Rate limiting (best-effort)
    ├── Idempotency check
    ├── partySize >= 16 → groupRequests.create
    ├── partySize 5-15 → reservation status="pending"
    └── partySize <= 4 → reservation status="confirmed"
```

### 6.2 Cycle de vie reservation

```
                    ┌──────────┐
         ┌────────►│ confirmed │◄─────────┐
         │          └─────┬────┘          │
         │                │               │
    ┌────┴───┐      ┌─────▼────┐    ┌─────┴─────┐
    │ pending │      │cardPlaced│    │  noshow   │
    └────┬───┘      └─────┬────┘    └───────────┘
         │                │
         │          ┌─────▼────┐
         │          │  seated  │
         │          └─────┬────┘
         │                │
    ┌────▼────┐     ┌─────▼─────┐
    │ refused │     │ completed │
    └─────────┘     └───────────┘
         │
    ┌────▼─────┐
    │cancelled │
    └──────────┘
```

### 6.3 Generation automatique de creneaux

```
Cron quotidien (01:00 UTC)
  └──► weeklyTemplates.generateFromTemplates({ daysAhead: 180 })
        ├── Pour chaque date dans [today, today+180]
        │     ├── Calcul dayOfWeek (ISO 1-7)
        │     ├── Pour chaque service (lunch, dinner)
        │     │     ├── Charger template (dayOfWeek, service)
        │     │     └── Pour chaque slot actif du template
        │     │           ├── Slot existe deja → Patch isOpen/capacity (si pas d'override)
        │     │           └── Slot n'existe pas → Creer
        │     └── ...
        └── ...
```

---

## 7. Services externes

| Service | Usage | Configuration |
|---------|-------|---------------|
| **Convex Cloud** | Backend, DB, crons, scheduler | `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` |
| **Vercel** | Hebergement frontend Next.js | `.vercel/` |
| **Resend** | Envoi emails transactionnels | `resendApiKey` en DB settings |
| **Cloudflare Turnstile** | Anti-bot widget reservation | `turnstileSiteKey` (public) + `turnstileSecretKey` (secret en DB) |
| **Pushover** | Push notifications admin (iPhone) | `pushoverUserKey` + `pushoverApiToken` en DB settings |
| **Google Analytics** | Analytics frontend | Via GTM script CSP |

---

## 8. Securite

- **Auth admin** : NextAuth v5 (Credentials provider) — email/password en variables d'env
- **Middleware** : Redirection automatique `/admin/*`, `/admin-tablette/*`, `/admin-mobile/*` vers login si non authentifie
- **RBAC** : 4 roles (staff < manager < admin < owner) — actuellement en mode mono-utilisateur (toujours "owner")
- **CSP** : Headers Content-Security-Policy configures par route dans `next.config.ts`
- **Widget iframe** : `frame-ancestors *` pour permettre l'embedding
- **Turnstile** : Verification serveur via Convex Action (jamais dans Query/Mutation)
- **Rate limiting** : Best-effort par IP (fallback fingerprint)
- **Idempotence** : Cles idempotentes obligatoires sur les actions publiques
- **Tokens** : CSPRNG pour tokens de gestion reservation, expiration avant le slot

---

## 9. Internationalisation (i18n)

Langues supportees : **fr**, **nl**, **en**, **de**, **it**, **es**

- Widget : detection automatique de la langue du navigateur, override par `?lang=xx`
- Emails : templates multilingues (sujet + corps traduits par langue)
- Admin : interface en francais uniquement
- Erreurs : toutes les erreurs utilisent des `messageKey` (traduites cote client)

---

## 10. Deploiement

| Composant | Plateforme | Methode |
|-----------|-----------|---------|
| Frontend | Vercel | `git push` → build automatique |
| Backend | Convex Cloud | `npx convex deploy` (CLI) |
| Emails | Resend | API REST via Convex Actions |

### Variables d'environnement requises

```env
# Convex
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...

# Auth (NextAuth)
AUTH_SECRET=...
AUTH_EMAIL=...
AUTH_PASSWORD=...
AUTH_URL=...

# (Optionnel) Resend, Turnstile, Pushover → configures en DB via admin settings
```

---

## 11. Tests

| Type | Framework | Emplacement | Commande |
|------|-----------|-------------|----------|
| Unitaires | Vitest | `tests/` | `pnpm test` |
| E2E | Playwright | `e2e/` | `pnpm test:e2e` |

---

## 12. Contrats & documentation de reference

- **Source de verite** : `spec/CONTRACTS.md` (898 lignes)
- **Contrats generes** : `spec/contracts.generated.ts` (types TypeScript extraits)
- **PRDs existants** : `docs/PRD-*.md` (documents de specification par fonctionnalite)
- **Devbook** : `docs/DEVBOOK.md` (guide developpeur)

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
