import { AlphaPayClient } from "alphapay-node";
import crypto from "node:crypto";
import { normalizeCountry } from "./alphapayCatalog";

export type PaymentState = "pending" | "completed" | "failed";
export function alphapayStatusToString(status: unknown): PaymentState {
  const value = String(status ?? "").toUpperCase();
  if (["SUCCESS", "SUCCEEDED", "COMPLETED", "PAID"].includes(value)) return "completed";
  if (["FAILED", "CANCELLED", "CANCELED", "EXPIRED", "REJECTED"].includes(value)) return "failed";
  return "pending";
}

export function verifyAlphaPaySignature(rawBody: Buffer, signature: string, timestamp: string, secret: string, now = Date.now()): boolean {
  if (!secret || !/^\d+$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

const NETWORKS: Record<string, Record<string, string>> = {
  MTN: { BJ: "mtn_bj", CI: "mtn_ci", CM: "mtn_cm" },
  MOOV: { BJ: "moov_bj", CI: "moov_ci", BF: "moov_bf", ML: "moov_ml", TG: "moov_tg" },
  ORANGE: { CI: "orange_ci", BF: "orange_bf", ML: "orange_ml", CM: "orange_cm", SN: "orange_sn", CD: "orange_cd" },
  WAVE: { CI: "wave_ci", SN: "wave_sn" },
  FREE: { SN: "freemoney_sn" }, MIXX: { SN: "freemoney_sn" },
  TMONEY: { TG: "togocel" }, TOGOCEL: { TG: "togocel" },
  VODACOM: { CD: "vodacom_cd" }, AIRTEL: { CD: "airtel_cd" },
};

export function getAlphaPayNetwork(operator: string, country: string): string {
  const iso = normalizeCountry(country);
  const exact = operator.toLowerCase();
  if (/^[a-z][a-z0-9_]*$/.test(exact) && (exact.includes("_") || ["togocel", "card", "crypto"].includes(exact))) return exact;
  const mapped = NETWORKS[operator.toUpperCase()]?.[iso];
  if (!mapped) throw new Error("Utilisez le code réseau exact retourné par le catalogue AlphaPay.");
  return mapped;
}

export interface PaymentParams {
  msisdn: string;
  amount: number;
  reference: string;
  firstName: string;
  lastName: string;
  operator?: string;
  country?: string;
  currency?: string;
  email?: string;
  otp?: string;
  returnUrl?: string;
  callbackUrl?: string;
  checkout?: boolean;
  directOnly?: boolean;
  /** Server-owned immutable quote; never read from a public request body. */
  walletRate?: number;
}

export interface PaymentResponse {
  success: number;
  id?: string;
  reference?: string;
  status?: string;
  message?: string;
  payment_url?: string;
  kind?: "payment" | "payout" | "checkout";
  requires_redirect?: boolean;
  instructions?: string;
}

export const DIRECT_PAYMENT_UNAVAILABLE = "Cet opérateur exige une page externe pour cette tentative. Le paiement n’est pas disponible sans redirection. Aucune page externe ne sera ouverte ; conservez la référence pour vérifier son statut.";

/** Preserve the provider receipt for reconciliation, but never offer external navigation. */
export function directPaymentResponse(receipt: PaymentResponse): PaymentResponse {
  const requiresRedirect = !!receipt.payment_url || receipt.requires_redirect === true || receipt.kind === "checkout";
  const { payment_url: _externalUrl, ...safe } = receipt;
  return {
    ...safe, requires_redirect: requiresRedirect,
    ...(requiresRedirect ? { message: DIRECT_PAYMENT_UNAVAILABLE, instructions: undefined } : {}),
  };
}

export class AlphaPayService {
  private client: AlphaPayClient;
  constructor(apiKey = process.env.ALPHAPAY_SECRET_KEY || "", client?: AlphaPayClient) {
    this.client = client || new AlphaPayClient({
      apiKey, timeout: 20_000, maxRetries: 0,
    });
  }

  async request(method: "get" | "post", path: string, body?: unknown, reference?: string): Promise<any> {
    try {
      return await this.client.http.request(method === "post" ? "POST" : "GET", path, {
        body, idempotencyKey: reference,
      });
    } catch (error: any) {
      // Do not propagate Axios errors: they contain Authorization headers.
      const status = Number(error.status);
      const definitive = [400, 401, 403, 404, 422].includes(status);
      const safeError = new Error(definitive
        ? "AlphaPay a refusé la demande. Vérifiez les autorisations, le réseau, les fonds et les données du bénéficiaire."
        : "AlphaPay n’a pas confirmé la demande. Elle reste en attente de rapprochement ; ne la renvoyez pas avec une nouvelle référence.");
      Object.assign(safeError, { code: definitive ? "ALPHAPAY_REJECTED" : "ALPHAPAY_UNCERTAIN", status });
      throw safeError;
    }
  }

  async deposit(params: PaymentParams): Promise<PaymentResponse> {
    const { country, currency, network } = this.context(params);
    const customer = { phone: params.msisdn, email: params.email, first_name: params.firstName, last_name: params.lastName };
    const common = {
      amount: String(params.amount), currency, country,
      description: `SolvexPay ${params.reference}`,
      metadata: { solvexpay_reference: params.reference },
      fee_charge_mode: "ADD_ON",
      return_url: params.returnUrl,
    };
    let result: any;
    const checkout = params.checkout === true && params.directOnly !== true;
    if (checkout) {
      if (!params.email) throw new Error("L’adresse email du payeur est requise pour le checkout AlphaPay.");
      result = await this.request("post", "/checkout-sessions/", {
        ...common, customer_email: params.email,
        customer_name: `${params.firstName} ${params.lastName}`.trim(),
        customer_phone: params.msisdn,
      }, params.reference);
    } else {
      result = await this.request("post", "/payments/softpay/", {
        ...common, customer, network, ...(params.otp ? { otp: params.otp } : {}),
      }, params.reference);
    }
    if (!result.id) throw Object.assign(new Error("Réponse AlphaPay incomplète : rapprochement nécessaire."), { code: "ALPHAPAY_UNCERTAIN" });
    const url = result.checkout_url || "";
    if (url) {
      const target = new URL(url);
      if (target.protocol !== "https:") throw new Error("URL de paiement AlphaPay invalide.");
    }
    const response: PaymentResponse = {
      success: 1, id: result.id, status: result.status, reference: params.reference,
      payment_url: url, kind: checkout ? "checkout" : "payment",
      instructions: typeof result.instructions === "string" ? result.instructions.slice(0, 2000) : undefined,
      requires_redirect: !!url,
    };
    return params.directOnly ? directPaymentResponse(response) : response;
  }

  async transfer(params: PaymentParams): Promise<PaymentResponse> {
    const { country, currency, network } = this.context(params);
    const result = await this.request("post", "/payouts/initialize/", {
      amount: String(params.amount), currency, country, method: network,
      customer: { phone: params.msisdn, email: params.email, first_name: params.firstName, last_name: params.lastName },
      recipient: { msisdn: params.msisdn },
      description: `SolvexPay ${params.reference}`,
      metadata: { solvexpay_reference: params.reference }, fee_charge_mode: "ADD_ON",
    }, params.reference);
    if (!result.id) throw Object.assign(new Error("Réponse AlphaPay incomplète : rapprochement nécessaire."), { code: "ALPHAPAY_UNCERTAIN" });
    return { success: 1, id: result.id, status: result.status, reference: params.reference, kind: "payout" };
  }

  context(params: PaymentParams) {
    const network = params.operator || "";
    const suffix = network === "togocel" ? "tg" : network.split("_").at(-1);
    const country = normalizeCountry(params.country || suffix || "");
    const special = network === "togocel" && country === "TG"
      || ["card", "crypto"].includes(network) && country === "XX"
      || /^(airtel|orange|vodacom)_cd_usd$/.test(network) && country === "XC";
    if (!/^[a-z][a-z0-9_]*$/.test(network) || (!special && !network.endsWith(`_${country.toLowerCase()}`))) {
      throw new Error("Réseau AlphaPay non pris en charge pour ce pays.");
    }
    const localCurrency = ({ CM: "XAF", CG: "XAF", GA: "XAF", CD: "CDF", GH: "GHS", GN: "GNF", KE: "KES", MW: "MWK", NG: "NGN", RW: "RWF", TZ: "TZS", UG: "UGX", ZM: "ZMW", SL: "SLE", XC: "USD", XX: "USD", ET: "ETB", LS: "LSL", MZ: "MZN", IN: "INR", US: "USD" } as Record<string, string>)[country] || "XOF";
    const currency = params.currency || localCurrency;
    if (currency !== localCurrency) throw new Error("La devise du paiement doit correspondre au pays sélectionné.");
    if (!Number.isSafeInteger(params.amount) || params.amount <= 0 || params.amount > 1_000_000_000) throw new Error("Montant entier invalide ou trop élevé.");
    if (!params.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email)) throw new Error("Une adresse email valide du client est requise par AlphaPay.");
    return { country, currency, network };
  }

  async verify(id: string, kind: "payment" | "payout" | "checkout"): Promise<any> {
    if (kind === "checkout") {
      const session = await this.request("get", `/checkout-sessions/${encodeURIComponent(id)}/status/`);
      if (session.transaction_id) return this.verify(session.transaction_id, "payment");
      return { status: session.status, sessionOnly: true };
    }
    return this.request("get", `/${kind === "payout" ? "payouts" : "payments"}/${encodeURIComponent(id)}/verify/`);
  }

  async getBalance() {
    const balances: any[] = [];
    for (let page = 1; page <= 20; page++) {
      const result = await this.request("get", `/merchant-balances/?page_size=100&page=${page}`);
      for (const balance of result.results || []) balances.push({
        countryName: balance.country, countryCode: balance.country,
        amount: Number(balance.available_amount), pending: Number(balance.pending_amount),
        currency: balance.currency,
      });
      if (!result.next) return { success: 1, balance: balances };
    }
    throw new Error("Pagination des soldes AlphaPay trop importante.");
  }
}
