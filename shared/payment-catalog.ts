// Operational countries already present in SolvexPay; network availability checked
// against the authenticated AlphaPay catalogue on 2026-10-15.
export const PAYMENT_COUNTRIES = [
  { code: "BJ", iso: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", currency: "XOF", operators: ["MTN", "Moov", "Celtiis", "Coris"], phonePlaceholder: "01 90 12 34 56" },
  { code: "CI", iso: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave", "Djamo"], phonePlaceholder: "07 12 34 56 78" },
  { code: "BF", iso: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", currency: "XOF", operators: ["Moov", "Orange", "TouchCash"], phonePlaceholder: "70 12 34 56" },
  { code: "TG", iso: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", currency: "XOF", operators: ["TMoney", "Moov", "Mixx"], phonePlaceholder: "90 12 34 56" },
  { code: "SN", iso: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", currency: "XOF", operators: ["Orange", "Wave", "Free", "Djamo", "Expresso", "PayDunya", "Wizall"], phonePlaceholder: "77 123 45 67" },
  { code: "ML", iso: "ML", name: "Mali", flag: "🇲🇱", prefix: "+223", currency: "XOF", operators: ["Orange", "Moov", "MobiCash", "Wave"], phonePlaceholder: "70 12 34 56" },
  { code: "CM", iso: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", currency: "XAF", operators: ["MTN", "Orange"], phonePlaceholder: "6 12 34 56 12" },
  { code: "COD", iso: "CD", name: "RD Congo", flag: "🇨🇩", prefix: "+243", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange", "Afrimoney"], phonePlaceholder: "81 234 56 78" },
  { code: "COG", iso: "CG", name: "Congo-Brazzaville", flag: "🇨🇬", prefix: "+242", currency: "XAF", operators: ["MTN", "Airtel"], phonePlaceholder: "06 123 45 67" },
];

export const PAYMENT_NETWORKS: Record<string, Record<string, string>> = {
  MTN: { BJ: "mtn_bj", CI: "mtn_ci", CM: "mtn_cm", CG: "mtn_cg" },
  MOOV: { BJ: "moov_bj", CI: "moov_ci", BF: "moov_bf", ML: "moov_ml", TG: "moov_tg" },
  ORANGE: { CI: "orange_ci", BF: "orange_bf", ML: "orange_ml", CM: "orange_cm", SN: "orange_sn", CD: "orange_cd" },
  WAVE: { CI: "wave_ci", SN: "wave_sn", ML: "wave_ml" },
  FREE: { SN: "freemoney_sn" }, MIXX: { SN: "freemoney_sn", TG: "mixx_tg" },
  TMONEY: { TG: "togocel" }, TOGOCEL: { TG: "togocel" },
  VODACOM: { CD: "vodacom_cd" }, AIRTEL: { CD: "airtel_cd", CG: "airtel_cg" },
  CELTIIS: { BJ: "celtiis_bj" }, CORIS: { BJ: "coris_bj" },
  TOUCHCASH: { BF: "touchcash_bf" }, DJAMO: { CI: "djamo_ci", SN: "djamo_sn" },
  EXPRESSO: { SN: "expresso_sn" }, PAYDUNYA: { SN: "paydunya_sn" },
  WIZALL: { SN: "wizall_sn" }, MOBICASH: { ML: "mobi_cash_ml" },
  AFRIMONEY: { CD: "afrimoney_cd" },
};

export function alphaCountryCode(country: string) {
  const upper = country.toUpperCase();
  return upper === "COD" ? "CD" : upper === "COG" ? "CG" : upper;
}

export function solvexCountryCode(country: string) {
  const iso = alphaCountryCode(country);
  return PAYMENT_COUNTRIES.find(c => c.iso === iso)?.code || iso;
}

export function getPaymentNetwork(operator: string, country: string) {
  const code = operator.toUpperCase().replace(/[\s_-]/g, "");
  const network = PAYMENT_NETWORKS[code]?.[alphaCountryCode(country)];
  if (!network) throw new Error("Ce pays ou cet opérateur n’est pas pris en charge par AlphaPay.");
  return network;
}

export function needsPaymentConfirmation(network: string) {
  return ["coris_bj", "wizall_sn"].includes(network);
}

export const PAYMENT_OPERATORS = Array.from(new Set(PAYMENT_COUNTRIES.flatMap(c => c.operators))).map(code => ({
  code, name: code === "MobiCash" ? "Mobi Cash" : code === "Celtiis" ? "Celtiis Cash" : code,
  countries: PAYMENT_COUNTRIES.filter(c => c.operators.includes(code)).map(c => c.code),
}));
