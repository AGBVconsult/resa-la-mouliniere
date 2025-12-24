# Règles Windsurf — La Moulinière

## Source de vérité
1. CONTRACTS.md (schéma, API, états)
2. Ce fichier (conventions)
3. PRDs (fonctionnel)

## Interdits absolus
- Inventer une table/colonne hors CONTRACTS.md
- Inventer un status hors machine d'états
- Logger du PII en clair (email, phone, nom)
- Extrapoler au-delà du ticket

## Conventions
- Terminologie : service="lunch"|"dinner", slotKey, partySize
- Logs : JSON `{ correlationId, actorId, action }` sans PII
- RBAC : `await requireRole(ctx, "admin")` sur mutations sensibles
- Validation : Zod côté serveur obligatoire

## DoD par slice
- [ ] `pnpm tsc --noEmit` passe
- [ ] `pnpm lint` passe
- [ ] Test unitaire ajouté
- [ ] Aucune invention hors contrat
- [ ] // NON-SPÉCIFIÉ si info manquante
