import axios from "axios";
import crypto from "crypto";

const SENDAVAPAY_BASE_URL = "https://sendavapay.com";
const SENDAVAPAY_API_KEY = process.env.SENDAVAPAY_API_KEY || "";
const SENDAVAPAY_API_SECRET = process.env.SENDAVAPAY_API_SECRET || "";

export interface CreatePaymentParams {
  amount: number;
  phoneNumber: string;
  operator: string;
  country: string;
  customerName?: string;
  description?: string;
  callbackUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  status: string;
  txid: string;
  reference: string;
  amount: string;
  fee: string;
  currency: string;
  message: string;
}

export interface VerifyResponse {
  success: boolean;
  status: string;
  txid?: string;
  reference: string;
  amount?: string;
  fee?: string;
  currency?: string;
  message?: string;
}

export interface WithdrawParams {
  amount: number;
  phoneNumber: string;
  operator: string;
  country: string;
}

export interface WithdrawResponse {
  success: boolean;
  status: string;
  txid: string;
  reference: string;
  amount: string;
  fee: string;
  currency: string;
  message: string;
}

export interface BalanceResponse {
  success: boolean;
  balance: string;
  currency: string;
}

export interface TransactionsResponse {
  success: boolean;
  transactions: any[];
}

function generateSignature(payload: any): string {
  return crypto
    .createHmac("sha256", SENDAVAPAY_API_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
}

function getAuthHeaders(payload: any) {
  return {
    "Content-Type": "application/json",
    "x-api-key": SENDAVAPAY_API_KEY,
    "x-signature": generateSignature(payload),
  };
}

export function verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return signature === expectedSignature;
}

class SendavaPayService {
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      const payload: any = {
        amount: params.amount,
        phoneNumber: params.phoneNumber,
        operator: params.operator,
        country: params.country,
      };
      if (params.customerName) payload.customerName = params.customerName;
      if (params.description) payload.description = params.description;
      if (params.callbackUrl) payload.callbackUrl = params.callbackUrl;

      const url = `${SENDAVAPAY_BASE_URL}/api/sdk/payment`;
      console.log("SendavaPay createPayment request:", { url, payload: { ...payload, phoneNumber: payload.phoneNumber?.substring(0, 6) + "***" } });
      const response = await axios.post(url, payload, { headers: getAuthHeaders(payload) });
      console.log("SendavaPay createPayment response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay createPayment error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Echec de la creation du paiement";
      throw new Error(errorMsg);
    }
  }

  async verifyPayment(reference: string): Promise<VerifyResponse> {
    try {
      const payload = { reference };
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/api/sdk/verify`,
        payload,
        { headers: getAuthHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay verifyPayment error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.response?.data?.error || "Echec de la verification");
    }
  }

  async createWithdraw(params: WithdrawParams): Promise<WithdrawResponse> {
    try {
      const payload: any = {
        amount: params.amount,
        phoneNumber: params.phoneNumber,
        operator: params.operator,
        country: params.country,
      };

      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/api/sdk/withdraw`,
        payload,
        { headers: getAuthHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay withdraw error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.response?.data?.error || "Echec du retrait");
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const payload = {};
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/api/sdk/balance`,
        { headers: getAuthHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getBalance error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.response?.data?.error || "Echec de recuperation du solde");
    }
  }

  async getTransactions(): Promise<TransactionsResponse> {
    try {
      const payload = {};
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/api/sdk/transactions`,
        { headers: getAuthHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getTransactions error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.response?.data?.error || "Echec de recuperation des transactions");
    }
  }

  async waitForPayment(reference: string, maxAttempts = 60, intervalMs = 5000): Promise<VerifyResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.verifyPayment(reference);
      if (result.status === "SUCCESS" || result.status === "FAILED" || result.status === "CANCELLED") {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error("Timeout en attendant la confirmation du paiement");
  }
}

export function isApiKeyConfigured(): boolean {
  return !!SENDAVAPAY_API_KEY && !!SENDAVAPAY_API_SECRET;
}

export const sendavaPayService = new SendavaPayService();
