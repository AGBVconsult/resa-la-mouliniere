# Project Status — Resa La Moulinière

**Dernière mise à jour :** 2026-01-18
**Version actuelle :** MVP en cours
**Statut global :** 🟡 En cours
**Progression estimée :** 80%

---

## Vue d'ensemble

Système de réservation en ligne pour Restaurant La Moulinière. Widget client multilingue + API backend Convex + interface admin (iPad-first).

---

## Métriques Clés

| Métrique | Valeur |
|----------|--------|
| Tests | 257 passing |
| Couverture | ~80% |
| Dernière release | 2026-01-08 |
| Deploy | https://resa-la-mouliniere.vercel.app |

---

## Composants — État d'Implémentation

### Backend (Convex) — 🟢

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Réservations CRUD | ✅ | create, cancel, getByToken |
| Disponibilités | ✅ | getDay, getMonth, overrides |
| Emails (queue + templates) | ✅ | 5 langues, retry, cleanup |
| Admin API | ✅ | listReservations, updateReservation |
| State machine | ✅ | Transitions validées |
| Crons (rappels J-1, cleanup) | ✅ | |
| Email review J+1 | ❌ | Cron manquant |
| Notification admin pending | ❌ | |
| dailyFinalize (no-show auto) | ❌ | Commenté |

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

### Frontend Admin — 🟡

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Vue Service journalière | ✅ | Page `/admin/reservations` |
| Liste réservations du jour | ✅ | Pagination, filtres service |
| Gestion statuts | ✅ | Boutons d'actions + menu contextuel |
| Attribution tables (click) | ❌ | API prête, UI manquante |
| Création manuelle | ❌ | API à exposer + UI |
| Recherche client | ❌ | |
| Tracking ponctualité | ✅ | Table reservationEvents + stats |

### Emails — Séquence MVP

| Type | Backend | Trigger | Template |
|------|---------|---------|----------|
| reservation.confirmed | ✅ | ✅ Auto | ✅ 5 langues |
| reservation.pending | ✅ | ✅ Auto | ✅ 5 langues |
| reservation.validated | ✅ | ❌ Trigger admin | ✅ 5 langues |
| reservation.refused | ✅ | ❌ Trigger admin | ✅ 5 langues |
| reservation.cancelled | ✅ | ✅ Auto | ✅ 5 langues |
| reservation.reminder | ✅ | ✅ Cron J-1 | ✅ 5 langues |
| reservation.review | ✅ | ❌ Cron J+1 | ✅ 5 langues |

---

## Bloquants Actuels

- [x] ~~**Interface Admin Vue Service**~~ ✅ Terminé (18/01)
- [ ] **Attribution tables click-to-click** — UI manquante
- [ ] **Création réservation manuelle** — API + UI

---

## Prochaines Étapes (Priorité Haute)

1. ~~**Interface Admin Vue Service**~~ ✅ Terminé
2. ~~**Page modification réservation client**~~ ✅ Terminé
3. **Emails admin (notification pending + triggers validated/refused)** — Estimation: 0.5 jour
4. **Cron email review J+1** — Estimation: 0.5 jour
5. **dailyFinalize (no-show auto)** — Estimation: 0.5 jour

---

## Estimation Travail Restant

| Phase | Effort | Statut |
|-------|--------|--------|
| MVP Core (Admin + Client edit + Emails) | 3-5 jours restants | 🟡 En cours |
| Phase 2 (Analytics, CRM avancé) | TBD | ❌ Non commencé |
| **Total MVP** | **3-5 jours** | |

---

## Historique des Audits

| Date | Version | Progression | Commit |
|------|---------|-------------|--------|
| 2026-01-08 | MVP | 65% | dd29fcd |
| 2026-01-17 | MVP | 70% | - | Pages edit/cancel client terminées |
| 2026-01-18 | MVP | 80% | - | Interface Admin Vue Service + tracking ponctualité | |
