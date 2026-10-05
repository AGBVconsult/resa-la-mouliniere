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
  bg: "#F3F5F7",
  /** Bandeau de créneau horaire */
  band: "#E9EEF2",
  line: "#E3E8EC",
  /** Sol du plan de salle (planches de pin brumeux) */
  floor: "#DCE2E6",
  floorPattern: "repeating-linear-gradient(90deg, rgba(60,80,100,0.07) 0 1px, transparent 1px 60px)",
} as const;

/** Jauge de remplissage d'un créneau, lisible sur le bandeau clair */
export const BRUME_GAUGE = {
  ok: "#5E8F72",
  low: "#C08A2A",
  full: "#BF4F4F",
} as const;

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
