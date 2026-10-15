import { AlphaPayClient } from "alphapay-node";
import type { AlphaCatalog, AlphaNetwork } from "@shared/alphapayCatalog";

type ReadAPI = (path: string) => Promise<any>;
const prefixes: Record<string, string> = {
  BF: "226", BJ: "229", CD: "243", CG: "242", CI: "225", CM: "237",
  ET: "251", GA: "241", GH: "233", GN: "224", IN: "91", KE: "254",
  LS: "266", ML: "223", MW: "265", MZ: "258", NE: "227", NG: "234",
  RW: "250", SL: "232", SN: "221", TG: "228", TZ: "255", UG: "256",
  US: "1", XC: "243", ZM: "260", XX: "",
};
export const normalizeCountry = (country: string) => ({ COD: "CD", COG: "CG" }[country.toUpperCase()] || country.toUpperCase());
export function operatorAlias(code: string) {
  const head = code.toLowerCase().split("_")[0];
  return ({ freemoney: "Free", mixx: "TMoney", togocel: "TMoney", mobi: "MobiCash", eu: "EUMobile" } as Record<string, string>)[head]
    || ({ mtn: "MTN", moov: "Moov", orange: "Orange", wave: "Wave", airtel: "Airtel", vodacom: "Vodacom" } as Record<string, string>)[head] || code;
}
export function sameOperator(configured: string, requested: string) {
  return configured.toLowerCase() === requested.toLowerCase() || configured.toLowerCase() === operatorAlias(requested).toLowerCase();
}
export function countryIncludes(list: string[], country: string) {
  return list.some(value => normalizeCountry(value) === normalizeCountry(country));
}

async function listAll(read: ReadAPI, path: string) {
  const rows: any[] = [];
  for (let page = 1; page <= 100; page++) {
    const data = await read(`${path}?page_size=100&page=${page}`);
    if (!Array.isArray(data.results)) throw new Error("Catalogue AlphaPay incomplet.");
    rows.push(...data.results);
    if (!data.next) return rows;
  }
  throw new Error("Catalogue AlphaPay trop volumineux.");
}

/** Rates are a quote for the SolvexPay XOF ledger, never an actual wallet transfer. */
export async function readXofRates(read: ReadAPI, currencies: string[]) {
  // Preserve the legacy ledger policy for old currencies.
  const output: Record<string, number> = { XOF: 1, XAF: 1, CDF: 0.22 };
  const bases = new Map<string, Map<string, number>>();
  const missing = () => currencies.filter(c => !output[c]);
  let firstBase: string | undefined;
  for (let page = 1; page <= 1000 && missing().length; page++) {
    const data = await read(`/exchange-rates/?page_size=100&page=${page}`);
    if (!Array.isArray(data.results)) throw new Error("Taux de change AlphaPay invalides.");
    for (const row of data.results) {
      firstBase ||= row.from_currency;
      const value = Number(row.rate);
      if (!Number.isFinite(value) || value <= 0) continue;
      if (row.to_currency === "XOF" && !["XOF", "XAF", "CDF"].includes(row.from_currency)) output[row.from_currency] = value;
      const rates = bases.get(row.from_currency) || new Map<string, number>();
      rates.set(row.to_currency, value);
      rates.set(row.from_currency, 1);
      bases.set(row.from_currency, rates);
    }
    for (const rates of bases.values()) {
      const xof = rates.get("XOF");
      if (!xof) continue;
      for (const currency of missing()) {
        const denominator = rates.get(currency);
        if (denominator) output[currency] = xof / denominator;
      }
    }
    // The first complete base already quotes every supported currency. Do not
    // download thousands of redundant cross pairs for an absent currency.
    if (firstBase && data.results.some((row: any) => row.from_currency !== firstBase)) break;
    if (!data.next) break;
  }
  // A missing quote is explicit; the related currency is not usable until resolved.
  return output;
}

export async function buildAlphaCatalog(read: ReadAPI): Promise<AlphaCatalog> {
  const [countries, networks, rates] = await Promise.all([
    read("/countries/"), listAll(read, "/networks/"), read("/pricing/my-rates/"),
  ]);
  if (!Array.isArray(countries) || !Array.isArray(rates)) throw new Error("Catalogue AlphaPay invalide.");
  const countryById = new Map(countries.map((c: any) => [c.id, c]));
  const active = new Set(networks.filter((n: any) => n.is_active === true).map((n: any) => `${countryById.get(n.country)?.iso_code || n.country}:${n.code}`));
  const available: AlphaNetwork[] = rates.filter((r: any) =>
    active.has(`${r.country_code}:${r.network_code}`) && (r.payin?.available === true || r.payout?.available === true),
  ).map((r: any) => ({
    code: r.network_code, name: r.network_name, country: r.country_code, currency: r.currency,
    payin: r.payin?.available === true, payout: r.payout?.available === true,
    otpRequired: r.payin?.otp_required === true,
    otpInstructions: typeof r.payin?.otp_instructions === "string" ? r.payin.otp_instructions.slice(0, 2000) : "",
    requiresRedirect: ["card", "crypto"].includes(r.network_code),
  }));
  const currencies = [...new Set(available.map(n => n.currency))].sort();
  const rateToXof = await readXofRates(read, currencies);
  return {
    fetchedAt: new Date().toISOString(), networks: available, currencies, rateToXof,
    countries: countries.filter((c: any) => c.is_active !== false && available.some(n => n.country === c.iso_code)).map((c: any) => {
      const code = c.iso_code;
      const currency = available.find(n => n.country === code)!.currency;
      const prefix = prefixes[code];
      return {
        code, name: code === "XC" ? "RD Congo (USD)" : code === "XX" ? "International (USD)" : c.name,
        flag: ["XC", "XX"].includes(code) ? "" : [...code].map(char => String.fromCodePoint(127397 + char.charCodeAt(0))).join(""),
        prefix: prefix ? `+${prefix}` : "", currency,
        operators: available.filter(n => n.country === code).map(n => n.code),
        phonePlaceholder: code === "BJ" || code === "CI" ? "Numéro local à 10 chiffres" : "Numéro de téléphone",
      };
    }),
  };
}

let cached: AlphaCatalog | undefined;
let pending: Promise<AlphaCatalog> | undefined;
export async function getAlphaCatalog(): Promise<AlphaCatalog> {
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 60_000) return cached;
  if (!pending) pending = (async () => {
    if (!process.env.ALPHAPAY_SECRET_KEY) throw new Error("AlphaPay n’est pas configuré.");
    const client = new AlphaPayClient({ apiKey: process.env.ALPHAPAY_SECRET_KEY, timeout: 20_000, maxRetries: 0 });
    try {
      const catalog = await buildAlphaCatalog(path => client.http.request("GET", path));
      cached = catalog;
      return catalog;
    } catch {
      throw Object.assign(new Error("Catalogue AlphaPay temporairement indisponible. Réessayez plus tard."), { status: 503 });
    }
  })().finally(() => { pending = undefined; });
  return pending;
}

export async function getWalletRate(currency: string) {
  const rate = (await getAlphaCatalog()).rateToXof[currency];
  if (!rate || !Number.isFinite(rate)) throw new Error(`Conversion ${currency}/XOF indisponible : opération bloquée.`);
  return rate;
}

export async function assertAlphaAvailable(code: string, country: string, currency: string, direction: "payin" | "payout") {
  const catalog = await getAlphaCatalog();
  const network = catalog.networks.find(n => n.code === code && n.country === normalizeCountry(country) && n.currency === currency);
  if (!network?.[direction]) throw Object.assign(new Error(`Ce moyen AlphaPay n’est pas disponible pour ${direction === "payin" ? "l’encaissement" : "le décaissement"} dans ce pays et cette devise.`), { code: "ALPHAPAY_REJECTED", status: 422 });
  if (!catalog.rateToXof[currency]) throw new Error("Taux de conversion indisponible ; aucune opération ne sera envoyée.");
  return network;
}
