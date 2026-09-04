# Resa La Moulinière

Système de réservation du restaurant La Moulinière (Ostende) : widget public multilingue, gestion de réservation par lien, back-office (desktop, tablette, mobile), plan de salle, CRM, e-mails transactionnels.

## Stack

- **Frontend** : Next.js 16 (App Router), React 19, Tailwind 3, Radix/shadcn — déployé sur Vercel.
- **Backend** : Convex (base de données réactive, fonctions, crons).
- **Auth admin** : NextAuth (compte unique) + pont JWT vers Convex (`docs/ops/AUTH_CONVEX.md`).
- **Services** : Resend (e-mails), Cloudflare Turnstile (anti-bot), Pushover (notifications).

## Démarrer

```bash
pnpm install
cp .env.example .env.local        # renseigner les variables
npx convex dev                    # déploiement Convex de développement
pnpm dev                          # http://localhost:3000
```

Sur le déploiement Convex de développement, définir `CONVEX_AUTH_ENFORCEMENT=off` (ou un tunnel public, voir `docs/ops/AUTH_CONVEX.md`) et, si besoin de données, `ALLOW_SEED=true` puis `pnpm seed`.

## Vérifications

```bash
pnpm exec tsc --noEmit                      # types Next.js
pnpm exec tsc --noEmit -p convex/tsconfig.json
pnpm lint
pnpm test                                   # vitest (unitaires + convex-test)
pnpm contracts:check
pnpm audit --prod
```

## Documentation

- `docs/audit/AUDIT_TECHNIQUE_COMPLET_2026-09-03.md` — audit technique, findings, roadmap.
- `docs/audit/AUDIT_TABLETTE_2026-09-04.md` — bugs de l'interface tablette.
- `docs/ops/AUTH_CONVEX.md` — authentification Convex, déploiement, coupe-circuit.
- `docs/ops/SECRETS.md` — variables d'environnement et secrets.
- `spec/CONTRACTS.md` — contrat (en cours de réalignement avec le code).
- `context/` — PRD produit.

## Routes

| Route | Rôle |
|---|---|
| `/widget` | Widget de réservation (iframe) |
| `/widget/group-request` | Demande de groupe (≥ 16 personnes) |
| `/reservation/[token]` | Gestion d'une réservation par lien |
| `/admin`, `/admin-tablette`, `/admin-mobile` | Back-office (authentifié) |
| `/api/health`, `/api/version` | Supervision |
