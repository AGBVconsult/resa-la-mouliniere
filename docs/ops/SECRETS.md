# Secrets et variables d'environnement

## Principe

Les secrets applicatifs ne vivent plus dans la table `settings` de Convex. Ils sont lus dans les **variables d'environnement du déploiement Convex** (dashboard → Settings → Environment Variables). La base ne sert que de repli pendant la migration : tant qu'un secret n'est pas défini en variable, `getSecretsInternal` journalise un avertissement listant les champs encore lus depuis la base (sans leur valeur).

Résolution : `convex/lib/secrets.ts` (`resolveSecrets`, testé dans `tests/secrets.spec.ts`).

## Variables Convex

| Variable | Rôle | Anciennement |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Vérification anti-bot du widget | `settings.turnstileSecretKey` |
| `RESEND_API_KEY` | Envoi des e-mails | `settings.resendApiKey` |
| `PUSHOVER_USER_KEY` | Notifications push | `settings.pushoverUserKey` |
| `PUSHOVER_API_TOKEN` | Notifications push | `settings.pushoverApiToken` |
| `APP_URL` | Origine publique pour les liens des e-mails (sans slash final) | `settings.appUrl` |
| `RESEND_WEBHOOK_SECRET` | Secret de signature (`whsec_…`) du webhook inbound Resend ; sans lui, `/inbound-email` répond 503 | — |
| `CONVEX_AUTH_ISSUER` | Émetteur des JWT admin (voir `AUTH_CONVEX.md`) | — |
| `CONVEX_AUTH_ENFORCEMENT` | `off` = coupe-circuit RBAC (jamais en production) | — |
| `ALLOW_SEED` | `true` autorise les fonctions `seed.*` (jamais en production) | — |

Les champs non secrets (`turnstileSiteKey`, `resendFromEmail`, `resendFromName`, `adminNotificationEmail`, `pushoverEnabled`, etc.) restent dans `settings`.

## Migration

1. Relever les valeurs actuelles dans le dashboard Convex (table `settings`).
2. Les définir en variables d'environnement sur le déploiement concerné.
3. Déployer cette version. Dans les logs, l'avertissement `[settings] secrets lus depuis la base` doit disparaître.
4. Vider les champs secrets de la table `settings` (dashboard, édition du document) : ils ne sont plus lus dès qu'une variable existe, mais un export de la base ne doit plus les contenir.

`admin.updateSecrets` est désormais interne (`npx convex run admin:updateSecrets`) et ne devrait plus servir qu'à `appUrl`/`turnstileSiteKey` le temps de la migration.

## Fonctions de seed

Toutes les fonctions de `convex/seed.ts` (`seedAll`, `seedTestReservations`, `updateSecrets`, `testEmail`, …) lèvent une erreur tant que `ALLOW_SEED=true` n'est pas défini sur le déploiement. Ne définir cette variable que sur un déploiement de développement ou de recette, et la retirer ensuite. `seed.updateSecrets` remplaçait la clé Turnstile par une clé de test « toujours valide » quand les variables manquaient : c'est ce scénario que la garde empêche en production.
