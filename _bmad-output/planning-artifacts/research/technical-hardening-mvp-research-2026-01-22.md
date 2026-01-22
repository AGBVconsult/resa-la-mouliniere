---
stepsCompleted: ['init', 'analysis', 'synthesis', 'complete', 'implemented']
inputDocuments: ['docs/ETAT_AVANCEMENT_GLOBAL.md', 'docs/AUDIT_MVP_2026-01-08.md', 'docs/DEVBOOK.md', 'docs/PROJECT_STATUS.md']
workflowType: 'research'
lastStep: 5
research_type: 'technical'
research_topic: 'hardening-mvp'
research_goals: 'Identifier et prioriser les améliorations techniques pour la release production'
user_name: 'Benjaminvantilcke'
date: '2026-01-22'
updated: '2026-01-22'
web_research_enabled: false
source_verification: true
status: 'implemented'
implementation_commit: '67fa6b5'
---

# Research Report: Technical Hardening MVP

**Date:** 2026-01-22  
**Auteur:** Benjaminvantilcke  
**Type de recherche:** Technical  
**Projet:** Resa La Moulinière

---

## Table des Matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Méthodologie](#2-méthodologie)
3. [Analyse Backend](#3-analyse-backend)
4. [Analyse Frontend Admin](#4-analyse-frontend-admin)
5. [Risques Identifiés](#5-risques-identifiés)
6. [Recommandations Priorisées](#6-recommandations-priorisées)
7. [Conclusion](#7-conclusion)

---

## 1. Vue d'ensemble

### Contexte
Le projet Resa La Moulinière est un système de réservation en ligne pour restaurant, comprenant :
- Widget client multilingue (5 langues)
- Backend Convex (serverless real-time)
- Interface admin iPad-first
- Plan de salle interactif
- Shadow Learning ML (Phase 2)

### État actuel
- **Progression :** 98%
- **Statut MVP :** Complet — Prêt pour release
- **Tests :** 257 passing (~80% couverture)

### Objectif de cette recherche
Identifier les améliorations techniques nécessaires avant la mise en production et pour les phases futures.

---

## 2. Méthodologie

### Sources analysées
1. **AUDIT_MVP_2026-01-08.md** — Audit fonctionnel détaillé
2. **DEVBOOK.md** — Guide développement avec tâches granulaires
3. **PROJECT_STATUS.md** — Statut projet format AGBVconsult
4. **Code source** — Audit direct des fichiers Convex et React

### Approche
- Revue de code des modules critiques
- Analyse des patterns de gestion d'erreurs
- Évaluation de la robustesse UX
- Vérification des bonnes pratiques sécurité

---

## 3. Analyse Backend

### 3.1 Points Forts

| Aspect | Évaluation | Détails |
|--------|------------|---------|
| **Idempotence** | ✅ Excellent | `dedupeKey` sur emails, `idempotencyKey` sur mutations |
| **Retry/Backoff** | ✅ Excellent | Backoff exponentiel avec jitter |
| **Optimistic Locking** | ✅ Excellent | `expectedVersion` sur toutes les mutations critiques |
| **RBAC** | ✅ Bon | Hiérarchie owner > admin > staff |
| **Logging** | ✅ Bon | Logs structurés, pas de données sensibles |
| **State Machine** | ✅ Excellent | Transitions validées, statut `incident` ajouté |

### 3.2 Points d'Attention

| Aspect | Évaluation | Détails |
|--------|------------|---------|
| **updateSettings** | ⚠️ Stub | Mutation non implémentée (non bloquant) |
| **Default role** | ⚠️ Attention | Fallback à `staff` si claim absent |
| **Inbound email** | ❌ Absent | Pas de webhook pour réponses clients |

### 3.3 Architecture Convex

```
convex/
├── schema.ts          # Schéma complet avec indexes
├── reservations.ts    # CRUD réservations + tokens
├── admin.ts           # API admin (list, update, create)
├── emails.ts          # Queue emails + worker + templates
├── floorplan.ts       # États tables + assignation
├── tables.ts          # CRUD tables
├── slots.ts           # Gestion créneaux
├── jobs.ts            # dailyFinalize
├── crons.ts           # 6 crons configurés
├── assignmentLogs.ts  # Shadow Learning
└── lib/
    ├── rbac.ts        # Gestion rôles
    ├── errors.ts      # Erreurs structurées
    ├── stateMachine.ts # Transitions
    └── email/         # Helpers email
```

---

## 4. Analyse Frontend Admin

### 4.1 Points Forts

| Aspect | Évaluation | Détails |
|--------|------------|---------|
| **Protection routes** | ✅ Bon | Middleware Clerk + auth guard layout |
| **UX iPad-first** | ✅ Bon | Touch-friendly, sidebar mobile |
| **Pagination** | ✅ Excellent | `usePaginatedQuery` avec load more |
| **Plan de salle** | ✅ Bon | Drag & drop, combinaison intelligente |
| **Composants UI** | ✅ Bon | Radix UI + Lucide icons |

### 4.2 Points Critiques

| Aspect | Évaluation | Impact | Détails |
|--------|------------|--------|---------|
| **Toast factice** | 🔴 Critique | UX | `console.log` invisible sur iPad |
| **Parsing erreurs** | 🔴 Critique | UX | `message.split("|")` déphasé vs `ConvexError.data` |
| **Role gate** | 🟡 Moyen | Sécurité | Auth sans vérification rôle côté front |
| **Dashboard** | 🟡 Moyen | UX | KPIs statiques (mock) |
| **Accessibilité** | 🟡 Moyen | A11y | Modals sans focus trap |

### 4.3 Fichiers Concernés

```
src/
├── middleware.ts                    # Protection /admin
├── app/(admin)/admin/
│   ├── layout.tsx                   # Auth guard (manque role gate)
│   ├── page.tsx                     # Dashboard statique
│   └── reservations/
│       ├── page.tsx                 # Vue Service
│       └── components/
│           └── CreateReservationModal.tsx
└── components/admin/
    └── floor-plan/
        └── ServiceFloorPlan.tsx     # Toast factice ici
```

---

## 5. Risques Identifiés

### 5.1 Risques Critiques (P1)

| ID | Risque | Impact | Probabilité | Mitigation |
|----|--------|--------|-------------|------------|
| R1 | Toast `console.log` | Utilisateur ne voit pas erreurs assignation | Certaine | Implémenter toast réel |
| R2 | Parsing erreur déphasé | Messages génériques au lieu de contextuels | Haute | Unifier avec `ConvexError.data` |

### 5.2 Risques Moyens (P2)

| ID | Risque | Impact | Probabilité | Mitigation |
|----|--------|--------|-------------|------------|
| R3 | Role gate manquant | User non-admin voit shell UI | Moyenne | Guard rôle dans layout |
| R4 | Dashboard mock | KPIs potentiellement faux | Moyenne | Brancher sur Convex ou marquer placeholder |
| R5 | Validation form légère | Données invalides acceptées | Basse | Ajouter validation téléphone |

### 5.3 Risques Faibles (P3)

| ID | Risque | Impact | Probabilité | Mitigation |
|----|--------|--------|-------------|------------|
| R6 | Accessibilité modals | Non-conformité WCAG | Basse | Focus trap, aria-label |
| R7 | Tests E2E manquants | Régression possible | Moyenne | Écrire tests critiques |

---

## 6. Recommandations Priorisées

### 6.1 Phase 1 — Hardening Immédiat (avant prod)

| # | Tâche | Effort | Fichiers |
|---|-------|--------|----------|
| 1 | **Implémenter toast réel** | 1h | `ServiceFloorPlan.tsx`, nouveau composant toast |
| 2 | **Helper formatConvexError** | 1h | Nouveau `src/lib/formatError.ts` |
| 3 | **Tests E2E admin** | 2h | `tests/e2e/admin.spec.ts` |
| 4 | **Tests E2E client** | 1h | `tests/e2e/client-edit.spec.ts` |

**Total Phase 1 : 5 heures**

### 6.2 Phase 2 — Améliorations UX (post-release)

| # | Tâche | Effort | Fichiers |
|---|-------|--------|----------|
| 5 | Role gate front | 30min | `layout.tsx` |
| 6 | Audit accessibilité | 1h | Modals, touch targets |
| 7 | Dashboard dynamique | 2h | `page.tsx` + queries Convex |
| 8 | Recherche client | 1h30 | Nouveau composant + query |

**Total Phase 2 : 5 heures**

### 6.3 Phase 3 — Fonctionnalités Avancées (backlog)

| # | Tâche | Effort |
|---|-------|--------|
| 9 | Inbound email webhook | 2h |
| 10 | Détail réservation drawer | 2h |
| 11 | Shadow Learning Phase 3 | TBD |
| 12 | Analytics avancées | TBD |

---

## 7. Conclusion

### Synthèse
Le projet Resa La Moulinière présente une **maturité technique élevée** pour un MVP :
- Backend Convex robuste avec bonnes pratiques (idempotence, retry, RBAC)
- Frontend fonctionnel mais nécessitant un hardening UX

### Priorités immédiates
1. **Toast réel** — Impact UX critique sur iPad
2. **Gestion erreurs unifiée** — Meilleure expérience utilisateur
3. **Tests E2E** — Filet de sécurité avant prod

### Estimation globale
- **Avant prod :** 5 heures (Phase 1)
- **Post-release :** 5 heures (Phase 2)
- **Total hardening :** ~10 heures

### Recommandation finale
Le projet est **prêt pour une release production** avec les corrections P1 (2h de travail critique). Les améliorations P2/P3 peuvent être planifiées en sprints post-release.

---

*Document généré dans le cadre du workflow BMAD Research — 2026-01-22*
