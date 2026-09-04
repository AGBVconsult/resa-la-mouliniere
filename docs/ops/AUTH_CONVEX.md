# Authentification Convex — pont NextAuth → Convex

**Pourquoi.** Jusqu'ici, Convex n'avait aucun fournisseur d'identité et `requireRole()` renvoyait toujours `"owner"` : toutes les fonctions d'administration étaient appelables anonymement avec l'URL publique du déploiement (audit SEC-001). Désormais chaque appel admin doit présenter un JWT signé par l'application Next.js pour la session NextAuth courante.

## Fonctionnement

```
Navigateur (admin)  ──session NextAuth (cookie)──►  Next.js  /api/auth/convex-token  ──► JWT RS256 (iss, aud="convex", sub, role)
Navigateur (admin)  ──JWT──►  Convex  ──vérifie signature via──►  Next.js  /.well-known/jwks.json
Convex  requireRole(ctx, "admin")  ──►  ctx.auth.getUserIdentity().role
```

- La clé privée RSA vit dans `CONVEX_AUTH_PRIVATE_KEY` (Next.js, serveur uniquement). La clé publique est dérivée et publiée sur `/.well-known/jwks.json`.
- `convex/auth.config.ts` déclare un fournisseur `customJwt` dont l'`issuer` est `CONVEX_AUTH_ISSUER` et le JWKS `${issuer}/.well-known/jwks.json`.
- `convex/lib/rbac.ts` lit la claim `role` (`owner` pour le compte unique) et lève `FORBIDDEN` sinon.
- Les surfaces admin sont enveloppées par `AdminProviders` (`ConvexProviderWithAuth`), qui fournit le jeton au client Convex et le renouvelle avant expiration (durée de vie : 1 h).
- Les pages publiques (widget, `/reservation/[token]`) n'envoient aucun jeton ; seules les fonctions listées dans `tests/authSurface.spec.ts` (`PUBLIC_FUNCTIONS`) leur sont accessibles.

## Variables d'environnement

| Où | Variable | Valeur |
|---|---|---|
| Vercel (Next.js), tous les environnements admin | `CONVEX_AUTH_PRIVATE_KEY` | Sortie de `node scripts/generate-convex-auth-key.mjs` (PKCS#8 PEM sur une ligne, sauts de ligne encodés `\n`) |
| Vercel (Next.js) | `CONVEX_AUTH_ISSUER` | Origine publique de l'app, **sans slash final** (ex. `https://resa-la-mouliniere.vercel.app`) |
| Convex (dashboard → Settings → Environment Variables) | `CONVEX_AUTH_ISSUER` | **Identique** à la valeur Vercel |
| Convex, développement uniquement | `CONVEX_AUTH_ENFORCEMENT` | `off` pour désactiver le contrôle (voir « Coupe-circuit ») |

`AUTH_SECRET`, `AUTH_EMAIL`, `AUTH_PASSWORD` restent nécessaires à NextAuth.

## Procédure de mise en production (ordre important)

1. Générer la clé : `node scripts/generate-convex-auth-key.mjs`. Ne pas la committer.
2. Sur Vercel, définir `CONVEX_AUTH_PRIVATE_KEY` et `CONVEX_AUTH_ISSUER`. Déployer Next.js.
3. Vérifier :
   - `curl https://<domaine>/.well-known/jwks.json` renvoie `{"keys":[{"kty":"RSA",...}]}` ;
   - `curl -i https://<domaine>/api/auth/convex-token` renvoie `401` (non connecté) ;
   - connecté dans le navigateur, `/api/auth/convex-token` renvoie `{"token":"eyJ..."}`.
4. Sur le déploiement Convex de production, définir `CONVEX_AUTH_ISSUER` (même valeur). Ne **pas** définir `CONVEX_AUTH_ENFORCEMENT`.
5. Déployer Convex (`npx convex deploy`, ou le pipeline habituel). `auth.config.ts` lit `CONVEX_AUTH_ISSUER` au déploiement : si la variable manque, un avertissement est journalisé et aucun fournisseur n'est déclaré (l'admin serait alors inaccessible).
6. Vérifier dans l'admin : liste des réservations chargée, changement de statut fonctionnel. Dans les logs Convex, aucune erreur `FORBIDDEN` sur les appels admin.
7. Vérifier que le widget public fonctionne toujours (il n'envoie pas de jeton).

Si l'étape 5 précède l'étape 2, l'administration est bloquée jusqu'à ce que le JWKS soit disponible : Convex ne peut pas vérifier les jetons.

## Coupe-circuit (retour arrière d'urgence)

Définir `CONVEX_AUTH_ENFORCEMENT=off` dans les variables d'environnement Convex. L'effet est immédiat (pas de redéploiement) ; toutes les fonctions admin redeviennent ouvertes et un avertissement est journalisé. Retirer la variable dès que la cause est corrigée. Ne jamais la laisser en production.

## Développement local

Convex Cloud ne peut pas joindre `http://localhost:3000` pour lire le JWKS. Deux options :

- **Simple** : sur le déploiement Convex de développement, définir `CONVEX_AUTH_ENFORCEMENT=off`.
- **Fidèle** : exposer le serveur Next local via un tunnel (ex. `cloudflared tunnel --url http://localhost:3000`) et utiliser cette URL comme `CONVEX_AUTH_ISSUER` côté Next et côté Convex de dev.

Les tests (`pnpm test`) n'ont besoin d'aucune variable : `tests/rbac.spec.ts` exerce `requireRole` avec et sans identité via `convex-test`.

## Rotation de clé

1. Générer une nouvelle clé, la définir sur Vercel, déployer Next.js. Le JWKS ne publie que la clé courante : les jetons signés par l'ancienne clé restent valides au plus 1 h et sont renouvelés automatiquement par le client.
2. Aucune action côté Convex.

## Scripts et appels hors navigateur

Les scripts (`scripts/import-clients-csv.ts`) qui appelaient des mutations admin sans identité échouent désormais avec `FORBIDDEN`. Les faire passer par une `internalMutation` exécutée avec `npx convex run`, ou leur fournir un jeton obtenu depuis `/api/auth/convex-token` via `client.setAuth(token)`.
