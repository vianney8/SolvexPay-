import { db } from "../db";
import { paymentProviders, paymentProviderLogs, transactions, wallets, adminWithdrawals, type Transaction } from "@shared/schema";
import { eq, and, desc, sql, ne } from "drizzle-orm";
import { AlphaPayService, alphapayStatusToString, directPaymentResponse, type PaymentParams, type PaymentResponse, type PaymentState } from "./alphapay";
import { amountInXOF, paymentWalletDelta } from "./paymentAccounting";
import { needsPaymentConfirmation } from "@shared/payment-catalog";
import { PAYMENT_COUNTRIES, alphaCountryCode } from "@shared/payment-catalog";
import { quotePayment, paymentInputError } from "./paymentQuote";
import { assertPaymentAllowed, policyError, withdrawalIsManual } from "./paymentPolicy";
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
    const delta = paymentWalletDelta(transaction, state);
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
    const receipt = (await findBinding(reference))?.response as PaymentResponse | null;
    return receipt ? { ...receipt, requires_redirect: !!receipt.payment_url || receipt.requires_redirect === true } : null;
  }

  private async initiate(action: "deposit" | "transfer", params: PaymentParams): Promise<PaymentResponse> {
    await assertPaymentAllowed(params.operator || "", params.sourceCountry || params.country || "", action === "deposit" ? "payin" : "payout");
    if (action === "transfer") await assertPayoutApproved(params.reference);
    requireConfigured();
    const service = new AlphaPayService();
    try { service.context(params); }
    catch (error: any) { throw paymentInputError(error.message || "Paramètres de paiement invalides."); }
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
        request: { params: { ...params, otp: undefined }, action, ephemeralOtp: !!params.otp }, status: "pending",
      }).returning();
      return { ...created, justCreated: true };
    });
    const receipt = binding.response as Receipt | null;
    if (receipt?.id) return receipt;
    if (binding.status === "rejected") throw Object.assign(new Error("Cette demande AlphaPay a été rejetée."), { code: "ALPHAPAY_REJECTED" });
    const saved = binding.request as BindingRequest;
    if ((binding.request as any).ephemeralOtp && (!(binding as any).justCreated || !params.otp)) throw new Error("Paiement avec code en attente de rapprochement ; aucune nouvelle initiation automatique.");
    if (saved.action !== action) throw new Error("Référence de paiement déjà utilisée.");
    if (binding.createdAt && Date.now() - binding.createdAt.getTime() > 60 * 60 * 1000) {
      throw new Error("Demande AlphaPay non rapprochée depuis plus d’une heure : vérification manuelle requise, fonds conservés.");
    }
    try {
      const result = action === "deposit" ? await service.deposit({ ...saved.params, otp: params.otp }) : await service.transfer(saved.params);
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
    await assertPaymentAllowed(params.operator || "", params.country || "", "payin");
    const country = PAYMENT_COUNTRIES.find(c => c.iso === alphaCountryCode(params.country || ""));
    const operator = params.operator === "crypto" ? "Crypto" : country?.operators.find(o => {
      try { return new AlphaPayService().context({ ...params, operator: params.operator }).network === getNetwork(o, country.code); } catch { return false; }
    });
    if (!country || !operator) throw paymentInputError("Ce moyen de paiement n’est pas disponible.");
    let quote;
    try { quote = await quotePayment({ country: country.code, operator, amount: params.amount, currency: params.currency || country.currency }); }
    catch (error: any) {
      if (error.code === "ALPHAPAY_REJECTED") throw error;
      throw Object.assign(new Error("Tarifs AlphaPay indisponibles : aucun paiement n’a été initié. Réessayez plus tard."), { status: 503, code: "ALPHAPAY_REJECTED" });
    }
    if (quote.otpRequired && !params.otp?.trim()) throw paymentInputError("Le code de paiement de votre opérateur est obligatoire avant de payer.");
    const prepared = params.operator === "crypto" ? {
      ...params, sourceAmount: params.amount, sourceCurrency: params.currency || country.currency, sourceCountry: params.country,
      amount: quote.providerAmount, currency: "USD", country: "XX",
    } : params;
    const receipt = await this.initiate("deposit", { ...prepared, checkout: false, directOnly: false });
    return { ...receipt, requires_redirect: !!receipt.payment_url || receipt.requires_redirect === true };
  }
  async transfer(params: PaymentParams) {
    await assertPaymentAllowed(params.operator || "", params.country || "", "payout");
    await assertPayoutApproved(params.reference);
    await validatePayout(params);
    return this.initiate("transfer", params);
  }
  async getBalance() { requireConfigured(); return new AlphaPayService().getBalance(); }

  async confirmOtp(reference: string, otp: string) {
    requireConfigured();
    const binding = await findBinding(reference);
    const receipt = binding?.response as Receipt | null;
    const request = binding?.request as BindingRequest | undefined;
    if (!request || request.action !== "deposit" || !receipt?.id || receipt.kind !== "payment" || receipt.requires_redirect ||
        !needsPaymentConfirmation(request.params.operator || "")) {
      throw Object.assign(new Error("Cette opération ne permet pas la confirmation par code."), { status: 400 });
    }
    const [local] = await db.select().from(transactions).where(eq(transactions.reference, reference)).limit(1);
    if (!local) throw Object.assign(new Error("Paiement introuvable."), { status: 404 });
    if (local.status !== "pending") throw Object.assign(new Error("Ce paiement est déjà traité. Vérifiez son statut."), { status: 409 });
    // OTPs are ephemeral: never persist or log them. A confirmation error does
    // not reject the original payment or trigger any accounting movement.
    try { await new AlphaPayService().confirmOtp(receipt.id, otp); }
    catch { throw Object.assign(new Error("Code non confirmé. Vérifiez le code ou le statut du paiement avant de réessayer."), { status: 422 }); }
    return this.getStatus(reference);
  }

  async getStatus(reference: string): Promise<PaymentResponse> {
    requireConfigured();
    let binding = await findBinding(reference);
    if (!binding) {
      const approval = await payoutApproval(reference);
      if (approval?.status === "awaiting_approval") return {
        success: 1, reference, status: "PENDING", approvalRequired: true,
        message: "Fonds réservés. En attente de validation administrateur ; aucun envoi effectué.",
      };
      if (approval?.status === "cancelled") return { success: 1, reference, status: "FAILED" };
      if (approval) throw policyError("Approbation enregistrée sans liaison fournisseur : rapprochement manuel requis, fonds conservés. Aucun nouvel envoi automatique.", "PAYOUT_RECONCILIATION_REQUIRED", 409);
      throw Object.assign(new Error("Cette opération historique n’est pas gérée par AlphaPay ; rapprochement manuel requis."), { code: "LEGACY_PAYMENT" });
    }
    if (binding.status === "rejected") {
      await settlePayment(reference, "failed");
      return { success: 1, reference, status: "FAILED" };
    }
    let receipt = binding.response as Receipt | null;
    if (!receipt?.id) {
      const saved = binding.request as BindingRequest;
      // A manual payout has one send attempt, owned by its approval claim.
      // Polling may overlap that attempt or follow a timeout. Even the same
      // idempotency key must not turn public status checks into payout sends.
      if (saved.action === "transfer" && await hasPayoutApproval(reference)) {
        throw policyError("Envoi manuel soumis sans réponse fournisseur confirmée : fonds conservés pour rapprochement, aucun nouvel envoi autorisé.", "PAYOUT_RECONCILIATION_REQUIRED", 409);
      }
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
      if (saved.params.sourceAmount && accounting && (Number(accounting.amount) !== saved.params.sourceAmount || accounting.currency !== saved.params.sourceCurrency)) throw new Error("Conversion crypto incohérente : rapprochement requis.");
      const minimumNet = receipt.kind === "payout" ? saved.params.amount
        : accounting ? saved.params.amount * (1 - Number(accounting.fees || 0) / Number(accounting.amount)) : saved.params.amount;
      if (!Number.isFinite(Number(result.net_amount)) || Number(result.net_amount) < minimumNet) {
        throw new Error("Montant net AlphaPay insuffisant : rapprocher les frais sans rembourser automatiquement.");
      }
    }
    await settlePayment(reference, state);
    const [adminPayout] = await db.select().from(adminWithdrawals).where(eq(adminWithdrawals.reference, reference)).limit(1);
    if (adminPayout && adminPayout.status === "pending" && state !== "pending") {
      await db.update(adminWithdrawals).set({ status: state, updatedAt: new Date() }).where(and(eq(adminWithdrawals.id, adminPayout.id), eq(adminWithdrawals.status, "pending")));
    }
    const presentation = { ...receipt, requires_redirect: !!receipt.payment_url || receipt.requires_redirect === true };
    return {
      success: 1, reference, status: result.status, id: result.id,
      requires_redirect: presentation.requires_redirect,
      payment_url: state === "pending" ? presentation.payment_url : undefined,
      requires_otp: state === "pending" && presentation.requires_redirect !== true && receipt.kind === "payment" && needsPaymentConfirmation(saved.params.operator || ""),
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

import { getPaymentNetwork as getNetwork } from "@shared/payment-catalog";
async function validatePayout(params: PaymentParams) {
  const country = PAYMENT_COUNTRIES.find(c => c.iso === alphaCountryCode(params.country || ""));
  const operator = country?.operators.find(o => getNetwork(o, country.code) === params.operator);
  if (!country || !operator || params.operator === "crypto") throw paymentInputError("Ce moyen de retrait n’est pas disponible.");
  await quotePayment({ country: country.code, operator, amount: params.amount, currency: params.currency || country.currency, direction: "payout" });
}

export async function reservePayout(userId: string, params: PaymentParams, feesXOF: number, type: "withdrawal" | "transfer") {
  await assertPaymentAllowed(params.operator || "", params.country || "", "payout");
  const manual = await withdrawalIsManual();
  requireConfigured();
  await validatePayout(params);
  const context = new AlphaPayService().context(params);
  const debit = amountInXOF(params.amount, context.currency) + feesXOF;
  if (!Number.isSafeInteger(debit) || debit <= 0 || !Number.isFinite(feesXOF) || feesXOF < 0) throw new Error("Montant ou frais invalides.");
  const transaction = await db.transaction(async tx => {
    const [wallet] = await tx.update(wallets).set({ balanceXOF: sql`${wallets.balanceXOF} - ${debit}`, updatedAt: new Date() })
      .where(and(eq(wallets.userId, userId), sql`${wallets.balanceXOF} >= ${debit}`)).returning();
    if (!wallet) throw Object.assign(new Error("Solde insuffisant."), { status: 400 });
    const [created] = await tx.insert(transactions).values({
      userId, type, amount: String(params.amount), currency: context.currency,
      reference: params.reference, status: "pending", fees: String(feesXOF),
      phoneNumber: params.msisdn, provider: context.network,
      payerCountry: params.country,
      description: `AlphaPay — ${type === "withdrawal" ? "retrait" : "transfert"}${manual ? " — validation administrateur requise" : ""}`,
    }).returning();
    if (manual) await tx.insert(paymentProviderLogs).values({
      providerCode: "alphapay", action: "payout_approval", reference: params.reference,
      request: { params: { ...params, otp: undefined }, userId, type }, status: "awaiting_approval",
    });
    return created;
  });
  if (manual) return { ...transaction, approvalRequired: true, providerId: null, message: "Fonds réservés. En attente de validation administrateur ; aucun envoi effectué." };
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

async function payoutApproval(reference: string, connection: Pick<typeof db, "select"> = db) {
  const [approval] = await connection.select().from(paymentProviderLogs).where(and(
    eq(paymentProviderLogs.providerCode, "alphapay"), eq(paymentProviderLogs.action, "payout_approval"),
    eq(paymentProviderLogs.reference, reference),
  )).limit(1);
  return approval;
}

export async function hasPayoutApproval(reference: string) { return !!await payoutApproval(reference); }

async function assertPayoutApproved(reference: string) {
  const approval = await payoutApproval(reference);
  if (approval && approval.status !== "submitted") throw policyError("Validation administrateur requise avant envoi.", "APPROVAL_REQUIRED", 409);
  if (!approval && await withdrawalIsManual()) throw policyError("Le mode manuel exige une demande réservée puis approuvée.", "APPROVAL_REQUIRED", 409);
}

/** Claim under the accounting row lock. Never change an approval back to awaiting. */
export async function decidePayout(reference: string, decision: "approve" | "reject") {
  const approval = await payoutApproval(reference);
  if (!approval) throw policyError("Demande manuelle introuvable.", "NOT_FOUND", 404);
  const params = (approval.request as { params: PaymentParams }).params;
  if (decision === "approve") {
    await assertPaymentAllowed(params.operator || "", params.country || "", "payout");
    requireConfigured();
    await validatePayout(params);
  }
  const claimed = await db.transaction(async tx => {
    const [local] = await tx.select().from(transactions).where(eq(transactions.reference, reference)).for("update");
    const current = await payoutApproval(reference, tx);
    if (!local || !current || current.status !== "awaiting_approval" || local.status !== "pending") return false;
    await tx.update(paymentProviderLogs).set({ status: decision === "approve" ? "submitted" : "cancelled" }).where(eq(paymentProviderLogs.id, current.id));
    if (decision === "reject") {
      const delta = paymentWalletDelta(local, "failed");
      const [wallet] = await tx.update(wallets).set({ balanceXOF: sql`${wallets.balanceXOF} + ${delta}`, updatedAt: new Date() }).where(eq(wallets.userId, local.userId)).returning();
      if (!wallet) throw new Error("Portefeuille introuvable ; rejet annulé.");
      await tx.update(transactions).set({ status: "failed", description: "Demande manuelle rejetée avant envoi — fonds restitués" }).where(eq(transactions.id, local.id));
    }
    return true;
  });
  if (!claimed) return { reference, alreadyDecided: true, message: "Cette demande a déjà été décidée ; vérifiez son statut sans nouvel envoi." };
  if (decision === "reject") return { reference, status: "failed", refunded: true };
  try {
    const receipt = await paymentService.transfer(params);
    return { reference, status: "pending", providerId: receipt.id, message: "Envoi soumis ; succès soumis à vérification AlphaPay." };
  } catch (error: any) {
    if (error.code === "ALPHAPAY_REJECTED") {
      await settlePayment(reference, "failed");
      throw error;
    }
    return { reference, status: "pending", message: "Envoi incertain ou bloqué. Fonds conservés pour rapprochement ; ne créez pas un nouvel envoi." };
  }
}
