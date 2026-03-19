import { db } from "./db";
import { storage } from "./storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_SETTINGS: Record<string, string> = {
  // ── Frais globaux ──
  fee_deposit: "6",
  fee_withdrawal: "5",
  fee_transfer: "6",
  fee_api: "6",

  // ── Taux OmniPay ──
  omnipay_rate_deposit: "3",
  omnipay_rate_withdrawal: "3",

  // ── Mode de retrait ──
  withdrawalMode: "auto",

  // ── Liens de support — URLs ──
  support_link_whatsapp_direct: "https://wa.me/+22964440084",
  support_link_whatsapp_group: "https://chat.whatsapp.com/BU8fF9ys87eD3BfrnfPUDz",
  support_link_email: "mailto:support@solvexpay.com",
  support_link_whatsapp_channel: "https://whatsapp.com/channel/0029VbBDhXf0LKZ6KPgmfw04",
  support_link_facebook: "https://www.facebook.com/profile.php?id=61586343275256",

  // ── Liens de support — Noms affichés ──
  support_link_whatsapp_direct_label: "Telegram Support",
  support_link_whatsapp_group_label: "Groupe Télégramme",
  support_link_email_label: "Email Support",
  support_link_whatsapp_channel_label: "Canal WhatsApp",
  support_link_facebook_label: "Page Facebook",

  // ── Liens de support — Visibilité (1 = visible, 0 = masqué) ──
  support_link_whatsapp_direct_visible: "1",
  support_link_whatsapp_group_visible: "0",
  support_link_email_visible: "1",
  support_link_whatsapp_channel_visible: "1",
  support_link_facebook_visible: "1",

  // ── Pays suspendus ──
  suspended_countries: "[]",
};

export async function seedDefaults() {
  try {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await storage.getSystemSetting(key);
      if (existing === null) {
        await storage.setSystemSetting(key, value);
        console.log(`[init] Paramètre par défaut créé: ${key} = ${value}`);
      }
    }

    await promoteAdminEmail();

    console.log("[init] Initialisation terminée.");
  } catch (err) {
    console.error("[init] Erreur lors de l'initialisation:", err);
  }
}

export async function promoteAdminEmail() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  try {
    const [user] = await db.select().from(users).where(eq(users.email, adminEmail));
    if (user && !user.isAdmin) {
      await db
        .update(users)
        .set({ isAdmin: true, updatedAt: new Date() })
        .where(eq(users.email, adminEmail));
      console.log(`[init] Compte admin promu: ${adminEmail}`);
    }
  } catch (err) {
    console.error("[init] Erreur promotion admin:", err);
  }
}
