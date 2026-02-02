import axios from "axios";
import crypto from "crypto";

const SENDAVAPAY_BASE_URL = "https://sendavapay.com/api/v1";
const SENDAVAPAY_API_KEY = process.env.SENDAVAPAY_API_KEY;
const SENDAVAPAY_WEBHOOK_SECRET = process.env.SENDAVAPAY_WEBHOOK_SECRET;

interface CreatePaymentParams {
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

interface CreatePaymentResponse {
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

interface VerifyPaymentResponse {
  success: boolean;
  data: {
    reference: string;
    externalReference: string;
    amount: string;
    fee: string;
    currency: string;
    status: string;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    paymentMethod: string;
    createdAt: string;
    completedAt: string;
  };
}

class SendavaPayService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = SENDAVAPAY_API_KEY || "";
    this.baseUrl = SENDAVAPAY_BASE_URL;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/create-payment`,
        {
          amount: params.amount,
          currency: params.currency || "XOF",
          description: params.description,
          externalReference: params.externalReference,
          customerEmail: params.customerEmail,
          customerPhone: params.customerPhone,
          customerName: params.customerName,
          redirectUrl: params.redirectUrl,
          metadata: params.metadata,
        },
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("SendavaPay createPayment error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to create payment");
    }
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/verify-payment`,
        { reference },
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("SendavaPay verifyPayment error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to verify payment");
    }
  }

  async getTransactions(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/transactions`, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error: any) {
      console.error("SendavaPay getTransactions error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to get transactions");
    }
  }
}

export function verifyWebhookSignature(payload: any, signature: string): boolean {
  if (!SENDAVAPAY_WEBHOOK_SECRET) {
    console.warn("SENDAVAPAY_WEBHOOK_SECRET not configured, skipping signature verification");
    return true;
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", SENDAVAPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
  
  return signature === expectedSignature;
}

export function isApiKeyConfigured(): boolean {
  return !!SENDAVAPAY_API_KEY;
}

export const sendavaPayService = new SendavaPayService();
export type { CreatePaymentParams, CreatePaymentResponse, VerifyPaymentResponse };
