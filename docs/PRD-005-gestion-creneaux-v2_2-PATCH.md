# PRD-005 : Gestion des Créneaux — PATCH v2.2

## Informations Document

| Attribut | Valeur |
|----------|--------|
| **ID** | PRD-005 |
| **Titre** | Gestion des Créneaux Horaires |
| **Statut** | ✅ Production-ready |
| **Priorité** | P0 - Critique |
| **Version** | 2.2 |
| **Date création** | 2025-12-20 |
| **Dernière MAJ** | 2025-12-22 |
| **Responsable** | AGBVconsult |
| **Base** | PRD-005 v2.1 (inchangé sauf sections ci-dessous) |

---

## Changelog

| Version | Date | Changements |
|---------|------|-------------|
| **2.2** | 2025-12-22 | Ajout section UI configuration, créneaux par défaut (12h/12h30/13h + 18h/18h30/19h), capacité éditable inline, réordonnancement automatique |
| 2.1 | 2025-12-20 | Timezone helpers, batch capacity, defaultCapacity |
| 2.0 | 2025-12-20 | Mode override explicite, overrideServices, merge slots |
| 1.0 | 2025-12-20 | Création |

---

## NOUVELLES SECTIONS v2.2

---

# SECTION 14 : CRÉNEAUX PAR DÉFAUT (Template Initial)

## 14.1 Configuration Standard

| Service | Créneaux | Intervalle |
|---------|----------|------------|
| **Déjeuner (midi)** | 12:00, 12:30, 13:00 | 30 min |
| **Dîner (soir)** | 18:00, 18:30, 19:00 | 30 min |

→ **3 créneaux par service** au démarrage

## 14.2 Constantes par Défaut

```typescript
// convex/lib/defaultWeekTemplate.ts — MISE À JOUR v2.2

const DEFAULT_SLOT_CAPACITY = 8;

const DEFAULT_MIDI_SLOTS: Slot[] = [
  { time: "12:00", capacity: DEFAULT_SLOT_CAPACITY, isActive: true, largeTableAllowed: true },
  { time: "12:30", capacity: DEFAULT_SLOT_CAPACITY, isActive: true, largeTableAllowed: true },
  { time: "13:00", capacity: DEFAULT_SLOT_CAPACITY, isActive: true, largeTableAllowed: true },
];

const DEFAULT_SOIR_SLOTS: Slot[] = [
  { time: "18:00", capacity: DEFAULT_SLOT_CAPACITY, isActive: true, largeTableAllowed: true },
  { time: "18:30", capacity: DEFAULT_SLOT_CAPACITY, isActive: true, largeTableAllowed: true },
  { time: "19:00", capacity: DEFAULT_SLOT_CAPACITY, isActive: true, largeTableAllowed: true },
];
```

---

# SECTION 15 : INTERFACE CONFIGURATION CRÉNEAUX

## 15.1 Layout Global

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CONFIGURATION CRÉNEAUX                              │
├───────────────────────────────┬─────────────────────────────────────────┤
│                               │                                         │
│         DÉJEUNER              │              DÎNER                      │
│                               │                                         │
│  Jours d'ouverture            │  Jours d'ouverture                      │
│  ┌───┬───┬───┬───┬───┬───┬───┐│  ┌───┬───┬───┬───┬───┬───┬───┐        │
│  │ L │ M │ M │ J │ V │ S │ D ││  │ L │ M │ M │ J │ V │ S │ D │        │
│  │   │   │   │   │   │ ● │ ● ││  │   │   │   │   │ ● │ ● │ ● │        │
│  └───┴───┴───┴───┴───┴───┴───┘│  └───┴───┴───┴───┴───┴───┴───┘        │
│                               │                                         │
│  Créneaux horaires       (+)  │  Créneaux horaires                 (+) │
│  ─────────────────────────────│  ───────────────────────────────────── │
│                               │                                         │
│  ⏱ 12:00   👥 [8]   [●━━]   │  ⏱ 18:00   👥 [8]   [●━━]              │
│  ⏱ 12:30   👥 [8]   [●━━]   │  ⏱ 18:30   👥 [8]   [●━━]              │
│  ⏱ 13:00   👥 [8]   [●━━]   │  ⏱ 19:00   👥 [8]   [●━━]              │
│                               │                                         │
└───────────────────────────────┴─────────────────────────────────────────┘
```

## 15.2 Section "Jours d'ouverture"

### Composant : DaySelector

```
┌───┬───┬───┬───┬───┬───┬───┐
│ L │ M │ M │ J │ V │ S │ D │
│   │   │   │   │   │ ● │ ● │
└───┴───┴───┴───┴───┴───┴───┘
```

| Élément | Description |
|---------|-------------|
| **Boutons** | 7 boutons circulaires (L M M J V S D) |
| **État sélectionné** | Fond noir, texte blanc |
| **État non sélectionné** | Fond blanc/gris clair, texte noir |
| **Action** | Clic toggle ON/OFF |

### Mapping Jours

| Label | DayOfWeek (ISO) |
|-------|-----------------|
| L | 1 (Lundi) |
| M | 2 (Mardi) |
| M | 3 (Mercredi) |
| J | 4 (Jeudi) |
| V | 5 (Vendredi) |
| S | 6 (Samedi) |
| D | 7 (Dimanche) |

## 15.3 Section "Créneaux horaires"

### En-tête

| Élément | Description |
|---------|-------------|
| **Titre** | "Créneaux horaires" |
| **Bouton (+)** | Ajoute un nouveau créneau |

### Ligne Créneau

```
┌─────────────────────────────────────────────────────────┐
│  ⏱ 12:00      👥      [8]      [━━━●]      🗑         │
│   │            │       │          │         │          │
│   └ Heure      └ Icône └ Capacité └ Toggle  └ Supprimer│
│   (lecture)    groupe  (éditable) ON/OFF               │
└─────────────────────────────────────────────────────────┘
```

| Élément | Type | Description |
|---------|------|-------------|
| **⏱ Heure** | Texte | Format HH:mm, lecture seule |
| **👥 Icône** | Icône | 3 silhouettes (groupe) |
| **Capacité** | Input | Nombre éditable, clic pour modifier |
| **Toggle** | Switch | ON (actif) / OFF (inactif) |
| **🗑 Corbeille** | Bouton | Supprime le créneau |

### Capacité Éditable

| Aspect | Règle |
|--------|-------|
| **Type** | Input numérique inline |
| **Interaction** | Clic sur le nombre → mode édition |
| **Validation** | Min 1, max 50 |
| **Défaut** | 8 (depuis settings.defaultSlotCapacity) |
| **Sauvegarde** | Blur ou Enter |

```tsx
// Composant simplifié
<EditableCapacity
  value={slot.capacity}
  min={1}
  max={50}
  onChange={(newValue) => updateSlotCapacity(slot.time, newValue)}
/>
```

## 15.4 Ajout de Créneau (+)

### Popup/Inline Form

```
┌─────────────────────────────────────────┐
│  Nouveau créneau                        │
├─────────────────────────────────────────┤
│                                         │
│  Heure :    [14:00 ▼]  (time picker)   │
│  Capacité : [8      ]  (input)          │
│                                         │
│           [Annuler]  [Ajouter]         │
│                                         │
└─────────────────────────────────────────┘
```

| Champ | Type | Validation |
|-------|------|------------|
| **Heure** | Time picker | Format HH:mm |
| **Capacité** | Input number | Min 1, max 50, défaut 8 |

### Règles d'Ajout

| Règle | Description |
|-------|-------------|
| **Doublon interdit** | Erreur si créneau même heure existe déjà |
| **Réordonnancement** | ✅ Automatique par chronologie |
| **Validation horaire** | Permissive (pas de contrainte de plage) |

### Exemple Réordonnancement

```
Avant ajout 12:15 :  12:00 → 12:30 → 13:00
Après ajout 12:15 :  12:00 → 12:15 → 12:30 → 13:00
                            └── inséré automatiquement à sa place
```

## 15.5 Suppression de Créneau (🗑)

### Comportement

| Cas | Action |
|-----|--------|
| **Sans réservations** | Suppression directe |
| **Avec réservations futures** | Confirmation requise |

### Dialog Confirmation (si réservations)

```
┌─────────────────────────────────────────┐
│  ⚠️ Attention                           │
├─────────────────────────────────────────┤
│                                         │
│  Ce créneau a 3 réservations futures.   │
│                                         │
│  Voulez-vous vraiment le supprimer ?    │
│  Les réservations existantes ne seront  │
│  pas annulées automatiquement.          │
│                                         │
│           [Annuler]  [Supprimer]       │
│                                         │
└─────────────────────────────────────────┘
```

## 15.6 États Visuels

| État | Toggle | Ligne |
|------|--------|-------|
| **Actif** | [━━━●] fond sombre | Normal |
| **Inactif** | [○━━━] fond clair | Grisée (opacity 50%) |

---

# SECTION 16 : VALIDATION PERMISSIVE

## 16.1 Règle

**Le système ne valide PAS strictement que les créneaux respectent les plages horaires du service.**

| Comportement | Description |
|--------------|-------------|
| **Pas de validation** | Un créneau 15:00 dans service "midi" est accepté |
| **Responsabilité admin** | L'admin configure selon ses besoins |
| **Pas d'erreur** | Pas de blocage, juste avertissement optionnel |

## 16.2 Avertissement Optionnel (P1)

```
⚠️ Ce créneau (15:00) est en dehors de la plage typique du déjeuner (11:00-14:30)
```

Non bloquant, juste informatif.

---

# SECTION 17 : COMPOSANTS UI

## 17.1 Structure des Fichiers

```
src/app/admin/creneaux/
├── page.tsx                    # Page principale
├── components/
│   ├── ServicePanel.tsx        # Panel par service (Déjeuner/Dîner)
│   ├── DaySelector.tsx         # Sélecteur jours d'ouverture
│   ├── SlotList.tsx            # Liste des créneaux
│   ├── SlotRow.tsx             # Ligne créneau
│   ├── EditableCapacity.tsx    # Input capacité inline
│   ├── AddSlotDialog.tsx       # Modal ajout créneau
│   └── DeleteSlotDialog.tsx    # Modal confirmation suppression
└── hooks/
    └── useWeekTemplate.ts      # Hook gestion template
```

## 17.2 Props Composants

```typescript
// ServicePanel
interface ServicePanelProps {
  service: "midi" | "soir";
  title: string;                    // "Déjeuner" | "Dîner"
  openDays: number[];               // [6, 7] = Sam, Dim
  slots: Slot[];
  onToggleDay: (day: number) => void;
  onAddSlot: (time: string, capacity: number) => void;
  onUpdateSlot: (time: string, updates: Partial<Slot>) => void;
  onDeleteSlot: (time: string) => void;
}

// SlotRow
interface SlotRowProps {
  slot: Slot;
  onCapacityChange: (capacity: number) => void;
  onToggleActive: (isActive: boolean) => void;
  onDelete: () => void;
}

// EditableCapacity
interface EditableCapacityProps {
  value: number;
  min?: number;           // défaut 1
  max?: number;           // défaut 50
  onChange: (value: number) => void;
}

// AddSlotDialog
interface AddSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (time: string, capacity: number) => void;
  existingTimes: string[];  // Pour validation doublon
  defaultCapacity: number;
}
```

## 17.3 Mutations Backend

```typescript
// convex/timeSlots.ts — AJOUTS v2.2

// Ajouter un créneau au template
export const addSlotToTemplate = mutation({
  args: {
    service: v.union(v.literal("midi"), v.literal("soir")),
    time: v.string(),
    capacity: v.number(),
  },
  handler: async (ctx, { service, time, capacity }) => {
    await requireRole(ctx, ["owner", "admin"]);
    
    // Validation
    if (!isValidTime(time)) {
      throw new Error("VALIDATION: Format heure invalide (HH:mm)");
    }
    if (capacity < 1 || capacity > 50) {
      throw new Error("VALIDATION: Capacité doit être entre 1 et 50");
    }
    
    const template = await getWeekTemplate(ctx);
    
    // Vérifier doublon
    for (const day of template.days) {
      const svc = day.services.find(s => s.name === service);
      if (svc?.slots.some(s => s.time === time)) {
        throw new Error("DUPLICATE: Ce créneau existe déjà");
      }
    }
    
    // Ajouter à tous les jours ouverts pour ce service
    const updatedDays = template.days.map(day => {
      const svc = day.services.find(s => s.name === service);
      if (!svc || !svc.isActive) return day;
      
      const newSlots = [
        ...svc.slots,
        { time, capacity, isActive: true, largeTableAllowed: true }
      ].sort((a, b) => a.time.localeCompare(b.time)); // Tri chronologique
      
      return {
        ...day,
        services: day.services.map(s => 
          s.name === service ? { ...s, slots: newSlots } : s
        ),
      };
    });
    
    await ctx.db.patch(template._id, { 
      days: updatedDays,
      updatedAt: Date.now(),
    });
    
    return { success: true, time, capacity };
  },
});

// Modifier capacité d'un créneau
export const updateSlotCapacity = mutation({
  args: {
    service: v.union(v.literal("midi"), v.literal("soir")),
    time: v.string(),
    capacity: v.number(),
  },
  handler: async (ctx, { service, time, capacity }) => {
    await requireRole(ctx, ["owner", "admin"]);
    
    if (capacity < 1 || capacity > 50) {
      throw new Error("VALIDATION: Capacité doit être entre 1 et 50");
    }
    
    const template = await getWeekTemplate(ctx);
    
    const updatedDays = template.days.map(day => ({
      ...day,
      services: day.services.map(svc => {
        if (svc.name !== service) return svc;
        return {
          ...svc,
          slots: svc.slots.map(slot =>
            slot.time === time ? { ...slot, capacity } : slot
          ),
        };
      }),
    }));
    
    await ctx.db.patch(template._id, { 
      days: updatedDays,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Supprimer un créneau
export const deleteSlotFromTemplate = mutation({
  args: {
    service: v.union(v.literal("midi"), v.literal("soir")),
    time: v.string(),
  },
  handler: async (ctx, { service, time }) => {
    await requireRole(ctx, ["owner", "admin"]);
    
    const template = await getWeekTemplate(ctx);
    
    const updatedDays = template.days.map(day => ({
      ...day,
      services: day.services.map(svc => {
        if (svc.name !== service) return svc;
        return {
          ...svc,
          slots: svc.slots.filter(slot => slot.time !== time),
        };
      }),
    }));
    
    await ctx.db.patch(template._id, { 
      days: updatedDays,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Toggle jour d'ouverture pour un service
export const toggleServiceDay = mutation({
  args: {
    service: v.union(v.literal("midi"), v.literal("soir")),
    dayOfWeek: v.number(),
    isOpen: v.boolean(),
  },
  handler: async (ctx, { service, dayOfWeek, isOpen }) => {
    await requireRole(ctx, ["owner", "admin"]);
    
    const template = await getWeekTemplate(ctx);
    
    const updatedDays = template.days.map(day => {
      if (day.dayOfWeek !== dayOfWeek) return day;
      
      return {
        ...day,
        services: day.services.map(svc => 
          svc.name === service ? { ...svc, isActive: isOpen } : svc
        ),
      };
    });
    
    await ctx.db.patch(template._id, { 
      days: updatedDays,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});
```

---

# SECTION 18 : TESTS UI

## 18.1 Tests Unitaires

```typescript
describe("SlotList", () => {
  it("should sort slots chronologically", () => {
    const slots = [
      { time: "13:00", capacity: 8, isActive: true },
      { time: "12:00", capacity: 8, isActive: true },
      { time: "12:30", capacity: 8, isActive: true },
    ];
    
    const sorted = sortSlotsByTime(slots);
    
    expect(sorted[0].time).toBe("12:00");
    expect(sorted[1].time).toBe("12:30");
    expect(sorted[2].time).toBe("13:00");
  });

  it("should reject duplicate time", () => {
    const existingTimes = ["12:00", "12:30", "13:00"];
    
    expect(isValidNewSlot("12:30", existingTimes)).toBe(false);
    expect(isValidNewSlot("12:15", existingTimes)).toBe(true);
  });
});

describe("EditableCapacity", () => {
  it("should clamp value between min and max", () => {
    expect(clampCapacity(0, 1, 50)).toBe(1);
    expect(clampCapacity(100, 1, 50)).toBe(50);
    expect(clampCapacity(25, 1, 50)).toBe(25);
  });
});
```

## 18.2 Tests E2E

```typescript
describe("Configuration Créneaux", () => {
  it("should display default slots", async ({ page }) => {
    await page.goto("/admin/creneaux");
    
    // Vérifier créneaux midi par défaut
    await expect(page.getByText("12:00")).toBeVisible();
    await expect(page.getByText("12:30")).toBeVisible();
    await expect(page.getByText("13:00")).toBeVisible();
    
    // Vérifier créneaux soir par défaut
    await expect(page.getByText("18:00")).toBeVisible();
    await expect(page.getByText("18:30")).toBeVisible();
    await expect(page.getByText("19:00")).toBeVisible();
  });

  it("should add slot and reorder", async ({ page }) => {
    await page.goto("/admin/creneaux");
    
    // Clic sur (+) du service midi
    await page.locator("[data-service='midi'] [data-action='add-slot']").click();
    
    // Remplir le formulaire
    await page.getByLabel("Heure").fill("12:15");
    await page.getByLabel("Capacité").fill("10");
    await page.getByRole("button", { name: "Ajouter" }).click();
    
    // Vérifier l'ordre (12:00 → 12:15 → 12:30 → 13:00)
    const slots = page.locator("[data-service='midi'] [data-slot]");
    await expect(slots.nth(0)).toContainText("12:00");
    await expect(slots.nth(1)).toContainText("12:15");
    await expect(slots.nth(2)).toContainText("12:30");
  });

  it("should edit capacity inline", async ({ page }) => {
    await page.goto("/admin/creneaux");
    
    // Clic sur la capacité du premier créneau
    await page.locator("[data-service='midi'] [data-slot='12:00'] [data-capacity]").click();
    
    // Modifier
    await page.getByRole("spinbutton").fill("12");
    await page.keyboard.press("Enter");
    
    // Vérifier
    await expect(page.locator("[data-service='midi'] [data-slot='12:00']")).toContainText("12");
  });

  it("should toggle day for service", async ({ page }) => {
    await page.goto("/admin/creneaux");
    
    // Toggle vendredi pour déjeuner
    await page.locator("[data-service='midi'] [data-day='5']").click();
    
    // Vérifier état toggle
    await expect(page.locator("[data-service='midi'] [data-day='5']")).toHaveAttribute("data-selected", "true");
  });
});
```

---

# SECTION 19 : RBAC (Complément)

| Action | Owner | Admin | Staff |
|--------|:-----:|:-----:|:-----:|
| Voir configuration | ✅ | ✅ | ✅ |
| Modifier jours | ✅ | ✅ | ❌ |
| Ajouter créneau | ✅ | ✅ | ❌ |
| Modifier capacité | ✅ | ✅ | ❌ |
| Supprimer créneau | ✅ | ✅ | ❌ |
| Toggle créneau ON/OFF | ✅ | ✅ | ❌ |

---

## Historique

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| **2.2** | 2025-12-22 | Claude | Section UI configuration, créneaux par défaut (12h/12h30/13h + 18h/18h30/19h), capacité éditable inline, réordonnancement automatique, mutations CRUD |
| 2.1 | 2025-12-20 | Claude | Timezone helpers, batch capacity, defaultCapacity |
| 2.0 | 2025-12-20 | Claude | Mode override explicite, overrideServices |
| 1.0 | 2025-12-20 | Claude | Création |

---

**FIN DU PATCH PRD-005 v2.2**

*Ce document est un patch/complément au PRD-005 v2.1*
*Sections 1-13 : inchangées (voir PRD-005 v2.1)*
*Sections 14-19 : nouvelles (v2.2)*
