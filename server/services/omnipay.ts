import axios from "axios";
import crypto from "crypto";

const DEFAULT_OMNIPAY_BASE_URL = "https://omnipay.webtechci.com/interface/api2";

export interface OmniPayConfig {
  apiKey: string;
  callbackKey: string;
  baseUrl?: string;
}

export interface OmniPayDepositParams {
  msisdn: string;
  amount: number;
  reference: string;
  firstName: string;
  lastName: string;
  otp?: string;
  operator?: string;
  returnUrl?: string;
  callbackUrl?: string;
}

export interface OmniPayTransferParams {
  msisdn: string;
  amount: number;
  reference: string;
  firstName: string;
  lastName: string;
  operator?: string;
}

export interface OmniPayDepositResponse {
  success: number;
  code?: number;
  message?: string;
  id?: number | string;
  reference?: string;
  payment_url?: string;
  first_name?: string;
  last_name?: string;
  msisdn?: string;
  amount?: number;
  fees?: number;
  type?: string;
}

export interface OmniPayTransferResponse {
  success: number;
  code?: number;
  message?: string;
  id?: number | string;
  reference?: string;
  first_name?: string;
  last_name?: string;
  msisdn?: string;
  amount?: number;
  fees?: number;
  currency?: string;
  type?: string;
}

export interface OmniPayStatusResponse {
  success: number;
  code?: number;
  id?: number | string;
  status?: number;
  message?: string;
  reference?: string;
  msisdn?: string;
  amount?: number;
  fees?: number;
  type?: string;
  first_name?: string;
  last_name?: string;
}

export interface OmniPayBalanceResponse {
  success: number;
  code?: number;
  message?: string;
  balance?: Array<{
    countryName: string;
    countryCode: string;
    amount: number;
    pending?: number;
    currency: string;
  }>;
}

export interface OmniPayCallbackPayload {
  action: string;
  id: string;
  type: string;
  reference: string;
  first_name: string;
  last_name: string;
  msisdn: string;
  amount: string;
  fees: string;
  currency: string;
  status: string;
  message: string;
  signature?: string;
}

export function omnipayStatusToString(status: number): "pending" | "completed" | "failed" {
  if (status === 3) return "completed";
  if (status === 4) return "failed";
  return "pending";
}

export function omnipayStatusFromRaw(raw: unknown): "pending" | "completed" | "failed" {
  if (raw === null || raw === undefined) return "pending";
  const n = Number(raw);
  if (!isNaN(n)) return omnipayStatusToString(n);
  const s = String(raw).toLowerCase().trim();
  if (s === "3" || s === "completed" || s === "success" || s === "successful" || s === "confirmed") return "completed";
  if (s === "4" || s === "failed" || s === "fail" || s === "rejected" || s === "cancelled" || s === "expired") return "failed";
  return "pending";
}

export function verifyCallbackSignature(payload: OmniPayCallbackPayload, callbackKey: string): boolean {
  if (!callbackKey) return true;
  const { id, type, reference, msisdn, amount, fees, status, message } = payload;
  const concatenated = `${id}|${type}|${reference}|${msisdn}|${amount}|${fees}|${status}|${message}`;
  const expectedSignature = crypto
    .createHmac("sha3-512", callbackKey)
    .update(concatenated)
    .digest("hex");
  return expectedSignature === payload.signature;
}

function normalizeMsisdn(msisdn: string): string {
  return msisdn.replace(/^\+/, "").replace(/^00/, "");
}

export class OmniPayService {
  private apiKey: string;
  private callbackKey: string;
  private baseUrl: string;

  constructor(config: OmniPayConfig) {
    this.apiKey = config.apiKey || "";
    this.callbackKey = config.callbackKey || "";
    this.baseUrl = config.baseUrl || DEFAULT_OMNIPAY_BASE_URL;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getCallbackKey(): string {
    return this.callbackKey;
  }

  async deposit(params: OmniPayDepositParams): Promise<OmniPayDepositResponse> {
    const body: any = {
      action: "paymentrequest",
      apikey: this.apiKey,
      msisdn: normalizeMsisdn(params.msisdn),
      amount: String(params.amount),
      reference: params.reference,
      first_name: params.firstName,
      last_name: params.lastName,
    };

    if (params.otp) body.otp = params.otp;
    if (params.operator) body.operator = params.operator.toLowerCase();
    if (params.returnUrl) body.return_url = params.returnUrl;
    if (params.callbackUrl) body.callback_url = params.callbackUrl;

    console.log("OmniPay deposit request:", {
      ...body,
      apikey: "[REDACTED]",
      msisdn: params.msisdn.substring(0, 6) + "***",
    });

    const response = await axios.post<OmniPayDepositResponse>(this.baseUrl, body, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("OmniPay deposit response:", response.data);

    if (response.data.success !== 1) {
      throw new Error(response.data.message || `Erreur OmniPay code ${response.data.code}`);
    }

    return response.data;
  }

  async transfer(params: OmniPayTransferParams): Promise<OmniPayTransferResponse> {
    const body: any = {
      action: "transfer",
      apikey: this.apiKey,
      msisdn: normalizeMsisdn(params.msisdn),
      amount: String(params.amount),
      reference: params.reference,
      first_name: params.firstName,
      last_name: params.lastName,
    };

    if (params.operator) body.operator = params.operator.toLowerCase();

    console.log("OmniPay transfer request:", {
      ...body,
      apikey: "[REDACTED]",
      msisdn: params.msisdn.substring(0, 6) + "***",
    });

    const response = await axios.post<OmniPayTransferResponse>(this.baseUrl, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 90000,
    });

    console.log("OmniPay transfer response:", response.data);

    if (response.data.success !== 1) {
      throw new Error(response.data.message || `Erreur OmniPay code ${response.data.code}`);
    }

    return response.data;
  }

  async getStatus(reference: string): Promise<OmniPayStatusResponse> {
    const body = {
      action: "getstatus",
      apikey: this.apiKey,
      reference,
    };

    const response = await axios.post<OmniPayStatusResponse>(this.baseUrl, body, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.data.success !== 1) {
      const msg = (response.data.message || "").toLowerCase();
      if (msg.includes("successful") || msg.includes("success") || msg.includes("completed") || msg.includes("confirmé") || msg.includes("confirmed")) {
        return { ...response.data, success: 1, status: 3 };
      }
      if (msg.includes("pending") || msg.includes("validation") || msg.includes("en cours") || msg.includes("initiated")) {
        return { ...response.data, success: 1, status: 2 };
      }
      if (msg.includes("failed") || msg.includes("fail") || msg.includes("transaction failed") || msg.includes("cancel") || msg.includes("rejected") || msg.includes("expired")) {
        return { ...response.data, success: 1, status: 4 };
      }
      throw new Error(response.data.message || `Erreur OmniPay code ${response.data.code}`);
    }

    return response.data;
  }

  async getBalance(): Promise<OmniPayBalanceResponse> {
    const body = {
      action: "getbalance",
      apikey: this.apiKey,
    };

    const response = await axios.post<OmniPayBalanceResponse>(this.baseUrl, body, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.data.success !== 1) {
      throw new Error(response.data.message || `Erreur OmniPay code ${response.data.code}`);
    }

    return response.data;
  }
}
