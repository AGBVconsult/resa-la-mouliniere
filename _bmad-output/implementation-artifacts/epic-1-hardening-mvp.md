# Epic 1 — Hardening MVP Production

**PRD Source :** PRD-012-hardening-mvp-v1_0.md  
**Priorité :** Haute  
**Effort estimé :** 6 heures  
**Statut :** Ready for Development

---

## Description

Corriger les points critiques identifiés lors de l'audit de maturité pour atteindre un niveau "production-ready" avant la mise en production du MVP Resa La Moulinière.

## Objectifs

1. Feedback utilisateur visible sur iPad (toast réel)
2. Messages d'erreur contextuels et user-friendly
3. Tests E2E des parcours critiques
4. Sécurité renforcée (role gate)

## Critères d'Acceptation Epic

- [ ] Toutes les erreurs d'assignation sont visibles sur iPad
- [ ] Messages d'erreur en français et contextuels
- [ ] Tests E2E passent en CI
- [ ] Utilisateurs sans rôle admin redirigés

---

## Stories

### Story 1.1 — Composant Toast Global

**Priorité :** P1 — Critique  
**Effort :** 45 min  
**Assigné :** -

#### Description
Créer un composant Toast basé sur Radix UI pour afficher les notifications utilisateur de manière visible sur iPad.

#### Critères d'Acceptation
- [ ] Toast visible sur iPad Safari (position fixe, z-index élevé)
- [ ] Variantes : success (vert), error (rouge), info (bleu), warning (orange)
- [ ] Auto-dismiss après 4 secondes
- [ ] Icône Lucide appropriée par variante
- [ ] Animation d'entrée/sortie fluide

#### Tâches Techniques
- [ ] Créer `src/components/ui/toast.tsx` (Radix Toast)
- [ ] Créer `src/components/ui/toaster.tsx` (Provider + container)
- [ ] Créer `src/hooks/use-toast.ts` (Hook global)
- [ ] Ajouter ToastProvider dans `src/app/(admin)/admin/layout.tsx`

#### Fichiers
- `src/components/ui/toast.tsx` (créer)
- `src/components/ui/toaster.tsx` (créer)
- `src/hooks/use-toast.ts` (créer)
- `src/app/(admin)/admin/layout.tsx` (modifier)

---

### Story 1.2 — Helper formatConvexError

**Priorité :** P1 — Critique  
**Effort :** 30 min  
**Assigné :** -

#### Description
Créer un helper pour parser les erreurs Convex et retourner des messages user-friendly en français.

#### Critères d'Acceptation
- [ ] Détecte si l'erreur est une `ConvexError`
- [ ] Lit `error.data.code` ou `error.data.messageKey`
- [ ] Mappe les codes vers des messages FR
- [ ] Fallback sur `error.message` si format inconnu

#### Tâches Techniques
- [ ] Créer `src/lib/formatError.ts`
- [ ] Mapper tous les codes de `convex/lib/errors.ts`
- [ ] Exporter fonction `formatConvexError(error): string`

#### Fichiers
- `src/lib/formatError.ts` (créer)

---

### Story 1.3 — Intégration Toast dans ServiceFloorPlan

**Priorité :** P1 — Critique  
**Effort :** 30 min  
**Assigné :** -

#### Description
Remplacer le toast factice (`console.log`) par le vrai composant toast dans le plan de salle.

#### Critères d'Acceptation
- [ ] Toast visible lors d'erreur d'assignation
- [ ] Messages contextuels (conflit table, capacité, version)
- [ ] Toast success lors d'assignation réussie
- [ ] Pas de régression fonctionnelle

#### Tâches Techniques
- [ ] Supprimer le faux toast `const toast = {...}`
- [ ] Importer `useToast` hook
- [ ] Utiliser `formatConvexError` pour les messages d'erreur
- [ ] Tester sur iPad

#### Fichiers
- `src/components/admin/floor-plan/ServiceFloorPlan.tsx` (modifier)

---

### Story 1.4 — Intégration Toast dans autres composants

**Priorité :** P1 — Critique  
**Effort :** 15 min  
**Assigné :** -

#### Description
Ajouter le feedback toast dans les autres composants admin qui gèrent des erreurs.

#### Critères d'Acceptation
- [ ] Toast sur erreur dans `handleStatusChange` (ReservationsPage)
- [ ] Toast sur erreur dans `CreateReservationModal`
- [ ] Messages user-friendly via `formatConvexError`

#### Tâches Techniques
- [ ] Modifier `src/app/(admin)/admin/reservations/page.tsx`
- [ ] Modifier `src/app/(admin)/admin/reservations/components/CreateReservationModal.tsx`

#### Fichiers
- `src/app/(admin)/admin/reservations/page.tsx` (modifier)
- `src/app/(admin)/admin/reservations/components/CreateReservationModal.tsx` (modifier)

---

### Story 1.5 — Tests E2E Admin

**Priorité :** P2 — Important  
**Effort :** 1h30  
**Assigné :** -

#### Description
Écrire des tests E2E Playwright pour les parcours critiques de l'interface admin.

#### Critères d'Acceptation
- [ ] Test création réservation manuelle
- [ ] Test changement de statut (pending → confirmed)
- [ ] Test assignation table
- [ ] Tests passent en CI

#### Scénarios
1. **Création réservation**
   - Ouvrir modal
   - Remplir formulaire
   - Soumettre
   - Vérifier apparition dans liste

2. **Changement statut**
   - Sélectionner réservation pending
   - Cliquer "Valider"
   - Vérifier statut = confirmed

3. **Assignation table**
   - Sélectionner réservation
   - Ouvrir plan de salle
   - Cliquer sur table
   - Vérifier assignation

#### Fichiers
- `tests/e2e/admin.spec.ts` (créer)

---

### Story 1.6 — Tests E2E Client

**Priorité :** P2 — Important  
**Effort :** 1h  
**Assigné :** -

#### Description
Écrire des tests E2E Playwright pour les parcours client (modification et annulation via token).

#### Critères d'Acceptation
- [ ] Test modification réservation via token
- [ ] Test annulation réservation via token
- [ ] Tests passent en CI

#### Scénarios
1. **Modification**
   - Accéder `/reservation/[token]/edit`
   - Modifier date/heure
   - Soumettre
   - Vérifier confirmation

2. **Annulation**
   - Accéder `/reservation/[token]/cancel`
   - Confirmer annulation
   - Vérifier message succès

#### Fichiers
- `tests/e2e/client-edit.spec.ts` (créer)

---

### Story 1.7 — Role Gate Frontend

**Priorité :** P2 — Important  
**Effort :** 30 min  
**Assigné :** -

#### Description
Ajouter une vérification de rôle dans le layout admin pour empêcher les utilisateurs non autorisés d'accéder à l'interface.

#### Critères d'Acceptation
- [ ] Vérification rôle via sessionClaims ou query Convex
- [ ] Rôles autorisés : admin, owner, staff
- [ ] Redirection vers `/admin/access-denied` si rôle insuffisant
- [ ] Page "Accès refusé" avec message clair

#### Tâches Techniques
- [ ] Modifier `src/app/(admin)/admin/layout.tsx` (ajouter role check)
- [ ] Créer `src/app/(admin)/admin/access-denied/page.tsx`

#### Fichiers
- `src/app/(admin)/admin/layout.tsx` (modifier)
- `src/app/(admin)/admin/access-denied/page.tsx` (créer)

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

## Retrospective (à compléter après implémentation)

### Ce qui a bien fonctionné
- 

### Ce qui pourrait être amélioré
- 

### Actions pour le prochain sprint
- 

---

*Epic généré dans le cadre du workflow BMAD — 2026-01-22*
