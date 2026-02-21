import axios from "axios";
import crypto from "crypto";

const SENDAVAPAY_BASE_URL = "https://sendavapay.com";
const SENDAVAPAY_API_KEY = process.env.SENDAVAPAY_API_KEY || "";
const SENDAVAPAY_API_SECRET = process.env.SENDAVAPAY_API_SECRET || "";

export interface CreatePaymentParams {
  amount: number;
  currency?: string;
  description?: string;
  externalReference?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    paymentUrl: string;
    createdAt: string;
  };
}

export interface VerifyResponse {
  success: boolean;
  data: {
    reference: string;
    externalReference?: string;
    amount: string;
    fee?: string;
    currency: string;
    status: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    paymentMethod?: string;
    createdAt: string;
    completedAt?: string;
  };
}

export interface CreditAccountParams {
  phone: string;
  amount: number;
  description?: string;
  externalReference?: string;
}

export interface CreditResponse {
  success: boolean;
  data: {
    reference: string;
    amount: number;
    phone: string;
    userName?: string;
    status: string;
    createdAt: string;
  };
}

export interface BalanceResponse {
  success: boolean;
  data: {
    phone: string;
    balance: string;
    currency: string;
    name: string;
    isVerified: boolean;
  };
}

export interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: any[];
    total: number;
  };
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SENDAVAPAY_API_KEY}`,
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
      };
      if (params.currency) payload.currency = params.currency;
      if (params.description) payload.description = params.description;
      if (params.externalReference) payload.externalReference = params.externalReference;
      if (params.customerEmail) payload.customerEmail = params.customerEmail;
      if (params.customerPhone) payload.customerPhone = params.customerPhone;
      if (params.customerName) payload.customerName = params.customerName;
      if (params.redirectUrl) payload.redirectUrl = params.redirectUrl;
      if (params.metadata) payload.metadata = params.metadata;

      const url = `${SENDAVAPAY_BASE_URL}/api/v1/create-payment`;
      console.log("SendavaPay createPayment request:", { url, payload: { ...payload, customerPhone: payload.customerPhone ? payload.customerPhone.substring(0, 6) + "***" : undefined } });
      const response = await axios.post(url, payload, { headers: getAuthHeaders() });
      console.log("SendavaPay createPayment response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay createPayment error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Echec de la creation du paiement";
      throw new Error(errorMsg);
    }
  }

  async verifyPayment(reference: string): Promise<VerifyResponse> {
    try {
      const payload = { reference };
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/api/v1/verify-payment`,
        payload,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay verifyPayment error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.response?.data?.message || "Echec de la verification");
    }
  }

  async creditAccount(params: CreditAccountParams): Promise<CreditResponse> {
    try {
      const payload: any = {
        phone: params.phone,
        amount: params.amount,
      };
      if (params.description) payload.description = params.description;
      if (params.externalReference) payload.externalReference = params.externalReference;

      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/api/v1/credit-account`,
        payload,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay creditAccount error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.response?.data?.message || "Echec du retrait");
    }
  }

  async getBalance(phone: string): Promise<BalanceResponse> {
    try {
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/api/v1/balance?phone=${encodeURIComponent(phone)}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getBalance error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.response?.data?.message || "Echec de recuperation du solde");
    }
  }

  async getTransactions(): Promise<TransactionsResponse> {
    try {
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/api/v1/transactions`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getTransactions error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.error || error.response?.data?.message || "Echec de recuperation des transactions");
    }
  }
}

export function isApiKeyConfigured(): boolean {
  return !!SENDAVAPAY_API_KEY;
}

export const sendavaPayService = new SendavaPayService();
