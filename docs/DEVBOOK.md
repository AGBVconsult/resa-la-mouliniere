# DEVBOOK — Resa La Moulinière

> Guide de développement complet avec tâches granulaires.
> Utilisé par Windsurf et Claude pour recommander la prochaine tâche selon le temps disponible.

**Dernière mise à jour :** 2026-01-17
**Progression globale :** 70%

---

## 📋 Index des Sprints

| Sprint | Nom | Statut | Progression |
|--------|-----|--------|-------------|
| 1 | Backend Core | ✅ Terminé | 100% |
| 2 | Widget Client | ✅ Terminé | 100% |
| 3 | Emails & Crons | 🟡 En cours | 80% |
| 3b | Page Modification Client | ✅ Terminé | 100% |
| 3c | Page Annulation Client | ✅ Terminé | 100% |
| 4 | Interface Admin | ❌ Non commencé | 0% |
| 5 | Polish & Tests | ❌ Non commencé | 0% |

---

## 🏃 Sprint Actuel : Interface Admin

### Objectif
Créer l'interface admin complète (iPad-first) permettant la gestion quotidienne des réservations : vue service, gestion statuts, attribution tables, création manuelle.

### Critères de complétion
- [ ] Vue Service affiche les réservations du jour par service (lunch/dinner)
- [ ] Gestion des statuts fonctionnelle (pending → confirmed → seated → completed)
- [ ] Attribution de tables par click-to-click
- [ ] Création de réservation manuelle (téléphone/walk-in)
- [ ] Notification email admin quand réservation pending créée

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

**Statut global :** ❌ Non commencé
**Effort total :** 3-4 jours
**Priorité :** 🔴 Critique (bloquant MVP)

### Tâches

#### [TASK-101] — Layout Admin avec navigation
- **Statut :** ❌
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
- **Statut :** ❌
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
- **Statut :** ❌
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
- **Statut :** ❌
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
- **Statut :** ❌
- **Durée :** ⏱️ 3h
- **Dépendances :** 🔗 TASK-105
- **Fichiers :** 
  - `src/components/admin/TableAssignment.tsx` (créer)
  - `src/components/admin/TableGrid.tsx` (créer)
- **Description :** 
  - Grille des tables disponibles
  - Click sur réservation → click sur table = assignation
  - Visualisation tables occupées/libres
  - Multi-tables possible (grands groupes)
- **Critères de validation :**
  - [ ] Assignation table fonctionne
  - [ ] Visualisation occupation temps réel
  - [ ] Pas de drag & drop (click-to-click uniquement)

#### [TASK-107] — Création réservation manuelle
- **Statut :** ❌
- **Durée :** ⏱️ 2h
- **Dépendances :** 🔗 TASK-103
- **Fichiers :** 
  - `src/components/admin/ManualReservationForm.tsx` (créer)
  - `convex/admin.ts` (modifier - exposer createReservation)
- **Description :** 
  - Formulaire création réservation (téléphone, walk-in)
  - Champs : date, heure, couverts, nom, téléphone, email (optionnel), note
  - Source = "admin" ou "phone"
  - Bypass validation Turnstile
- **Critères de validation :**
  - [ ] Création réservation fonctionne
  - [ ] Source correctement enregistrée
  - [ ] Email confirmation envoyé si email fourni

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

**Statut global :** 🟡 En cours (80%)
**Effort total :** 1 jour
**Priorité :** 🔴 Critique

### Tâches

#### [TASK-201] — Notification admin pour réservations pending
- **Statut :** ❌
- **Durée :** ⏱️ 45min
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `convex/reservations.ts` (modifier)
  - `convex/emails.ts` (modifier - ajouter type admin.notification)
  - `convex/lib/email/templates.ts` (modifier - ajouter template admin)
- **Description :** 
  - Quand réservation créée avec status "pending" (>4 couverts)
  - Envoyer email à admin avec détails réservation
  - Lien direct vers admin pour valider/refuser
- **Critères de validation :**
  - [ ] Email envoyé à admin
  - [ ] Lien fonctionne
  - [ ] Template clair et actionnable

#### [TASK-202] — Trigger email validated depuis admin
- **Statut :** ❌
- **Durée :** ⏱️ 30min
- **Dépendances :** 🔗 TASK-105
- **Fichiers :** 
  - `convex/admin.ts` (modifier)
- **Description :** 
  - Quand admin change status pending → confirmed
  - Déclencher email "reservation.validated" au client
- **Critères de validation :**
  - [ ] Email envoyé automatiquement
  - [ ] Template correct utilisé

#### [TASK-203] — Trigger email refused depuis admin
- **Statut :** ❌
- **Durée :** ⏱️ 30min
- **Dépendances :** 🔗 TASK-105
- **Fichiers :** 
  - `convex/admin.ts` (modifier)
- **Description :** 
  - Quand admin refuse réservation (pending → refused)
  - Déclencher email "reservation.refused" au client
  - Inclure raison du refus (optionnel)
- **Critères de validation :**
  - [ ] Email envoyé automatiquement
  - [ ] Raison incluse si fournie

#### [TASK-204] — Cron email review J+1
- **Statut :** ❌
- **Durée :** ⏱️ 1h
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `convex/emails.ts` (modifier - ajouter enqueueReviewEmails)
  - `convex/crons.ts` (modifier)
- **Description :** 
  - Cron à 10h chaque jour
  - Trouver réservations "completed" de la veille
  - Envoyer email demande d'avis avec lien Google Reviews
- **Critères de validation :**
  - [ ] Cron configuré
  - [ ] Emails envoyés aux bonnes réservations
  - [ ] Pas de doublon (idempotence)

#### [TASK-205] — dailyFinalize (no-show automatique)
- **Statut :** ❌
- **Durée :** ⏱️ 1h
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `convex/jobs.ts` (créer ou modifier)
  - `convex/crons.ts` (modifier)
- **Description :** 
  - Cron à 3h du matin
  - Trouver réservations "confirmed" dont le slot est passé
  - Marquer automatiquement comme "noshow"
- **Critères de validation :**
  - [ ] Cron configuré
  - [ ] Seules les réservations passées sont marquées
  - [ ] Log des actions

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

**Statut global :** 🟡 En cours
**Effort total :** 0.5 jour
**Priorité :** 🟡 Haute

### Tâches

#### [TASK-401] — Mutation admin createReservation
- **Statut :** ❌
- **Durée :** ⏱️ 45min
- **Dépendances :** 🔗 Aucune
- **Fichiers :** 
  - `convex/admin.ts` (modifier)
- **Description :** 
  - Exposer mutation pour création réservation admin
  - Paramètres : date, time, service, partySize, firstName, lastName, phone, email?, note?, source
  - Bypass Turnstile, bypass seuil pending
  - Status = "confirmed" par défaut
- **Critères de validation :**
  - [ ] Mutation fonctionne
  - [ ] RBAC enforced (admin/owner/staff)
  - [ ] Email confirmation si email fourni

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
| BLOCK-001 | Interface Admin inexistante | Bloque release MVP | Compléter EPIC-1 |

---

## 📝 Notes Techniques

### Architecture
- **Frontend :** Next.js 16 + React 19 + TailwindCSS + Radix UI
- **Backend :** Convex (serverless real-time DB + functions)
- **Auth :** Clerk (RBAC : admin, owner, staff)
- **Emails :** Resend avec queue et retry
- **CAPTCHA :** Cloudflare Turnstile (widget client uniquement)

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
 refused      noshow      noshow
    │           │
    ↓           ↓
cancelled   cancelled
```

---

## 📅 Historique des Sessions

| Date | Durée | Tâches complétées | Notes |
|------|-------|-------------------|-------|
| 2026-01-08 | 2h | Audit MVP complet | Création DEVBOOK, PROJECT_STATUS |

---

## 🎯 Recommandation Prochaine Tâche

**Si tu as 30 min :** TASK-201 (Notification admin pending) — Aucune dépendance, impact immédiat

**Si tu as 1h :** TASK-204 (Cron email review J+1) — Complète la séquence emails

**Si tu as 2h :** TASK-101 (Layout Admin) — Débloque tout l'EPIC-1

**Si tu as une demi-journée :** TASK-101 + TASK-102 + TASK-103 — Vue Service fonctionnelle
