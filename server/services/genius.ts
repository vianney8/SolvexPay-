import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import type {
  OmniPayDepositParams,
  OmniPayTransferParams,
  OmniPayDepositResponse,
  OmniPayTransferResponse,
  OmniPayStatusResponse,
  OmniPayBalanceResponse,
} from "./omnipay";

const DEFAULT_GENIUS_BASE_URL = "https://pay.genius.ci/api/v1";

export interface GeniusConfig {
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  baseUrl?: string;
}

export interface GeniusWebhookPayload {
  event?: string;
  reference?: string;
  amount?: number | string;
  net_amount?: number | string;
  fees?: number | string;
  currency?: string;
  status?: string;
  msisdn?: string;
  metadata?: Record<string, any>;
  data?: any;
  timestamp?: string;
  [key: string]: any;
}

function geniusStatusToOmniNumeric(status?: string): number {
  const s = (status || "").toLowerCase();
  if (s === "completed" || s === "success" || s === "successful" || s === "paid") return 3;
  if (s === "failed" || s === "cancelled" || s === "canceled" || s === "expired" || s === "rejected") return 4;
  return 2;
}

function normalizePhoneIntl(msisdn: string): string {
  const cleaned = msisdn.replace(/^\+/, "").replace(/^00/, "");
  return `+${cleaned}`;
}

const COUNTRY_3LETTER: Record<string, string> = {
  CI: "CIV", SN: "SEN", BJ: "BEN", BF: "BFA", ML: "MLI",
  TG: "TGO", CM: "CMR", COD: "COD", COG: "COG", GA: "GAB",
};

function toGenius3Letter(country: string): string {
  const up = (country || "").toUpperCase();
  if (up.length === 3) return up;
  return COUNTRY_3LETTER[up] || up;
}

interface GeniusMethod {
  payment_method: string;
  mmo_provider?: string;
}

/**
 * Convertit un opérateur OmniPay (ex: "wave", "moov_benin", "orange_sn", "mtn")
 * en couple { payment_method, mmo_provider } compris par GeniusPay.
 */
function operatorToGeniusMethod(operator: string, country: string): GeniusMethod {
  const op = (operator || "").toLowerCase();
  const co3 = toGenius3Letter(country);

  if (op === "wave" || op.startsWith("wave")) {
    return { payment_method: "wave", mmo_provider: `WAVE_${co3}` };
  }

  let prefix: string | null = null;
  if (op.startsWith("orange")) prefix = "ORANGE";
  else if (op.startsWith("mtn") || op === "momo") prefix = "MTN_MOMO";
  else if (op.startsWith("moov")) prefix = "MOOV";
  else if (op.startsWith("free") || op === "mixx") prefix = "FREE";
  else if (op.startsWith("airtel")) prefix = "AIRTEL";
  else if (op.startsWith("tmoney")) prefix = "TMONEY";
  else if (op === "mpesa" || op === "vodacom") prefix = "MPESA";
  else prefix = op.toUpperCase();

  return { payment_method: "pawapay", mmo_provider: `${prefix}_${co3}` };
}

export class GeniusPayService {
  private client: AxiosInstance;
  private publicKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor(config: GeniusConfig) {
    this.publicKey = config.publicKey || "";
    this.secretKey = config.secretKey || "";
    this.webhookSecret = config.webhookSecret || "";
    this.baseUrl = (config.baseUrl || DEFAULT_GENIUS_BASE_URL).replace(/\/$/, "");
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "X-API-Key": this.publicKey,
        "X-API-Secret": this.secretKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 60000,
    });
  }

  isConfigured(): boolean {
    return !!this.publicKey && !!this.secretKey;
  }

  getCallbackKey(): string {
    return this.webhookSecret;
  }

  async deposit(params: OmniPayDepositParams): Promise<OmniPayDepositResponse> {
    const country = inferCountryFromPhone(params.msisdn) || "CI";
    const method = operatorToGeniusMethod(params.operator || "", country);

    const body: any = {
      amount: params.amount,
      currency: "XOF",
      payment_method: method.payment_method,
      mmo_provider: method.mmo_provider,
      reference: params.reference,
      description: `Dépôt ${params.reference}`,
      customer: {
        phone: normalizePhoneIntl(params.msisdn),
        first_name: params.firstName || "Client",
        last_name: params.lastName || "SolvexPay",
      },
      callback_url: params.callbackUrl,
      return_url: params.returnUrl,
      metadata: { merchant_reference: params.reference },
    };

    console.log("[GeniusPay] deposit request:", {
      ...body,
      customer: { ...body.customer, phone: params.msisdn.substring(0, 6) + "***" },
    });

    try {
      const { data } = await this.client.post("/merchant/payments", body);
      const d = data?.data || data;
      console.log("[GeniusPay] deposit response id/ref:", d?.id, d?.reference);
      return {
        success: 1,
        id: d?.reference || d?.id || params.reference,
        reference: d?.reference || params.reference,
        payment_url: d?.payment_url,
        amount: Number(d?.amount ?? params.amount),
        fees: Number(d?.fees ?? 0),
        message: data?.message,
      };
    } catch (err: any) {
      const r = err?.response?.data;
      const detailedMsg = r?.error?.message || r?.message || err?.message || "Erreur GeniusPay";
      const fieldErrors = r?.error?.errors ? JSON.stringify(r.error.errors) : "";
      throw new Error(`GeniusPay: ${detailedMsg}${fieldErrors ? " — " + fieldErrors : ""}`);
    }
  }

  async transfer(params: OmniPayTransferParams): Promise<OmniPayTransferResponse> {
    // Récupère le wallet par défaut (premier disponible)
    let walletId: number | string | null = null;
    try {
      const { data } = await this.client.get("/merchant/wallets");
      const wallets = data?.data?.wallets || data?.wallets || [];
      if (Array.isArray(wallets) && wallets.length > 0) {
        walletId = wallets[0]?.id ?? null;
      }
    } catch {}
    if (!walletId) {
      throw new Error("GeniusPay: aucun wallet disponible pour effectuer un retrait. Approvisionnez votre compte GeniusPay d'abord.");
    }

    const country = inferCountryFromPhone(params.msisdn) || "CI";
    const method = operatorToGeniusMethod(params.operator || "", country);

    const body: any = {
      wallet_id: walletId,
      amount: params.amount,
      currency: "XOF",
      reference: params.reference,
      recipient: {
        name: `${params.firstName || ""} ${params.lastName || ""}`.trim() || "Bénéficiaire",
      },
      destination: {
        type: "mobile_money",
        provider: method.mmo_provider || method.payment_method,
        account: normalizePhoneIntl(params.msisdn),
      },
      metadata: { merchant_reference: params.reference },
    };

    try {
      const { data } = await this.client.post("/merchant/payouts", body);
      const d = data?.data || data;
      return {
        success: 1,
        id: d?.reference || d?.id || params.reference,
        reference: d?.reference || params.reference,
        amount: Number(d?.amount ?? params.amount),
        fees: Number(d?.fees ?? 0),
        currency: d?.currency || "XOF",
        message: data?.message,
      };
    } catch (err: any) {
      const r = err?.response?.data;
      const detailedMsg = r?.error?.message || r?.message || err?.message || "Erreur GeniusPay";
      const fieldErrors = r?.error?.errors ? JSON.stringify(r.error.errors) : "";
      throw new Error(`GeniusPay: ${detailedMsg}${fieldErrors ? " — " + fieldErrors : ""}`);
    }
  }

  /**
   * Récupère le statut d'une transaction. La référence peut être :
   * - une référence GeniusPay (MTX-XXXX) => lookup direct
   * - une référence marchand (notre BDD) => fallback : recherche dans la liste par metadata.merchant_reference
   */
  async getStatus(reference: string): Promise<OmniPayStatusResponse> {
    let data: any = null;
    const tryFetch = async (ref: string): Promise<any | null> => {
      try {
        const r = await this.client.get(`/merchant/payments/${encodeURIComponent(ref)}`);
        return r.data?.data || r.data;
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    };

    data = await tryFetch(reference);
    if (!data) {
      // fallback payouts
      try {
        const r = await this.client.get(`/merchant/payouts/${encodeURIComponent(reference)}`);
        data = r.data?.data || r.data;
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          const msg = err?.response?.data?.error?.message || err?.message || "Erreur GeniusPay";
          throw new Error(`GeniusPay: ${msg}`);
        }
      }
    }
    if (!data) {
      // fallback : chercher dans la liste par metadata.merchant_reference
      try {
        const r = await this.client.get(`/merchant/payments`, { params: { search: reference, per_page: 20 } });
        const list: any[] = r.data?.data || [];
        data = list.find((p) => p?.metadata?.merchant_reference === reference || p?.reference === reference) || null;
      } catch {}
    }
    if (!data) {
      return { success: 0, status: 2, reference, amount: 0, fees: 0, message: "Transaction non trouvée chez GeniusPay" };
    }

    return {
      success: 1,
      id: data?.id ?? data?.reference,
      status: geniusStatusToOmniNumeric(data?.status),
      reference: data?.reference || reference,
      amount: Number(data?.amount ?? 0),
      fees: Number(data?.fees ?? 0),
      message: data?.status_message || data?.status,
    };
  }

  async getBalance(): Promise<OmniPayBalanceResponse> {
    try {
      const { data } = await this.client.get("/merchant/wallets");
      const wallets = data?.data?.wallets || data?.wallets || (Array.isArray(data) ? data : []);
      return {
        success: 1,
        balance: (wallets as any[]).map((w: any) => ({
          countryName: w.country_name || w.country || "Côte d'Ivoire",
          countryCode: w.country_code || "CI",
          amount: Number(w.available_balance ?? w.balance ?? 0),
          pending: Number(w.pending_balance ?? 0),
          currency: w.currency || "XOF",
        })),
      };
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Erreur GeniusPay";
      throw new Error(`GeniusPay: ${msg}`);
    }
  }

  /**
   * Vérifie HMAC-SHA256(timestamp + "." + rawBody, webhookSecret)
   * Headers: X-Webhook-Signature, X-Webhook-Timestamp
   */
  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean {
    if (!this.webhookSecret) return true;
    if (!signature) return false;
    const payloadToSign = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", this.webhookSecret).update(payloadToSign).digest("hex");
    try {
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}

function inferCountryFromPhone(msisdn: string): string | null {
  const p = (msisdn || "").replace(/\D/g, "");
  if (p.startsWith("225")) return "CI";
  if (p.startsWith("221")) return "SN";
  if (p.startsWith("229")) return "BJ";
  if (p.startsWith("226")) return "BF";
  if (p.startsWith("223")) return "ML";
  if (p.startsWith("228")) return "TG";
  if (p.startsWith("237")) return "CM";
  if (p.startsWith("243")) return "COD";
  if (p.startsWith("242")) return "COG";
  return null;
}

export function geniusStatusFromPayload(payload: GeniusWebhookPayload): "pending" | "completed" | "failed" {
  const inner = payload.data || payload;
  const ev = (payload.event || "").toLowerCase();
  const st = (inner.status || payload.status || "").toLowerCase();
  if (ev.includes("completed") || ev.includes("success") || st === "completed" || st === "success" || st === "paid") return "completed";
  if (ev.includes("failed") || ev.includes("cancel") || ev.includes("expired") || st === "failed" || st === "cancelled" || st === "expired" || st === "rejected") return "failed";
  return "pending";
}
