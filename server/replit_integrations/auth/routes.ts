import type { Express } from "express";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { sanitizeUser } from "./userUtils";
import { z } from "zod";

function saveBase64ToFile(base64Data: string, userId: string, type: string): string {
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Format base64 invalide");
  const ext = match[1].split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const filename = `${userId}_${type}_${Date.now()}.${ext}`;
  const dir = path.resolve(process.cwd(), "uploads/kyc");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), Buffer.from(match[2], "base64"));
  return `/uploads/kyc/${filename}`;
}

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8, "Numéro de téléphone invalide (8 chiffres minimum)").optional(),
  merchantName: z.string().optional().nullable(),
});

const updateWithdrawalAccountSchema = z.object({
  country: z.string().min(2, "Pays requis"),
  operator: z.string().min(1, "Opérateur requis"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caracteres"),
});

const kycSubmitSchema = z.object({
  kycFirstName: z.string().min(1, "Prénom requis"),
  kycLastName: z.string().min(1, "Nom requis"),
  kycDocumentNumber: z.string().min(1, "Numéro de la pièce requis"),
  kycDocumentFront: z.string().min(1, "Photo recto requise"),
  kycDocumentBack: z.string().optional().nullable(),
  kycSelfie: z.string().min(1, "Selfie requis"),
});

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.id;
      const isVerified = req.user.kycStatus === "verified";
      const updates: any = {};

      if (!isVerified) {
        if (validation.data.firstName !== undefined) updates.firstName = validation.data.firstName;
        if (validation.data.lastName !== undefined) updates.lastName = validation.data.lastName;
        if (validation.data.phone !== undefined) updates.phone = validation.data.phone;
      }

      if (validation.data.email !== undefined) {
        const existing = await authStorage.getUserByEmail(validation.data.email);
        if (existing && existing.id !== userId) {
          return res.status(409).json({ message: "Cet email est deja utilise" });
        }
        updates.email = validation.data.email;
      }

      if (validation.data.merchantName !== undefined) {
        updates.merchantName = validation.data.merchantName || null;
      }

      const user = await authStorage.upsertUser({ id: userId, ...updates });
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Erreur lors de la mise a jour du profil" });
    }
  });

  app.patch("/api/auth/withdrawal-account", isAuthenticated, async (req: any, res) => {
    try {
      const validation = updateWithdrawalAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      const userId = req.user.id;
      const user = await authStorage.upsertUser({
        id: userId,
        withdrawalCountry: validation.data.country,
        withdrawalOperator: validation.data.operator,
        withdrawalPhone: validation.data.phone,
      } as any);
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error updating withdrawal account:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du compte de retrait" });
    }
  });

  app.post("/api/kyc/submit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
      if (user.kycStatus === "verified") {
        return res.status(400).json({ message: "Votre identité est déjà vérifiée" });
      }

      const validation = kycSubmitSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { kycFirstName, kycLastName, kycDocumentNumber, kycDocumentFront, kycDocumentBack, kycSelfie } = validation.data;

      const isBase64 = (s: string) => s.startsWith("data:");
      const frontPath = isBase64(kycDocumentFront) ? saveBase64ToFile(kycDocumentFront, userId, "front") : kycDocumentFront;
      const backPath = kycDocumentBack ? (isBase64(kycDocumentBack) ? saveBase64ToFile(kycDocumentBack, userId, "back") : kycDocumentBack) : null;
      const selfiePath = isBase64(kycSelfie) ? saveBase64ToFile(kycSelfie, userId, "selfie") : kycSelfie;

      const updated = await authStorage.upsertUser({
        id: userId,
        kycStatus: "pending",
        kycFirstName,
        kycLastName,
        kycDocumentNumber,
        kycDocumentFront: frontPath,
        kycDocumentBack: backPath,
        kycSelfie: selfiePath,
      } as any);
      res.json(sanitizeUser(updated));
    } catch (error) {
      console.error("Error submitting KYC:", error);
      res.status(500).json({ message: "Erreur lors de la soumission KYC" });
    }
  });

  app.patch("/api/auth/password", isAuthenticated, async (req: any, res) => {
    try {
      const validation = changePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const userId = req.user.id;
      const user = await authStorage.getUser(userId);

      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: "Utilisateur introuvable" });
      }

      const isValid = await bcrypt.compare(validation.data.currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Mot de passe actuel incorrect" });
      }

      const newHash = await bcrypt.hash(validation.data.newPassword, 10);
      await authStorage.upsertUser({ id: userId, passwordHash: newHash });

      res.json({ success: true });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Erreur lors du changement de mot de passe" });
    }
  });
}
