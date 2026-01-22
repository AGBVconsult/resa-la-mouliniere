# PRD-012 — Hardening MVP Production

**Version :** 1.0  
**Date :** 2026-01-22  
**Auteur :** Benjaminvantilcke  
**Statut :** Draft  
**Priorité :** Haute

---

## 1. Résumé Exécutif

### Contexte
Le MVP Resa La Moulinière est fonctionnellement complet (98%). Avant la mise en production, des améliorations de robustesse et d'expérience utilisateur sont nécessaires pour garantir une exploitation fiable sur iPad.

### Objectif
Corriger les points critiques identifiés lors de l'audit de maturité pour atteindre un niveau "production-ready".

### Périmètre
- Gestion des erreurs et feedback utilisateur
- Tests E2E des parcours critiques
- Améliorations UX mineures

### Hors périmètre
- Nouvelles fonctionnalités (recherche client, analytics)
- Refactoring majeur
- Shadow Learning Phase 3

---

## 2. Problèmes Identifiés

### 2.1 Toast Factice (P1 — Critique)

**Fichier :** `src/components/admin/floor-plan/ServiceFloorPlan.tsx`

**Problème :**
```typescript
const toast = {
  info: (msg: string) => console.log("[INFO]", msg),
  error: (msg: string) => console.error("[ERROR]", msg),
  success: (msg: string) => console.log("[SUCCESS]", msg),
};
```

**Impact :** Sur iPad en production, l'utilisateur ne voit **aucun feedback** lors des erreurs d'assignation de tables (conflit, capacité insuffisante, version conflict).

**Solution :** Implémenter un composant toast réel (Radix Toast ou Sonner).

### 2.2 Parsing Erreurs Déphasé (P1 — Critique)

**Fichier :** `src/components/admin/floor-plan/ServiceFloorPlan.tsx`

**Problème :**
```typescript
const message = error.message || "Erreur d'assignation";
const [code, ...params] = message.split("|");
```

**Impact :** Le backend utilise `ConvexError` avec `data.code/messageKey/meta`, pas un format `code|param1|param2`. Les messages d'erreur sont donc génériques.

**Solution :** Créer un helper `formatConvexError(error)` qui lit `error.data` correctement.

### 2.3 Tests E2E Manquants (P2 — Important)

**Impact :** Risque de régression lors des futures modifications.

**Solution :** Écrire des tests E2E pour :
- Parcours admin (création réservation, changement statut, assignation table)
- Parcours client (modification, annulation via token)

### 2.4 Role Gate Manquant (P2 — Important)

**Fichier :** `src/app/(admin)/admin/layout.tsx`

**Problème :** Le layout vérifie l'authentification Clerk mais pas le rôle. Un utilisateur connecté sans rôle admin/staff peut voir le shell UI.

**Solution :** Ajouter une vérification de rôle et rediriger vers une page "Accès refusé".

---

## 3. Spécifications Fonctionnelles

### 3.1 Composant Toast Global

#### Exigences
- [ ] Toast visible sur iPad (position fixe, z-index élevé)
- [ ] Variantes : success (vert), error (rouge), info (bleu), warning (orange)
- [ ] Auto-dismiss après 4 secondes (configurable)
- [ ] Icône Lucide appropriée par variante
- [ ] Animation d'entrée/sortie fluide

#### API
```typescript
// Hook global
const { toast } = useToast();

// Utilisation
toast.success("Table assignée");
toast.error("Capacité insuffisante: 4 < 6 personnes");
toast.info("Sélectionnez une réservation");
```

#### Intégration
- Provider dans `src/app/(admin)/admin/layout.tsx`
- Remplacement dans `ServiceFloorPlan.tsx`
- Utilisation dans `CreateReservationModal.tsx`
- Utilisation dans `ReservationsPage` (handleStatusChange)

### 3.2 Helper formatConvexError

#### Exigences
- [ ] Détecte si l'erreur est une `ConvexError`
- [ ] Lit `error.data.code` ou `error.data.messageKey`
- [ ] Mappe les codes vers des messages FR user-friendly
- [ ] Fallback sur `error.message` si format inconnu

#### Mapping des codes
```typescript
const ERROR_MESSAGES: Record<string, string> = {
  VERSION_CONFLICT: "La réservation a été modifiée. Rafraîchissez la page.",
  TABLE_OCCUPIED_SEATED: "Cette table est occupée",
  TABLE_CONFLICT: "Cette table est déjà réservée",
  INSUFFICIENT_CAPACITY: "Capacité insuffisante",
  SLOT_FULL: "Ce créneau est complet",
  INVALID_TRANSITION: "Cette action n'est pas autorisée",
  UNAUTHORIZED: "Accès non autorisé",
  // ... autres codes de convex/lib/errors.ts
};
```

### 3.3 Tests E2E Admin

#### Scénarios à couvrir
1. **Création réservation manuelle**
   - Ouvrir modal
   - Remplir formulaire (nom, email, heure, couverts)
   - Soumettre
   - Vérifier apparition dans la liste

2. **Changement de statut**
   - Sélectionner réservation pending
   - Cliquer "Valider"
   - Vérifier statut = confirmed

3. **Assignation table**
   - Sélectionner réservation
   - Ouvrir plan de salle
   - Cliquer sur table libre
   - Vérifier assignation

### 3.4 Tests E2E Client

#### Scénarios à couvrir
1. **Modification réservation**
   - Accéder via token `/reservation/[token]/edit`
   - Modifier date/heure
   - Soumettre
   - Vérifier confirmation

2. **Annulation réservation**
   - Accéder via token `/reservation/[token]/cancel`
   - Confirmer annulation
   - Vérifier message succès

### 3.5 Role Gate Frontend

#### Exigences
- [ ] Vérifier rôle via `auth().sessionClaims` ou query Convex
- [ ] Rôles autorisés : `admin`, `owner`, `staff`
- [ ] Redirection vers `/admin/access-denied` si rôle insuffisant
- [ ] Page "Accès refusé" avec message clair

---

## 4. Spécifications Techniques

### 4.1 Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `src/components/ui/toast.tsx` | Composant Toast (Radix-based) |
| `src/components/ui/toaster.tsx` | Provider + container |
| `src/hooks/use-toast.ts` | Hook global |
| `src/lib/formatError.ts` | Helper formatConvexError |
| `src/app/(admin)/admin/access-denied/page.tsx` | Page accès refusé |
| `tests/e2e/admin.spec.ts` | Tests E2E admin |
| `tests/e2e/client-edit.spec.ts` | Tests E2E client |

### 4.2 Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/app/(admin)/admin/layout.tsx` | Ajouter ToastProvider + role gate |
| `src/components/admin/floor-plan/ServiceFloorPlan.tsx` | Remplacer toast factice |
| `src/app/(admin)/admin/reservations/page.tsx` | Ajouter toast sur erreurs |
| `src/app/(admin)/admin/reservations/components/CreateReservationModal.tsx` | Utiliser formatConvexError |

### 4.3 Dépendances

Aucune nouvelle dépendance requise — utiliser Radix Toast déjà disponible via shadcn/ui.

---

## 5. Plan d'Implémentation

### Phase 1 — Corrections Critiques (2h)

| # | Tâche | Effort | Priorité |
|---|-------|--------|----------|
| 1.1 | Créer composant Toast (Radix) | 45min | P1 |
| 1.2 | Créer helper formatConvexError | 30min | P1 |
| 1.3 | Intégrer dans ServiceFloorPlan | 30min | P1 |
| 1.4 | Intégrer dans autres composants | 15min | P1 |

### Phase 2 — Tests E2E (3h)

| # | Tâche | Effort | Priorité |
|---|-------|--------|----------|
| 2.1 | Setup Playwright si nécessaire | 30min | P2 |
| 2.2 | Tests E2E admin | 1h30 | P2 |
| 2.3 | Tests E2E client | 1h | P2 |

### Phase 3 — Améliorations UX (1h)

| # | Tâche | Effort | Priorité |
|---|-------|--------|----------|
| 3.1 | Role gate frontend | 30min | P2 |
| 3.2 | Page access-denied | 15min | P2 |
| 3.3 | Audit touch targets | 15min | P3 |

---

## 6. Critères d'Acceptation

### 6.1 Toast
- [ ] Toast visible sur iPad Safari
- [ ] Messages d'erreur contextuels (pas génériques)
- [ ] Auto-dismiss fonctionne
- [ ] Pas de régression sur les fonctionnalités existantes

### 6.2 Gestion Erreurs
- [ ] Erreurs Convex correctement parsées
- [ ] Messages en français user-friendly
- [ ] Fallback sur message générique si code inconnu

### 6.3 Tests E2E
- [ ] Tests passent en CI
- [ ] Couverture des parcours critiques
- [ ] Pas de flaky tests

### 6.4 Role Gate
- [ ] User sans rôle redirigé
- [ ] User avec rôle accède normalement
- [ ] Page access-denied claire

---

## 7. Risques et Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Radix Toast incompatible iPad | Faible | Moyen | Tester sur iPad réel avant merge |
| Tests E2E flaky | Moyenne | Faible | Utiliser waitFor et retry |
| Régression fonctionnelle | Faible | Élevé | Tests manuels avant deploy |

---

## 8. Métriques de Succès

| Métrique | Cible |
|----------|-------|
| Erreurs visibles par l'utilisateur | 100% |
| Tests E2E passants | 100% |
| Temps de correction d'un bug | < 1h (grâce aux tests) |
| Satisfaction utilisateur iPad | Pas de plainte UX |

---

## 9. Timeline

| Semaine | Livrables |
|---------|-----------|
| S1 (immédiat) | Phase 1 — Toast + formatConvexError |
| S1 | Phase 2 — Tests E2E |
| S2 | Phase 3 — Role gate + polish |
| S2 | **Release production** |

**Effort total estimé :** 6 heures

---

## 10. Références

- `docs/ETAT_AVANCEMENT_GLOBAL.md` — État d'avancement complet
- `docs/AUDIT_MVP_2026-01-08.md` — Audit fonctionnel
- `convex/lib/errors.ts` — Codes d'erreur backend
- Radix Toast : https://www.radix-ui.com/primitives/docs/components/toast

---

*PRD généré dans le cadre du workflow BMAD — 2026-01-22*
