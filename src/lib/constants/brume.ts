/**
 * Thème de l'interface tablette : palette neutre (gris sans teinte, texte quasi noir,
 * un seul accent bleu #3884FF), police Montserrat, aucun texte tout en majuscules.
 *
 * Le code couleur des statuts est conservé (pêche = en attente, jaune = confirmé,
 * bleu = table assignée / carton, vert = installé, rose = no-show, rouge = annulé…).
 *
 * Les classes sont écrites en entier (pas de concaténation) pour que Tailwind les détecte.
 */

export const BRUME = {
  /** Accent unique (création, « Auj. », sélection, badges) */
  accent: "#3884FF",
  accentStrong: "#2F74E6",
  /** Texte principal */
  ink: "#0C0C0C",
  /** Fond de page (le header est blanc) */
  bg: "#F6F6F6",
  /** Bandeau de créneau horaire */
  band: "#464646",
  line: "#E5E5E5",
  /** Sol du plan de salle (très clair, tables « plan d'architecte ») */
  floor: "#F7F7F7",
} as const;

export type GaugeLevel = "low" | "medium" | "high" | "full";

/**
 * Jauge de remplissage d'un créneau : la couleur suit le taux de remplissage.
 * `bar` colore la barre, `text` le libellé « x dispo » (plus clair, lisible sur le bandeau foncé).
 */
export const BRUME_GAUGE: Record<GaugeLevel, { bar: string; text: string }> = {
  low: { bar: "#22C55E", text: "#86EFAC" }, // < 50 % : vert
  medium: { bar: "#FACC15", text: "#FDE68A" }, // 50–79 % : jaune
  high: { bar: "#F97316", text: "#FDBA74" }, // 80–99 % : orange
  full: { bar: "#EF4444", text: "#FCA5A5" }, // complet : rouge
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
