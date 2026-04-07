# PRD-005 — Interface Admin & Tablette

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Sources** : `src/app/(admin)/admin/`, `src/app/admin-tablette/`, `src/app/admin-mobile/`, `convex/admin.ts` (1673 lignes)

---

## 1. Vue d'ensemble

L'application propose 3 interfaces d'administration :

| Interface | Route | Cible | Layout |
|-----------|-------|-------|--------|
| **Admin Desktop** | `/admin/*` | Ecran large, gestion complete | Sidebar + header |
| **Admin Tablette** | `/admin-tablette/*` | iPad en service, vue rapide | Full-screen, gestes tactiles |
| **Admin Mobile** | `/admin-mobile/*` | Smartphone, notifications | Mobile-first, compact |

Toutes sont protegees par le middleware NextAuth (`src/middleware.ts`) qui redirige vers `/admin/login` si non authentifie.

---

## 2. Routes Admin Desktop

### 2.1 Arborescence

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | Dashboard | Tableau de bord avec KPIs (statique MVP) |
| `/admin/reservations` | Reservations | Vue principale : liste, filtres, modals |
| `/admin/creneaux` | Creneaux | Gestion des templates hebdomadaires |
| `/admin/periodes` | Periodes speciales | CRUD periodes (vacances, fermetures, evenements) |
| `/admin/planning` | Planning | Vue planning avec plan de salle |
| `/admin/clients` | Clients CRM | Liste clients, recherche, fiches detaillees |
| `/admin/login` | Login | Formulaire credentials (email/password) |

### 2.2 Layout Admin

- **Sidebar** : Navigation principale (Dashboard, Reservations, Creneaux, Periodes, Planning, Clients)
- **Header** : Cloche notifications (pending count), lien mobile/tablette
- **ConvexProviderWithAuth** : Fournit le client Convex authentifie

---

## 3. Page Reservations (`/admin/reservations`)

### 3.1 Fonctionnalites

- **Navigation par date** : Chevrons gauche/droite + selecteur calendrier
- **Filtrage par service** : lunch / dinner / tous
- **Synchro slots** : `ensureSlotsForDate` appele au chargement de chaque date
- **Liste paginee** : `admin.listReservations` avec pagination Convex
- **Carte capacite** : Barre de remplissage par creneau (partySize / capacity)
- **Filtrage par statut** : Tabs ou chips

### 3.2 Composants

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `ReservationHeader` | `ReservationHeader.tsx` | Barre de navigation date + service + actions |
| `ReservationList` | `ReservationList.tsx` | Conteneur de la liste groupee par heure |
| `ReservationRow` | `ReservationRow.tsx` (35KB) | Ligne de reservation avec actions inline |
| `DatePickerCalendar` | `DatePickerCalendar.tsx` | Calendrier de selection de date |
| `TimeChunk` | `TimeChunk.tsx` | Groupe de reservations par heure |
| `DayOverrideModal` | `DayOverrideModal.tsx` (15KB) | Modal gestion creneaux du jour |
| `CreateReservationModal` | `CreateReservationModal.tsx` (13KB) | Modal creation reservation admin |
| `ImportReservationModal` | `ImportReservationModal.tsx` (15KB) | Modal import sans email |

### 3.3 ReservationRow — Actions

Chaque ligne de reservation expose :

| Action | Transition | Effet |
|--------|-----------|-------|
| Confirmer | pending → confirmed | Email `reservation.validated` |
| Refuser | pending → refused | Email `reservation.refused` |
| Carte placee | confirmed → cardPlaced | Pas d'email |
| Installer (seated) | confirmed/cardPlaced → seated | Calcul delayMinutes |
| Terminer (completed) | seated → completed | Pas d'email |
| No-show | confirmed → noshow | Email differe (cron 16h/22h) |
| Annuler (admin) | * → cancelled | Email `reservation.cancelled_by_restaurant` |
| Annuler (client) | pending/confirmed → cancelled | Email `reservation.cancelled` |
| Assigner tables | * | Via plan de salle ou dropdown |

### 3.4 CreateReservationModal

- Source : `admin`, `phone`, ou `walkin`
- Statut toujours `confirmed` (bypass pending)
- Pas de Turnstile
- Email de confirmation envoye
- Verification capacite standard

### 3.5 ImportReservationModal

- Pour migration depuis un autre systeme
- Email/telephone optionnels (placeholders si absents)
- **Pas de verification de capacite**
- **Pas d'email envoye**
- Note prefixee `[IMPORT]`

---

## 4. Interface Tablette (`/admin-tablette`)

### 4.1 Route principale

| Route | Description |
|-------|-------------|
| `/admin-tablette` | Page d'accueil (redirect vers reservations) |
| `/admin-tablette/reservations` | Vue reservations optimisee tablette |

### 4.2 Layout

- Plein ecran, sans sidebar
- Header compact avec date et navigation
- Optimise pour tactile (cibles larges, gestes)

### 4.3 Composants specifiques

| Composant | Description |
|-----------|-------------|
| `TabletLayoutClient` | Shell layout tablette (header + content) |
| `CalendarPopup` (14KB) | Calendrier plein ecran pour selection date |
| `EditReservationPopup` (15KB) | Edition complete reservation (tous champs) |
| `DaySettingsPopup` (15KB) | Gestion creneaux du jour (toggle, capacite, ajout) |
| `ActionPopup` | Menu contextuel actions rapides sur reservation |
| `ClientSearchPopup` (7KB) | Recherche client CRM |
| `SegmentedBar` | Barre segmentee (remplissage creneaux) |
| `StatusPill` | Badge statut colore |

### 4.4 DaySettingsPopup

Ce composant permet :
- Toggle ouverture/fermeture par creneau
- Modification capacite par creneau
- Ajout de creneaux ponctuels (`slots.addSlot`)
- Sauvegarde batch (`slots.batchUpdateSlots` → ecrit dans `slotOverrides`)
- Synchronisation depuis templates au montage (`ensureSlotsForDate`)

### 4.5 EditReservationPopup

Utilise `admin.updateReservationFull` pour mettre a jour :
- Date, service, heure
- Nombre de couverts (adultes, enfants, bebes)
- Nom, prenom, telephone, email
- Note, options

---

## 5. Interface Mobile (`/admin-mobile`)

### 5.1 Routes

| Route | Description |
|-------|-------------|
| `/admin-mobile` | Liste reservations du jour |
| `/admin-mobile/reservations/[id]` | Detail reservation |
| `/admin-mobile/activity` | Fil d'activite recent |

### 5.2 Composants

| Composant | Description |
|-----------|-------------|
| `MobileHeader` | Header mobile avec navigation |
| `MobileReservationCard` | Carte reservation compacte |
| `MobileServiceTabs` | Tabs lunch/dinner |
| `MobileStatusChip` | Chip statut colore |

### 5.3 Page activite

Utilise `admin.listRecentActivity` pour afficher :
- Nouvelles reservations (created)
- Modifications client (updated, performedBy != admin)
- Annulations client (cancelled, performedBy != admin)

---

## 6. Backend Admin — Endpoints Convex

### 6.1 Queries

| Endpoint | Auth | Description |
|----------|------|-------------|
| `admin.getSettings` | admin | Retourne settings (sans secrets) |
| `admin.listReservations` | admin | Liste paginee avec filtres (date, service, status) |
| `admin.getReservation` | admin | Detail reservation par ID |
| `admin.listPendingReservations` | admin | Reservations pending (cloche notifs) |
| `admin.listRecentActivity` | admin | Fil d'activite client (50 derniers events) |
| `admin.getPunctualityStats` | admin | Statistiques ponctualite (analytics) |

### 6.2 Mutations

| Endpoint | Auth | Description |
|----------|------|-------------|
| `admin.updateReservation` | admin | MAJ statut + assignment tables (version) |
| `admin.updateReservationFull` | admin | MAJ complete tous champs (tablette) |
| `admin.createReservation` | admin | Creation admin (toujours confirmed) |
| `admin.importReservation` | admin | Import sans email (migration) |
| `admin.cancelByClient` | admin | Annulation comme si le client annulait |
| `admin.updateSettings` | admin | MAJ settings (stub) |
| `admin.updateProgressiveFilling` | admin | MAJ config remplissage progressif |
| `admin.updateSecrets` | owner | MAJ secrets (Turnstile, appUrl) |

### 6.3 Particularites

**`admin.updateReservation`** :
- Verifie transitions statut via `isValidStatusTransition()`
- Empeche double-booking tables (conflit sur meme slotKey)
- Calcule `delayMinutes` pour les check-in (seated)
- Envoie email selon transition :
  - pending → confirmed : `reservation.validated`
  - * → cancelled : `reservation.cancelled_by_restaurant`
  - * → refused : `reservation.refused`
  - noshow : **PAS d'email immediat** (cron differe)
- Log `reservationEvent` (status_change ou table_assignment)
- Flag `needsRebuild` sur client si reservation antedatee

**`admin.createReservation`** :
- Statut toujours `confirmed` (admin bypass)
- Sources : `admin`, `phone`, `walkin`
- Capacite verifiee, slot requis
- Token de gestion cree
- Email confirmation envoye

**`admin.importReservation`** :
- **Pas de verification slot/capacite**
- **Pas d'email**
- Email/phone optionnels (placeholders)
- Note prefixee `[IMPORT]`
- Token cree (meme si non utilise)

**`admin.listReservations`** :
- Pagination Convex native
- Batch lookup clients par telephone (totalVisits, clientId, behavior)
- Retourne `ReservationAdmin` DTO enrichi (totalVisits, hasClientNotes, isLateClient, isSlowClient)

---

## 7. DTO ReservationAdmin

```typescript
{
  _id, restaurantId, dateKey, service, timeKey, slotKey,
  adults, childrenCount, babyCount, partySize,
  firstName, lastName, email, phone, language,
  note, options, status, source,
  tableIds, primaryTableId, clientId,
  version, createdAt, updatedAt,
  cancelledAt, refusedAt, seatedAt, completedAt, noshowAt,
  // Enrichi par batch client lookup :
  totalVisits: number,
  hasClientNotes: boolean,
  isLateClient: boolean,
  isSlowClient: boolean,
}
```

---

## 8. Plan de salle integre

L'interface admin et tablette integrent le composant `ServiceFloorPlan` pour :
- Visualiser les tables par zone (salle/terrasse)
- Assigner des tables par clic
- Voir l'etat des tables (libre, reservee, assise, bloquee)
- Gerer les combinaisons de tables

Ce composant est detaille dans le PRD-009.

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
