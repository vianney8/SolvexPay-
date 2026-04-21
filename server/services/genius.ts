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
  apiKey: string;
  webhookSecret: string;
  baseUrl?: string;
}

export interface GeniusWebhookPayload {
  event: string;
  reference: string;
  amount?: number | string;
  net_amount?: number | string;
  fees?: number | string;
  currency?: string;
  status?: string;
  msisdn?: string;
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

export class GeniusPayService {
  private client: AxiosInstance;
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor(config: GeniusConfig) {
    this.apiKey = config.apiKey || "";
    this.webhookSecret = config.webhookSecret || "";
    this.baseUrl = (config.baseUrl || DEFAULT_GENIUS_BASE_URL).replace(/\/$/, "");
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 60000,
    });
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getCallbackKey(): string {
    return this.webhookSecret;
  }

  /**
   * Crée un paiement (dépôt). Retourne une réponse normalisée au format OmniPay
   * pour rester compatible avec les routes existantes.
   */
  async deposit(params: OmniPayDepositParams): Promise<OmniPayDepositResponse> {
    const body = {
      amount: params.amount,
      currency: "XOF",
      description: undefined as string | undefined,
      reference: params.reference,
      customer: {
        phone: normalizePhoneIntl(params.msisdn),
        first_name: params.firstName,
        last_name: params.lastName,
      },
      operator: params.operator,
      callback_url: params.callbackUrl,
      return_url: params.returnUrl,
      metadata: { reference: params.reference },
    };

    console.log("GeniusPay deposit request:", {
      ...body,
      customer: { ...body.customer, phone: params.msisdn.substring(0, 6) + "***" },
    });

    try {
      const { data } = await this.client.post("/merchant/payments", body);
      console.log("GeniusPay deposit response:", data);
      return {
        success: 1,
        id: data?.id ?? data?.reference ?? params.reference,
        reference: data?.reference ?? params.reference,
        payment_url: data?.payment_url ?? data?.checkout_url ?? data?.url,
        amount: Number(data?.amount ?? params.amount),
        fees: Number(data?.fees ?? 0),
        message: data?.message,
      };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Erreur GeniusPay";
      throw new Error(`GeniusPay: ${msg}`);
    }
  }

  /**
   * Crée un payout (retrait/transfert).
   */
  async transfer(params: OmniPayTransferParams): Promise<OmniPayTransferResponse> {
    const body = {
      amount: params.amount,
      currency: "XOF",
      reference: params.reference,
      beneficiary: {
        phone: normalizePhoneIntl(params.msisdn),
        name: `${params.firstName} ${params.lastName}`.trim(),
      },
      operator: params.operator,
    };

    try {
      const { data } = await this.client.post("/merchant/payouts", body);
      console.log("GeniusPay payout response:", data);
      return {
        success: 1,
        id: data?.id ?? data?.reference ?? params.reference,
        reference: data?.reference ?? params.reference,
        amount: Number(data?.amount ?? params.amount),
        fees: Number(data?.fees ?? 0),
        currency: data?.currency || "XOF",
        message: data?.message,
      };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Erreur GeniusPay";
      throw new Error(`GeniusPay: ${msg}`);
    }
  }

  async getStatus(reference: string): Promise<OmniPayStatusResponse> {
    // Tente d'abord paiement, puis payout si non trouvé
    let data: any = null;
    try {
      const r = await this.client.get(`/merchant/payments/${encodeURIComponent(reference)}`);
      data = r.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const r = await this.client.get(`/merchant/payouts/${encodeURIComponent(reference)}`);
        data = r.data;
      } else {
        const msg = err?.response?.data?.message || err?.message || "Erreur GeniusPay";
        throw new Error(`GeniusPay: ${msg}`);
      }
    }

    return {
      success: 1,
      id: data?.id,
      status: geniusStatusToOmniNumeric(data?.status),
      reference: data?.reference || reference,
      amount: Number(data?.amount ?? 0),
      fees: Number(data?.fees ?? 0),
      message: data?.message || data?.status,
    };
  }

  async getBalance(): Promise<OmniPayBalanceResponse> {
    try {
      const { data } = await this.client.get("/merchant/wallets");
      const wallets = Array.isArray(data) ? data : data?.wallets || (data ? [data] : []);
      return {
        success: 1,
        balance: wallets.map((w: any) => ({
          countryName: w.country_name || w.country || "Côte d'Ivoire",
          countryCode: w.country_code || "CI",
          amount: Number(w.available_balance ?? w.balance ?? 0),
          pending: Number(w.pending_balance ?? 0),
          currency: w.currency || "XOF",
        })),
      };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Erreur GeniusPay";
      throw new Error(`GeniusPay: ${msg}`);
    }
  }

  /**
   * Vérifie la signature HMAC-SHA256 d'un webhook GeniusPay.
   * Header attendu: X-Webhook-Signature  ; Timestamp dans X-Webhook-Timestamp
   * Formula: HMAC-SHA256(timestamp + "." + rawBody, secret)
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

export function geniusStatusFromPayload(payload: GeniusWebhookPayload): "pending" | "completed" | "failed" {
  const ev = (payload.event || "").toLowerCase();
  const st = (payload.status || "").toLowerCase();
  if (ev.includes("completed") || ev.includes("success") || st === "completed" || st === "success") return "completed";
  if (ev.includes("failed") || ev.includes("cancel") || ev.includes("expired") || st === "failed" || st === "cancelled" || st === "expired") return "failed";
  return "pending";
}
