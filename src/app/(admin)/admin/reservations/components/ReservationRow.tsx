"use client";

import { useState } from "react";
import { Users, Baby, Accessibility, PawPrint, ChevronDown, MoreHorizontal, X, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../convex/_generated/dataModel";

// Status colors
const STATUS_COLORS: Record<string, { bg: string; animate?: boolean }> = {
  confirmed: { bg: "bg-emerald-500" },
  seated: { bg: "bg-emerald-500" },
  arrived: { bg: "bg-emerald-500" },
  pending: { bg: "bg-orange-500", animate: true },
  incident: { bg: "bg-black" },
  cancelled: { bg: "bg-red-500" },
  noshow: { bg: "bg-red-500" },
  refused: { bg: "bg-red-500" },
  completed: { bg: "bg-gray-300" },
  finished: { bg: "bg-gray-300" },
};

// Visit badge styles - Design System
function getVisitBadgeStyle(visits: number): { classes: string; fontWeight: string } {
  if (visits === 1) return { classes: "bg-blue-50 text-blue-700 border-blue-100", fontWeight: "font-medium" }; // Nouveau
  if (visits <= 4) return { classes: "bg-gray-50 text-gray-500 border-gray-100", fontWeight: "font-medium" };
  if (visits <= 14) return { classes: "bg-gray-100 text-gray-700 border-gray-200", fontWeight: "font-medium" };
  if (visits <= 49) return { classes: "bg-amber-50 text-amber-700 border-amber-100", fontWeight: "font-bold" };
  return { classes: "bg-amber-100 text-amber-800 border-amber-300", fontWeight: "font-bold" }; // VIP 50+
}

// Phone prefix to country mapping (comprehensive list)
// Sorted by prefix length descending to match longer prefixes first
const PHONE_PREFIXES: Array<{ prefix: string; country: string }> = [
  // 4-digit prefixes
  { prefix: "+1242", country: "bs" }, // Bahamas
  { prefix: "+1246", country: "bb" }, // Barbados
  { prefix: "+1264", country: "ai" }, // Anguilla
  { prefix: "+1268", country: "ag" }, // Antigua
  { prefix: "+1284", country: "vg" }, // British Virgin Islands
  { prefix: "+1345", country: "ky" }, // Cayman Islands
  { prefix: "+1441", country: "bm" }, // Bermuda
  { prefix: "+1473", country: "gd" }, // Grenada
  { prefix: "+1649", country: "tc" }, // Turks and Caicos
  { prefix: "+1664", country: "ms" }, // Montserrat
  { prefix: "+1670", country: "mp" }, // Northern Mariana Islands
  { prefix: "+1671", country: "gu" }, // Guam
  { prefix: "+1684", country: "as" }, // American Samoa
  { prefix: "+1758", country: "lc" }, // Saint Lucia
  { prefix: "+1767", country: "dm" }, // Dominica
  { prefix: "+1784", country: "vc" }, // Saint Vincent
  { prefix: "+1787", country: "pr" }, // Puerto Rico
  { prefix: "+1809", country: "do" }, // Dominican Republic
  { prefix: "+1868", country: "tt" }, // Trinidad and Tobago
  { prefix: "+1869", country: "kn" }, // Saint Kitts
  { prefix: "+1876", country: "jm" }, // Jamaica
  // 3-digit prefixes
  { prefix: "+352", country: "lu" }, // Luxembourg
  { prefix: "+353", country: "ie" }, // Ireland
  { prefix: "+354", country: "is" }, // Iceland
  { prefix: "+355", country: "al" }, // Albania
  { prefix: "+356", country: "mt" }, // Malta
  { prefix: "+357", country: "cy" }, // Cyprus
  { prefix: "+358", country: "fi" }, // Finland
  { prefix: "+359", country: "bg" }, // Bulgaria
  { prefix: "+370", country: "lt" }, // Lithuania
  { prefix: "+371", country: "lv" }, // Latvia
  { prefix: "+372", country: "ee" }, // Estonia
  { prefix: "+373", country: "md" }, // Moldova
  { prefix: "+374", country: "am" }, // Armenia
  { prefix: "+375", country: "by" }, // Belarus
  { prefix: "+376", country: "ad" }, // Andorra
  { prefix: "+377", country: "mc" }, // Monaco
  { prefix: "+378", country: "sm" }, // San Marino
  { prefix: "+380", country: "ua" }, // Ukraine
  { prefix: "+381", country: "rs" }, // Serbia
  { prefix: "+382", country: "me" }, // Montenegro
  { prefix: "+383", country: "xk" }, // Kosovo
  { prefix: "+385", country: "hr" }, // Croatia
  { prefix: "+386", country: "si" }, // Slovenia
  { prefix: "+387", country: "ba" }, // Bosnia
  { prefix: "+389", country: "mk" }, // North Macedonia
  { prefix: "+420", country: "cz" }, // Czech Republic
  { prefix: "+421", country: "sk" }, // Slovakia
  { prefix: "+423", country: "li" }, // Liechtenstein
  { prefix: "+212", country: "ma" }, // Morocco
  { prefix: "+213", country: "dz" }, // Algeria
  { prefix: "+216", country: "tn" }, // Tunisia
  { prefix: "+218", country: "ly" }, // Libya
  { prefix: "+220", country: "gm" }, // Gambia
  { prefix: "+221", country: "sn" }, // Senegal
  { prefix: "+222", country: "mr" }, // Mauritania
  { prefix: "+223", country: "ml" }, // Mali
  { prefix: "+224", country: "gn" }, // Guinea
  { prefix: "+225", country: "ci" }, // Ivory Coast
  { prefix: "+226", country: "bf" }, // Burkina Faso
  { prefix: "+227", country: "ne" }, // Niger
  { prefix: "+228", country: "tg" }, // Togo
  { prefix: "+229", country: "bj" }, // Benin
  { prefix: "+230", country: "mu" }, // Mauritius
  { prefix: "+231", country: "lr" }, // Liberia
  { prefix: "+232", country: "sl" }, // Sierra Leone
  { prefix: "+233", country: "gh" }, // Ghana
  { prefix: "+234", country: "ng" }, // Nigeria
  { prefix: "+235", country: "td" }, // Chad
  { prefix: "+236", country: "cf" }, // Central African Republic
  { prefix: "+237", country: "cm" }, // Cameroon
  { prefix: "+238", country: "cv" }, // Cape Verde
  { prefix: "+239", country: "st" }, // São Tomé
  { prefix: "+240", country: "gq" }, // Equatorial Guinea
  { prefix: "+241", country: "ga" }, // Gabon
  { prefix: "+242", country: "cg" }, // Congo
  { prefix: "+243", country: "cd" }, // DR Congo
  { prefix: "+244", country: "ao" }, // Angola
  { prefix: "+245", country: "gw" }, // Guinea-Bissau
  { prefix: "+246", country: "io" }, // British Indian Ocean
  { prefix: "+247", country: "ac" }, // Ascension
  { prefix: "+248", country: "sc" }, // Seychelles
  { prefix: "+249", country: "sd" }, // Sudan
  { prefix: "+250", country: "rw" }, // Rwanda
  { prefix: "+251", country: "et" }, // Ethiopia
  { prefix: "+252", country: "so" }, // Somalia
  { prefix: "+253", country: "dj" }, // Djibouti
  { prefix: "+254", country: "ke" }, // Kenya
  { prefix: "+255", country: "tz" }, // Tanzania
  { prefix: "+256", country: "ug" }, // Uganda
  { prefix: "+257", country: "bi" }, // Burundi
  { prefix: "+258", country: "mz" }, // Mozambique
  { prefix: "+260", country: "zm" }, // Zambia
  { prefix: "+261", country: "mg" }, // Madagascar
  { prefix: "+262", country: "re" }, // Réunion
  { prefix: "+263", country: "zw" }, // Zimbabwe
  { prefix: "+264", country: "na" }, // Namibia
  { prefix: "+265", country: "mw" }, // Malawi
  { prefix: "+266", country: "ls" }, // Lesotho
  { prefix: "+267", country: "bw" }, // Botswana
  { prefix: "+268", country: "sz" }, // Eswatini
  { prefix: "+269", country: "km" }, // Comoros
  { prefix: "+290", country: "sh" }, // Saint Helena
  { prefix: "+291", country: "er" }, // Eritrea
  { prefix: "+297", country: "aw" }, // Aruba
  { prefix: "+298", country: "fo" }, // Faroe Islands
  { prefix: "+299", country: "gl" }, // Greenland
  { prefix: "+350", country: "gi" }, // Gibraltar
  { prefix: "+351", country: "pt" }, // Portugal
  { prefix: "+500", country: "fk" }, // Falkland Islands
  { prefix: "+501", country: "bz" }, // Belize
  { prefix: "+502", country: "gt" }, // Guatemala
  { prefix: "+503", country: "sv" }, // El Salvador
  { prefix: "+504", country: "hn" }, // Honduras
  { prefix: "+505", country: "ni" }, // Nicaragua
  { prefix: "+506", country: "cr" }, // Costa Rica
  { prefix: "+507", country: "pa" }, // Panama
  { prefix: "+508", country: "pm" }, // Saint Pierre
  { prefix: "+509", country: "ht" }, // Haiti
  { prefix: "+590", country: "gp" }, // Guadeloupe
  { prefix: "+591", country: "bo" }, // Bolivia
  { prefix: "+592", country: "gy" }, // Guyana
  { prefix: "+593", country: "ec" }, // Ecuador
  { prefix: "+594", country: "gf" }, // French Guiana
  { prefix: "+595", country: "py" }, // Paraguay
  { prefix: "+596", country: "mq" }, // Martinique
  { prefix: "+597", country: "sr" }, // Suriname
  { prefix: "+598", country: "uy" }, // Uruguay
  { prefix: "+599", country: "cw" }, // Curaçao
  { prefix: "+670", country: "tl" }, // Timor-Leste
  { prefix: "+672", country: "nf" }, // Norfolk Island
  { prefix: "+673", country: "bn" }, // Brunei
  { prefix: "+674", country: "nr" }, // Nauru
  { prefix: "+675", country: "pg" }, // Papua New Guinea
  { prefix: "+676", country: "to" }, // Tonga
  { prefix: "+677", country: "sb" }, // Solomon Islands
  { prefix: "+678", country: "vu" }, // Vanuatu
  { prefix: "+679", country: "fj" }, // Fiji
  { prefix: "+680", country: "pw" }, // Palau
  { prefix: "+681", country: "wf" }, // Wallis and Futuna
  { prefix: "+682", country: "ck" }, // Cook Islands
  { prefix: "+683", country: "nu" }, // Niue
  { prefix: "+685", country: "ws" }, // Samoa
  { prefix: "+686", country: "ki" }, // Kiribati
  { prefix: "+687", country: "nc" }, // New Caledonia
  { prefix: "+688", country: "tv" }, // Tuvalu
  { prefix: "+689", country: "pf" }, // French Polynesia
  { prefix: "+690", country: "tk" }, // Tokelau
  { prefix: "+691", country: "fm" }, // Micronesia
  { prefix: "+692", country: "mh" }, // Marshall Islands
  { prefix: "+850", country: "kp" }, // North Korea
  { prefix: "+852", country: "hk" }, // Hong Kong
  { prefix: "+853", country: "mo" }, // Macau
  { prefix: "+855", country: "kh" }, // Cambodia
  { prefix: "+856", country: "la" }, // Laos
  { prefix: "+880", country: "bd" }, // Bangladesh
  { prefix: "+886", country: "tw" }, // Taiwan
  { prefix: "+960", country: "mv" }, // Maldives
  { prefix: "+961", country: "lb" }, // Lebanon
  { prefix: "+962", country: "jo" }, // Jordan
  { prefix: "+963", country: "sy" }, // Syria
  { prefix: "+964", country: "iq" }, // Iraq
  { prefix: "+965", country: "kw" }, // Kuwait
  { prefix: "+966", country: "sa" }, // Saudi Arabia
  { prefix: "+967", country: "ye" }, // Yemen
  { prefix: "+968", country: "om" }, // Oman
  { prefix: "+970", country: "ps" }, // Palestine
  { prefix: "+971", country: "ae" }, // UAE
  { prefix: "+972", country: "il" }, // Israel
  { prefix: "+973", country: "bh" }, // Bahrain
  { prefix: "+974", country: "qa" }, // Qatar
  { prefix: "+975", country: "bt" }, // Bhutan
  { prefix: "+976", country: "mn" }, // Mongolia
  { prefix: "+977", country: "np" }, // Nepal
  { prefix: "+992", country: "tj" }, // Tajikistan
  { prefix: "+993", country: "tm" }, // Turkmenistan
  { prefix: "+994", country: "az" }, // Azerbaijan
  { prefix: "+995", country: "ge" }, // Georgia
  { prefix: "+996", country: "kg" }, // Kyrgyzstan
  { prefix: "+998", country: "uz" }, // Uzbekistan
  // 2-digit prefixes (most common European/major countries)
  { prefix: "+20", country: "eg" }, // Egypt
  { prefix: "+27", country: "za" }, // South Africa
  { prefix: "+30", country: "gr" }, // Greece
  { prefix: "+31", country: "nl" }, // Netherlands
  { prefix: "+32", country: "be" }, // Belgium
  { prefix: "+33", country: "fr" }, // France
  { prefix: "+34", country: "es" }, // Spain
  { prefix: "+36", country: "hu" }, // Hungary
  { prefix: "+39", country: "it" }, // Italy
  { prefix: "+40", country: "ro" }, // Romania
  { prefix: "+41", country: "ch" }, // Switzerland
  { prefix: "+43", country: "at" }, // Austria
  { prefix: "+44", country: "gb" }, // United Kingdom
  { prefix: "+45", country: "dk" }, // Denmark
  { prefix: "+46", country: "se" }, // Sweden
  { prefix: "+47", country: "no" }, // Norway
  { prefix: "+48", country: "pl" }, // Poland
  { prefix: "+49", country: "de" }, // Germany
  { prefix: "+51", country: "pe" }, // Peru
  { prefix: "+52", country: "mx" }, // Mexico
  { prefix: "+53", country: "cu" }, // Cuba
  { prefix: "+54", country: "ar" }, // Argentina
  { prefix: "+55", country: "br" }, // Brazil
  { prefix: "+56", country: "cl" }, // Chile
  { prefix: "+57", country: "co" }, // Colombia
  { prefix: "+58", country: "ve" }, // Venezuela
  { prefix: "+60", country: "my" }, // Malaysia
  { prefix: "+61", country: "au" }, // Australia
  { prefix: "+62", country: "id" }, // Indonesia
  { prefix: "+63", country: "ph" }, // Philippines
  { prefix: "+64", country: "nz" }, // New Zealand
  { prefix: "+65", country: "sg" }, // Singapore
  { prefix: "+66", country: "th" }, // Thailand
  { prefix: "+81", country: "jp" }, // Japan
  { prefix: "+82", country: "kr" }, // South Korea
  { prefix: "+84", country: "vn" }, // Vietnam
  { prefix: "+86", country: "cn" }, // China
  { prefix: "+90", country: "tr" }, // Turkey
  { prefix: "+91", country: "in" }, // India
  { prefix: "+92", country: "pk" }, // Pakistan
  { prefix: "+93", country: "af" }, // Afghanistan
  { prefix: "+94", country: "lk" }, // Sri Lanka
  { prefix: "+95", country: "mm" }, // Myanmar
  { prefix: "+98", country: "ir" }, // Iran
  // 1-digit prefix
  { prefix: "+1", country: "us" }, // USA/Canada (NANP)
  { prefix: "+7", country: "ru" }, // Russia/Kazakhstan
];

// Country code to flag emoji (comprehensive)
const COUNTRY_FLAGS: Record<string, string> = {
  // Europe
  ad: "🇦🇩", al: "🇦🇱", at: "🇦🇹", ba: "🇧🇦", be: "🇧🇪", bg: "🇧🇬", by: "🇧🇾",
  ch: "🇨🇭", cy: "🇨🇾", cz: "🇨🇿", de: "🇩🇪", dk: "🇩🇰", ee: "🇪🇪", es: "🇪🇸",
  fi: "🇫🇮", fo: "🇫🇴", fr: "🇫🇷", gb: "🇬🇧", gi: "🇬🇮", gr: "🇬🇷", hr: "🇭🇷",
  hu: "🇭🇺", ie: "🇮🇪", is: "🇮🇸", it: "🇮🇹", li: "🇱🇮", lt: "🇱🇹", lu: "🇱🇺",
  lv: "🇱🇻", mc: "🇲🇨", md: "🇲🇩", me: "🇲🇪", mk: "🇲🇰", mt: "🇲🇹", nl: "🇳🇱",
  no: "🇳🇴", pl: "🇵🇱", pt: "🇵🇹", ro: "🇷🇴", rs: "🇷🇸", ru: "🇷🇺", se: "🇸🇪",
  si: "🇸🇮", sk: "🇸🇰", sm: "🇸🇲", ua: "🇺🇦", xk: "🇽🇰",
  // Americas
  ag: "🇦🇬", ai: "🇦🇮", ar: "🇦🇷", aw: "🇦🇼", bb: "🇧🇧", bm: "🇧🇲", bo: "🇧🇴",
  br: "🇧🇷", bs: "🇧🇸", bz: "🇧🇿", ca: "🇨🇦", cl: "🇨🇱", co: "🇨🇴", cr: "🇨🇷",
  cu: "🇨🇺", cw: "🇨🇼", dm: "🇩🇲", do: "🇩🇴", ec: "🇪🇨", fk: "🇫🇰", gd: "🇬🇩",
  gf: "🇬🇫", gl: "🇬🇱", gp: "🇬🇵", gt: "🇬🇹", gy: "🇬🇾", hn: "🇭🇳", ht: "🇭🇹",
  jm: "🇯🇲", kn: "🇰🇳", ky: "🇰🇾", lc: "🇱🇨", mq: "🇲🇶", ms: "🇲🇸", mx: "🇲🇽",
  ni: "🇳🇮", pa: "🇵🇦", pe: "🇵🇪", pm: "🇵🇲", pr: "🇵🇷", py: "🇵🇾", sr: "🇸🇷",
  sv: "🇸🇻", tc: "🇹🇨", tt: "🇹🇹", us: "🇺🇸", uy: "🇺🇾", vc: "🇻🇨", ve: "🇻🇪",
  vg: "🇻🇬",
  // Africa
  ao: "🇦🇴", bf: "🇧🇫", bi: "🇧🇮", bj: "🇧🇯", bw: "🇧🇼", cd: "🇨🇩", cf: "🇨🇫",
  cg: "🇨🇬", ci: "🇨🇮", cm: "🇨🇲", cv: "🇨🇻", dj: "🇩🇯", dz: "🇩🇿", eg: "🇪🇬",
  er: "🇪🇷", et: "🇪🇹", ga: "🇬🇦", gh: "🇬🇭", gm: "🇬🇲", gn: "🇬🇳", gq: "🇬🇶",
  gw: "🇬🇼", ke: "🇰🇪", km: "🇰🇲", lr: "🇱🇷", ls: "🇱🇸", ly: "🇱🇾", ma: "🇲🇦",
  mg: "🇲🇬", ml: "🇲🇱", mr: "🇲🇷", mu: "🇲🇺", mw: "🇲🇼", mz: "🇲🇿", na: "🇳🇦",
  ne: "🇳🇪", ng: "🇳🇬", re: "🇷🇪", rw: "🇷🇼", sc: "🇸🇨", sd: "🇸🇩", sh: "🇸🇭",
  sl: "🇸🇱", sn: "🇸🇳", so: "🇸🇴", st: "🇸🇹", sz: "🇸🇿", td: "🇹🇩", tg: "🇹🇬",
  tn: "🇹🇳", tz: "🇹🇿", ug: "🇺🇬", za: "🇿🇦", zm: "🇿🇲", zw: "🇿🇼",
  // Asia
  ae: "🇦🇪", af: "🇦🇫", am: "🇦🇲", az: "🇦🇿", bd: "🇧🇩", bh: "🇧🇭", bn: "🇧🇳",
  bt: "🇧🇹", cn: "🇨🇳", ge: "🇬🇪", hk: "🇭🇰", id: "🇮🇩", il: "🇮🇱", in: "🇮🇳",
  iq: "🇮🇶", ir: "🇮🇷", jo: "🇯🇴", jp: "🇯🇵", kg: "🇰🇬", kh: "🇰🇭", kp: "🇰🇵",
  kr: "🇰🇷", kw: "🇰🇼", kz: "🇰🇿", la: "🇱🇦", lb: "🇱🇧", lk: "🇱🇰", mm: "🇲🇲",
  mn: "🇲🇳", mo: "🇲🇴", mv: "🇲🇻", my: "🇲🇾", np: "🇳🇵", om: "🇴🇲", ph: "🇵🇭",
  pk: "🇵🇰", ps: "🇵🇸", qa: "🇶🇦", sa: "🇸🇦", sg: "🇸🇬", sy: "🇸🇾", th: "🇹🇭",
  tj: "🇹🇯", tl: "🇹🇱", tm: "🇹🇲", tr: "🇹🇷", tw: "🇹🇼", uz: "🇺🇿", vn: "🇻🇳",
  ye: "🇾🇪",
  // Oceania
  as: "🇦🇸", au: "🇦🇺", ck: "🇨🇰", fj: "🇫🇯", fm: "🇫🇲", gu: "🇬🇺", io: "🇮🇴",
  ki: "🇰🇮", mh: "🇲🇭", mp: "🇲🇵", nc: "🇳🇨", nf: "🇳🇫", nr: "🇳🇷", nu: "🇳🇺",
  nz: "🇳🇿", pf: "🇵🇫", pg: "🇵🇬", pw: "🇵🇼", sb: "🇸🇧", tk: "🇹🇰", to: "🇹🇴",
  tv: "🇹🇻", vu: "🇻🇺", wf: "🇼🇫", ws: "🇼🇸",
};

// Language to default country (fallback when no phone prefix detected)
const LANGUAGE_DEFAULT_COUNTRY: Record<string, string> = {
  fr: "fr",
  nl: "nl",
  en: "gb",
  de: "de",
  it: "it",
};

/**
 * Determine flag based on phone prefix and language.
 * Special case: +32 (Belgium) + FR language = Belgian flag (not French)
 * Special case: +32 (Belgium) + NL language = Dutch flag
 */
function getFlag(phone: string, language: string): string {
  // Extract phone prefix - normalize by removing spaces
  const normalizedPhone = phone.replace(/\s/g, "");
  let detectedCountry: string | null = null;

  // Find matching prefix (longer prefixes are checked first due to array order)
  for (const { prefix, country } of PHONE_PREFIXES) {
    if (normalizedPhone.startsWith(prefix)) {
      detectedCountry = country;
      break;
    }
  }

  // Special case: Belgian phone number
  if (detectedCountry === "be") {
    // +32 + FR = Belgian flag (francophone belge)
    if (language === "fr") {
      return COUNTRY_FLAGS.be;
    }
    // +32 + NL = Dutch flag (to distinguish from Flemish Belgian)
    if (language === "nl") {
      return COUNTRY_FLAGS.nl;
    }
    // Other languages with Belgian phone = Belgian flag
    return COUNTRY_FLAGS.be;
  }

  // If phone prefix detected, use that country's flag
  if (detectedCountry && COUNTRY_FLAGS[detectedCountry]) {
    return COUNTRY_FLAGS[detectedCountry];
  }

  // Fallback: use language to determine flag
  const defaultCountry = LANGUAGE_DEFAULT_COUNTRY[language];
  if (defaultCountry && COUNTRY_FLAGS[defaultCountry]) {
    return COUNTRY_FLAGS[defaultCountry];
  }

  // Unknown = question mark
  return "❓";
}

export interface Reservation {
  _id: Id<"reservations">;
  dateKey: string;
  service: "lunch" | "dinner";
  timeKey: string;
  adults: number;
  childrenCount: number;
  babyCount: number;
  partySize: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: "fr" | "nl" | "en" | "de" | "it";
  note?: string;
  options?: string[];
  status: string;
  source: "online" | "admin" | "phone" | "walkin";
  tableIds: Id<"tables">[];
  primaryTableId?: Id<"tables">;
  version: number;
}

interface ReservationRowProps {
  reservation: Reservation;
  isCompact?: boolean;
  isExpanded?: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
  onSelectForAssignment?: () => void;
  tables?: { _id: Id<"tables">; name: string }[];
}

export function ReservationRow({
  reservation,
  isCompact = false,
  isExpanded = false,
  onToggleExpand,
  onStatusChange,
  onEdit,
  onSelectForAssignment,
  tables = [],
}: ReservationRowProps) {
  const [showMenu, setShowMenu] = useState(false);

  const statusStyle = STATUS_COLORS[reservation.status] || { bg: "bg-gray-400" };
  const visits = 1; // TODO: Get from CRM
  const visitBadge = getVisitBadgeStyle(visits);

  // Get table name - show only primary table name
  const tableName = (() => {
    if (reservation.tableIds.length === 0) return "-";
    // Use primaryTableId if available, otherwise first table
    const primaryId = reservation.primaryTableId ?? reservation.tableIds[0];
    return tables.find((t) => t._id === primaryId)?.name || "-";
  })();

  // Options icons
  const hasOption = (opt: string) => reservation.options?.includes(opt);

  // Primary action based on status - Design System
  // Dimensions: w-28 (112px), h-11 min-h-[44px], rounded-full, text-[11px] font-medium uppercase tracking-wide
  const getPrimaryAction = (): { label: string; color: string; nextStatus: string } | null => {
    switch (reservation.status) {
      case "pending":
        return { 
          label: "À valider", 
          color: "bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100", 
          nextStatus: "confirmed" 
        };
      case "confirmed":
        return { 
          label: "Arrivé", 
          color: "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100", 
          nextStatus: "seated" 
        };
      case "seated":
        return { 
          label: "Terminé", 
          color: "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100", 
          nextStatus: "completed" 
        };
      default:
        return null;
    }
  };

  // Secondary action (icon button) based on status - Design System
  // Dimensions: w-11 min-w-[44px], h-11 min-h-[44px], rounded-full, icon size={18}
  const getSecondaryAction = (): { icon: React.ReactNode; color: string; nextStatus: string; tooltip: string } | null => {
    switch (reservation.status) {
      case "pending":
        return { 
          icon: <X size={18} />, 
          color: "bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600", 
          nextStatus: "cancelled", 
          tooltip: "Refuser" 
        };
      case "confirmed":
        return { 
          icon: <UserX size={18} />, 
          color: "bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600", 
          nextStatus: "noshow", 
          tooltip: "No-show" 
        };
      default:
        return null;
    }
  };

  // Menu actions based on status - Design System
  // Text: text-xs (12px), hover backgrounds by type
  const getMenuActions = (): Array<{ label: string; nextStatus: string; textColor: string; hoverBg: string }> => {
    const actions: Array<{ label: string; nextStatus: string; textColor: string; hoverBg: string }> = [];
    
    switch (reservation.status) {
      case "pending":
        actions.push({ label: "Refuser", nextStatus: "cancelled", textColor: "text-red-600", hoverBg: "hover:bg-red-50" });
        break;
      case "confirmed":
        actions.push({ label: "No-show", nextStatus: "noshow", textColor: "text-red-600", hoverBg: "hover:bg-red-50" });
        actions.push({ label: "Annuler", nextStatus: "cancelled", textColor: "text-red-600", hoverBg: "hover:bg-red-50" });
        break;
      case "seated":
        actions.push({ label: "Signaler Incident", nextStatus: "incident", textColor: "text-orange-600", hoverBg: "hover:bg-orange-50" });
        break;
      case "noshow":
        actions.push({ label: "Marquer Arrivé", nextStatus: "seated", textColor: "text-emerald-600", hoverBg: "hover:bg-emerald-50" });
        actions.push({ label: "Restaurer", nextStatus: "confirmed", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        break;
      case "cancelled":
        actions.push({ label: "Marquer Arrivé", nextStatus: "seated", textColor: "text-emerald-600", hoverBg: "hover:bg-emerald-50" });
        actions.push({ label: "Restaurer", nextStatus: "confirmed", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        break;
      case "completed":
        actions.push({ label: "Rouvrir", nextStatus: "seated", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        break;
      case "incident":
        actions.push({ label: "Rouvrir", nextStatus: "seated", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        actions.push({ label: "Terminer", nextStatus: "completed", textColor: "text-gray-600", hoverBg: "hover:bg-gray-50" });
        break;
    }
    
    return actions;
  };

  const secondaryAction = getSecondaryAction();
  const menuActions = getMenuActions();

  const primaryAction = getPrimaryAction();

  if (isCompact) {
    // Compact mode (with floor plan)
    return (
      <div
        className={cn(
          "grid grid-cols-[24px_50px_44px_36px_1fr_60px] items-center px-4 py-2 hover:bg-gray-50/50 cursor-pointer border-b border-gray-100",
          isExpanded && "bg-gray-50"
        )}
        onClick={onToggleExpand}
      >
        {/* Status pill */}
        <div className="flex justify-center">
          <div
            className={cn(
              "w-1 h-5 rounded-full",
              statusStyle.bg,
              statusStyle.animate && "animate-pulse"
            )}
          />
        </div>

        {/* Time */}
        <span className="text-xs font-mono text-gray-600">{reservation.timeKey}</span>

        {/* Table */}
        <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-center">
          {tableName.substring(0, 4)}
        </span>

        {/* Party size */}
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Users className="h-3 w-3" />
          {reservation.partySize}
        </div>

        {/* Name */}
        <span className="text-sm font-medium truncate">
          {reservation.lastName} {reservation.firstName.charAt(0)}.
        </span>

        {/* Options - fixed order: highChair, wheelchair, dogAccess */}
        <div className="flex items-center gap-1">
          <Baby className={cn("h-4 w-4", hasOption("highChair") ? "text-black" : "text-transparent")} />
          <Accessibility className={cn("h-4 w-4", hasOption("wheelchair") ? "text-black" : "text-transparent")} />
          <PawPrint className={cn("h-4 w-4", hasOption("dogAccess") ? "text-black" : "text-transparent")} />
        </div>
      </div>
    );
  }

  // Full mode (list only)
  return (
    <>
      <div
        className={cn(
          "flex items-center px-4 py-3 hover:bg-gray-50/50 cursor-pointer border-b border-gray-100 gap-4",
          isExpanded && "bg-gray-50"
        )}
        onClick={onToggleExpand}
      >
        {/* Status pill */}
        <div className="w-6 flex justify-center">
          <div
            className={cn(
              "w-1 h-7 rounded-full",
              statusStyle.bg,
              statusStyle.animate && "animate-pulse"
            )}
          />
        </div>

        {/* Time */}
        <span className="w-14 text-sm font-mono text-gray-600">{reservation.timeKey}</span>

        {/* Table */}
        <span className="w-14 text-sm px-2.5 py-1 bg-gray-100 rounded text-center">
          {tableName}
        </span>

        {/* Party size - detailed: total (Xe + Xb) */}
        <div className="w-16 flex items-center gap-1 text-sm text-gray-600">
          <span className="font-medium">{reservation.partySize}</span>
          {(reservation.childrenCount > 0 || reservation.babyCount > 0) && (
            <span className="text-gray-400 text-xs">
              ({reservation.childrenCount > 0 ? `${reservation.childrenCount}e` : ""}
              {reservation.childrenCount > 0 && reservation.babyCount > 0 ? " + " : ""}
              {reservation.babyCount > 0 ? `${reservation.babyCount}b` : ""})
            </span>
          )}
        </div>

        {/* Visits - square badge - Design System: text-[10px], px-2 py-0.5 */}
        <span className={cn("w-7 h-7 text-[10px] flex items-center justify-center rounded border", visitBadge.classes, visitBadge.fontWeight)}>
          {visits}
        </span>

        {/* Flag based on phone + language */}
        <span className="w-10 text-lg text-center">{getFlag(reservation.phone, reservation.language)}</span>

        {/* Name - min width with auto expand */}
        <div className="min-w-40 max-w-60 truncate">
          <span className="font-semibold">{reservation.lastName}</span>{" "}
          <span className="text-gray-600">{reservation.firstName}</span>
        </div>

        {/* Options - fixed order: highChair, wheelchair, dogAccess */}
        <div className="w-28 flex items-center gap-1.5">
          <Baby className={cn("h-4 w-4", hasOption("highChair") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
          <Accessibility className={cn("h-4 w-4", hasOption("wheelchair") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
          <PawPrint className={cn("h-4 w-4", hasOption("dogAccess") ? "text-black" : "text-transparent")} strokeWidth={1.5} />
        </div>

        {/* Note preview */}
        <span className="flex-1 text-sm text-gray-500 truncate">{reservation.note || "-"}</span>

        {/* Actions column - primary and secondary buttons - Design System */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Primary action button - w-28 (112px), h-11 min-h-[44px], rounded-full */}
          {primaryAction && (
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "w-28 h-11 min-h-[44px] rounded-full",
                "text-[11px] font-medium uppercase tracking-wide",
                primaryAction.color
              )}
              onClick={() => onStatusChange(primaryAction.nextStatus)}
            >
              {primaryAction.label}
            </Button>
          )}
          {/* Secondary action icon - w-11 min-w-[44px], h-11 min-h-[44px], rounded-full */}
          {secondaryAction && (
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "w-11 min-w-[44px] h-11 min-h-[44px] rounded-full",
                secondaryAction.color
              )}
              onClick={() => onStatusChange(secondaryAction.nextStatus)}
              title={secondaryAction.tooltip}
            >
              {secondaryAction.icon}
            </Button>
          )}
        </div>

        {/* Menu column - Design System: w-10 h-10 (40x40px), text-gray-400, hover:text-black hover:bg-gray-100 */}
        <div className="w-10 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <div className="relative" ref={(el) => {
            if (el && showMenu) {
              const rect = el.getBoundingClientRect();
              const menu = el.querySelector('[data-menu]') as HTMLElement;
              if (menu) {
                menu.style.top = `${rect.bottom + 4}px`;
                menu.style.right = `${window.innerWidth - rect.right}px`;
              }
            }
          }}>
            <Button
              size="icon"
              variant="ghost"
              className="w-10 h-10 rounded-full text-gray-400 hover:text-black hover:bg-gray-100"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-[99]" 
                  onClick={() => setShowMenu(false)} 
                />
                <div 
                  data-menu
                  className="fixed bg-white rounded-lg shadow-xl border py-1 z-[100] min-w-[180px]"
                  style={{ right: 16 }}
                >
                  {/* Modifier - Design System: text-gray-700, hover:bg-blue-50 hover:text-blue-700 */}
                  <button
                    className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => { onEdit(); setShowMenu(false); }}
                  >
                    Modifier
                  </button>
                  {/* Assigner table */}
                  {onSelectForAssignment && (
                    <button
                      className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                      onClick={() => { onSelectForAssignment(); setShowMenu(false); }}
                    >
                      Assigner table
                    </button>
                  )}
                  {/* Dynamic actions based on status - text-xs (12px) */}
                  {menuActions.map((action) => (
                    <button
                      key={action.nextStatus}
                      className={cn("w-full px-4 py-2 text-left text-xs", action.textColor, action.hoverBg)}
                      onClick={() => { onStatusChange(action.nextStatus); setShowMenu(false); }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="bg-gray-50/50 px-4 py-4 ml-8 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Contact</p>
              <p className="text-sm">{reservation.phone}</p>
              <p className="text-sm text-gray-600">{reservation.email}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Note</p>
              <p className="text-sm text-gray-700">{reservation.note || "Aucune note"}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              Modifier
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
