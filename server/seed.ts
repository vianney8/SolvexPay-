import { db } from "./db";
import { storage } from "./storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_SETTINGS: Record<string, string> = {
  fee_deposit: "7",
  fee_withdrawal: "7",
  fee_api: "7",
  omnipay_rate_deposit: "3",
  omnipay_rate_withdrawal: "3",
  support_link_whatsapp_direct: "https://wa.me/22891840498",
  support_link_whatsapp_group: "https://chat.whatsapp.com/FeGmjzHa1VG7v4VGo0Rxbd",
  support_link_email: "mailto:support@solvexpay.com",
  support_link_whatsapp_channel: "https://whatsapp.com/channel/0029Vb3WFkb2ZjCZTb0Dq11F",
  support_link_facebook: "https://www.facebook.com/profile.php?id=61574706268491",
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
