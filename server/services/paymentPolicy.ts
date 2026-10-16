import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestHandler } from "express";
import { db } from "../db";
import { paymentMethods, systemSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { PAYMENT_COUNTRIES, getPaymentNetwork, solvexCountryCode } from "@shared/payment-catalog";

// Only a server-authenticated session can grant the maintenance exemption.
const actors = new AsyncLocalStorage<{ isAdmin: boolean }>();
export const withPaymentActor: RequestHandler = (req: any, _res, next) =>
  actors.run({ isAdmin: !!req.session?.userId && req.session.userId === req.user?.id && req.user?.isAdmin === true }, next);

export function policyError(message: string, code = "PAYMENT_UNAVAILABLE", status = 503) {
  return Object.assign(new Error(message), { status, code });
}
export async function paymentSetting(key: string): Promise<string | undefined> {
  try {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    return row?.value;
  } catch {
    throw policyError("Restrictions de paiement indisponibles. Aucun nouvel envoi autorisé.");
  }
}
export async function assertNotMaintenance() {
  if (await paymentSetting("globalMaintenance") === "true" && !actors.getStore()?.isAdmin) {
    throw policyError("Le site est actuellement en maintenance. Veuillez réessayer plus tard.", "MAINTENANCE");
  }
}
export async function withdrawalIsManual() {
  const mode = await paymentSetting("withdrawalMode");
  if (mode && !["auto", "manual"].includes(mode)) throw policyError("Mode de retrait invalide.");
  return mode === "manual";
}
export async function assertCountryAllowed(country: string) {
  await assertNotMaintenance();
  const code = solvexCountryCode(country);
  let suspended: string[];
  try {
    const parsed = JSON.parse(await paymentSetting("suspended_countries") || "[]");
    if (!Array.isArray(parsed) || parsed.some(c => typeof c !== "string")) throw new Error();
    suspended = parsed.map(solvexCountryCode);
  } catch {
    throw policyError("Restrictions pays indisponibles. Aucun nouvel envoi autorisé.");
  }
  if (suspended.includes(code)) throw policyError(`Les paiements depuis le pays ${code} sont temporairement suspendus.`, "COUNTRY_SUSPENDED");
  return code;
}
export async function assertPaymentAllowed(operator: string, country: string, direction: "payin" | "payout") {
  const code = await assertCountryAllowed(country);
  const catalog = PAYMENT_COUNTRIES.find(c => c.code === code);
  const label = operator.toLowerCase() === "crypto" ? "Crypto" : catalog?.operators.find(o => {
    try { return o.toLowerCase() === operator.toLowerCase() || getPaymentNetwork(o, code) === operator.toLowerCase(); }
    catch { return false; }
  });
  if (!catalog || !label || (direction === "payout" && label === "Crypto")) {
    throw policyError("Ce moyen de paiement n’est pas disponible.", "INVALID_PAYMENT_METHOD", 400);
  }
  let methods;
  try { methods = await db.select().from(paymentMethods); }
  catch { throw policyError("Restrictions opérateur indisponibles. Aucun nouvel envoi autorisé."); }
  const pm = methods.find(m => m.code.toLowerCase() === label.toLowerCase());
  const includesCountry = (countries: string[] | null) => (countries || []).map(solvexCountryCode).includes(code);
  if (pm?.isActive === false || pm?.inMaintenance || includesCountry(pm?.maintenanceCountries || [])) {
    throw policyError(`L’opérateur ${label} est indisponible ou en maintenance.`, "OPERATOR_MAINTENANCE");
  }
  if (direction === "payin" && (pm?.depositMaintenance || includesCountry(pm?.depositMaintenanceCountries || []))) {
    throw policyError(`Les dépôts via ${label} sont temporairement indisponibles.`, "DEPOSIT_MAINTENANCE");
  }
  if (direction === "payout" && (pm?.withdrawalMaintenance || includesCountry(pm?.withdrawalMaintenanceCountries || []))) {
    throw policyError(`Les retraits via ${label} sont temporairement indisponibles.`, "WITHDRAWAL_MAINTENANCE");
  }
}

export const requireNotMaintenance: RequestHandler = async (_req, res, next) => {
  try { await assertNotMaintenance(); next(); }
  catch (error: any) { res.status(error.status || 503).json({ maintenance: true, message: error.message }); }
};
export function requirePaymentAllowed(direction: "payin" | "payout"): RequestHandler {
  return async (req, res, next) => {
    try {
      // Standard API intentions can omit a method; their public pay route checks it later.
      const input = req.method === "GET" ? req.query : req.body;
      if (typeof input?.operator === "string" && typeof input?.country === "string") {
        await assertPaymentAllowed(input.operator, input.country, direction);
      } else if (typeof input?.country === "string") {
        await assertCountryAllowed(input.country);
      }
      next();
    } catch (error: any) {
      res.status(error.status || 503).json({ message: error.message, error: { code: error.code, message: error.message, status: error.status || 503 } });
    }
  };
}
