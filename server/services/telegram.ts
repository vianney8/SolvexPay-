import axios from "axios";
import { sendWithdrawalEmail } from "./resend";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7671423781:AAFuF1FqSMRufUOStIX-zzexKE0hEeLGtKc";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8360195532";

function fmt(n: number, currency = "XOF"): string {
  return `${n.toLocaleString("fr-FR")} ${currency}`;
}

function now(): string {
  return new Date().toLocaleString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

async function send(text: string): Promise<void> {
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
    });
  } catch (err: any) {
    console.error("Telegram notification error:", err?.response?.data || err?.message);
  }
}

interface UserInfo {
  merchantName: string;
  firstName: string;
  email: string;
}

async function getUserInfo(userId: string): Promise<UserInfo> {
  try {
    const { users: usersTable } = await import("@shared/schema");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const [u] = await db.select({
      merchantName: usersTable.merchantName,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
    }).from(usersTable).where(eq(usersTable.id, userId));
    const firstName = u?.firstName || "";
    const merchantName = (u as any)?.merchantName || [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "Inconnu";
    return { merchantName, firstName, email: u?.email || "" };
  } catch {
    return { merchantName: "Inconnu", firstName: "", email: "" };
  }
}

async function getMerchantName(userId: string): Promise<string> {
  return (await getUserInfo(userId)).merchantName;
}

async function getApiKeyName(apiKeyId: string): Promise<string> {
  try {
    const { apiKeys } = await import("@shared/schema");
    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const [k] = await db.select({ appName: apiKeys.appName, name: apiKeys.name }).from(apiKeys).where(eq(apiKeys.id, apiKeyId));
    return (k as any)?.appName || (k as any)?.name || "API";
  } catch {
    return "API";
  }
}

function getSourceLabel(tx: any, apiKeyName?: string): string {
  if (tx.apiKeyId && apiKeyName) return `API — <b>${apiKeyName}</b>`;
  if (tx.apiKeyId) return "Via API";
  if (tx.description?.startsWith("Paiement via lien:")) {
    const name = tx.description.replace("Paiement via lien:", "").trim();
    return `Lien — <b>${name}</b>`;
  }
  return "Dépôt direct";
}

// ── Public notification functions ─────────────────────────────────────────────

export async function notifyTransactionCompleted(tx: any): Promise<void> {
  try {
    const merchantName = await getMerchantName(tx.userId);
    const apiKeyName = tx.apiKeyId ? await getApiKeyName(tx.apiKeyId) : undefined;
    const sourceLabel = getSourceLabel(tx, apiKeyName);
    const amount = parseFloat(tx.amount || "0");
    const currency = tx.currency || "XOF";
    const phone = tx.phoneNumber || tx.payerName || "—";

    await send(
      `✅ <b>Paiement réussi</b>\n\n` +
      `📋 Référence: <code>${tx.reference}</code>\n` +
      `👤 Marchand: <b>${merchantName}</b>\n` +
      `📱 Numéro: <code>${phone}</code>\n` +
      `💰 Montant: <b>${fmt(amount, currency)}</b>\n` +
      `🔗 Source: ${sourceLabel}\n` +
      `🕐 Heure: ${now()}`
    );
  } catch (err) {
    console.error("notifyTransactionCompleted error:", err);
  }
}

export async function notifyWithdrawal(tx: any, statusLabel: "success" | "failed"): Promise<void> {
  try {
    const userInfo = await getUserInfo(tx.userId);
    const amount = parseFloat(tx.amount || "0");
    const currency = tx.currency || "XOF";
    const phone = tx.phoneNumber || "—";
    const operator = tx.provider || "—";
    const dateStr = now();
    const icon = statusLabel === "success" ? "✅" : "❌";
    const label = statusLabel === "success" ? "Retrait réussi" : "Retrait échoué";

    await send(
      `${icon} <b>${label}</b>\n\n` +
      `📋 Référence: <code>${tx.reference}</code>\n` +
      `👤 Marchand: <b>${userInfo.merchantName}</b>\n` +
      `📱 Numéro: <code>${phone}</code>\n` +
      `💰 Montant: <b>${fmt(amount, currency)}</b>\n` +
      `📡 Opérateur: ${operator}\n` +
      `🕐 Heure: ${dateStr}`
    );

    if (userInfo.email) {
      await sendWithdrawalEmail(userInfo.email, userInfo.firstName || userInfo.merchantName, {
        status: statusLabel,
        reference: tx.reference,
        amount,
        currency,
        phone,
        operator,
        date: dateStr,
      });
    }
  } catch (err) {
    console.error("notifyWithdrawal error:", err);
  }
}

export async function notifyKycPending(firstName: string, lastName: string, email: string): Promise<void> {
  try {
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Inconnu";
    await send(
      `🆔 <b>Nouvelle demande KYC en attente</b>\n\n` +
      `👤 Nom: <b>${fullName}</b>\n` +
      `📧 Email: <code>${email}</code>\n` +
      `🕐 Heure: ${now()}`
    );
  } catch (err) {
    console.error("notifyKycPending error:", err);
  }
}
