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
export function getFlag(phone: string, language: string): string {
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
