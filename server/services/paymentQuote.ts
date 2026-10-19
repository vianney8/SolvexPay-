import { AlphaPayService } from "./alphapay";
import { alphaCountryCode, getPaymentNetwork, PAYMENT_COUNTRIES } from "@shared/payment-catalog";

let ratesCache: { until: number; rows: any[] } | undefined;
let ratesPending: Promise<any[]> | undefined;
const exchange = new Map<string, { until: number; rate: number }>();
export const paymentInputError = (message: string) => Object.assign(new Error(message), { status: 422, code: "ALPHAPAY_REJECTED" });
async function rates() {
  if (ratesCache && ratesCache.until > Date.now()) return ratesCache.rows;
  if (!ratesPending) ratesPending = new AlphaPayService().request("get", "/pricing/my-rates/").then(result => {
    const rows = Array.isArray(result) ? result : result.results;
    if (!Array.isArray(rows)) throw new Error("Tarifs AlphaPay indisponibles.");
    ratesCache = { rows, until: Date.now() + 60_000 };
    return rows;
  }).finally(() => { ratesPending = undefined; });
  return ratesPending;
}
// Paginated reference endpoint has no pair filter. Load the full reference once,
// cache only the three source currencies used by this app; never guess a rate.
let exchangePending: Promise<void> | undefined;
async function usdRate(currency: string) {
  const cached = exchange.get(currency);
  if (cached && cached.until > Date.now()) return cached.rate;
  if (!exchangePending) exchangePending = (async () => {
    const service = new AlphaPayService();
    const first = await service.request("get", "/exchange-rates/?page_size=100&page=1");
    const pages = Math.ceil(Number(first.count) / 100);
    if (!Number.isFinite(pages) || pages > 150) throw new Error("Référentiel de change indisponible.");
    const store = (result: any) => {
      for (const row of result.results || []) if (["XOF", "XAF", "CDF"].includes(row.from_currency) && row.to_currency === "USD" && Number(row.rate) > 0) {
        exchange.set(row.from_currency, { rate: Number(row.rate), until: Date.now() + 300_000 });
      } else if (row.from_currency === "USD" && ["XOF", "XAF", "CDF"].includes(row.to_currency) && Number(row.rate) > 0) {
        exchange.set(row.to_currency, { rate: 1 / Number(row.rate), until: Date.now() + 300_000 });
      }
    };
    store(first);
    for (let start = 2; start <= pages; start += 8) {
      const batch = await Promise.all(Array.from({ length: Math.min(8, pages - start + 1) }, (_, i) => service.request("get", `/exchange-rates/?page_size=100&page=${start + i}`)));
      batch.forEach(store);
    }
  })().finally(() => { exchangePending = undefined; });
  await exchangePending;
  const value = exchange.get(currency);
  if (!value || value.until < Date.now()) throw new Error("Taux de conversion AlphaPay indisponible.");
  return value.rate;
}
export function calculateProviderFee(amount: number, tier: any, currency: string) {
  let fee = amount * Number(tier.percent) / 100 + Number(tier.fixed);
  if (tier.floor_amount != null) fee = Math.max(fee, Number(tier.floor_amount));
  if (tier.cap_amount != null) fee = Math.min(fee, Number(tier.cap_amount));
  const units = currency === "USD" ? 100 : 1;
  if (!Number.isFinite(fee) || fee < 0) throw new Error("Tarif AlphaPay invalide.");
  return Math.ceil((fee - 1e-9) * units) / units;
}
export async function quotePayment(input: { country: string; operator: string; amount: number; currency: string; direction?: string }) {
  const direction = input.direction || "payin";
  if (!["payin", "payout"].includes(direction)) throw paymentInputError("Sens de paiement invalide.");
  const network = getPaymentNetwork(input.operator, input.country);
  const country = PAYMENT_COUNTRIES.find(c => c.iso === alphaCountryCode(input.country));
  if (!country || country.currency !== input.currency || !Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 1e9) throw paymentInputError("Montant, pays ou devise invalide.");
  if (network === "crypto" && direction === "payout") throw paymentInputError("Les retraits crypto ne sont pas disponibles chez AlphaPay.");
  const row = (await rates()).find(r => r.network_code === network && r.country_code === (network === "crypto" ? "XX" : country.iso));
  const capability = row?.[direction];
  if (!capability?.available) throw paymentInputError("Cette opération n’est pas disponible sur votre compte AlphaPay.");
  const providerCurrency = network === "crypto" ? "USD" : input.currency;
  const providerAmount = network === "crypto" ? Math.ceil((input.amount * await usdRate(input.currency) - 1e-9) * 100) / 100 : input.amount;
  const tier = capability.tiers?.find((t: any) => t.currency === providerCurrency && providerAmount >= Number(t.min_amount) && (t.max_amount == null || providerAmount <= Number(t.max_amount)));
  if (!tier) throw paymentInputError("Le montant est hors des limites AlphaPay pour ce moyen de paiement.");
  const providerFee = calculateProviderFee(providerAmount, tier, providerCurrency);
  const providerTotal = Number((providerAmount + (tier.fee_charge_mode === "DEDUCTED" ? 0 : providerFee)).toFixed(2));
  // Explicit merchant policy: Orange BF uses a pre-payment code; Orange SN
  // does not. Other networks keep their live AlphaPay requirements.
  const otpRequired = direction === "payin" && (
    network === "orange_bf" || (network !== "orange_sn" && capability.otp_required === true)
  );
  const otpInstructions = otpRequired
    ? String(capability.otp_instructions || (network === "orange_bf"
      ? "Composez *144*4*6*{amount}# pour obtenir votre code de paiement Orange Money."
      : "")).replaceAll("{amount}", providerTotal.toFixed(2))
    : "";
  return {
    available: true, network, direction, sourceAmount: input.amount, sourceCurrency: input.currency,
    providerAmount, providerCurrency, providerFee, providerTotal,
    otpRequired,
    otpInstructions,
  };
}
