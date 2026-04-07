# PRD-009 — Plan de Sol & Assignation Tables

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Sources** : `convex/tables.ts` (761 lignes), `src/app/(admin)/admin/planning/page.tsx`, composants `ServiceFloorPlan`

---

## 1. Vue d'ensemble

Le systeme de plan de salle permet :
- Definir et positionner des tables sur une grille 2D
- Organiser les tables par zone (salle / terrasse)
- Assigner des tables aux reservations (manuellement ou par combinaison)
- Visualiser l'etat des tables en temps reel par service

---

## 2. Modele de donnees — Table `tables`

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | Id\<restaurants\> | Restaurant proprietaire |
| `name` | string | Nom unique (1-20 car.) ex: "T1", "Terrasse 3" |
| `capacity` | number | Capacite (1-20 personnes) |
| `zone` | "salle" \| "terrasse" | Zone physique |
| `positionX` | number | Position X sur la grille |
| `positionY` | number | Position Y sur la grille |
| `width` | number? | Largeur visuelle (optionnel) |
| `height` | number? | Hauteur visuelle (optionnel) |
| `combinationDirection` | "horizontal" \| "vertical" \| "none" | Direction de combinaison |
| `isActive` | boolean | Table active (soft delete) |
| `createdAt` | number | Timestamp creation |
| `updatedAt` | number | Timestamp modification |

### Index

| Index | Champs |
|-------|--------|
| `by_restaurant_isActive` | restaurantId, isActive |
| `by_restaurant_zone` | restaurantId, zone |
| `by_restaurant_name` | restaurantId, name (unicite) |

---

## 3. Zones

| Zone | Description |
|------|-------------|
| `salle` | Tables interieures |
| `terrasse` | Tables exterieures (activation saisonniere) |

### Activation/desactivation terrasse en bloc

- `tables.activateTerrace` — Active toutes les tables terrasse
- `tables.deactivateTerrace` — Desactive toutes les tables terrasse

Usage : ouverture/fermeture saisonniere de la terrasse.

---

## 4. Grille et positionnement

### 4.1 Constantes

- `TABLE_GRID_SPAN = 3` — Nombre de cellules par table sur la grille

### 4.2 Position

Chaque table a une position (positionX, positionY) sur une grille 2D. Les positions sont en unites de grille (pas en pixels).

Migration : les anciens champs `gridX`/`gridY` sont supportes via `getPosition()` avec fallback : `positionX ?? (gridX * TABLE_GRID_SPAN)`.

---

## 5. Combinaison de tables

### 5.1 Direction

| Direction | Signification |
|-----------|---------------|
| `none` | Table independante, non combinable |
| `horizontal` | Combinable avec voisins sur l'axe X |
| `vertical` | Combinable avec voisins sur l'axe Y |

### 5.2 Algorithme `findCombinableTables`

Pour un partySize donne a partir d'une table de depart :

1. Si `startTable.capacity >= partySize` → retourne la table seule
2. Si `combinationDirection === "none"` → retourne la table seule
3. Filtrer les candidats : meme zone, meme direction, actifs, non occupes
4. Trier par proximite (distance Manhattan ponderee)
5. Construire une chaine adjacente :
   - Horizontal : meme Y, |deltaX| === TABLE_GRID_SPAN
   - Vertical : meme X, |deltaY| === TABLE_GRID_SPAN
6. Arreter quand totalCapacity >= partySize

### 5.3 Verification d'occupation

Tables occupees = tables assignees a des reservations actives (pending, confirmed, cardPlaced, seated) pour le meme service.

---

## 6. Assignation de tables

### 6.1 `tables.assignToReservation`

| Etape | Detail |
|-------|--------|
| 1 | Verifier que la reservation existe |
| 2 | Verifier que chaque table existe et est active |
| 3 | Verifier absence de conflits (pas deja assignee a une autre reservation active du meme service) |
| 4 | Mettre a jour `reservation.tableIds` |
| 5 | Incrementer `reservation.version` |

### 6.2 Detection de conflits

Conflits verifies sur le meme service (dateKey + service) :
- Statuts actifs : `pending`, `confirmed`, `cardPlaced`, `seated`
- Si une table est deja assignee a une autre reservation active → erreur

### 6.3 Via admin.updateReservation

L'admin peut aussi assigner des tables via `admin.updateReservation` :
- Meme verification de conflits
- Log `reservationEvent` de type `table_assignment` avec metadata previousTables/newTables
- Verifie que le statut permet l'assignation (pending, confirmed, seated uniquement)

---

## 7. Etats des tables (`getTableStates`)

Query qui retourne pour un service donne :
- Liste de toutes les tables actives
- Set des `assignedTableIds` (tables liees a des reservations actives)

Utilise par le composant `ServiceFloorPlan` pour le rendu visuel.

---

## 8. Endpoints Convex

### 8.1 Queries

| Endpoint | Auth | Description |
|----------|------|-------------|
| `tables.list` | admin | Toutes les tables (filtres: activeOnly, zone) |
| `tables.stats` | admin | Statistiques (total, actives, capacite par zone) |
| `tables.getTableStates` | admin | Etats tables pour un service |
| `tables.findCombinableTables` | admin | Trouver combinaison pour partySize |

### 8.2 Mutations

| Endpoint | Auth | Description |
|----------|------|-------------|
| `tables.create` | admin | Creer une table (nom unique) |
| `tables.update` | admin | Modifier une table |
| `tables.remove` | admin | Supprimer (si pas de resa active) |
| `tables.deactivate` | admin | Desactiver (soft delete) |
| `tables.activate` | admin | Reactiver |
| `tables.duplicate` | admin | Dupliquer avec position decalee |
| `tables.activateTerrace` | admin | Activer toute la terrasse |
| `tables.deactivateTerrace` | admin | Desactiver toute la terrasse |
| `tables.assignToReservation` | admin | Assigner tables a une reservation |

---

## 9. Validations

| Champ | Regle |
|-------|-------|
| `name` | 1-20 caracteres, unique par restaurant |
| `capacity` | 1-20 personnes |
| `positionX`, `positionY` | >= 0 |
| Suppression | Impossible si table assignee a une reservation active |

---

## 10. Interface visuelle

### 10.1 ServiceFloorPlan

Composant React integre dans :
- `/admin/planning` — Vue planning
- `/admin/reservations` — Panel lateral
- `/admin-tablette/reservations` — Vue tablette

### 10.2 Fonctionnalites visuelles

- Rendu grille 2D avec positionnement absolu
- Code couleur par etat (libre, reservee, assise, bloquee)
- Clic pour assigner/desassigner
- Drag & drop pour repositionner (admin uniquement)
- Indicateur de capacite sur chaque table
- Groupement visuel des tables combinees

### 10.3 Tri

Les tables sont triees par nom avec collation francaise numerique :
```typescript
tables.sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }))
```

---

## 11. Invariants

1. Le nom de table est unique par restaurant
2. Une table ne peut etre supprimee que si aucune reservation active ne l'utilise
3. La combinaison ne fonctionne qu'entre tables de meme zone et meme direction
4. L'assignation incremente la version de reservation (concurrence optimiste)
5. Les tables inactives ne sont pas retournees par `getTableStates`
6. L'activation/desactivation terrasse est atomique (batch)

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
