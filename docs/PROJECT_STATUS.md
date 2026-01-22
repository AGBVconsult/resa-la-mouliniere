# Project Status — Resa La Moulinière

**Dernière mise à jour :** 2026-01-22
**Version actuelle :** MVP complet
**Statut global :** 🟢 Prêt pour release
**Progression estimée :** 98%

---

## Vue d'ensemble

Système de réservation en ligne pour Restaurant La Moulinière. Widget client multilingue + API backend Convex + interface admin (iPad-first) + plan de salle interactif + Shadow Learning ML.

---

## Métriques Clés

| Métrique | Valeur |
|----------|--------|
| Tests | 257 passing |
| Couverture | ~80% |
| Dernière release | 2026-01-22 |
| Deploy | https://resa-la-mouliniere.vercel.app |

---

## Composants — État d'Implémentation

### Backend (Convex) — 🟢

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Réservations CRUD | ✅ | create, cancel, getByToken |
| Disponibilités | ✅ | getDay, getMonth, overrides |
| Emails (queue + templates) | ✅ | 8 types, 5 langues, retry, cleanup |
| Admin API | ✅ | listReservations, updateReservation, createReservation |
| State machine | ✅ | Transitions validées |
| Crons | ✅ | rappels J-1, review J+1, dailyFinalize, cleanup |
| Plan de salle API | ✅ | getTableStates, assign, checkAssignment |
| Tables CRUD | ✅ | list, create, update, delete, updatePosition |
| Email review J+1 | ✅ | Cron `enqueueReviewEmails` à 10h |
| Notification admin pending | ✅ | Email + Push Pushover |
| dailyFinalize | ✅ | Cron à 3h (noshow + completed auto) |
| Shadow Learning | ✅ | Phase 2 active (prédictions ML) |

### Frontend Client (Widget) — 🟢

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Widget 5 étapes | ✅ | Step1-5 complets |
| Calendrier interactif | ✅ | MonthCalendar + MiniStrip |
| i18n 5 langues | ✅ | FR/NL/EN/DE/IT |
| Détection langue navigateur | ✅ | |
| Turnstile CAPTCHA | ✅ | |
| Page gestion réservation | ✅ | /reservation/[token] |
| Annulation via token | ✅ | |
| Modification réservation | ✅ | /reservation/[token]/edit |
| Page annulation dédiée | ✅ | /reservation/[token]/cancel |
| Routage groupe (>15) | ✅ | /widget/group-request |

### Frontend Admin — 🟢

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Vue Service journalière | ✅ | Page `/admin/reservations` |
| Liste réservations du jour | ✅ | Pagination, filtres service, mode compact |
| Gestion statuts | ✅ | Boutons d'actions + menu contextuel |
| Plan de salle interactif | ✅ | `/admin/settings/tables` + ServiceFloorPlan |
| Attribution tables (click) | ✅ | Clic direct, combinaison auto |
| Création manuelle | ✅ | `CreateReservationModal.tsx` + `admin.createReservation` |
| Recherche client | ❌ | Nice-to-have post-MVP |
| Tracking ponctualité | ✅ | Table reservationEvents + stats |

### Plan de Salle (PRD-004) — 🟢

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Configuration tables (drag & drop) | ✅ | FloorPlanGrid + FloorPlanTable |
| Zones salle/terrasse | ✅ | Switch zone dans ServiceFloorPlan |
| Combinaison tables (H/V) | ✅ | Lignes visuelles + auto-sélection |
| Dimensions dynamiques grille | ✅ | Adapte hauteur/largeur aux tables |
| Assignation directe au clic | ✅ | Plus de bouton de validation |
| Combinaison bidirectionnelle intelligente | ✅ | Analyse forward/backward, choisit optimal |
| Affichage primaryTableId | ✅ | Corrigé |
| Statuts visuels (libre/réservé/occupé) | ✅ | Couleurs par statut |

### Emails — Séquence MVP

| Type | Backend | Trigger | Template |
|------|---------|---------|----------|
| reservation.confirmed | ✅ | ✅ Auto | ✅ 5 langues |
| reservation.pending | ✅ | ✅ Auto | ✅ 5 langues |
| reservation.validated | ✅ | ✅ Via admin.updateReservation | ✅ 5 langues |
| reservation.refused | ✅ | ✅ Via admin.updateReservation | ✅ 5 langues |
| reservation.cancelled | ✅ | ✅ Auto | ✅ 5 langues |
| reservation.reminder | ✅ | ✅ Cron J-1 18h | ✅ 5 langues |
| reservation.review | ✅ | ✅ Cron J+1 10h | ✅ 5 langues |
| admin.notification | ✅ | ✅ Auto (pending) | ✅ |

---

## Bloquants Actuels

- [x] ~~**Interface Admin Vue Service**~~ ✅ Terminé (18/01)
- [x] ~~**Attribution tables click-to-click**~~ ✅ Terminé (21/01)
- [x] ~~**Bug primaryTableId**~~ ✅ Corrigé
- [x] ~~**Création réservation manuelle**~~ ✅ Terminé (22/01)
- [x] ~~**Emails admin (notification pending)**~~ ✅ Terminé (22/01)
- [x] ~~**Cron email review J+1**~~ ✅ Terminé (22/01)
- [x] ~~**dailyFinalize**~~ ✅ Terminé (22/01)

**Aucun bloquant actuel — MVP prêt pour release**

---

## Prochaines Étapes (Polish & Tests)

1. ~~**Interface Admin Vue Service**~~ ✅ Terminé
2. ~~**Page modification réservation client**~~ ✅ Terminé
3. ~~**Plan de salle interactif**~~ ✅ Terminé (21/01)
4. ~~**Bug primaryTableId**~~ ✅ Corrigé
5. ~~**Emails admin**~~ ✅ Terminé (22/01)
6. ~~**Cron email review J+1**~~ ✅ Terminé (22/01)
7. **Tests E2E parcours admin** — Estimation: 2h
8. **Tests E2E parcours client** — Estimation: 1h
9. **Audit accessibilité** — Estimation: 1h

---

## Estimation Travail Restant

| Phase | Effort | Statut |
|-------|--------|--------|
| MVP Core (Admin + Plan salle + Emails) | Terminé | ✅ Complet |
| Tests & Polish | 0.5 jour | 🟡 En cours |
| Phase 2 (Analytics, CRM avancé) | TBD | ❌ Non commencé |
| **Total MVP** | **Terminé** | 🟢 |

---

## Historique des Audits

| Date | Version | Progression | Notes |
|------|---------|-------------|-------|
| 2026-01-08 | MVP | 65% | Audit initial |
| 2026-01-17 | MVP | 70% | Pages edit/cancel client terminées |
| 2026-01-18 | MVP | 80% | Interface Admin Vue Service + tracking ponctualité |
| 2026-01-21 | MVP | 88% | Plan de salle interactif + assignation directe |
| 2026-01-22 | MVP | 92% | Shadow Learning Phase 2 + corrections sécurité |
| 2026-01-22 | MVP | **98%** | **MVP COMPLET** — Création manuelle, emails admin, crons, dailyFinalize |
