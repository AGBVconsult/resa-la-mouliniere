# DEVBOOK — Resa La Moulinière

> Guide de développement complet avec tâches granulaires.
> Utilisé par Windsurf et Claude pour recommander la prochaine tâche selon le temps disponible.

**Dernière mise à jour :** 2026-02-16
**Progression globale :** 100%

---

## 📋 Index des Sprints

| Sprint | Nom | Statut | Progression |
|--------|-----|--------|-------------|
| 1 | Backend Core | ✅ Terminé | 100% |
| 2 | Widget Client | ✅ Terminé | 100% |
| 3 | Emails & Crons | ✅ Terminé | 100% |
| 3b | Page Modification Client | ✅ Terminé | 100% |
| 3c | Page Annulation Client | ✅ Terminé | 100% |
| 4 | Interface Admin | ✅ Terminé | 100% |
| 4b | Plan de Salle (PRD-004) | ✅ Terminé | 100% |
| 4c | Shadow Learning (PRD-011) | ✅ Terminé | 100% |
| 5 | Polish & Tests | ✅ Terminé | 100% |
| 6 | Interface Tablette | ✅ Terminé | 100% |
| 7 | Interface Mobile | ✅ Terminé | 100% |
| 8 | Migration NextAuth | ✅ Terminé | 100% |
| 9 | Améliorations UX | ✅ Terminé | 100% |

---

## 🏃 Sprint Actuel : En Production

### Objectif
Application en production. Améliorations continues.

### Critères de complétion MVP
- [x] Vue Service affiche les réservations du jour par service (lunch/dinner)
- [x] Gestion des statuts fonctionnelle (pending → confirmed → seated → completed)
- [x] Attribution de tables par click-to-click
- [x] Shadow Learning Phase 1 & 2 (PRD-011) — Logging + prédictions ML
- [x] Corrections sécurité (revue adversariale)
- [x] Bug primaryTableId — Corrigé
- [x] Création de réservation manuelle (téléphone/walk-in) — `CreateReservationModal.tsx`
- [x] Notification email admin quand réservation pending créée — `admin.notification`
- [x] Notification push Pushover — `notifications.ts`
- [x] Cron email review J+1 — `enqueueReviewEmails`
- [x] dailyFinalize (noshow/completed auto) — `jobs.dailyFinalize`
- [x] Tests E2E parcours admin
- [x] Tests E2E parcours client modification

### Critères de complétion Post-MVP
- [x] Interface Tablette (`/admin-tablette`) — iPad paysage optimisé
- [x] Interface Mobile (`/admin-mobile`) — iPhone optimisé
- [x] Migration NextAuth — Remplacement de Clerk
- [x] Popup fermeture widget — `ClosureNoticeModal.tsx`
- [x] Calendrier tablette responsive — iPad mini/Pro
- [x] Badges CRM — NEW/Regular/VIP selon totalVisits
- [x] Sélection automatique service — Selon l'heure (>=16h = dîner)
- [x] PWA icons — Logo La Moulinière

---

## 📦 Backlog Détaillé

### Légende

| Icône | Signification |
|-------|---------------|
| ✅ | Terminé |
| 🟡 | En cours |
| ❌ | Non commencé |
| 🔴 | Bloquant / Critique |
| 🟢 | Nice-to-have |
| ⏱️ | Durée estimée |
| 🔗 | Dépendance |

---

## [EPIC-1] — Interface Admin Core

> Interface admin iPad-first pour la gestion quotidienne des réservations

**Statut global :** ✅ Terminé (100%)
**Effort total :** Terminé
**Priorité :** ✅ Complété

### Tâches

#### [TASK-101] — Layout Admin avec navigation
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 2h
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `src/app/admin/layout.tsx` (créer)
  - `src/app/admin/page.tsx` (créer)
  - `src/components/admin/AdminNav.tsx` (créer)
- **Description :** 
  - Créer le layout admin avec sidebar navigation
  - Intégrer Clerk pour auth admin
  - Navigation : Dashboard, Réservations, Paramètres
  - Design iPad-first (touch-friendly, grands boutons)
- **Critères de validation :**
  - [ ] Route `/admin` accessible uniquement aux rôles admin/owner/staff
  - [ ] Layout responsive iPad/Desktop
  - [ ] Navigation fonctionnelle

#### [TASK-102] — Sélecteur de date et service
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 1h
- **Dépendances :** 🔗 TASK-101
- **Fichiers :** 
  - `src/components/admin/DateServiceSelector.tsx` (créer)
- **Description :** 
  - Composant pour sélectionner date (calendrier) et service (lunch/dinner)
  - Boutons "Aujourd'hui", "Demain", navigation semaine
  - Toggle lunch/dinner avec indicateur de réservations
- **Critères de validation :**
  - [ ] Sélection date fonctionne
  - [ ] Toggle service fonctionne
  - [ ] État synchronisé avec URL params

#### [TASK-103] — Vue Service (liste réservations)
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 3h
- **Dépendances :** 🔗 TASK-102
- **Fichiers :** 
  - `src/app/admin/service/page.tsx` (créer)
  - `src/components/admin/ReservationList.tsx` (créer)
  - `src/components/admin/ReservationCard.tsx` (créer)
- **Description :** 
  - Afficher liste des réservations pour date/service sélectionné
  - Utiliser `api.admin.listReservations` existant
  - Card par réservation : nom, heure, couverts, statut, table
  - Tri par heure, filtres par statut
  - Indicateurs visuels par statut (couleurs)
- **Critères de validation :**
  - [ ] Liste affiche réservations temps réel (Convex)
  - [ ] Filtres par statut fonctionnent
  - [ ] Design touch-friendly

#### [TASK-104] — Détail réservation (drawer/modal)
- **Statut :** ❌
- **Durée :** ⏱️ 2h
- **Dépendances :** 🔗 TASK-103
- **Fichiers :** 
  - `src/components/admin/ReservationDetail.tsx` (créer)
- **Description :** 
  - Drawer latéral ou modal avec détails complets
  - Infos client : nom, email, téléphone, note
  - Historique réservations client (CRM basique)
  - Options sélectionnées (chaise haute, PMR, chien)
- **Critères de validation :**
  - [ ] Toutes les infos réservation affichées
  - [ ] Lien vers historique client
  - [ ] Actions rapides accessibles

#### [TASK-105] — Gestion des statuts (boutons d'action)
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 2h
- **Dépendances :** 🔗 TASK-104
- **Fichiers :** 
  - `src/components/admin/StatusActions.tsx` (créer)
- **Description :** 
  - Boutons pour changer statut selon state machine :
    - pending → confirmed (Valider) / refused (Refuser)
    - confirmed → seated (Installer) / noshow (No-show)
    - seated → completed (Terminer)
  - Utiliser `api.admin.updateReservation` existant
  - Confirmation avant actions destructives (refuse, noshow)
- **Critères de validation :**
  - [ ] Transitions respectent state machine
  - [ ] Emails déclenchés (validated, refused)
  - [ ] UI feedback immédiat (optimistic update)

#### [TASK-106] — Attribution de tables (click-to-click)
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 3h
- **Dépendances :** 🔗 TASK-105
- **Fichiers :** 
  - `src/components/admin/floor-plan/ServiceFloorPlan.tsx` ✅
  - `src/components/admin/floor-plan/FloorPlanGrid.tsx` ✅
  - `src/components/admin/floor-plan/FloorPlanTable.tsx` ✅
- **Description :** 
  - Grille des tables avec dimensions dynamiques
  - Click sur réservation → click sur table = assignation directe
  - Visualisation tables occupées/libres/réservées
  - Multi-tables automatique (combinaison intelligente)
  - Zones salle/terrasse avec switch
- **Critères de validation :**
  - [x] Assignation table fonctionne
  - [x] Visualisation occupation temps réel
  - [x] Pas de drag & drop (click-to-click uniquement)
  - [x] Combinaison bidirectionnelle intelligente

#### [TASK-107] — Création réservation manuelle
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 2h
- **Dépendances :** 🔗 TASK-103
- **Fichiers :** 
  - `src/app/(admin)/admin/reservations/components/CreateReservationModal.tsx` ✅
  - `convex/admin.ts` (`createReservation`) ✅
- **Description :** 
  - Formulaire création réservation (téléphone, walk-in)
  - Champs : date, heure, couverts, nom, téléphone, email, note
  - Source = "admin", "phone" ou "walkin"
  - Bypass validation Turnstile
- **Critères de validation :**
  - [x] Création réservation fonctionne
  - [x] Source correctement enregistrée
  - [x] Email confirmation envoyé si email fourni

#### [TASK-108] — Recherche client
- **Statut :** ❌
- **Durée :** ⏱️ 1h30
- **Dépendances :** 🔗 TASK-103
- **Fichiers :** 
  - `src/components/admin/ClientSearch.tsx` (créer)
  - `convex/admin.ts` (modifier - ajouter searchClients)
- **Description :** 
  - Recherche par nom, email, téléphone
  - Autocomplétion
  - Affichage historique réservations client
- **Critères de validation :**
  - [ ] Recherche fonctionne
  - [ ] Résultats pertinents
  - [ ] Historique accessible

---

## [EPIC-2] — Emails Admin & Triggers

> Compléter la séquence d'emails et notifications admin

**Statut global :** ✅ Terminé (100%)
**Effort total :** Terminé
**Priorité :** ✅ Complété

### Tâches

#### [TASK-201] — Notification admin pour réservations pending
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 45min
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `convex/reservations.ts` (`_create` enqueue email + push) ✅
  - `convex/emails.ts` (type `admin.notification`) ✅
  - `convex/notifications.ts` (push Pushover) ✅
- **Description :** 
  - Quand réservation créée avec status "pending" (>4 couverts)
  - Envoyer email à admin avec détails réservation
  - Envoyer push notification Pushover
  - Lien direct vers admin pour valider/refuser
- **Critères de validation :**
  - [x] Email envoyé à admin
  - [x] Push notification envoyée
  - [x] Lien fonctionne
  - [x] Template clair et actionnable

#### [TASK-202] — Trigger email validated depuis admin
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 30min
- **Dépendances :** 🔗 TASK-105
- **Fichiers :** 
  - `convex/admin.ts` (`updateReservation`) ✅
- **Description :** 
  - Quand admin change status pending → confirmed
  - Déclencher email "reservation.validated" au client
- **Critères de validation :**
  - [x] Email envoyé automatiquement
  - [x] Template correct utilisé

#### [TASK-203] — Trigger email refused depuis admin
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 30min
- **Dépendances :** 🔗 TASK-105
- **Fichiers :** 
  - `convex/admin.ts` (`updateReservation`) ✅
- **Description :** 
  - Quand admin refuse réservation (pending → refused)
  - Déclencher email "reservation.refused" au client
- **Critères de validation :**
  - [x] Email envoyé automatiquement
  - [x] Template correct utilisé

#### [TASK-204] — Cron email review J+1
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 1h
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `convex/emails.ts` (`enqueueReviewEmails`) ✅
  - `convex/crons.ts` (`enqueue-reviews` à 10h) ✅
- **Description :** 
  - Cron à 10h chaque jour
  - Trouver réservations "completed" de la veille
  - Exclut les réservations avec événement "incident"
  - Envoyer email demande d'avis
- **Critères de validation :**
  - [x] Cron configuré
  - [x] Emails envoyés aux bonnes réservations
  - [x] Pas de doublon (idempotence via dedupeKey)
  - [x] Exclut les incidents

#### [TASK-205] — dailyFinalize (no-show automatique)
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 1h
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `convex/jobs.ts` (`dailyFinalize`) ✅
  - `convex/crons.ts` (`daily-finalize` à 3h) ✅
- **Description :** 
  - Cron à 3h du matin
  - Trouver réservations "confirmed" de la veille → "noshow"
  - Trouver réservations "seated" de la veille → "completed"
  - Log des événements dans reservationEvents
- **Critères de validation :**
  - [x] Cron configuré
  - [x] Seules les réservations passées sont marquées
  - [x] Log des actions dans reservationEvents

---

## [EPIC-3] — Page Modification Client

> Permettre au client de modifier sa réservation via lien email

**Statut global :** ✅ Terminé
**Effort total :** 0.5 jour
**Priorité :** 🟡 Haute

### Tâches

#### [TASK-301] — Page modification réservation
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 2h
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `src/app/reservation/[token]/edit/page.tsx` ✅
  - `convex/reservations.ts` (updateByToken existe) ✅
- **Description :** 
  - Page accessible via token (lien dans email)
  - Formulaire pré-rempli avec données actuelles
  - Modification : date, heure, couverts, note, options
  - Vérification disponibilité avant validation
  - Style graphique cohérent avec le widget client
  - Multilingue (FR/NL/EN/DE/IT)
- **Critères de validation :**
  - [x] Page accessible via token
  - [x] Modification fonctionne
  - [x] Email confirmation envoyé après modification
  - [x] Options (chaise haute, PMR, chien) pré-cochées
  - [x] Calendrier mensuel intégré

#### [TASK-302] — Lien modification dans emails
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 30min
- **Dépendances :** 🔗 TASK-301
- **Fichiers :** 
  - `convex/lib/email/templates.ts` (vérifier editUrl)
- **Description :** 
  - Vérifier que editUrl pointe vers /reservation/[token]/edit
  - Tester tous les templates concernés
- **Critères de validation :**
  - [x] Liens fonctionnels dans tous les emails

#### [TASK-303] — Page annulation réservation
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 1h
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `src/app/reservation/[token]/cancel/page.tsx` ✅
- **Description :** 
  - Page accessible via token (lien dans email)
  - Affiche résumé de la réservation (date, heure, convives)
  - Message d'avertissement (action irréversible)
  - Bouton de confirmation d'annulation
  - Style graphique cohérent avec le widget client
  - Multilingue (FR/NL/EN/DE/IT)
- **Critères de validation :**
  - [x] Page accessible via token
  - [x] Annulation fonctionne
  - [x] Message de confirmation affiché
  - [x] Traductions complètes

---

## [EPIC-4] — Backend Compléments

> Fonctionnalités backend manquantes pour le MVP

**Statut global :** ✅ Terminé (100%)
**Effort total :** Terminé
**Priorité :** ✅ Complété

### Tâches

#### [TASK-401] — Mutation admin createReservation
- **Statut :** ✅ Terminé
- **Durée :** ⏱️ 45min
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `convex/admin.ts` (`createReservation`) ✅
- **Description :** 
  - Exposer mutation pour création réservation admin
  - Paramètres : date, time, service, partySize, firstName, lastName, phone, email, note, source, tableIds
  - Bypass Turnstile, bypass seuil pending
  - Status = "confirmed" par défaut
- **Critères de validation :**
  - [x] Mutation fonctionne
  - [x] RBAC enforced (admin/owner/staff)
  - [x] Email confirmation envoyé

#### [TASK-402] — Query admin searchClients
- **Statut :** ❌
- **Durée :** ⏱️ 45min
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `convex/admin.ts` (modifier)
- **Description :** 
  - Recherche clients par nom, email, téléphone
  - Retourner : infos client + nombre réservations + dernière visite
  - Pagination
- **Critères de validation :**
  - [ ] Recherche fonctionne
  - [ ] Résultats pertinents
  - [ ] Performance acceptable

---

## [EPIC-5] — Polish & Tests

> Finalisation et tests avant release MVP

**Statut global :** ❌ Non commencé
**Effort total :** 1-2 jours
**Priorité :** 🟢 Moyenne

### Tâches

#### [TASK-501] — Tests E2E parcours admin
- **Statut :** ❌
- **Durée :** ⏱️ 2h
- **Dépendances :** 🔗 EPIC-1 complet
- **Fichiers :** 
  - `tests/e2e/admin.spec.ts` (créer)
- **Description :** 
  - Test création réservation manuelle
  - Test changement statuts
  - Test attribution table
- **Critères de validation :**
  - [ ] Tests passent
  - [ ] Couverture parcours critique

#### [TASK-502] — Tests E2E parcours client modification
- **Statut :** ❌
- **Durée :** ⏱️ 1h
- **Dépendances :** 🔗 EPIC-3 complet
- **Fichiers :** 
  - `tests/e2e/client-edit.spec.ts` (créer)
- **Description :** 
  - Test modification réservation via token
  - Test annulation via token
- **Critères de validation :**
  - [ ] Tests passent

#### [TASK-503] — Audit accessibilité admin
- **Statut :** ❌
- **Durée :** ⏱️ 1h
- **Dépendances :** 🔗 EPIC-1 complet
- **Fichiers :** 
  - Interface admin
- **Description :** 
  - Vérifier contraste couleurs
  - Vérifier taille touch targets (44px min)
  - Vérifier navigation clavier
- **Critères de validation :**
  - [ ] Touch targets ≥ 44px
  - [ ] Contraste WCAG AA

#### [TASK-504] — Documentation API admin
- **Statut :** ❌
- **Durée :** ⏱️ 1h
- **Dépendances :** 🔗 EPIC-1, EPIC-4 complets
- **Fichiers :** 
  - `docs/API_ADMIN.md` (créer)
- **Description :** 
  - Documenter toutes les mutations/queries admin
  - Exemples d'utilisation
  - Permissions requises
- **Critères de validation :**
  - [ ] Documentation complète
  - [ ] Exemples fonctionnels

---

## 🎯 Quick Reference — Tâches par Durée

### ⏱️ 30 minutes ou moins
| ID | Tâche | Epic | Dépendances |
|----|-------|------|-------------|
| TASK-202 | Trigger email validated | Emails | TASK-105 |
| TASK-203 | Trigger email refused | Emails | TASK-105 |
| TASK-302 | Lien modification emails | Client | TASK-301 |

### ⏱️ 45 minutes
| ID | Tâche | Epic | Dépendances |
|----|-------|------|-------------|
| TASK-201 | Notification admin pending | Emails | Aucune |
| TASK-401 | Mutation admin createReservation | Backend | Aucune |
| TASK-402 | Query admin searchClients | Backend | Aucune |

### ⏱️ 1 heure
| ID | Tâche | Epic | Dépendances |
|----|-------|------|-------------|
| TASK-102 | Sélecteur date/service | Admin | TASK-101 |
| TASK-204 | Cron email review J+1 | Emails | Aucune |
| TASK-205 | dailyFinalize no-show | Emails | Aucune |
| TASK-502 | Tests E2E client edit | Tests | EPIC-3 |
| TASK-503 | Audit accessibilité | Tests | EPIC-1 |
| TASK-504 | Documentation API | Tests | EPIC-1, EPIC-4 |

### ⏱️ 1h30
| ID | Tâche | Epic | Dépendances |
|----|-------|------|-------------|
| TASK-108 | Recherche client | Admin | TASK-103 |

### ⏱️ 2 heures
| ID | Tâche | Epic | Dépendances |
|----|-------|------|-------------|
| TASK-101 | Layout Admin | Admin | Aucune |
| TASK-104 | Détail réservation | Admin | TASK-103 |
| TASK-105 | Gestion statuts | Admin | TASK-104 |
| TASK-107 | Création manuelle | Admin | TASK-103 |
| TASK-301 | Page modification client | Client | Aucune |
| TASK-501 | Tests E2E admin | Tests | EPIC-1 |

### ⏱️ 3 heures
| ID | Tâche | Epic | Dépendances |
|----|-------|------|-------------|
| TASK-103 | Vue Service liste | Admin | TASK-102 |
| TASK-106 | Attribution tables | Admin | TASK-105 |

---

## 🚧 Bloquants Actuels

| ID | Bloquant | Impact | Action requise |
|----|----------|--------|----------------|
| ~~BLOCK-001~~ | ~~Interface Admin inexistante~~ | ~~Bloque release MVP~~ | ✅ Résolu |

**Aucun bloquant actuel — MVP prêt pour release**

---

## 📝 Notes Techniques

### Architecture
- **Frontend :** Next.js 16 + React 19 + TailwindCSS + Radix UI
- **Backend :** Convex (serverless real-time DB + functions)
- **Auth :** Clerk (RBAC : admin, owner, staff)
- **Emails :** Resend avec queue et retry
- **CAPTCHA :** Cloudflare Turnstile (widget client uniquement)
- **ML :** Shadow Learning (PRD-011) — scoring V0 rule-based, prédictions de SETS

### Conventions
- Icônes : Lucide uniquement (pas d'emojis dans le code)
- i18n : 5 langues (FR/NL/EN/DE/IT)
- Touch targets : minimum 44px pour iPad
- State machine réservations : voir `convex/lib/stateMachine.ts`

### Commandes utiles
```bash
# Dev
pnpm dev

# Tests
pnpm test

# Convex dev
npx convex dev

# Deploy Vercel
vercel --prod

# Deploy Convex
npx convex deploy
```

### État des réservations (State Machine)
```
pending ──→ confirmed ──→ seated ──→ completed
    │           │           │
    ↓           ↓           ↓
 refused      noshow     incident
    │           │
    ↓           ↓
cancelled   cancelled

Nouveau statut "incident" ajouté (18/01) - empêche envoi email review J+1
```

---

## 📅 Historique des Sessions

| Date | Durée | Tâches complétées | Notes |
|------|-------|-------------------|-------|
| 2026-01-08 | 2h | Audit MVP complet | Création DEVBOOK, PROJECT_STATUS |
| 2026-01-17 | 3h | Pages edit/cancel client | TASK-301, TASK-303 |
| 2026-01-18 | 4h | Interface Admin Vue Service | TASK-101, 102, 103, 105 + tracking ponctualité |
| 2026-01-21 | 3h | Plan de salle complet | TASK-106 + PRD-004 (config tables, assignation directe, combinaison intelligente) |
| 2026-01-22 | 2h | Shadow Learning PRD-011 | Phase 1 (logging) + Phase 2 (prédictions ML, scoring V0, shadow metrics) |
| 2026-01-22 | 1h | Corrections sécurité | Revue adversariale: error handling, N+1 queries, auth audit |
| 2026-01-22 | 2h | **MVP COMPLET** | TASK-107, 201-205, 401 — Création manuelle, emails admin, crons, dailyFinalize |
| 2026-01-24 | 2h | Sprint Hardening | Toast réel, formatConvexError, role gate, notifications header |
| 2026-02-02 | 4h | Interface Tablette + Mobile | `/admin-tablette`, `/admin-mobile`, PWA icons |
| 2026-02-02 | 2h | Migration NextAuth | Remplacement Clerk par NextAuth credentials |
| 2026-02-03 | 2h | Améliorations Widget | Popup fermeture, CRM badges, filtrage créneaux passés |
| 2026-02-05 | 2h | Calendrier Tablette | CalendarPopup responsive iPad mini/Pro, sélection auto service |

---

## 🎯 Recommandation Prochaine Tâche

**APPLICATION EN PRODUCTION — Toutes les fonctionnalités sont terminées !**

**Si tu as 30 min :** TASK-503 (Audit accessibilité) — Vérifier touch targets et contraste

**Si tu as 1h :** TASK-504 (Documentation API) — Créer docs/API_ADMIN.md

**Si tu as 2h :** TASK-108 (Recherche client) — Nice-to-have pour améliorer UX admin

**Si tu as une demi-journée :** Analytics avancées — Dashboard dynamique branché sur Convex
