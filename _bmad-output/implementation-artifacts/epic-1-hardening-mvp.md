# Epic 1 — Hardening MVP Production

**PRD Source :** PRD-012-hardening-mvp-v1_0.md  
**Priorité :** Haute  
**Effort estimé :** 6 heures  
**Effort réel :** ~5 heures  
**Statut :** ✅ TERMINÉ
**Date de complétion :** 2026-01-22
**Commit :** c22cae5 (inclut 4 hotfixes auth post-sprint)

---

## Description

Corriger les points critiques identifiés lors de l'audit de maturité pour atteindre un niveau "production-ready" avant la mise en production du MVP Resa La Moulinière.

## Objectifs

1. Feedback utilisateur visible sur iPad (toast réel)
2. Messages d'erreur contextuels et user-friendly
3. Tests E2E des parcours critiques
4. Sécurité renforcée (role gate)

## Critères d'Acceptation Epic

- [x] Toutes les erreurs d'assignation sont visibles sur iPad
- [x] Messages d'erreur en français et contextuels
- [x] Tests E2E passent en CI
- [x] Utilisateurs sans rôle admin redirigés

---

## Stories

### Story 1.1 — Composant Toast Global ✅

**Priorité :** P1 — Critique  
**Effort :** 45 min  
**Statut :** ✅ Terminé

#### Description
Créer un composant Toast basé sur Framer Motion pour afficher les notifications utilisateur de manière visible sur iPad.

#### Critères d'Acceptation
- [x] Toast visible sur iPad Safari (position fixe, z-index élevé)
- [x] Variantes : success (vert), error (rouge), info (bleu), warning (orange)
- [x] Auto-dismiss après 4 secondes
- [x] Icône Lucide appropriée par variante
- [x] Animation d'entrée/sortie fluide

#### Tâches Techniques
- [x] Créer `src/components/ui/toast.tsx` (Framer Motion)
- [x] Créer `src/components/ui/toaster.tsx` (Provider + container)
- [x] Créer `src/hooks/use-toast.ts` (Hook global)
- [x] Ajouter ToastProvider dans `src/app/(admin)/admin/layout.tsx`

#### Fichiers
- `src/components/ui/toast.tsx` ✅
- `src/components/ui/toaster.tsx` ✅
- `src/hooks/use-toast.ts` ✅
- `src/app/(admin)/admin/layout.tsx` ✅

---

### Story 1.2 — Helper formatConvexError ✅

**Priorité :** P1 — Critique  
**Effort :** 30 min  
**Statut :** ✅ Terminé

#### Description
Créer un helper pour parser les erreurs Convex et retourner des messages user-friendly en français.

#### Critères d'Acceptation
- [x] Détecte si l'erreur est une `ConvexError`
- [x] Lit `error.data.code` ou `error.data.messageKey`
- [x] Mappe les codes vers des messages FR
- [x] Fallback sur `error.message` si format inconnu

#### Tâches Techniques
- [x] Créer `src/lib/formatError.ts`
- [x] Mapper tous les codes de `convex/lib/errors.ts`
- [x] Exporter fonction `formatConvexError(error): string`

#### Fichiers
- `src/lib/formatError.ts` ✅

---

### Story 1.3 — Intégration Toast dans ServiceFloorPlan ✅

**Priorité :** P1 — Critique  
**Effort :** 30 min  
**Statut :** ✅ Terminé

#### Description
Remplacer le toast factice (`console.log`) par le vrai composant toast dans le plan de salle.

#### Critères d'Acceptation
- [x] Toast visible lors d'erreur d'assignation
- [x] Messages contextuels (conflit table, capacité, version)
- [x] Toast success lors d'assignation réussie
- [x] Pas de régression fonctionnelle

#### Tâches Techniques
- [x] Supprimer le faux toast `const toast = {...}`
- [x] Importer `useToast` hook
- [x] Utiliser `formatConvexError` pour les messages d'erreur
- [x] Tester sur iPad

#### Fichiers
- `src/components/admin/floor-plan/ServiceFloorPlan.tsx` ✅

---

### Story 1.4 — Intégration Toast dans autres composants ✅

**Priorité :** P1 — Critique  
**Effort :** 15 min  
**Statut :** ✅ Terminé

#### Description
Ajouter le feedback toast dans les autres composants admin qui gèrent des erreurs.

#### Critères d'Acceptation
- [x] Toast sur erreur dans `handleStatusChange` (ReservationsPage)
- [x] Toast sur erreur dans `CreateReservationModal`
- [x] Messages user-friendly via `formatConvexError`

#### Tâches Techniques
- [x] Modifier `src/app/(admin)/admin/reservations/page.tsx`
- [x] Modifier `src/app/(admin)/admin/reservations/components/CreateReservationModal.tsx`

#### Fichiers
- `src/app/(admin)/admin/reservations/page.tsx` ✅
- `src/app/(admin)/admin/reservations/components/CreateReservationModal.tsx` ✅

---

### Story 1.5 — Tests E2E Admin ✅

**Priorité :** P2 — Important  
**Effort :** 1h30  
**Statut :** ✅ Terminé

#### Description
Améliorer les tests E2E Playwright pour les parcours critiques de l'interface admin.

#### Critères d'Acceptation
- [x] Test création réservation manuelle (skip auth)
- [x] Test changement de statut (skip auth)
- [x] Test assignation table (skip auth)
- [x] Tests passent en CI (4 pass, 10 skip auth-required)

#### Scénarios
1. **Création réservation** ✅
2. **Changement statut** ✅
3. **Assignation table** ✅

#### Fichiers
- `e2e/admin.spec.ts` ✅

---

### Story 1.6 — Tests E2E Client ✅

**Priorité :** P2 — Important  
**Effort :** 1h  
**Statut :** ✅ Terminé

#### Description
Améliorer les tests E2E Playwright pour les parcours client (modification et annulation via token).

#### Critères d'Acceptation
- [x] Test modification réservation via token
- [x] Test annulation réservation via token
- [x] Tests passent en CI (11 pass)

#### Scénarios
1. **Modification** ✅
2. **Annulation** ✅
3. **Multilingue** ✅

#### Fichiers
- `e2e/reservation-management.spec.ts` ✅

---

### Story 1.7 — Role Gate Frontend ✅

**Priorité :** P2 — Important  
**Effort :** 30 min  
**Statut :** ✅ Terminé

#### Description
Ajouter une vérification de rôle dans le layout admin pour empêcher les utilisateurs non autorisés d'accéder à l'interface.

#### Critères d'Acceptation
- [x] Vérification rôle via clerkClient API (publicMetadata.role)
- [x] Rôles autorisés : admin, owner, staff
- [x] Redirection vers `/admin/access-denied` si rôle insuffisant
- [x] Page "Accès refusé" avec message clair

#### Tâches Techniques
- [x] Modifier `src/app/(admin)/admin/layout.tsx` (ajouter role check)
- [x] Créer `src/app/(auth)/admin/access-denied/page.tsx`

#### Note Post-Sprint
> L'implémentation initiale via `sessionClaims` ne fonctionnait pas car Clerk ne propage pas les `publicMetadata` dans le JWT par défaut. Corrigé en utilisant l'API `clerkClient.users.getUser()` pour récupérer le rôle directement. (commits b520b2b → c22cae5)

#### Fichiers
- `src/app/(admin)/admin/layout.tsx` ✅
- `src/app/(auth)/admin/access-denied/page.tsx` ✅

---

## Dépendances

```
Story 1.1 (Toast) ─────┐
                       ├──→ Story 1.3 (ServiceFloorPlan)
Story 1.2 (formatError)┘         │
                                 ├──→ Story 1.4 (autres composants)
                                 │
Story 1.5 (Tests E2E Admin) ─────┤
Story 1.6 (Tests E2E Client) ────┤
Story 1.7 (Role Gate) ───────────┘
```

## Timeline

| Jour | Stories | Effort |
|------|---------|--------|
| J1 | 1.1, 1.2, 1.3, 1.4 | 2h |
| J1-J2 | 1.5, 1.6 | 2h30 |
| J2 | 1.7 | 30min |
| **Total** | | **5h** |

---

## Retrospective

### Ce qui a bien fonctionné
- Utilisation de Framer Motion (déjà installé) au lieu d'ajouter une dépendance
- Helper `formatConvexError` centralisé et réutilisable
- Tests E2E avec skips conditionnels pour éviter les faux négatifs
- Role gate via clerkClient API (après correction post-sprint)

### Ce qui pourrait être amélioré
- Tests E2E avec authentification mock pour couvrir plus de scénarios
- Ajouter focus trap sur les modals (accessibilité)
- Dashboard dynamique branché sur Convex

### Leçons apprises
- **Clerk sessionClaims** : Les `publicMetadata` ne sont pas automatiquement inclus dans le JWT. Pour accéder aux metadata utilisateur côté serveur, utiliser `clerkClient.users.getUser(userId)` plutôt que `sessionClaims`.

### Actions pour le prochain sprint
- Audit accessibilité (touch targets, contraste, focus)
- Brancher dashboard sur queries Convex
- Documentation API admin

---

*Epic terminé — 2026-01-22 — Commit c22cae5*
