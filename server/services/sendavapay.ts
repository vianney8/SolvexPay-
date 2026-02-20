import axios from "axios";
import crypto from "crypto";

const SENDAVAPAY_BASE_URL = "https://sendavapay.com/api/v1";
const SENDAVAPAY_API_KEY = process.env.SENDAVAPAY_API_KEY || "";

export interface SendavaPaymentParams {
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

export interface SendavaCreditParams {
  phone: string;
  amount: number;
  description?: string;
  externalReference?: string;
}

export interface SendavaPaymentResponse {
  success: boolean;
  data?: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    paymentUrl: string;
    createdAt: string;
  };
  message?: string;
}

export interface SendavaVerifyResponse {
  success: boolean;
  data?: {
    reference: string;
    externalReference?: string;
    amount: string;
    fee: string;
    currency: string;
    status: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    paymentMethod?: string;
    createdAt: string;
    completedAt?: string;
  };
  message?: string;
}

export interface SendavaCreditResponse {
  success: boolean;
  data?: {
    reference: string;
    amount: number;
    phone: string;
    userName: string;
    status: string;
    createdAt: string;
  };
  message?: string;
}

export interface SendavaBalanceResponse {
  success: boolean;
  data?: {
    phone: string;
    balance: string;
    currency: string;
    name: string;
    isVerified: boolean;
  };
  message?: string;
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
  async createPayment(params: SendavaPaymentParams): Promise<SendavaPaymentResponse> {
    try {
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/create-payment`,
        params,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay createPayment error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Echec de la creation du paiement");
    }
  }

  async verifyPayment(reference: string): Promise<SendavaVerifyResponse> {
    try {
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/verify-payment`,
        { reference },
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay verifyPayment error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Echec de la verification");
    }
  }

  async creditAccount(params: SendavaCreditParams): Promise<SendavaCreditResponse> {
    try {
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/credit-account`,
        params,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay creditAccount error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Echec du credit");
    }
  }

  async getBalance(phone: string): Promise<SendavaBalanceResponse> {
    try {
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/balance?phone=${encodeURIComponent(phone)}`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getBalance error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Echec de recuperation du solde");
    }
  }

  async getTransactions(): Promise<any> {
    try {
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/transactions`,
        { headers: getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getTransactions error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Echec de recuperation des transactions");
    }
  }
}

export function isApiKeyConfigured(): boolean {
  return !!SENDAVAPAY_API_KEY;
}

export const sendavaPayService = new SendavaPayService();
