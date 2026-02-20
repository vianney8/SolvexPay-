import axios from "axios";
import crypto from "crypto";

const SENDAVAPAY_BASE_URL = "https://sendavapay.com";
const SENDAVAPAY_API_KEY = process.env.SENDAVAPAY_API_KEY || "";
const SENDAVAPAY_API_SECRET = process.env.SENDAVAPAY_API_SECRET || "";

export interface SendavaPaymentParams {
  amount: number;
  phoneNumber: string;
  operator: string;
  country: string;
  customerName?: string;
  description?: string;
  callbackUrl?: string;
}

export interface SendavaWithdrawParams {
  amount: number;
  phoneNumber: string;
  operator: string;
  country: string;
}

export interface SendavaPayResponse {
  success: boolean;
  status: string;
  txid?: string;
  reference?: string;
  amount?: string;
  fee?: string;
  currency?: string;
  message?: string;
}

function signPayload(payload: Record<string, any>): string {
  return crypto
    .createHmac("sha256", SENDAVAPAY_API_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
}

function getHeaders(payload: Record<string, any>) {
  return {
    "Content-Type": "application/json",
    "x-api-key": SENDAVAPAY_API_KEY,
    "x-signature": signPayload(payload),
  };
}

class SendavaPayService {
  async createPayment(params: SendavaPaymentParams): Promise<SendavaPayResponse> {
    const payload = {
      amount: params.amount,
      phoneNumber: params.phoneNumber,
      operator: params.operator,
      country: params.country,
      customerName: params.customerName || "",
      description: params.description || "",
      callbackUrl: params.callbackUrl || "",
    };

    try {
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/api/sdk/payment`,
        payload,
        { headers: getHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay createPayment error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Échec de la création du paiement");
    }
  }

  async createWithdraw(params: SendavaWithdrawParams): Promise<SendavaPayResponse> {
    const payload = {
      amount: params.amount,
      phoneNumber: params.phoneNumber,
      operator: params.operator,
      country: params.country,
    };

    try {
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/api/sdk/withdraw`,
        payload,
        { headers: getHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay createWithdraw error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Échec du retrait");
    }
  }

  async verifyPayment(reference: string): Promise<SendavaPayResponse> {
    const payload = { reference };

    try {
      const response = await axios.post(
        `${SENDAVAPAY_BASE_URL}/api/sdk/verify`,
        payload,
        { headers: getHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay verifyPayment error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Échec de la vérification");
    }
  }

  async getTransaction(id: string): Promise<any> {
    const payload = { id };
    try {
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/api/sdk/transaction/${id}`,
        { headers: getHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getTransaction error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Échec de récupération de la transaction");
    }
  }

  async getBalance(): Promise<any> {
    const payload = {};
    try {
      const response = await axios.get(
        `${SENDAVAPAY_BASE_URL}/api/sdk/balance`,
        { headers: getHeaders(payload) }
      );
      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getBalance error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Échec de récupération du solde");
    }
  }

  async waitForPayment(reference: string, maxAttempts = 30, intervalMs = 5000): Promise<SendavaPayResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.verifyPayment(reference);
      if (result.status === "SUCCESS" || result.status === "FAILED" || result.status === "CANCELLED") {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return { success: false, status: "TIMEOUT", message: "Délai d'attente dépassé" };
  }
}

export function isApiKeyConfigured(): boolean {
  return !!SENDAVAPAY_API_KEY && !!SENDAVAPAY_API_SECRET;
}

export const sendavaPayService = new SendavaPayService();
