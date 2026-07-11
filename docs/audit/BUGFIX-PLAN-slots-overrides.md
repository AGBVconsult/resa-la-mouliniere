# Plan de corrections — Bugs Slots, Overrides & Generation

> **Date** : 2026-04-07
> **Statut** : Propositions — en attente de validation avant implementation

---

## BUG 1 (CRITIQUE) — `_update` ne charge PAS les overrides

**Fichier** : `convex/reservations.ts`, lignes 973-1018
**Diagnostic confirme** : Le code charge `newSlot` puis utilise directement `newSlot.isOpen`, `newSlot.capacity`, `newSlot.maxGroupSize` sans charger les `slotOverrides`. Le pattern correct existe deja dans `_create` (lignes 349-376).

### Correction proposee

Ajouter le chargement et l'application des overrides dans `_update`, juste apres le chargement du slot (ligne 979), en reproduisant exactement le pattern de `_create` :

```typescript
// Apres ligne 979 (apres le chargement de newSlot), ajouter :

// Load overrides (same pattern as _create)
const overrides = await ctx.db
  .query("slotOverrides")
  .withIndex("by_restaurant_slotKey", (q) =>
    q.eq("restaurantId", reservation.restaurantId).eq("slotKey", newSlotKey)
  )
  .collect();

// Apply overrides: period first (lower priority), then manual (higher priority)
let effectiveIsOpen = newSlot.isOpen;
let effectiveCapacity = newSlot.capacity;
let effectiveMaxGroupSize = newSlot.maxGroupSize;

const periodOverride = overrides.find((o) => o.origin === "period");
if (periodOverride?.patch) {
  if (periodOverride.patch.isOpen !== undefined) effectiveIsOpen = periodOverride.patch.isOpen;
  if (periodOverride.patch.capacity !== undefined) effectiveCapacity = periodOverride.patch.capacity;
  if (periodOverride.patch.maxGroupSize !== undefined) effectiveMaxGroupSize = periodOverride.patch.maxGroupSize;
}
const manualOverride = overrides.find((o) => o.origin === "manual");
if (manualOverride?.patch) {
  if (manualOverride.patch.isOpen !== undefined) effectiveIsOpen = manualOverride.patch.isOpen;
  if (manualOverride.patch.capacity !== undefined) effectiveCapacity = manualOverride.patch.capacity;
  if (manualOverride.patch.maxGroupSize !== undefined) effectiveMaxGroupSize = manualOverride.patch.maxGroupSize;
}
```

Puis remplacer les 3 references au slot brut :
- Ligne 986 : `computeEffectiveOpen(newSlot.isOpen, newSlot.capacity)` → `computeEffectiveOpen(effectiveIsOpen, effectiveCapacity)`
- Ligne 995 : `newSlot.maxGroupSize` → `effectiveMaxGroupSize`
- Ligne 1014 : `newSlot.capacity` → `effectiveCapacity`

**Risque** : Nul. Pattern identique a `_create`, deja eprouve.

**Optionnel (refactoring futur)** : Extraire une fonction helper `loadEffectiveSlot(ctx, restaurantId, slotKey)` partagee entre `_create` et `_update` pour eviter la duplication.

---

## BUG 2 (CRITIQUE) — `toggleServiceSlots` et `toggleDaySlots` ecrivent directement dans `slots`

**Fichier** : `convex/slots.ts`, lignes 711-803
**Diagnostic confirme** : Les deux mutations patchent `slot.isOpen` directement au lieu de creer des `slotOverrides` avec `origin: "manual"`. Le cron `generateFromTemplates` ne voit pas d'override et reecrit `isOpen: true` lors de sa prochaine execution.

### Correction proposee

Remplacer le `ctx.db.patch(slot._id, { isOpen, updatedAt: now })` par la creation/MAJ d'un `slotOverride` manual, en suivant le pattern de `updateSlot`/`batchUpdateSlots` (lignes 567-703) qui est correct.

Pour **`toggleServiceSlots`** (ligne 743-748), remplacer par :

```typescript
for (const slot of slots) {
  // Chercher un override manual existant
  const existingOverride = await ctx.db
    .query("slotOverrides")
    .withIndex("by_restaurant_slotKey", (q) =>
      q.eq("restaurantId", restaurant._id).eq("slotKey", slot.slotKey)
    )
    .filter((q) => q.eq(q.field("origin"), "manual"))
    .first();

  if (existingOverride) {
    await ctx.db.patch(existingOverride._id, {
      patch: { ...existingOverride.patch, isOpen },
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("slotOverrides", {
      restaurantId: restaurant._id,
      slotKey: slot.slotKey,
      origin: "manual",
      patch: { isOpen },
      createdAt: now,
      updatedAt: now,
    });
  }
  updatedCount++;
}
```

Meme transformation pour **`toggleDaySlots`** (ligne 792-797).

### Meme correction pour `closeRange` et `openRange`

**Lignes 407-409** (`closeRange`) et **472-474** (`openRange`) : meme pattern — remplacer le patch direct par la creation d'un `slotOverride` manual.

**Note importante** : `closeRange` et `openRange` sont marques "Tooling MVP — Non contracte". Si ces fonctions sont destinees a disparaitre, on pourrait simplement les deprecier au lieu de les corriger. Sinon, appliquer la meme transformation.

**Risque** : Faible. Le pattern override manual est deja utilise par `updateSlot`/`batchUpdateSlots`.

---

## BUG 3 (CRITIQUE) — `adminOverrideSlot` contourne le systeme d'overrides

**Fichier** : `convex/availability.ts`, lignes 436-503
**Diagnostic confirme** : La mutation ecrit directement dans `slots` via `ctx.db.patch(existingSlot._id, updateData)`. Aucun `slotOverride` n'est cree.

### Correction proposee

Remplacer l'ecriture directe dans `slots` par la creation/MAJ d'un `slotOverride` manual :

```typescript
// Remplacer lignes 499 (ctx.db.patch) par :

// Build override patch (only defined fields)
const overridePatch: Record<string, any> = {};
if (patch.isOpen !== undefined) overridePatch.isOpen = patch.isOpen;
if (patch.capacity !== undefined) overridePatch.capacity = patch.capacity;
if (patch.maxGroupSize !== undefined) overridePatch.maxGroupSize = patch.maxGroupSize;
if (patch.largeTableAllowed !== undefined) overridePatch.largeTableAllowed = patch.largeTableAllowed;

// Check for existing manual override
const existingOverride = await ctx.db
  .query("slotOverrides")
  .withIndex("by_restaurant_slotKey", (q) =>
    q.eq("restaurantId", restaurantId).eq("slotKey", slotKey)
  )
  .filter((q) => q.eq(q.field("origin"), "manual"))
  .first();

const now = Date.now();

if (existingOverride) {
  await ctx.db.patch(existingOverride._id, {
    patch: { ...existingOverride.patch, ...overridePatch },
    updatedAt: now,
  });
} else {
  await ctx.db.insert("slotOverrides", {
    restaurantId,
    slotKey,
    origin: "manual",
    patch: overridePatch,
    createdAt: now,
    updatedAt: now,
  });
}
```

**Risque** : Faible. Alignement sur l'architecture existante.

---

## BUG 4 (MAJEUR) — `ensureSlotsForDate` ferme les slots SANS verifier les overrides

**Fichier** : `convex/weeklyTemplates.ts`, lignes 1159-1168
**Diagnostic confirme** : Quand `!template || !template.isOpen`, le code ferme TOUS les slots du jour. La verification des overrides (ligne 1170+) ne vient qu'APRES ce `continue`.

### Correction proposee

Deplacer la verification des overrides et de `createdByPeriodId` AVANT la fermeture des slots quand le template est ferme :

```typescript
// Remplacer lignes 1159-1168 par :

// Get overrides for this date BEFORE any processing
const slotKeys = new Set(existingSlots.map((s) => s.slotKey));
const [periodOverrides, manualOverrides] = await Promise.all([
  ctx.db.query("slotOverrides")
    .withIndex("by_restaurant_origin", (q) =>
      q.eq("restaurantId", restaurantId).eq("origin", "period"))
    .collect(),
  ctx.db.query("slotOverrides")
    .withIndex("by_restaurant_origin", (q) =>
      q.eq("restaurantId", restaurantId).eq("origin", "manual"))
    .collect(),
]);

const overriddenSlotKeys = new Set([
  ...periodOverrides.filter((o) => slotKeys.has(o.slotKey)).map((o) => o.slotKey),
  ...manualOverrides.filter((o) => slotKeys.has(o.slotKey)).map((o) => o.slotKey),
]);

// If no template or template is closed, close non-protected slots only
if (!template || !template.isOpen) {
  for (const slot of existingSlots) {
    if (overriddenSlotKeys.has(slot.slotKey)) continue; // respecter overrides
    if (slot.createdByPeriodId) continue; // respecter periodes exceptionnelles
    if (slot.isOpen) {
      await ctx.db.patch(slot._id, { isOpen: false, updatedAt: now });
      updated++;
    }
  }
  continue;
}

// Supprimer le chargement redondant des overrides qui suit (lignes 1170-1191)
// car on l'a deja fait ci-dessus
```

**Risque** : Faible. Restructuration logique, pas de changement de semantique pour les slots non proteges.

---

## BUG 5 (MAJEUR) — `syncSlotsWithTemplate` meme probleme

**Fichier** : `convex/weeklyTemplates.ts`, lignes 883-894
**Diagnostic confirme** : Meme pattern que BUG 4. Quand `!template.isOpen`, les slots sont fermes en ne verifiant que `createdByPeriodId`, mais pas les `slotOverrides`.

### Correction proposee

A la ligne 884-893, ajouter la verification des overrides :

```typescript
// Remplacer lignes 884-893 par :
if (!template.isOpen) {
  const slotsForDate = futureSlots.filter((s) => s.dateKey === dateKey);
  for (const slot of slotsForDate) {
    if (slot.createdByPeriodId) continue;
    if (overriddenSlotKeys.has(slot.slotKey)) continue; // AJOUT: respecter overrides
    if (slot.isOpen) {
      await ctx.db.patch(slot._id, { isOpen: false, updatedAt: now });
      updated++;
    }
  }
  continue;
}
```

La variable `overriddenSlotKeys` est deja chargee plus haut (lignes 850-860), donc il suffit d'ajouter le check.

**Risque** : Nul. Ajout d'une seule ligne de guard.

---

## BUG 6 (MOYEN) — `listByDateService` ne retourne PAS les overrides

**Fichier** : `convex/slots.ts`, lignes 310-351
**Diagnostic confirme** : Le `effectiveOpen` est calcule sur `slot.isOpen` brut (ligne 345), sans charger les overrides. Par contraste, `listByDate` (lignes 488-564) les charge correctement.

### Correction proposee

Ajouter le chargement des overrides et leur application, en reproduisant le pattern de `listByDate` :

```typescript
// Apres ligne 339 (apres le collect des slots), ajouter :

// Fetch slotOverrides (same pattern as listByDate)
const slotKeysSet = new Set(slots.map((s) => s.slotKey));
const [manualOverrides, periodOverrides] = await Promise.all([
  ctx.db.query("slotOverrides")
    .withIndex("by_restaurant_origin", (q) =>
      q.eq("restaurantId", restaurant._id).eq("origin", "manual"))
    .collect(),
  ctx.db.query("slotOverrides")
    .withIndex("by_restaurant_origin", (q) =>
      q.eq("restaurantId", restaurant._id).eq("origin", "period"))
    .collect(),
]);

const overridesMap = new Map<string, { isOpen?: boolean; capacity?: number }>();
for (const o of periodOverrides) {
  if (slotKeysSet.has(o.slotKey)) overridesMap.set(o.slotKey, o.patch);
}
for (const o of manualOverrides) {
  if (slotKeysSet.has(o.slotKey)) overridesMap.set(o.slotKey, o.patch); // manual ecrase period
}

// Modifier ligne 342-347 :
const result = slots
  .map((slot) => {
    const override = overridesMap.get(slot.slotKey);
    const effectiveIsOpen = override?.isOpen ?? slot.isOpen;
    const effectiveCapacity = override?.capacity ?? slot.capacity;
    return {
      ...slot,
      isOpen: effectiveIsOpen,
      capacity: effectiveCapacity,
      effectiveOpen: computeEffectiveOpen(effectiveIsOpen, effectiveCapacity),
    };
  })
  .sort((a, b) => a.timeKey.localeCompare(b.timeKey));
```

**Risque** : Faible. Identifier les composants qui consomment `listByDateService` pour verifier qu'ils n'attendent pas le slot brut.

**Alternative** : Deprecier `listByDateService` et migrer les consommateurs vers `listByDate` qui est deja correct.

---

## BUG 7 (MOYEN) — Pas de detection de conflit inter-periodes

**Fichier** : `convex/specialPeriods.ts`, lignes 849-882
**Diagnostic confirme** : `generateOverrides` verifie `specialPeriodId === periodId` mais ignore les overrides d'autres periodes. Si une autre periode a deja un override pour ce slot, le nouvel insert cree un doublon et le resultat depend de l'ordre de lecture.

### Correction proposee

Ajouter une verification des overrides de periodes concurrentes avant l'insert :

```typescript
// Remplacer lignes 849-882 par :

// Check if ANY period override exists for this slot (not just ours)
const existingPeriodOverride = await ctx.db
  .query("slotOverrides")
  .withIndex("by_restaurant_slotKey", (q) =>
    q.eq("restaurantId", restaurantId).eq("slotKey", slot.slotKey)
  )
  .filter((q) => q.eq(q.field("origin"), "period"))
  .first();

if (existingPeriodOverride) {
  if (existingPeriodOverride.specialPeriodId === periodId) {
    // Notre propre override → mettre a jour
    await ctx.db.patch(existingPeriodOverride._id, {
      patch,
      updatedAt: now,
    });
    slotsModified++;
  } else {
    // Override d'une AUTRE periode → log warning, ne pas ecraser
    console.warn("Period override conflict", {
      slotKey: slot.slotKey,
      existingPeriodId: existingPeriodOverride.specialPeriodId,
      newPeriodId: periodId,
    });
    // Skip — la premiere periode garde la priorite
  }
} else {
  // Aucun override period → creer
  await ctx.db.insert("slotOverrides", {
    restaurantId,
    slotKey: slot.slotKey,
    origin: "period",
    patch,
    specialPeriodId: periodId,
    createdAt: now,
    updatedAt: now,
  });
  slotsModified++;
}
```

**Alternative (plus permissive)** : Remplacer l'override existant par le nouveau (derniere periode gagne). Dans ce cas, ajouter au moins un log pour la tracabilite.

**Risque** : Moyen. A discuter : quelle periode doit avoir priorite? La proposition actuelle donne priorite a la premiere creee.

---

## BUG 8 (MOYEN) — Race condition lors du update de periode speciale

**Fichier** : `convex/specialPeriods.ts`, lignes 597-620
**Diagnostic confirme** : La sequence `deleteOverrides() → patch → generateOverrides()` laisse une fenetre sans overrides.

### Correction proposee

**Approche 1 (simple, recommandee)** : Convex execute les mutations de facon serialisee au sein d'une meme transaction. Comme `update` est une mutation (pas une action), les 3 operations (`deleteOverrides`, `patch`, `generateOverrides`) s'executent dans la **meme transaction Convex**. Il n'y a donc **pas de fenetre visible** pour `generateFromTemplates` qui est une mutation separee.

**Verdict** : Ce bug est un **faux positif** dans le contexte Convex. Les mutations Convex sont atomiques — aucune autre mutation ne peut voir l'etat intermediaire. Le cron `generateFromTemplates` ne pourra lire les slots qu'APRES que la transaction entiere de `update` soit commitee.

**Action** : Aucune correction necessaire. Ajouter un commentaire explicatif :

```typescript
// NOTE: deleteOverrides + generateOverrides run within the same Convex mutation transaction.
// No other mutation can observe the intermediate state (no overrides).
// This is safe because Convex mutations are serialized/atomic.
```

---

## BUG 9 (MINEUR) — `generateExceptionalOpeningSlots` ne cree pas d'overrides

**Fichier** : `convex/specialPeriods.ts`, lignes 894-1006
**Diagnostic confirme** : Les ouvertures exceptionnelles patchent les slots directement (`ctx.db.patch`) ou creent de nouveaux slots (`ctx.db.insert`). Contrairement aux fermetures, aucun `slotOverride` n'est cree.

### Analyse

Ce n'est pas exactement un bug mais une **incohérence architecturale deliberee** :

- Les nouveaux slots crees portent `createdByPeriodId: periodId`
- `generateFromTemplates` et `syncSlotsWithTemplate` verifient `createdByPeriodId` avant de modifier
- Les slots existants patches n'ont pas ce flag, d'ou le risque

### Correction proposee

Pour les slots **existants** patches (lignes 943-951 et 990-997), creer un `slotOverride` period au lieu de patcher directement :

```typescript
// Au lieu de ctx.db.patch(existingSlot._id, { ... })
// Creer un slotOverride period :
const existingPeriodOverride = await ctx.db
  .query("slotOverrides")
  .withIndex("by_restaurant_slotKey", (q) =>
    q.eq("restaurantId", restaurantId).eq("slotKey", slotKey)
  )
  .filter((q) => q.and(
    q.eq(q.field("origin"), "period"),
    q.eq(q.field("specialPeriodId"), periodId)
  ))
  .first();

if (existingPeriodOverride) {
  await ctx.db.patch(existingPeriodOverride._id, {
    patch: { isOpen: slotConfig.isActive, capacity: slotConfig.capacity, maxGroupSize: slotConfig.maxGroupSize },
    updatedAt: now,
  });
} else {
  await ctx.db.insert("slotOverrides", {
    restaurantId,
    slotKey,
    origin: "period",
    patch: { isOpen: slotConfig.isActive, capacity: slotConfig.capacity, maxGroupSize: slotConfig.maxGroupSize },
    specialPeriodId: periodId,
    createdAt: now,
    updatedAt: now,
  });
}
slotsModified++;
```

Pour les **nouveaux** slots (lignes 926-942 et 972-988), le mecanisme `createdByPeriodId` est suffisant car le slot n'existait pas avant et le cron le respecte.

**Risque** : Faible. Harmonise le comportement avec les fermetures.

---

## Resume des corrections

| # | Severite | Effort | Approche |
|---|----------|--------|----------|
| 1 | CRITIQUE | ~15 lignes | Copier le pattern override de `_create` dans `_update` |
| 2 | CRITIQUE | ~30 lignes x4 | toggle/close/openRange : creer `slotOverride` manual au lieu de patcher `slots` |
| 3 | CRITIQUE | ~25 lignes | `adminOverrideSlot` : creer `slotOverride` manual au lieu de patcher `slots` |
| 4 | MAJEUR | ~15 lignes | `ensureSlotsForDate` : verifier overrides AVANT de fermer les slots |
| 5 | MAJEUR | ~1 ligne | `syncSlotsWithTemplate` : ajouter check `overriddenSlotKeys` |
| 6 | MOYEN | ~20 lignes | `listByDateService` : charger et appliquer overrides (ou deprecier) |
| 7 | MOYEN | ~15 lignes | `generateOverrides` : verifier overrides inter-periodes |
| 8 | MOYEN | 0 lignes | **Faux positif** — mutations Convex atomiques, ajouter commentaire |
| 9 | MINEUR | ~20 lignes | `generateExceptionalOpeningSlots` : creer overrides pour slots existants |

### Ordre d'implementation recommande

1. **BUG 1** (le plus impactant pour les clients)
2. **BUG 2 + 3** ensemble (meme pattern — ecriture override au lieu de patch direct)
3. **BUG 4 + 5** ensemble (meme pattern — guard sur overrides avant fermeture)
4. **BUG 6** (affichage admin)
5. **BUG 7 + 9** (periodes speciales, coherence)
6. **BUG 8** (commentaire uniquement)

### Refactoring recommande en parallele

Extraire un helper `loadEffectiveSlot(ctx, restaurantId, slotKey)` pour centraliser :
- Chargement du slot brut
- Chargement des overrides
- Application par priorite (period < manual)
- Retour des valeurs effectives (isOpen, capacity, maxGroupSize, largeTableAllowed)

Ce helper serait utilise par : `_create`, `_update`, `listByDateService`, `listByDate`, et tout futur endpoint.

---

*Rapport genere le 2026-04-07*
