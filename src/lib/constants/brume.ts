/**
 * Thème « Brume » de l'interface tablette : gris-bleu brumeux, esprit scandinave.
 *
 * Le code couleur des statuts est conservé (pêche = en attente, jaune = confirmé,
 * bleu = table assignée / carton, vert = installé, rose = no-show, rouge = annulé…),
 * mais chaque teinte est légèrement désaturée et rafraîchie pour s'accorder au gris-bleu.
 *
 * Les classes sont écrites en entier (pas de concaténation) pour que Tailwind les détecte.
 */

export const BRUME = {
  /** Accent principal (barre de service active, « Aujourd'hui », création, sélection) */
  accent: "#4F6D84",
  accentStrong: "#3E5A70",
  /** Texte principal / secondaire */
  ink: "#2A3540",
  /** Fond de page et d'en-tête */
  bg: "#E4E9ED",
  /** Bandeau de créneau horaire */
  band: "#CFD9E1",
  line: "#D3DBE1",
  /** Sol du plan de salle (planches de pin brumeux) */
  floor: "#C5D0D8",
  floorPattern: "repeating-linear-gradient(90deg, rgba(40,60,80,0.10) 0 1px, transparent 1px 60px)",
} as const;

export type GaugeLevel = "low" | "medium" | "high" | "full";

/**
 * Jauge de remplissage d'un créneau : la couleur suit le taux de remplissage.
 * `bar` colore la barre, `text` le libellé « x dispo » (plus foncé, lisible sur le bandeau).
 */
export const BRUME_GAUGE: Record<GaugeLevel, { bar: string; text: string }> = {
  low: { bar: "#22C55E", text: "#15803D" }, // < 50 % : vert
  medium: { bar: "#FACC15", text: "#A16207" }, // 50–79 % : jaune
  high: { bar: "#F97316", text: "#C2410C" }, // 80–99 % : orange
  full: { bar: "#EF4444", text: "#B91C1C" }, // complet : rouge
};

export function getGaugeLevel(covers: number, capacity: number): GaugeLevel {
  if (capacity <= 0) return "low";
  const ratio = covers / capacity;
  if (ratio >= 1) return "full";
  if (ratio >= 0.8) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
}

export type StatusToneKey =
  | "pending"
  | "confirmed"
  | "assigned"
  | "cardPlaced"
  | "seated"
  | "completed"
  | "noshow"
  | "cancelled"
  | "refused"
  | "incident";

/** Pastille de statut : fond pastel + couleur d'icône */
export const STATUS_TONES: Record<StatusToneKey, { bg: string; iconColor: string }> = {
  pending: { bg: "bg-[#F6E3D3]", iconColor: "text-[#A4521F]" }, // Pêche
  confirmed: { bg: "bg-[#F4EBCF]", iconColor: "text-[#8A6510]" }, // Jaune paille
  assigned: { bg: "bg-[#DEE7F0]", iconColor: "text-[#2F5B86]" }, // Bleu brume
  cardPlaced: { bg: "bg-[#CBD9E7]", iconColor: "text-[#24496E]" }, // Bleu carton
  seated: { bg: "bg-[#D2E4D8]", iconColor: "text-[#2D5E40]" }, // Vert sauge
  completed: { bg: "bg-[#E9EDF1]", iconColor: "text-[#5B6B7A]" }, // Gris nuage
  noshow: { bg: "bg-[#F3E1E9]", iconColor: "text-[#9A3B62]" }, // Rose poudré
  cancelled: { bg: "bg-[#F5E0DF]", iconColor: "text-[#A33A3A]" }, // Rouge pastel
  refused: { bg: "bg-[#E6E4E1]", iconColor: "text-[#5E5852]" }, // Pierre
  incident: { bg: "bg-[#DDE3E9]", iconColor: "text-[#3E4C5A]" }, // Ardoise claire
};
