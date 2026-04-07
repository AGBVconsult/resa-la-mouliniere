# PRD-004 — Gestion des Creneaux & Templates Hebdomadaires

> **Projet** : Systeme de reservation — La Mouliniere
> **Version** : 1.0 | **Date** : 2026-04-07
> **Sources** : `convex/slots.ts` (872 lignes), `convex/weeklyTemplates.ts` (~1270 lignes), `convex/availability.ts` (~504 lignes)

---

## 1. Vue d'ensemble

Le systeme de creneaux est structure en 3 couches :

1. **Templates hebdomadaires** (`weeklyTemplates`) : Configuration recurrente par jour/service
2. **Slots materialisés** (`slots`) : Creneaux concrets par date/service/heure
3. **Overrides** (`slotOverrides`) : Modifications manuelles ou par periode speciale

**Regle fondamentale** : `effectiveOpen = isOpen === true AND capacity > 0`

**Priorite d'application** : `MANUAL override > PERIOD override > SLOT base`

---

## 2. Templates hebdomadaires

### 2.1 Structure

14 templates possibles : 7 jours (ISO 1=Lundi, 7=Dimanche) x 2 services (lunch, dinner).

Chaque template contient :
- `dayOfWeek` : 1-7 (ISO)
- `service` : lunch | dinner
- `isOpen` : Jour ouvert pour ce service
- `slots[]` : Liste de creneaux tries par timeKey

Chaque slot du template :
- `timeKey` : HH:MM
- `capacity` : 1-50
- `isActive` : Creneau actif
- `largeTableAllowed` : Grande table autorisee
- `maxGroupSize` : number | null

### 2.2 Mutations templates

| Mutation | Auth | Description |
|----------|------|-------------|
| `weeklyTemplates.upsert` | owner | Creer/MAJ template complet |
| `weeklyTemplates.addSlot` | owner | Ajouter un creneau au template |
| `weeklyTemplates.updateSlot` | owner | Modifier un creneau du template |
| `weeklyTemplates.removeSlot` | owner | Supprimer un creneau du template |
| `weeklyTemplates.toggleDay` | owner | Basculer isOpen d'un jour/service |
| `weeklyTemplates.seedDefaults` | owner | Creer les 14 templates par defaut |

### 2.3 Creneaux par defaut (seed)

- **lunch** : `12:00`, `12:30`, `13:00` (capacity=8, isActive=true)
- **dinner** : `18:00`, `18:30`, `19:00` (capacity=8, isActive=true)

### 2.4 Validations

- `dayOfWeek` : 1-7 strict
- `slots[].timeKey` : format HH:MM, unique dans le tableau
- `slots[].capacity` : 1-50
- Slots tries par timeKey avant sauvegarde

---

## 3. Generation automatique des slots

### 3.1 Cron job

**Planification** : Quotidien a 01:00 UTC
**Fonction** : `weeklyTemplates.generateFromTemplates`
**Parametre** : `daysAhead = 180` (6 mois de slots generes)

### 3.2 Algorithme de generation

```
Pour chaque dateKey dans [today, today + daysAhead] :
  dayOfWeek = getDayOfWeek(dateKey)  // ISO 1-7
  
  Pour chaque service (lunch, dinner) :
    template = charger template(restaurantId, dayOfWeek, service)
    
    Si template inexistant OU isOpen=false → skip
    
    Pour chaque slot actif (isActive=true) du template :
      slotKey = {dateKey}#{service}#{timeKey}
      
      existingSlot = chercher par slotKey
      
      Si existingSlot existe :
        // Verifier s'il y a des overrides
        override = chercher slotOverrides pour ce slotKey
        Si override existe OU existingSlot.createdByPeriodId → skip (ne pas ecraser)
        
        // Mettre a jour si necessaire (capacity ou isOpen different)
        Si capacity != template.capacity OU isOpen != true :
          patch(existingSlot, { capacity, isOpen: true, maxGroupSize, largeTableAllowed })
      
      Sinon :
        // Creer nouveau slot
        insert(slots, { dateKey, service, timeKey, slotKey,
                        isOpen: true, capacity, maxGroupSize, largeTableAllowed })
```

### 3.3 Regles critiques

1. **Ne jamais ecraser un slot avec override** (manual ou period)
2. **Ne jamais ecraser un slot cree par periode speciale** (`createdByPeriodId`)
3. Les slots existants sans override sont mis a jour (capacity, isOpen) pour refleter le template
4. Les nouveaux slots sont crees avec `isOpen: true`

### 3.4 Trigger manuel

La mutation `weeklyTemplates.triggerSlotGeneration` permet de declencher manuellement la generation, avec la meme logique que le cron.

### 3.5 Synchronisation admin

La mutation `weeklyTemplates.ensureSlotsForDate` est appelee automatiquement quand un admin ouvre une date dans l'interface. Elle s'assure que les slots existent pour cette date en les generant depuis le template si necessaire.

---

## 4. Slots materialises

### 4.1 Mutations admin

| Mutation | Auth | Description |
|----------|------|-------------|
| `slots.seedRange` | owner | Generer slots pour une plage (valeurs par defaut) |
| `slots.addSlot` | admin | Ajouter un creneau ponctuel |
| `slots.updateSlot` | admin | Modifier un creneau (ecrit dans slotOverrides) |
| `slots.batchUpdateSlots` | admin | Modifier plusieurs creneaux en batch |
| `slots.toggleServiceSlots` | admin | Basculer tous les slots d'un service |
| `slots.toggleDaySlots` | admin | Basculer tous les slots d'un jour |
| `slots.closeRange` | owner | Fermer tous les slots d'une plage de dates |
| `slots.openRange` | owner | Ouvrir tous les slots d'une plage de dates |

### 4.2 Point critique : updateSlot et batchUpdateSlots

Ces mutations **n'ecrivent pas directement dans la table `slots`**. Elles creent/mettent a jour des documents `slotOverrides` avec `origin: "manual"`.

C'est un choix architectural important :
- Permet de distinguer les modifications manuelles des valeurs de base
- Preserve la capacite de regenerer depuis les templates sans perdre les overrides manuels
- Necessite que toute lecture de slot applique les overrides

### 4.3 Valeurs par defaut (seedRange)

- **lunch** : 12:00, 12:15, 12:30, 12:45, 13:00, 13:15, 13:30
- **dinner** : 18:30, 18:45, 19:00, 19:15, 19:30, 19:45, 20:00, 20:15, 20:30, 20:45, 21:00
- **capacity** : 50
- **maxGroupSize** : 15
- **largeTableAllowed** : false

---

## 5. Systeme d'overrides

### 5.1 Types d'override

| Origin | Source | Priorite |
|--------|--------|---------|
| `manual` | Admin via UI (updateSlot, batchUpdateSlots) | Haute (ecrase tout) |
| `period` | Genere par specialPeriods | Basse (ecrase uniquement le slot base) |

### 5.2 Structure d'un override

```typescript
{
  restaurantId: Id<"restaurants">,
  slotKey: string,              // Cle du creneau cible
  origin: "manual" | "period",
  patch: {
    isOpen?: boolean,
    capacity?: number,
    maxGroupSize?: number | null,
    largeTableAllowed?: boolean,
  },
  specialPeriodId?: Id<"specialPeriods">,  // Requis si origin="period"
}
```

### 5.3 Application des overrides

L'application suit toujours le meme pattern :

```typescript
// 1. Charger le slot brut
let effectiveIsOpen = rawSlot.isOpen;
let effectiveCapacity = rawSlot.capacity;
let effectiveMaxGroupSize = rawSlot.maxGroupSize;

// 2. Appliquer override period (priorite basse)
const periodOverride = overrides.find(o => o.origin === "period");
if (periodOverride?.patch) {
  if (periodOverride.patch.isOpen !== undefined) effectiveIsOpen = periodOverride.patch.isOpen;
  if (periodOverride.patch.capacity !== undefined) effectiveCapacity = periodOverride.patch.capacity;
  if (periodOverride.patch.maxGroupSize !== undefined) effectiveMaxGroupSize = periodOverride.patch.maxGroupSize;
}

// 3. Appliquer override manual (priorite haute, ecrase period)
const manualOverride = overrides.find(o => o.origin === "manual");
if (manualOverride?.patch) {
  if (manualOverride.patch.isOpen !== undefined) effectiveIsOpen = manualOverride.patch.isOpen;
  // ...
}
```

Ce pattern est utilise dans :
- `availability.getDay` (widget client)
- `reservations._create` (creation de reservation)
- `slots.listByDate` (interface admin)

---

## 6. Queries de disponibilite

### 6.1 `availability.getDay`

**Type** : Query publique (widget)
**Args** : `{ dateKey, partySize }`
**Retour** : `{ lunch: Slot[], dinner: Slot[] }`

**Pipeline** :
1. Charger restaurant actif
2. Charger settings (timezone, progressiveFilling)
3. Charger tous les slots du jour par service
4. Charger tous les slotOverrides (manual + period)
5. Appliquer overrides (MANUAL > PERIOD)
6. Calculer `effectiveOpen` pour chaque slot
7. Filtrer creneaux passes (pour aujourd'hui, basé sur timezone)
8. Calculer `remainingCapacity` = capacity - somme partySize des reservations actives
9. Filtrer par `maxGroupSize` si `partySize` fourni
10. Appliquer remplissage progressif si active

**Chaque slot retourne** :
```typescript
{
  slotKey, dateKey, service, timeKey,
  isOpen: boolean,          // effectiveOpen (pas le brut)
  capacity: number,         // effective
  remainingCapacity: number,
  maxGroupSize: number | null,
}
```

### 6.2 `availability.getMonth`

**Type** : Query publique (widget calendrier)
**Args** : `{ year, month, partySize }`
**Retour** : `DayState[]`

Retourne l'etat open/close de chaque jour du mois, utilise pour colorer le calendrier.

### 6.3 Remplissage progressif

**Settings** : `progressiveFilling` dans settings
- `enabled` : boolean
- `lunchThreshold` : HH:MM (ex: "13:00")
- `dinnerThreshold` : HH:MM (ex: "19:00")
- `minFillPercent` : 0-100 (ex: 20)

Les creneaux apres le seuil ne sont affiches que si le creneau precedent a atteint le taux de remplissage minimum. Cela encourage le remplissage des creneaux les plus tot.

---

## 7. Mutation admin : `availability.adminOverrideSlot`

**Auth** : owner
**Args** : `{ slotKey, restaurantId, patch: { isOpen?, capacity?, maxGroupSize?, largeTableAllowed? } }`

Override direct d'un slot specifique. Ecrit dans la table `slots` directement (contrairement a updateSlot/batchUpdateSlots qui ecrivent dans slotOverrides).

---

## 8. Diagramme de flux des donnees

```
weeklyTemplates ──(cron quotidien)──► slots (materialisés)
                                         │
specialPeriods ──(creation/MAJ)──► slotOverrides (origin=period)
                                         │
Admin UI ──(updateSlot/batch)──► slotOverrides (origin=manual)
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │ Lecture effective :  │
                              │ slot + period        │
                              │      + manual        │
                              │ = donnees finales    │
                              └──────────┬──────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
            availability.getDay   reservations._create   slots.listByDate
            (widget client)       (verification)         (admin UI)
```

---

## 9. Invariants critiques

1. `slotKey` est toujours `{dateKey}#{service}#{timeKey}` — aucune variante
2. `effectiveOpen` est la seule regle d'ouverture : `isOpen=true AND capacity>0`
3. Priorite overrides stricte : `MANUAL > PERIOD > SLOT base`
4. La generation automatique ne touche jamais un slot avec override ou cree par periode
5. La somme des `partySize` des reservations actives ne depasse jamais `effectiveCapacity`
6. Les slots retournes par les queries publiques refletent toujours `effectiveOpen` (pas le brut)
7. Les creneaux passes (basé sur timezone) sont filtres dans les queries publiques

---

*Document genere le 2026-04-07 — Etat exact du code source au moment de la redaction.*
