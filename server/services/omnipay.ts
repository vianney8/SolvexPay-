import axios from "axios";
import crypto from "crypto";

const OMNIPAY_BASE_URL = "https://omnipay.webtechci.com/interface/api2";
const OMNIPAY_API_KEY = process.env.OMNIPAY_API_KEY || "";
const OMNIPAY_CALLBACK_KEY = process.env.OMNIPAY_CALLBACK_KEY || "";

export interface OmniPayDepositParams {
  msisdn: string;
  amount: number;
  reference: string;
  firstName: string;
  lastName: string;
  otp?: string;
  operator?: string;
  returnUrl?: string;
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
  id?: number;
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
  id?: number;
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
  id?: number;
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

class OmniPayService {
  async deposit(params: OmniPayDepositParams): Promise<OmniPayDepositResponse> {
    const body: any = {
      action: "paymentrequest",
      apikey: OMNIPAY_API_KEY,
      msisdn: normalizeMsisdn(params.msisdn),
      amount: String(params.amount),
      reference: params.reference,
      first_name: params.firstName,
      last_name: params.lastName,
    };

    if (params.otp) body.otp = params.otp;
    if (params.operator) body.operator = params.operator.toLowerCase();
    if (params.returnUrl) body.return_url = params.returnUrl;

    console.log("OmniPay deposit request:", {
      ...body,
      apikey: "[REDACTED]",
      msisdn: params.msisdn.substring(0, 6) + "***",
    });

    const response = await axios.post<OmniPayDepositResponse>(OMNIPAY_BASE_URL, body, {
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
      apikey: OMNIPAY_API_KEY,
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

    const response = await axios.post<OmniPayTransferResponse>(OMNIPAY_BASE_URL, body, {
      headers: { "Content-Type": "application/json" },
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
      apikey: OMNIPAY_API_KEY,
      reference,
    };

    const response = await axios.post<OmniPayStatusResponse>(OMNIPAY_BASE_URL, body, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.data.success !== 1) {
      throw new Error(response.data.message || `Erreur OmniPay code ${response.data.code}`);
    }

    return response.data;
  }

  async getBalance(): Promise<OmniPayBalanceResponse> {
    const body = {
      action: "getbalance",
      apikey: OMNIPAY_API_KEY,
    };

    const response = await axios.post<OmniPayBalanceResponse>(OMNIPAY_BASE_URL, body, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.data.success !== 1) {
      throw new Error(response.data.message || `Erreur OmniPay code ${response.data.code}`);
    }

    return response.data;
  }

  getCallbackKey(): string {
    return OMNIPAY_CALLBACK_KEY;
  }
}

export function isApiKeyConfigured(): boolean {
  return !!OMNIPAY_API_KEY;
}

export const omniPayService = new OmniPayService();
