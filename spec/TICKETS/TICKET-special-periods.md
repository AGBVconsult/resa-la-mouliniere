# TICKET: Special Periods System (PRD-007)

**Statut**: Post-MVP  
**Priorité**: Phase 2  
**Estimation**: 2-3 jours  
**Référence**: PRD-007 v2.6

---

## Contexte

Le MVP gère les fermetures via :
- `availability.adminOverrideSlot` (isOpen=false) pour fermetures ponctuelles
- `slots.closeRange` / `slots.openRange` pour plages (tooling owner)

Un système dédié de périodes spéciales est souhaité post-MVP pour une gestion plus avancée.

---

## Scope à contractualiser

### 1. Table `specialPeriods`

```typescript
specialPeriods: defineTable({
  restaurantId: v.id("restaurants"),
  type: v.union(
    v.literal("holiday"),
    v.literal("closure"),
    v.literal("event")
  ),
  name: v.string(),
  startDate: v.string(),  // YYYY-MM-DD
  endDate: v.string(),    // YYYY-MM-DD
  applyRules: v.object({
    status: v.union(v.literal("open"), v.literal("closed")),
    services: v.optional(v.array(v.union(v.literal("lunch"), v.literal("dinner")))),
    activeDays: v.optional(v.array(v.number())),  // 0=dimanche, 6=samedi
    overrideCapacity: v.optional(v.number()),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_restaurant_dates", ["restaurantId", "startDate", "endDate"])
```

**Priorité de résolution** : EVENT > HOLIDAY > CLOSURE

### 2. Table `dailyOverrides`

```typescript
dailyOverrides: defineTable({
  restaurantId: v.id("restaurants"),
  dateKey: v.string(),
  service: v.union(v.literal("lunch"), v.literal("dinner")),
  origin: v.union(v.literal("period"), v.literal("manual")),
  periodId: v.optional(v.id("specialPeriods")),
  isOpen: v.boolean(),
  capacity: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_restaurant_date_service", ["restaurantId", "dateKey", "service"])
```

**Règle** : Manual > Period (les overrides manuels priment sur les périodes)

### 3. Endpoints admin CRUD

```typescript
// À contractualiser
specialPeriods.create(args) -> { periodId }
specialPeriods.update(args) -> { success }
specialPeriods.delete(args) -> { success }
specialPeriods.list(args) -> { periods }
specialPeriods.get(args) -> Period
```

### 4. Cron régénération

- Cron quotidien pour appliquer les périodes aux slots
- Régénération des `dailyOverrides` basée sur `specialPeriods`

---

## MVP Workaround

En attendant ce système, utiliser :

```typescript
// Fermer une plage de dates
await slots.closeRange({ dateStart: "2025-12-24", dateEnd: "2025-12-26" });

// Rouvrir une plage
await slots.openRange({ dateStart: "2025-12-27", dateEnd: "2025-12-31" });

// Override ponctuel
await availability.adminOverrideSlot({ slotKey, restaurantId, patch: { isOpen: false } });
```

---

## Critères d'acceptation

- [ ] Tables `specialPeriods` et `dailyOverrides` contractualisées dans CONTRACTS.md
- [ ] CRUD admin avec RBAC owner
- [ ] Priorité EVENT > HOLIDAY > CLOSURE respectée
- [ ] Manual > Period respecté
- [ ] Cron régénération fonctionnel
- [ ] Tests unitaires et intégration
