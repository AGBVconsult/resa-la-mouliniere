# PRD-010 — Periodes Speciales & Overrides

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Sources** : `convex/specialPeriods.ts` (1024 lignes)

---

## 1. Vue d'ensemble

Les periodes speciales permettent de modifier le comportement des creneaux sur une plage de dates. Trois types :

| Type | Description | Exemple |
|------|-------------|---------|
| `holiday` | Vacances (capacite modifiee ou fermeture partielle) | Vacances de Noel |
| `closure` | Fermeture complete | Conges annuels |
| `event` | Evenement special (ouverture exceptionnelle) | Soiree privee, brunch du dimanche |

---

## 2. Modele de donnees — Table `specialPeriods`

| Champ | Type | Description |
|-------|------|-------------|
| `restaurantId` | Id\<restaurants\> | Restaurant |
| `name` | string | Nom (2-50 car.) |
| `type` | "holiday" \| "closure" \| "event" | Type de periode |
| `startDate` | string | Date debut (YYYY-MM-DD) |
| `endDate` | string | Date fin (YYYY-MM-DD) |
| `applyRules` | ApplyRules | Regles d'application |
| `stats` | object | Statistiques de materialisation |
| `createdBy` | string | Sujet JWT du createur |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

### ApplyRules

| Champ | Type | Description |
|-------|------|-------------|
| `status` | "open" \| "modified" \| "closed" | Effet sur les creneaux |
| `services` | ("lunch" \| "dinner")[] | Services concernes |
| `activeDays` | number[] | Jours de la semaine (1=lundi, 7=dimanche) |
| `overrideCapacity` | number? | Capacite remplacee (si modified) |
| `maxGroupSize` | number \| null? | Taille max groupe (si modified) |
| `largeTableAllowed` | boolean? | Autoriser grandes tables (si modified) |
| `lunchSlots` | SlotConfig[]? | Creneaux lunch personnalises (event) |
| `dinnerSlots` | SlotConfig[]? | Creneaux dinner personnalises (event) |
| `lunchActiveDays` | number[]? | Jours actifs specifiques lunch |
| `dinnerActiveDays` | number[]? | Jours actifs specifiques dinner |

### SlotConfig (pour ouvertures exceptionnelles)

| Champ | Type | Description |
|-------|------|-------------|
| `timeKey` | string | Heure (HH:MM) |
| `capacity` | number | Capacite |
| `isActive` | boolean | Creneau actif |
| `maxGroupSize` | number \| null | Taille max groupe |

### Stats

| Champ | Type | Description |
|-------|------|-------------|
| `totalSlotsCreated` | number | Creneaux crees |
| `totalSlotsModified` | number | Creneaux modifies |
| `totalDaysAffected` | number | Jours concernes |
| `totalCapacity` | number | Capacite totale estimee |

---

## 3. Statuts d'application

| Status | Effet | Overrides generes |
|--------|-------|-------------------|
| `open` | Aucun changement | Aucun override |
| `modified` | Modification capacite/maxGroupSize | slotOverrides origin="period" |
| `closed` | Fermeture des creneaux | slotOverrides origin="period" (isOpen=false) |

---

## 4. Materialisation des overrides

### 4.1 Algorithme `generateOverrides`

Pour chaque date dans [startDate, endDate] :

1. Verifier si le jour de la semaine est dans `activeDays`
2. Pour chaque service dans `services` :
3. Pour chaque slot existant du service :
   - Si un override **manual** existe → **ne pas toucher** (priorite manuelle)
   - Sinon, creer/mettre a jour un `slotOverride` avec `origin: "period"`

### 4.2 Priorite des overrides

```
manual > period > slot (valeur de base)
```

Un override manuel n'est **jamais** ecrase par une periode speciale.

### 4.3 Ouvertures exceptionnelles

Si `status === "modified"` ET `lunchSlots` ou `dinnerSlots` sont definis :

→ Appel `generateExceptionalOpeningSlots()` au lieu de `generateOverrides()` standard.

Ce mode **cree de nouveaux slots** (pas juste des overrides) :
- Verifie si le slot existe deja (`by_restaurant_slotKey`)
- Si non → `insert` dans `slots` avec `createdByPeriodId: periodId`
- Si oui → `patch` du slot existant (capacity, isOpen, maxGroupSize)

Cela permet d'ouvrir des creneaux sur des jours normalement fermes (ex: brunch du dimanche).

### 4.4 Fermetures

Si `status === "closed"` :
- Cree des `slotOverrides` avec `patch: { isOpen: false }`
- Tous les creneaux concernes deviennent fermes
- Le widget detecte la fermeture via `getActiveClosure`

---

## 5. Validation

### 5.1 Regles de validation

| Regle | Detail |
|-------|--------|
| Nom | 2-50 caracteres |
| Dates | Format YYYY-MM-DD, endDate >= startDate |
| Duree max | 365 jours |
| Services | Au moins 1 service requis |
| Jours actifs | Au moins 1 jour requis, valeurs 1-7 |
| Chevauchement | Pas de chevauchement entre periodes du meme type |
| Champs modified | overrideCapacity, maxGroupSize, largeTableAllowed uniquement si status="modified" |

### 5.2 Detection de chevauchement

Deux periodes du **meme type** ne peuvent pas se chevaucher :

```
overlaps = !(endDate < existing.startDate || startDate > existing.endDate)
```

Si chevauchement → erreur `SAME_TYPE_OVERLAP(existingId, existingName)`.

Note : des periodes de **types differents** peuvent se chevaucher (ex: holiday + event).

---

## 6. Endpoints Convex

### 6.1 Queries

| Endpoint | Auth | Description |
|----------|------|-------------|
| `specialPeriods.getActiveClosure` | public | Fermeture active aujourd'hui (widget) |
| `specialPeriods.list` | admin | Liste avec filtres (type, year) |
| `specialPeriods.get` | admin | Detail par ID |
| `specialPeriods.previewImpact` | admin | Preview sans creation |

### 6.2 Mutations

| Endpoint | Auth | Description |
|----------|------|-------------|
| `specialPeriods.create` | admin | Creer + generer overrides |
| `specialPeriods.update` | admin | MAJ + regenerer overrides |
| `specialPeriods.remove` | admin | Supprimer + cleanup overrides + slots |
| `specialPeriods.regenerateAllSlots` | admin | Regenerer tous les slots event actifs |

---

## 7. Preview d'impact

`previewImpact` simule la creation sans ecrire :

Retourne :
```typescript
{
  totalSlots: number,      // Creneaux dans la plage
  affectedSlots: number,   // Creneaux qui seraient modifies (sans override manual)
  byService: { lunch: number, dinner: number },
  byDate: Array<{ dateKey: string, count: number }>
}
```

---

## 8. Lifecycle CRUD

### 8.1 Creation

1. Validation inputs
2. Verification chevauchement meme type
3. Insert `specialPeriods`
4. `generateOverrides()` si status != "open"
5. Update stats avec compteurs reels

### 8.2 Mise a jour

1. Validation inputs
2. Verification chevauchement (excluant soi-meme)
3. **Suppression** anciens overrides (`deleteOverrides`)
4. **Suppression** anciens slots crees par la periode
5. Patch `specialPeriods`
6. **Regeneration** overrides si status != "open"

### 8.3 Suppression

1. Supprimer slots crees par la periode (`by_createdByPeriodId`)
2. Supprimer overrides de la periode (`by_specialPeriodId`)
3. Supprimer la periode elle-meme

### 8.4 Regeneration globale

`regenerateAllSlots` : pour tous les `event` actifs (endDate >= today) :
1. Supprimer anciens slots/overrides
2. Regenerer

Usage : apres correction de bug ou changement de templates.

---

## 9. Integration avec le widget

### 9.1 `getActiveClosure`

Query publique (pas d'auth) :
- Cherche une `closure` dont `startDate <= today <= endDate`
- Retourne dates + date de reouverture (endDate + 1 jour)
- Le widget affiche un `ClosureNoticeModal`

### 9.2 Impact sur la disponibilite

Les periodes affectent les slots via overrides. Le calcul de disponibilite (`availability.getDay`, `availability.getMonth`) prend en compte les overrides automatiquement via `effectiveOpen` qui combine slot + overrides.

---

## 10. Invariants

1. Pas de chevauchement entre periodes du meme type
2. Les overrides manuels ne sont jamais ecrases par une periode
3. La suppression d'une periode restaure l'etat precedent (suppression overrides + slots crees)
4. Les slots crees par une periode sont traces via `createdByPeriodId`
5. Les overrides de periode sont traces via `specialPeriodId`
6. La duree max d'une periode est 365 jours
7. `getActiveClosure` est public — pas de donnees sensibles exposees

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
