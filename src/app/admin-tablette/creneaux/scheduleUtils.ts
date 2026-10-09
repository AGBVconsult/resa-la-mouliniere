/**
 * Semaine type de la page tablette « Créneaux » : un horaire par service
 * (mêmes créneaux tous les jours ouverts) édité en brouillon, puis traduit en
 * modèles hebdomadaires (`weeklyTemplates.upsert`) à l'enregistrement.
 */

export type Service = "lunch" | "dinner";

export const SERVICES: readonly Service[] = ["lunch", "dinner"];
export const ALL_DAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

/** Mêmes bornes que le serveur (weeklyTemplates : capacité 1 à 50). */
export const MIN_CAPACITY = 1;
export const MAX_CAPACITY = 50;
/** Capacité d'un nouveau créneau, comme sur la page web. */
export const NEW_SLOT_CAPACITY = 8;

export interface TemplateSlot {
  timeKey: string;
  capacity: number;
  isActive: boolean;
  largeTableAllowed: boolean;
  maxGroupSize: number | null;
}

/** Champs d'un Doc<"weeklyTemplates"> utiles à la page. */
export interface WeeklyTemplate {
  dayOfWeek: number;
  service: Service;
  isOpen: boolean;
  slots: TemplateSlot[];
}

export interface ServiceSchedule {
  /** Jours ouverts (1 = lundi … 7 = dimanche), triés. */
  openDays: number[];
  /** Créneaux du service, triés par heure. */
  slots: TemplateSlot[];
}

export type WeekSchedule = Record<Service, ServiceSchedule>;

const SLOT_FIELDS = ["capacity", "isActive", "largeTableAllowed", "maxGroupSize"] as const;

export function sortSlots(slots: readonly TemplateSlot[]): TemplateSlot[] {
  return [...slots].sort((a, b) => a.timeKey.localeCompare(b.timeKey));
}

function copySlot(slot: TemplateSlot): TemplateSlot {
  return {
    timeKey: slot.timeKey,
    capacity: slot.capacity,
    isActive: slot.isActive,
    largeTableAllowed: slot.largeTableAllowed,
    maxGroupSize: slot.maxGroupSize,
  };
}

export function newTemplateSlot(timeKey: string): TemplateSlot {
  return { timeKey, capacity: NEW_SLOT_CAPACITY, isActive: true, largeTableAllowed: false, maxGroupSize: null };
}

/**
 * Comme la page web : les créneaux affichés sont l'union de ceux des jours ouverts
 * (valeurs du premier jour qui le porte). Sans jour ouvert, on montre ceux des jours fermés.
 */
export function deriveServiceSchedule(templates: readonly WeeklyTemplate[], service: Service): ServiceSchedule {
  const ofService = templates.filter((t) => t.service === service).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const open = ofService.filter((t) => t.isOpen);
  const byTime = new Map<string, TemplateSlot>();
  for (const template of open.length > 0 ? open : ofService) {
    for (const slot of template.slots) {
      if (!byTime.has(slot.timeKey)) byTime.set(slot.timeKey, copySlot(slot));
    }
  }
  return { openDays: open.map((t) => t.dayOfWeek), slots: sortSlots([...byTime.values()]) };
}

export function deriveWeekSchedule(templates: readonly WeeklyTemplate[]): WeekSchedule {
  return { lunch: deriveServiceSchedule(templates, "lunch"), dinner: deriveServiceSchedule(templates, "dinner") };
}

export interface ServiceChanges {
  openedDays: number[];
  closedDays: number[];
  added: TemplateSlot[];
  removed: string[];
  /** Seuls les champs modifiés figurent dans le patch. */
  modified: { timeKey: string; patch: Partial<TemplateSlot> }[];
}

export function diffServiceSchedule(base: ServiceSchedule, current: ServiceSchedule): ServiceChanges {
  const baseByTime = new Map(base.slots.map((s) => [s.timeKey, s]));
  const currentTimes = new Set(current.slots.map((s) => s.timeKey));
  const changes: ServiceChanges = {
    openedDays: current.openDays.filter((d) => !base.openDays.includes(d)),
    closedDays: base.openDays.filter((d) => !current.openDays.includes(d)),
    added: [],
    removed: base.slots.filter((s) => !currentTimes.has(s.timeKey)).map((s) => s.timeKey),
    modified: [],
  };
  for (const slot of current.slots) {
    const before = baseByTime.get(slot.timeKey);
    if (!before) {
      changes.added.push(copySlot(slot));
      continue;
    }
    const patch: Partial<TemplateSlot> = {};
    for (const field of SLOT_FIELDS) {
      if (slot[field] !== before[field]) Object.assign(patch, { [field]: slot[field] });
    }
    if (Object.keys(patch).length > 0) changes.modified.push({ timeKey: slot.timeKey, patch });
  }
  return changes;
}

/** Nombre de modifications affiché dans la barre d'enregistrement (jours et créneaux). */
export function countChanges(base: WeekSchedule, current: WeekSchedule): number {
  return SERVICES.reduce((total, service) => {
    const c = diffServiceSchedule(base[service], current[service]);
    return total + c.openedDays.length + c.closedDays.length + c.added.length + c.removed.length + c.modified.length;
  }, 0);
}

function applySlotChanges(slots: readonly TemplateSlot[], changes: ServiceChanges): TemplateSlot[] {
  const removed = new Set(changes.removed);
  const patches = new Map(changes.modified.map((m) => [m.timeKey, m.patch]));
  const result = slots
    .filter((s) => !removed.has(s.timeKey))
    .map((s) => ({ ...copySlot(s), ...patches.get(s.timeKey) }));
  for (const added of changes.added) {
    const index = result.findIndex((s) => s.timeKey === added.timeKey);
    // Un jour fermé peut déjà porter ce créneau (masqué) : il prend les nouvelles valeurs.
    if (index === -1) result.push(copySlot(added));
    else result[index] = copySlot(added);
  }
  return sortSlots(result);
}

function sameSlots(a: readonly TemplateSlot[], b: readonly TemplateSlot[]): boolean {
  const sortedB = sortSlots(b);
  return (
    a.length === b.length &&
    sortSlots(a).every(
      (slot, i) => slot.timeKey === sortedB[i].timeKey && SLOT_FIELDS.every((field) => slot[field] === sortedB[i][field])
    )
  );
}

/**
 * Modèles à réécrire pour passer de `base` à `current`, appliqués aux modèles serveur actuels.
 * - jour qu'on ouvre : il prend l'horaire affiché ;
 * - autres jours : seules les modifications faites sont reportées (ajout, suppression, champs modifiés),
 *   les valeurs propres à un jour sont conservées ;
 * - les modèles inchangés ne sont pas renvoyés.
 */
export function buildTemplateUpdates(
  templates: readonly WeeklyTemplate[],
  base: WeekSchedule,
  current: WeekSchedule
): WeeklyTemplate[] {
  const updates: WeeklyTemplate[] = [];
  for (const service of SERVICES) {
    const changes = diffServiceSchedule(base[service], current[service]);
    for (const dayOfWeek of ALL_DAYS) {
      const existing = templates.find((t) => t.service === service && t.dayOfWeek === dayOfWeek);
      if (changes.openedDays.includes(dayOfWeek)) {
        updates.push({ dayOfWeek, service, isOpen: true, slots: current[service].slots.map(copySlot) });
        continue;
      }
      // Pas de modèle et jour non ouvert : rien à créer.
      if (!existing) continue;
      const isOpen = changes.closedDays.includes(dayOfWeek) ? false : existing.isOpen;
      const slots = applySlotChanges(existing.slots, changes);
      if (isOpen === existing.isOpen && sameSlots(slots, existing.slots)) continue;
      updates.push({ dayOfWeek, service, isOpen, slots });
    }
  }
  return updates;
}

/** Heure proposée pour un nouveau créneau : 30 min après le dernier, sinon 12:00 / 19:00. */
export function suggestNewSlotTime(slots: readonly TemplateSlot[], service: Service): string {
  const last = slots[slots.length - 1];
  if (!last) return service === "lunch" ? "12:00" : "19:00";
  const [hours, minutes] = last.timeKey.split(":").map(Number);
  const next = Math.min(hours * 60 + minutes + 30, 23 * 60 + 45);
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}

export const TIME_KEY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
