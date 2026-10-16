import type { Request, Response } from "express";
import { verifyAlphaPaySignature } from "./alphapay";

type NotificationService = {
  referenceForWebhook(id: string): Promise<string | undefined>;
  getStatus(reference: string): Promise<{ id?: string }>;
};

/** The event is a wake-up signal, never evidence of payment or a local reference. */
export function alphaPayWebhook(
  service: NotificationService,
  checkoutReferences: () => Promise<string[]>,
  secret: () => string = () => process.env.ALPHAPAY_WEBHOOK_SECRET || "",
) {
  return async (req: Request, res: Response) => {
    const signingSecret = secret();
    if (!signingSecret) return res.status(503).json({ message: "Webhook AlphaPay non configuré." });
    const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.alloc(0);
    if (!verifyAlphaPaySignature(rawBody, req.get("X-Webhook-Signature") || "", req.get("X-Webhook-Timestamp") || "", signingSecret)) {
      return res.status(401).json({ message: "Signature AlphaPay invalide ou expirée." });
    }
    if (req.body?.event === "webhook.test") return res.json({ received: true });
    if (!String(req.body?.event || "").startsWith("transaction.")) return res.json({ received: true, ignored: true });
    const providerId = req.body?.data?.id;
    if (typeof providerId !== "string" || !providerId) return res.status(400).json({ message: "Identifiant AlphaPay requis." });
    try {
      let reference = await service.referenceForWebhook(providerId);
      // Historical checkout bindings contain the session ID, not the payment ID.
      if (!reference) {
        for (const candidate of await checkoutReferences()) {
          const verified = await service.getStatus(candidate);
          if (verified.id === providerId) { reference = candidate; break; }
        }
      }
      if (!reference) return res.status(409).json({ message: "Opération non rapprochée ; nouvelle livraison nécessaire." });
      await service.getStatus(reference);
      return res.json({ received: true });
    } catch {
      return res.status(503).json({ message: "Vérification AlphaPay à réessayer." });
    }
  };
}

/** Browser query parameters cannot settle a payment; only authenticated verify can. */
export function alphaPayBrowserReturn(service: Pick<NotificationService, "getStatus">) {
  return async (req: Request, res: Response) => {
    const reference = typeof req.query.reference === "string" ? req.query.reference : "";
    if (reference) {
      try { await service.getStatus(reference); }
      catch { console.error("[AlphaPay] Retour navigateur non rapproché ; paiement inchangé."); }
    }
    return res.redirect(`/deposit?status=callback&reference=${encodeURIComponent(reference)}`);
  };
}

/** The SR return carries two caller-controlled identifiers; bind them before use. */
export function alphaPayWaveReturn(
  service: Pick<NotificationService, "getStatus">,
  transactionById: (id: string) => Promise<{ id: string; reference: string | null } | undefined>,
) {
  return async (req: Request, res: Response) => {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    const reference = typeof req.query.reference === "string" ? req.query.reference : "";
    if (!id || !reference) return res.status(400).json({ message: "Identifiant et référence requis." });
    try {
      const transaction = await transactionById(id);
      if (!transaction || transaction.reference !== reference) {
        return res.status(404).json({ message: "Transaction introuvable." });
      }
    } catch {
      return res.status(503).json({ message: "Transaction à réessayer." });
    }
    // No independent status or wallet writes here, even for an already paid reference.
    try { await service.getStatus(reference); }
    catch { console.error("[AlphaPay] Retour Wave non rapproché ; paiement inchangé."); }
    return res.redirect(`/pay-api/${encodeURIComponent(id)}?status=callback&reference=${encodeURIComponent(reference)}`);
  };
}
