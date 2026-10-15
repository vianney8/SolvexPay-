import { db } from "../db";
import { paymentProviders, paymentProviderLogs, transactions, wallets, adminWithdrawals, type Transaction } from "@shared/schema";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import { AlphaPayService, alphapayStatusToString, directPaymentResponse, type PaymentParams, type PaymentResponse, type PaymentState } from "./alphapay";
import { amountInXOF, paymentWalletDelta } from "./paymentAccounting";
import { assertAlphaAvailable, getWalletRate } from "./alphapayCatalog";
export { amountInXOF } from "./paymentAccounting";

type Receipt = PaymentResponse & { kind: "payment" | "payout" | "checkout" };
type BindingRequest = { params: PaymentParams; action: "deposit" | "transfer" };
let settlementListener: ((transaction: Transaction) => Promise<void>) | undefined;
export function onPaymentSettled(listener: (transaction: Transaction) => Promise<void>) { settlementListener = listener; }
export function isApiKeyConfigured() { return !!process.env.ALPHAPAY_SECRET_KEY; }
export function invalidateActiveProviderCache() { /* Configuration is read from the environment, never cached. */ }
export async function getActiveProvider() {
  const [provider] = await db.select().from(paymentProviders).where(eq(paymentProviders.code, "alphapay")).limit(1);
  return provider || null;
}
export async function getProviderByCode(code: string) { return code === "alphapay" ? getActiveProvider() : null; }
export async function activateProvider(id: string) {
  const provider = await getActiveProvider();
  return provider?.id === id ? provider : null;
}
export async function seedPaymentProviders() {
  await db.transaction(async tx => {
    await tx.update(paymentProviders).set({ isActive: false, apiKey: "", secretKey: "", updatedAt: new Date() }).where(ne(paymentProviders.code, "alphapay"));
    await tx.insert(paymentProviders).values({
      code: "alphapay", displayName: "AlphaPay", isActive: true,
      apiKey: "", secretKey: "", baseUrl: "https://api.alphapay.me/api/v1",
      docsUrl: "https://docs.alphapay.me/javascript-sdk", config: {},
    }).onConflictDoUpdate({ target: paymentProviders.code, set: { isActive: true, apiKey: "", secretKey: "", updatedAt: new Date() } });
  });
}

async function findBinding(reference: string) {
  const [binding] = await db.select().from(paymentProviderLogs).where(and(
    eq(paymentProviderLogs.reference, reference), eq(paymentProviderLogs.providerCode, "alphapay"),
    eq(paymentProviderLogs.action, "binding"),
  )).orderBy(desc(paymentProviderLogs.createdAt)).limit(1);
  return binding;
}

export async function isAlphaPayment(reference: string) { return !!(await findBinding(reference)); }

function requireConfigured() {
  if (!isApiKeyConfigured()) throw Object.assign(new Error("AlphaPay n’est pas configuré. Ajoutez ALPHAPAY_SECRET_KEY dans les Secrets du projet."), { status: 503 });
}

/** Status transition and accounting entry commit together, under the same row lock. */
export async function settlePayment(reference: string, state: PaymentState) {
  if (state === "pending") return;
  const settled = await db.transaction(async tx => {
    const [transaction] = await tx.select().from(transactions).where(eq(transactions.reference, reference)).for("update");
    if (!transaction || transaction.status !== "pending") return;
    const [binding] = await tx.select().from(paymentProviderLogs).where(and(
      eq(paymentProviderLogs.reference, reference), eq(paymentProviderLogs.providerCode, "alphapay"),
      eq(paymentProviderLogs.action, "binding"),
    )).limit(1);
    const delta = paymentWalletDelta(transaction, state, (binding?.request as BindingRequest | undefined)?.params.walletRate);
    if (delta !== 0) {
      await tx.insert(wallets).values({ userId: transaction.userId }).onConflictDoNothing({ target: wallets.userId });
      const [wallet] = await tx.update(wallets).set({ balanceXOF: sql`${wallets.balanceXOF} + ${delta}`, updatedAt: new Date() })
        .where(eq(wallets.userId, transaction.userId)).returning();
      if (!wallet) throw new Error("Portefeuille introuvable.");
    }
    const [updated] = await tx.update(transactions).set({ status: state }).where(eq(transactions.id, transaction.id)).returning();
    return updated;
  });
  if (settled && settlementListener) {
    try { await settlementListener(settled); }
    catch { console.error("[AlphaPay] Notification à réessayer après règlement comptable."); }
  }
  return settled;
}

class PaymentService {
  async getActiveCode() { return "alphapay"; }
  async isConfigured() { return isApiKeyConfigured(); }
  async getReceipt(reference: string) {
    const binding = await findBinding(reference);
    const receipt = binding?.response as PaymentResponse | null;
    return receipt ? ((binding?.request as BindingRequest)?.params.directOnly ? directPaymentResponse(receipt) : receipt) : null;
  }

  private async initiate(action: "deposit" | "transfer", params: PaymentParams): Promise<PaymentResponse> {
    requireConfigured();
    const service = new AlphaPayService();
    const context = service.context(params);
    if (!(await findBinding(params.reference))) {
      await assertAlphaAvailable(context.network, context.country, context.currency, action === "deposit" ? "payin" : "payout");
      params = { ...params, walletRate: await getWalletRate(context.currency) };
    }
    // Save the exact non-secret payload before the network request. Ambiguous
    // responses are retried with the SAME provider idempotency key and payload.
    const binding = await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${params.reference}))`);
      const [existing] = await tx.select().from(paymentProviderLogs).where(and(
        eq(paymentProviderLogs.reference, params.reference),
        eq(paymentProviderLogs.providerCode, "alphapay"), eq(paymentProviderLogs.action, "binding"),
      )).limit(1);
      if (existing) return existing;
      const [created] = await tx.insert(paymentProviderLogs).values({
        providerCode: "alphapay", action: "binding", reference: params.reference,
        request: { params, action }, status: "pending",
      }).returning();
      return created;
    });
    const receipt = binding.response as Receipt | null;
    if (receipt?.id) return receipt;
    if (binding.status === "rejected") throw Object.assign(new Error("Cette demande AlphaPay a été rejetée."), { code: "ALPHAPAY_REJECTED" });
    const saved = binding.request as BindingRequest;
    if (saved.action !== action) throw new Error("Référence de paiement déjà utilisée.");
    if (binding.createdAt && Date.now() - binding.createdAt.getTime() > 60 * 60 * 1000) {
      throw new Error("Demande AlphaPay non rapprochée depuis plus d’une heure : vérification manuelle requise, fonds conservés.");
    }
    try {
      const result = action === "deposit" ? await service.deposit(saved.params) : await service.transfer(saved.params);
      await db.update(paymentProviderLogs).set({ response: result, status: "success" }).where(eq(paymentProviderLogs.id, binding.id));
      return result;
    } catch (error: any) {
      if (error.code === "ALPHAPAY_REJECTED") {
        await db.update(paymentProviderLogs).set({ status: "rejected", errorMessage: error.message }).where(eq(paymentProviderLogs.id, binding.id));
      }
      throw error;
    }
  }

  async deposit(params: PaymentParams) {
    return this.initiate("deposit", { ...params, checkout: false, directOnly: false });
  }
  transfer(params: PaymentParams) { return this.initiate("transfer", params); }
  async getBalance() { requireConfigured(); return new AlphaPayService().getBalance(); }

  async getStatus(reference: string): Promise<PaymentResponse> {
    requireConfigured();
    let binding = await findBinding(reference);
    if (!binding) throw Object.assign(new Error("Cette opération historique n’est pas gérée par AlphaPay ; rapprochement manuel requis."), { code: "LEGACY_PAYMENT" });
    if (binding.status === "rejected") {
      await settlePayment(reference, "failed");
      return { success: 1, reference, status: "FAILED" };
    }
    let receipt = binding.response as Receipt | null;
    if (!receipt?.id) {
      const saved = binding.request as BindingRequest;
      await this.initiate(saved.action, saved.params);
      binding = await findBinding(reference);
      receipt = binding?.response as Receipt;
    }
    if (!receipt?.id) throw new Error("Référence AlphaPay en attente de rapprochement.");
    const result = await new AlphaPayService().verify(receipt.id, receipt.kind);
    const state = alphapayStatusToString(result.status);
    const saved = binding!.request as BindingRequest;
    const expected = new AlphaPayService().context(saved.params);
    if (!result.sessionOnly) {
      if (receipt.kind !== "checkout" && result.id !== receipt.id) {
        throw new Error("Identifiant de transaction AlphaPay incohérent.");
      }
      if (Number(result.requested_amount) !== saved.params.amount || result.currency !== expected.currency) {
        throw new Error("Montant ou devise AlphaPay incohérent : rapprochement manuel requis.");
      }
      if (result.flow_direction !== (receipt.kind === "payout" ? "OUTBOUND" : "INBOUND")) {
        throw new Error("Sens de transaction AlphaPay incohérent.");
      }
    } else if (state === "completed") {
      throw new Error("Une session payée doit être liée à une transaction vérifiée.");
    }
    if (result.id && result.id !== receipt.id) {
      await db.update(paymentProviderLogs).set({ response: { ...receipt, transactionId: result.id } }).where(eq(paymentProviderLogs.id, binding!.id));
    }
    const [local] = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.reference, reference)).limit(1);
    const [admin] = await db.select({ id: adminWithdrawals.id }).from(adminWithdrawals).where(eq(adminWithdrawals.reference, reference)).limit(1);
    if (!local && !admin) throw new Error("L’opération locale n’est pas encore enregistrée ; réessayez.");
    if (state === "completed" && !result.sessionOnly) {
      const [accounting] = await db.select().from(transactions).where(eq(transactions.reference, reference)).limit(1);
      const minimumNet = receipt.kind === "payout" ? saved.params.amount
        : accounting ? saved.params.amount - Number(accounting.fees || 0) : saved.params.amount;
      if (!Number.isFinite(Number(result.net_amount)) || Number(result.net_amount) < minimumNet) {
        throw new Error("Montant net AlphaPay insuffisant : rapprocher les frais sans rembourser automatiquement.");
      }
    }
    await settlePayment(reference, state);
    const [adminPayout] = await db.select().from(adminWithdrawals).where(eq(adminWithdrawals.reference, reference)).limit(1);
    if (adminPayout && adminPayout.status === "pending" && state !== "pending") {
      await db.update(adminWithdrawals).set({ status: state, updatedAt: new Date() }).where(and(eq(adminWithdrawals.id, adminPayout.id), eq(adminWithdrawals.status, "pending")));
    }
    const presentation = saved.params.directOnly ? directPaymentResponse(receipt) : receipt;
    return {
      success: 1, reference, status: result.status, id: result.id,
      payment_url: presentation.payment_url,
      requires_redirect: presentation.requires_redirect === true || !!presentation.payment_url,
      instructions: presentation.instructions, message: presentation.message,
    };
  }

  /** Find webhooks by the provider ID already persisted, never by caller-supplied local references. */
  async referenceForWebhook(providerId: string): Promise<string | undefined> {
    const [binding] = await db.select({ reference: paymentProviderLogs.reference }).from(paymentProviderLogs).where(and(
      eq(paymentProviderLogs.providerCode, "alphapay"), eq(paymentProviderLogs.action, "binding"),
      sql`(${paymentProviderLogs.response}->>'id' = ${providerId} OR ${paymentProviderLogs.response}->>'transactionId' = ${providerId})`,
    )).limit(1);
    return binding?.reference || undefined;
  }
}

export const paymentService = new PaymentService();

export async function reservePayout(userId: string, params: PaymentParams, feesXOF: number, type: "withdrawal" | "transfer") {
  requireConfigured();
  const context = new AlphaPayService().context(params);
  await assertAlphaAvailable(context.network, context.country, context.currency, "payout");
  params = { ...params, walletRate: params.walletRate ?? await getWalletRate(context.currency) };
  const debit = amountInXOF(params.amount, context.currency, params.walletRate) + feesXOF;
  if (!Number.isSafeInteger(debit) || debit <= 0 || !Number.isFinite(feesXOF) || feesXOF < 0) throw new Error("Montant ou frais invalides.");
  const transaction = await db.transaction(async tx => {
    const [wallet] = await tx.update(wallets).set({ balanceXOF: sql`${wallets.balanceXOF} - ${debit}`, updatedAt: new Date() })
      .where(and(eq(wallets.userId, userId), sql`${wallets.balanceXOF} >= ${debit}`)).returning();
    if (!wallet) throw Object.assign(new Error("Solde insuffisant."), { status: 400 });
    const [created] = await tx.insert(transactions).values({
      userId, type, amount: String(params.amount), currency: context.currency,
      reference: params.reference, status: "pending", fees: String(feesXOF),
      phoneNumber: params.msisdn, provider: context.network,
      description: `AlphaPay — ${type === "withdrawal" ? "retrait" : "transfert"}`,
    }).returning();
    // Persist the exact refund conversion in the same commit as the reservation.
    await tx.insert(paymentProviderLogs).values({
      providerCode: "alphapay", action: "binding", reference: params.reference,
      request: { params, action: "transfer" }, status: "pending",
    });
    return created;
  });
  try {
    const receipt = await paymentService.transfer(params);
    return { ...transaction, providerId: receipt.id };
  } catch (error: any) {
    if (error.code === "ALPHAPAY_REJECTED") {
      await settlePayment(params.reference, "failed");
      throw error;
    }
    return { ...transaction, providerId: null, message: "Demande en cours de rapprochement AlphaPay. Fonds réservés, ne renvoyez pas une nouvelle demande." };
  }
}
