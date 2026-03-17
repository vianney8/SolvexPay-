import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { users } from "@shared/models/auth";
import { apiKeys } from "@shared/schema";
import { db } from "../db";
import { sendWithdrawalEmail, sendKycStatusEmail } from "./resend";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7671423781:AAFuF1FqSMRufUOStIX-zzexKE0hEeLGtKc";

// Derive a stable webhook secret from the BOT_TOKEN so no extra env var is needed
function getWebhookSecret(): string {
  return crypto.createHash("sha256").update(`webhook:${BOT_TOKEN}`).digest("hex").slice(0, 64);
}
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "8360195532";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

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

async function send(text: string, extra?: object): Promise<any> {
  try {
    const r = await axios.post(`${API}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      ...extra,
    });
    return r.data?.result;
  } catch (err: any) {
    console.error("Telegram sendMessage error:", err?.response?.data || err?.message);
  }
}

async function editMsg(messageId: number, text: string, extra?: object): Promise<void> {
  try {
    await axios.post(`${API}/editMessageText`, {
      chat_id: CHAT_ID,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      ...extra,
    });
  } catch (err: any) {
    console.error("Telegram editMessageText error:", err?.response?.data || err?.message);
  }
}

function base64ToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.split(",")[1];
  return Buffer.from(base64, "base64");
}

function getMediaType(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/\w+);/);
  return match ? match[1] : "image/jpeg";
}

async function sendPhoto(imageData: string, caption?: string, extra?: object): Promise<any> {
  try {
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    const buf = base64ToBuffer(imageData);
    const mimeType = getMediaType(imageData);
    const ext = mimeType.split("/")[1] || "jpg";
    form.append("photo", buf, { filename: `kyc.${ext}`, contentType: mimeType });
    if (caption) form.append("caption", caption);
    form.append("parse_mode", "HTML");
    if (extra) {
      for (const [key, val] of Object.entries(extra as Record<string, any>)) {
        form.append(key, typeof val === "object" ? JSON.stringify(val) : String(val));
      }
    }
    const r = await axios.post(`${API}/sendPhoto`, form, {
      headers: form.getHeaders(),
    });
    return r.data?.result;
  } catch (err: any) {
    console.error("Telegram sendPhoto error:", err?.response?.data || err?.message);
  }
}

interface UserInfo {
  merchantName: string;
  firstName: string;
  email: string;
}

async function getUserInfo(userId: string): Promise<UserInfo> {
  try {
    const [u] = await db.select({
      merchantName: users.merchantName,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    }).from(users).where(eq(users.id, userId));
    const firstName = u?.firstName || "";
    const merchantName = u?.merchantName || [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "Inconnu";
    return { merchantName, firstName, email: u?.email || "" };
  } catch (err) {
    console.error("getUserInfo error:", err);
    return { merchantName: "Inconnu", firstName: "", email: "" };
  }
}

async function getMerchantName(userId: string): Promise<string> {
  return (await getUserInfo(userId)).merchantName;
}

async function getApiKeyName(apiKeyId: string): Promise<string> {
  try {
    const [k] = await db.select({ appName: apiKeys.appName, name: apiKeys.name })
      .from(apiKeys)
      .where(eq(apiKeys.id, apiKeyId));
    return k?.appName || k?.name || "API";
  } catch (err) {
    console.error("getApiKeyName error:", err);
    return "API";
  }
}

function getSourceLabel(tx: any, apiKeyName?: string): string {
  if (tx.apiKeyId && apiKeyName && apiKeyName !== "API") return `API — <b>${apiKeyName}</b>`;
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
    const operator = tx.payerOperator || tx.provider || "—";

    await send(
      `✅ <b>Paiement réussi</b>\n\n` +
      `📋 Référence: <code>${tx.reference}</code>\n` +
      `👤 Marchand: <b>${merchantName}</b>\n` +
      `📱 Numéro: <code>${phone}</code>\n` +
      `📡 Opérateur: ${operator}\n` +
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

export interface KycNotifyData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  documentNumber: string;
  frontImage: string | null;
  backImage: string | null;
  selfieImage: string | null;
}

export async function notifyKycPending(data: KycNotifyData): Promise<void> {
  try {
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ") || "Inconnu";
    const infoText =
      `🆔 <b>Nouvelle demande KYC</b>\n\n` +
      `👤 Nom: <b>${fullName}</b>\n` +
      `📧 Email: <code>${data.email}</code>\n` +
      `🔢 N° Pièce: <code>${data.documentNumber || "—"}</code>\n` +
      `🕐 Heure: ${now()}`;

    const keyboard = {
      inline_keyboard: [[
        { text: "✅ Vérifier", callback_data: `kv_${data.userId}` },
        { text: "❌ Rejeter", callback_data: `krs_${data.userId}` },
      ]],
    };

    const isB64 = (s: string | null | undefined) => !!(s && s.startsWith("data:"));

    if (isB64(data.frontImage)) {
      await sendPhoto(data.frontImage!, `📄 <b>Recto</b> — ${fullName}`, { caption: `📄 <b>Recto de la pièce</b>\n${fullName}` });
    }
    if (isB64(data.backImage)) {
      await sendPhoto(data.backImage!, undefined, { caption: `📄 <b>Verso de la pièce</b>\n${fullName}` });
    }
    if (isB64(data.selfieImage)) {
      await sendPhoto(data.selfieImage!, undefined, { caption: `🤳 <b>Selfie</b>\n${fullName}` });
    }

    await send(infoText, { reply_markup: keyboard });
  } catch (err) {
    console.error("notifyKycPending error:", err);
  }
}

export async function setupTelegramWebhook(): Promise<void> {
  try {
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
    if (!domain) {
      console.log("[Telegram] REPLIT_DOMAINS non défini — webhook non enregistré");
      return;
    }
    const webhookUrl = `https://${domain}/api/telegram/webhook`;
    const secret = getWebhookSecret();
    // Store secret in env so the route handler can verify it
    process.env.TELEGRAM_WEBHOOK_SECRET = secret;
    await axios.post(`${API}/setWebhook`, {
      url: webhookUrl,
      secret_token: secret,
      drop_pending_updates: true,
    });
    console.log(`[Telegram] Webhook enregistré : ${webhookUrl}`);
  } catch (err: any) {
    console.error("[Telegram] Erreur enregistrement webhook:", err?.response?.data || err?.message);
  }
}

export async function handleTelegramCallback(callbackQuery: any): Promise<void> {
  const data: string = callbackQuery?.data || "";
  const messageId: number = callbackQuery?.message?.message_id;

  try {
    await axios.post(`${API}/answerCallbackQuery`, { callback_query_id: callbackQuery.id });
  } catch (_) {}

  if (data.startsWith("kv_")) {
    const userId = data.slice(3);
    await updateKycStatus(userId, "verified", null, messageId);

  } else if (data.startsWith("krs_")) {
    const [, userId] = data.split("krs_");
    const kycMsgId = messageId;
    try {
      await axios.post(`${API}/editMessageReplyMarkup`, {
        chat_id: CHAT_ID,
        message_id: kycMsgId,
        reply_markup: { inline_keyboard: [] },
      });
    } catch (_) {}
    const keyboard = {
      inline_keyboard: [
        [{ text: "📷 Document illisible", callback_data: `kr1_${userId}_${kycMsgId}` }],
        [{ text: "ℹ️ Informations incorrectes", callback_data: `kr2_${userId}_${kycMsgId}` }],
        [{ text: "❌ Document invalide/expiré", callback_data: `kr3_${userId}_${kycMsgId}` }],
        [{ text: "🚫 Photo non conforme (selfie)", callback_data: `kr4_${userId}_${kycMsgId}` }],
        [{ text: "🔕 Rejeter sans motif", callback_data: `kr0_${userId}_${kycMsgId}` }],
      ],
    };
    await send(`❌ <b>Choisir le motif de rejet :</b>`, { reply_markup: keyboard });

  } else if (data.startsWith("kr0_") || data.startsWith("kr1_") || data.startsWith("kr2_") || data.startsWith("kr3_") || data.startsWith("kr4_")) {
    const prefix = data.slice(0, 4);
    const rest = data.slice(4);
    const lastUnderscore = rest.lastIndexOf("_");
    const userId = rest.slice(0, lastUnderscore);
    const kycMsgId = parseInt(rest.slice(lastUnderscore + 1), 10) || messageId;
    const reasons: Record<string, string | null> = {
      "kr0_": null,
      "kr1_": "Document illisible. Veuillez soumettre des photos claires.",
      "kr2_": "Les informations sur la pièce ne correspondent pas à votre profil.",
      "kr3_": "Document invalide ou expiré. Veuillez utiliser un document en cours de validité.",
      "kr4_": "Le selfie ne correspond pas aux exigences (visage non visible ou document non tenu).",
    };
    const reason = reasons[prefix] ?? null;
    await editMsg(messageId, `🗑 <i>Motif sélectionné — traitement en cours...</i>`, { reply_markup: { inline_keyboard: [] } });
    await updateKycStatus(userId, "rejected", reason, kycMsgId);
  }
}

async function updateKycStatus(userId: string, status: "verified" | "rejected", reason: string | null, messageId?: number): Promise<void> {
  try {
    const updateData: any = { kycStatus: status, updatedAt: new Date() };
    if (status === "rejected" && reason) updateData.kycRejectionReason = reason;
    if (status === "verified") updateData.kycRejectionReason = null;

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();

    const icon = status === "verified" ? "✅" : "❌";
    const label = status === "verified" ? "KYC VÉRIFIÉ" : "KYC REJETÉ";
    const extra = reason ? `\n📝 Motif: <i>${reason}</i>` : "";
    const name = updated ? [updated.firstName, updated.lastName].filter(Boolean).join(" ") : userId;
    const confirmText = `${icon} <b>${label}</b>\n👤 ${name}${extra}\n🕐 ${now()}`;

    if (messageId) {
      await editMsg(messageId, confirmText, { reply_markup: { inline_keyboard: [] } });
    } else {
      await send(confirmText);
    }

    if (updated?.email) {
      sendKycStatusEmail(
        updated.email,
        updated.firstName || updated.email,
        status,
        reason
      ).catch(e => console.error("[Telegram] KYC email error:", e?.message));
    }
  } catch (err) {
    console.error("updateKycStatus error:", err);
    await send(`⚠️ Erreur lors de la mise à jour KYC pour <code>${userId}</code>`);
  }
}
