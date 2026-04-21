/**
 * Dispatcher central de fournisseurs de paiement.
 *
 * Détecte automatiquement le fournisseur actif (en BDD), instancie le service
 * adéquat (OmniPay, ...) et expose une API unique compatible avec
 * l'ancien `omniPayService`. Toutes les routes métier passent par ce service —
 * aucune modification n'est nécessaire pour ajouter un nouveau fournisseur.
 */
import { db } from "../db";
import { paymentProviders, paymentProviderLogs, type PaymentProvider } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import {
  OmniPayService,
  type OmniPayDepositParams,
  type OmniPayDepositResponse,
  type OmniPayTransferParams,
  type OmniPayTransferResponse,
  type OmniPayStatusResponse,
  type OmniPayBalanceResponse,
} from "./omnipay";

const CACHE_TTL_MS = 30_000;

interface ActiveProviderCache {
  provider: PaymentProvider;
  fetchedAt: number;
}

let cache: ActiveProviderCache | null = null;

export function invalidateActiveProviderCache(): void {
  cache = null;
}

export async function getProviderByCode(code: string): Promise<PaymentProvider | null> {
  const [row] = await db.select().from(paymentProviders).where(eq(paymentProviders.code, code)).limit(1);
  return row || null;
}

/** Récupère la clé de callback du fournisseur OmniPay spécifiquement (route /webhooks/omnipay). */
export async function getOmniPayCallbackKey(): Promise<string> {
  const p = await getProviderByCode("omnipay");
  return p?.secretKey || process.env.OMNIPAY_CALLBACK_KEY || "";
}

export async function getActiveProvider(): Promise<PaymentProvider | null> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.provider;
  }
  const [row] = await db.select().from(paymentProviders).where(eq(paymentProviders.isActive, true)).limit(1);
  if (!row) {
    cache = null;
    return null;
  }
  cache = { provider: row, fetchedAt: Date.now() };
  return row;
}

interface ProviderInstance {
  code: string;
  isConfigured(): boolean;
  getCallbackKey(): string;
  deposit(params: OmniPayDepositParams): Promise<OmniPayDepositResponse>;
  transfer(params: OmniPayTransferParams): Promise<OmniPayTransferResponse>;
  getStatus(reference: string): Promise<OmniPayStatusResponse>;
  getBalance(): Promise<OmniPayBalanceResponse>;
}

function buildInstance(provider: PaymentProvider): ProviderInstance {
  // Default: OmniPay
  const svc = new OmniPayService({
    apiKey: provider.apiKey || process.env.OMNIPAY_API_KEY || "",
    callbackKey: provider.secretKey || process.env.OMNIPAY_CALLBACK_KEY || "",
    baseUrl: provider.baseUrl || undefined,
  });
  return Object.assign(svc, { code: provider.code });
}

async function getProviderInstance(): Promise<ProviderInstance> {
  const provider = await getActiveProvider();
  if (!provider) {
    // Fallback: tente OmniPay via env si aucun fournisseur n'est configuré en BDD
    const envKey = process.env.OMNIPAY_API_KEY;
    if (envKey) {
      const svc = new OmniPayService({
        apiKey: envKey,
        callbackKey: process.env.OMNIPAY_CALLBACK_KEY || "",
      });
      return Object.assign(svc, { code: "omnipay" });
    }
    throw new Error("Aucun fournisseur de paiement actif. Configurez-en un dans l'admin.");
  }
  return buildInstance(provider);
}

async function logCall(
  providerCode: string,
  action: string,
  reference: string | null,
  request: any,
  startedAt: number,
  result: { ok: true; response: any } | { ok: false; error: string }
): Promise<void> {
  try {
    const sanitized = { ...(request || {}) };
    if (sanitized.apikey) sanitized.apikey = "[REDACTED]";
    if (sanitized.apiKey) sanitized.apiKey = "[REDACTED]";
    if (sanitized.msisdn && typeof sanitized.msisdn === "string") {
      sanitized.msisdn = sanitized.msisdn.substring(0, 6) + "***";
    }
    await db.insert(paymentProviderLogs).values({
      providerCode,
      action,
      reference: reference || undefined,
      request: sanitized,
      response: result.ok ? result.response : null,
      status: result.ok ? "success" : "error",
      errorMessage: result.ok ? null : result.error,
      durationMs: Date.now() - startedAt,
    } as any);
  } catch (err) {
    console.error("[paymentService] Failed to write provider log:", err);
  }
}

class PaymentDispatcher {
  async getActiveCode(): Promise<string | null> {
    const p = await getActiveProvider();
    return p?.code || null;
  }

  async isConfigured(): Promise<boolean> {
    try {
      const inst = await getProviderInstance();
      return inst.isConfigured();
    } catch {
      return false;
    }
  }

  async getCallbackKey(): Promise<string> {
    try {
      const inst = await getProviderInstance();
      return inst.getCallbackKey();
    } catch {
      return "";
    }
  }

  async deposit(params: OmniPayDepositParams): Promise<OmniPayDepositResponse> {
    const inst = await getProviderInstance();
    const startedAt = Date.now();
    try {
      const response = await inst.deposit(params);
      await logCall(inst.code, "deposit", params.reference, params, startedAt, { ok: true, response });
      return response;
    } catch (err: any) {
      await logCall(inst.code, "deposit", params.reference, params, startedAt, { ok: false, error: err?.message || String(err) });
      throw err;
    }
  }

  async transfer(params: OmniPayTransferParams): Promise<OmniPayTransferResponse> {
    const inst = await getProviderInstance();
    const startedAt = Date.now();
    try {
      const response = await inst.transfer(params);
      await logCall(inst.code, "transfer", params.reference, params, startedAt, { ok: true, response });
      return response;
    } catch (err: any) {
      await logCall(inst.code, "transfer", params.reference, params, startedAt, { ok: false, error: err?.message || String(err) });
      throw err;
    }
  }

  async getStatus(reference: string): Promise<OmniPayStatusResponse> {
    const inst = await getProviderInstance();
    const startedAt = Date.now();
    try {
      const response = await inst.getStatus(reference);
      await logCall(inst.code, "getStatus", reference, { reference }, startedAt, { ok: true, response });
      return response;
    } catch (err: any) {
      await logCall(inst.code, "getStatus", reference, { reference }, startedAt, { ok: false, error: err?.message || String(err) });
      throw err;
    }
  }

  async getBalance(): Promise<OmniPayBalanceResponse> {
    const inst = await getProviderInstance();
    const startedAt = Date.now();
    try {
      const response = await inst.getBalance();
      await logCall(inst.code, "getBalance", null, {}, startedAt, { ok: true, response });
      return response;
    } catch (err: any) {
      await logCall(inst.code, "getBalance", null, {}, startedAt, { ok: false, error: err?.message || String(err) });
      throw err;
    }
  }
}

export const paymentService = new PaymentDispatcher();

/** Compatibilité descendante : équivalent synchrone de l'ancien `isApiKeyConfigured`. */
export function isApiKeyConfigured(): boolean {
  // Présence du cache => au moins un provider trouvé récemment
  if (cache?.provider?.apiKey) return true;
  return !!process.env.OMNIPAY_API_KEY;
}

/**
 * Active un fournisseur et désactive automatiquement tous les autres.
 * Utilise une transaction pour garantir l'unicité de l'actif.
 */
export async function activateProvider(id: string): Promise<PaymentProvider | null> {
  const result = await db.transaction(async (tx) => {
    await tx.update(paymentProviders).set({ isActive: false, updatedAt: new Date() });
    const [row] = await tx
      .update(paymentProviders)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(paymentProviders.id, id))
      .returning();
    return row || null;
  });
  invalidateActiveProviderCache();
  return result;
}

/** Seed les fournisseurs par défaut au démarrage si la table est vide. */
export async function seedPaymentProviders(): Promise<void> {
  try {
    const existing = await db.select().from(paymentProviders);
    if (existing.length > 0) return;

    const envOmniKey = process.env.OMNIPAY_API_KEY || "";
    const envOmniCallback = process.env.OMNIPAY_CALLBACK_KEY || "";

    await db.insert(paymentProviders).values([
      {
        code: "omnipay",
        displayName: "OmniPay",
        isActive: true,
        apiKey: envOmniKey,
        secretKey: envOmniCallback,
        baseUrl: "https://omnipay.webtechci.com/interface/api2",
        config: {},
      },
    ]);

    console.log("[init] Fournisseur de paiement par défaut créé (omnipay actif).");
  } catch (err) {
    console.error("[init] Erreur seed paymentProviders:", err);
  }
}
