import axios from "axios";
import crypto from "crypto";

const SENDAVAPAY_BASE_URL = process.env.SENDAVAPAY_BASE_URL || "https://sendavapay.com";
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

export interface CreateWithdrawParams {
  amount: number;
  phoneNumber: string;
  operator: string;
  country: string;
}

export interface PaymentResponse {
  success: boolean;
  status: string;
  reference: string;
  message?: string;
}

export interface VerifyResponse {
  success: boolean;
  status: string;
  reference: string;
  amount?: number;
  fee?: number;
  phoneNumber?: string;
  operator?: string;
  country?: string;
  completedAt?: string;
  message?: string;
}

export interface WithdrawResponse {
  success: boolean;
  status: string;
  reference: string;
  message?: string;
}

export interface BalanceResponse {
  success: boolean;
  balance: number;
  currency: string;
  message?: string;
}

export interface TransactionsResponse {
  success: boolean;
  transactions: any[];
  total: number;
  message?: string;
}

function generateSignature(payload: any): string {
  return crypto
    .createHmac("sha256", SENDAVAPAY_API_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
}

function getSignedHeaders(payload: any) {
  return {
    "Content-Type": "application/json",
    "x-api-key": SENDAVAPAY_API_KEY,
    "x-signature": generateSignature(payload),
  };
}

function getSignedHeadersGet() {
  return {
    "Content-Type": "application/json",
    "x-api-key": SENDAVAPAY_API_KEY,
    "x-signature": generateSignature({}),
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
      const payload = {
        amount: params.amount,
        phoneNumber: params.phoneNumber,
        operator: params.operator,
        country: params.country,
        customerName: params.customerName || "",
        description: params.description || "",
        callbackUrl: params.callbackUrl || "",
      };
      const url = `${SENDAVAPAY_BASE_URL}/api/v1/create-payment`;
      console.log("SendavaPay createPayment request:", { url, payload: { ...payload, phoneNumber: payload.phoneNumber.substring(0, 6) + "***" } });
      const response = await axios.post(url, payload, { headers: getSignedHeaders(payload) });
      console.log("SendavaPay createPayment response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay createPayment error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: `${SENDAVAPAY_BASE_URL}/api/v1/create-payment`,
      });
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || "Echec de la creation du paiement";
      throw new Error(errorMsg);
    }
  }

  async verifyPayment(reference: string): Promise<VerifyResponse> {
    try {
      const payload = { reference };
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/api/v1/verify-payment`,
        payload,
        { headers: getSignedHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay verifyPayment error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Echec de la verification");
    }
  }

  async createWithdraw(params: CreateWithdrawParams): Promise<WithdrawResponse> {
    try {
      const payload = {
        amount: params.amount,
        phoneNumber: params.phoneNumber,
        operator: params.operator,
        country: params.country,
      };
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/api/v1/credit-account`,
        payload,
        { headers: getSignedHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay createWithdraw error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Echec du retrait");
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/api/v1/balance`,
        { headers: getSignedHeadersGet() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getBalance error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Echec de recuperation du solde");
    }
  }

  async getTransactions(): Promise<TransactionsResponse> {
    try {
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/api/v1/transactions`,
        { headers: getSignedHeadersGet() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getTransactions error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Echec de recuperation des transactions");
    }
  }

  async waitForPayment(reference: string, timeoutMs: number = 120000, intervalMs: number = 5000): Promise<VerifyResponse> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.verifyPayment(reference);
      if (result.status === "SUCCESS" || result.status === "FAILED" || result.status === "CANCELLED") {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error("Timeout: le paiement n'a pas ete confirme dans le delai imparti");
  }
}

export function isApiKeyConfigured(): boolean {
  return !!SENDAVAPAY_API_KEY && !!SENDAVAPAY_API_SECRET;
}

export const sendavaPayService = new SendavaPayService();
