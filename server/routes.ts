import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, generateApiKey, generateSlug, generateReference } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { sendavaPayService, isApiKeyConfigured } from "./services/sendavapay";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

const SUPPORTED_COUNTRIES = ["BJ", "BF", "TG", "CM", "CI", "COD", "COG"] as const;
const SUPPORTED_OPERATORS = ["MTN", "Moov", "Orange", "TMoney", "Wave", "Vodacom", "Airtel"] as const;
const SUPPORTED_CURRENCIES = ["XOF", "XAF", "CDF"] as const;

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  BJ: "XOF", BF: "XOF", TG: "XOF", CI: "XOF",
  CM: "XAF", COG: "XAF",
  COD: "CDF",
};

const COUNTRY_OPERATORS: Record<string, string[]> = {
  BJ: ["MTN", "Moov"],
  BF: ["Moov", "Orange"],
  TG: ["TMoney", "Moov"],
  CM: ["MTN", "Orange"],
  CI: ["Orange", "MTN", "Moov", "Wave"],
  COD: ["Vodacom", "Airtel", "Orange"],
  COG: ["Airtel", "MTN"],
};

const depositSchema = z.object({
  amount: z.number().min(100, "Montant minimum: 100"),
  phoneNumber: z.string().min(8, "Numéro de téléphone invalide"),
  operator: z.enum(SUPPORTED_OPERATORS),
  country: z.enum(SUPPORTED_COUNTRIES),
  customerName: z.string().optional(),
  description: z.string().optional(),
}).refine(data => {
  const allowed = COUNTRY_OPERATORS[data.country];
  return allowed && allowed.includes(data.operator);
}, { message: "Opérateur non disponible pour ce pays" });

const withdrawSchema = z.object({
  amount: z.number().min(100, "Montant minimum: 100"),
  phoneNumber: z.string().min(8, "Numéro de téléphone invalide"),
  operator: z.enum(SUPPORTED_OPERATORS),
  country: z.enum(SUPPORTED_COUNTRIES),
}).refine(data => {
  const allowed = COUNTRY_OPERATORS[data.country];
  return allowed && allowed.includes(data.operator);
}, { message: "Opérateur non disponible pour ce pays" });

const createPaymentLinkSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  amount: z.number().min(100, "Montant minimum: 100"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("XOF"),
  description: z.string().optional(),
  redirectUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().optional(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1, "Nom requis"),
});

const updatePaymentLinkSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().min(100).optional(),
  description: z.string().optional().nullable(),
  redirectUrl: z.string().url().optional().or(z.literal("")).nullable(),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const publicPaySchema = z.object({
  operator: z.enum(SUPPORTED_OPERATORS),
  country: z.enum(SUPPORTED_COUNTRIES),
  phoneNumber: z.string().min(8, "Numéro de téléphone invalide"),
}).refine(data => {
  const allowed = COUNTRY_OPERATORS[data.country];
  return allowed && allowed.includes(data.operator);
}, { message: "Opérateur non disponible pour ce pays" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/wallet", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let wallet = await storage.getWallet(userId);
      
      if (!wallet) {
        wallet = await storage.createWallet(userId);
      }
      
      res.json(wallet);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  app.get("/api/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const transactions = await storage.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions/deposit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const validation = depositSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { amount, phoneNumber, operator, country, customerName, description } = validation.data;
      const currency = COUNTRY_CURRENCY_MAP[country] || "XOF";

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configuré" });
      }

      let wallet = await storage.getWallet(userId);
      if (!wallet) {
        wallet = await storage.createWallet(userId);
      }

      const paymentResponse = await sendavaPayService.createPayment({
        amount,
        phoneNumber,
        operator,
        country,
        customerName: customerName || req.user.username || "",
        description: description || `Dépôt SolvexPay`,
      });

      const reference = paymentResponse.reference || paymentResponse.txid || generateReference();

      const transaction = await storage.createTransaction({
        userId,
        type: "deposit",
        amount: amount.toString(),
        currency,
        provider: operator,
        phoneNumber,
        reference,
        status: "pending",
        description: `Dépôt via ${operator} (${country})`,
      });

      res.json({
        ...transaction,
        sendavaStatus: paymentResponse.status,
        sendavaMessage: paymentResponse.message,
      });
    } catch (error: any) {
      console.error("Error creating deposit:", error);
      res.status(500).json({ message: error.message || "Échec du dépôt" });
    }
  });

  app.post("/api/transactions/withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const validation = withdrawSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { amount, phoneNumber, operator, country } = validation.data;
      const currency = COUNTRY_CURRENCY_MAP[country] || "XOF";

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configuré" });
      }

      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Aucun portefeuille trouvé" });
      }

      const balanceKey = `balance${currency}` as keyof typeof wallet;
      const currentBalance = parseFloat(wallet[balanceKey] as string || "0");
      
      if (currentBalance < amount) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      const withdrawResponse = await sendavaPayService.createWithdraw({
        amount,
        phoneNumber,
        operator,
        country,
      });

      const reference = withdrawResponse.reference || withdrawResponse.txid || generateReference();

      const transaction = await storage.createTransaction({
        userId,
        type: "withdrawal",
        amount: amount.toString(),
        currency,
        provider: operator,
        phoneNumber,
        reference,
        status: "pending",
        description: `Retrait vers ${operator} (${country})`,
      });

      await storage.updateWalletBalance(userId, currency, -amount);

      res.json({
        ...transaction,
        sendavaStatus: withdrawResponse.status,
        sendavaMessage: withdrawResponse.message,
      });
    } catch (error: any) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: error.message || "Échec du retrait" });
    }
  });

  app.post("/api/transactions/verify", isAuthenticated, async (req: any, res) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ message: "Référence requise" });
      }

      const result = await sendavaPayService.verifyPayment(reference);

      if (result.status === "SUCCESS") {
        const transaction = await storage.getTransactionByReference(reference);
        if (transaction && transaction.status === "pending") {
          await storage.updateTransactionStatus(transaction.id, "completed");
          if (transaction.type === "deposit") {
            await storage.updateWalletBalance(
              transaction.userId,
              transaction.currency,
              parseFloat(transaction.amount)
            );
          }
        }
      } else if (result.status === "FAILED" || result.status === "CANCELLED") {
        const transaction = await storage.getTransactionByReference(reference);
        if (transaction && transaction.status === "pending") {
          await storage.updateTransactionStatus(transaction.id, "failed");
          if (transaction.type === "withdrawal") {
            await storage.updateWalletBalance(
              transaction.userId,
              transaction.currency,
              parseFloat(transaction.amount)
            );
          }
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Verify error:", error);
      res.status(500).json({ message: error.message || "Erreur de vérification" });
    }
  });

  app.get("/api/payment-links", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const paymentLinks = await storage.getPaymentLinks(userId);
      res.json(paymentLinks);
    } catch (error) {
      console.error("Error fetching payment links:", error);
      res.status(500).json({ message: "Failed to fetch payment links" });
    }
  });

  app.post("/api/payment-links", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const validation = createPaymentLinkSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { name, amount, currency, description, redirectUrl, imageUrl } = validation.data;

      const paymentLink = await storage.createPaymentLink({
        userId,
        name,
        amount: amount.toString(),
        currency,
        description,
        redirectUrl: redirectUrl || null,
        imageUrl: imageUrl || null,
        slug: generateSlug(),
        isActive: true,
      });

      res.json(paymentLink);
    } catch (error) {
      console.error("Error creating payment link:", error);
      res.status(500).json({ message: "Failed to create payment link" });
    }
  });

  app.patch("/api/payment-links/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validation = updatePaymentLinkSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const updateData: any = {};
      const { name, amount, description, redirectUrl, imageUrl, isActive } = validation.data;
      if (name !== undefined) updateData.name = name;
      if (amount !== undefined) updateData.amount = amount.toString();
      if (description !== undefined) updateData.description = description;
      if (redirectUrl !== undefined) updateData.redirectUrl = redirectUrl || null;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const paymentLink = await storage.updatePaymentLink(id, updateData);
      res.json(paymentLink);
    } catch (error) {
      console.error("Error updating payment link:", error);
      res.status(500).json({ message: "Failed to update payment link" });
    }
  });

  app.delete("/api/payment-links/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePaymentLink(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment link:", error);
      res.status(500).json({ message: "Failed to delete payment link" });
    }
  });

  app.get("/api/payment-links/public/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const paymentLink = await storage.getPaymentLinkBySlug(slug);
      
      if (!paymentLink) {
        return res.status(404).json({ message: "Payment link not found" });
      }

      res.json(paymentLink);
    } catch (error) {
      console.error("Error fetching payment link:", error);
      res.status(500).json({ message: "Failed to fetch payment link" });
    }
  });

  app.post("/api/payment-links/public/:slug/pay", async (req, res) => {
    try {
      const { slug } = req.params;
      
      const validation = publicPaySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { operator, country, phoneNumber } = validation.data;

      const paymentLink = await storage.getPaymentLinkBySlug(slug);
      
      if (!paymentLink) {
        return res.status(404).json({ message: "Lien de paiement introuvable" });
      }

      if (!paymentLink.isActive) {
        return res.status(400).json({ message: "Ce lien de paiement est inactif" });
      }

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configuré" });
      }

      const paymentResponse = await sendavaPayService.createPayment({
        amount: parseFloat(paymentLink.amount),
        phoneNumber,
        operator,
        country,
        description: paymentLink.description || paymentLink.name,
      });

      const reference = paymentResponse.reference || paymentResponse.txid || generateReference();

      const transaction = await storage.createTransaction({
        userId: paymentLink.userId,
        type: "deposit",
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        provider: operator,
        phoneNumber,
        reference,
        status: "pending",
        description: `Paiement via lien: ${paymentLink.name}`,
      });

      await storage.incrementPaymentLinkUsage(paymentLink.id);

      res.json({
        ...transaction,
        sendavaStatus: paymentResponse.status,
        sendavaMessage: paymentResponse.message,
      });
    } catch (error: any) {
      console.error("Error processing payment:", error);
      res.status(500).json({ message: error.message || "Échec du paiement" });
    }
  });

  app.get("/api/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const apiKeys = await storage.getApiKeys(userId);
      res.json(apiKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const validation = createApiKeySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { name } = validation.data;

      const { key, prefix, hash } = generateApiKey();

      const apiKey = await storage.createApiKey({
        userId,
        name,
        keyPrefix: prefix,
        keyHash: hash,
        fullKey: key,
        environment: "live",
        isActive: true,
      });

      res.json(apiKey);
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.patch("/api/api-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const apiKey = await storage.updateApiKey(id, { isActive });
      res.json(apiKey);
    } catch (error) {
      console.error("Error updating API key:", error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  app.delete("/api/api-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteApiKey(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  app.post("/api/upload", isAuthenticated, upload.single("image"), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  app.use("/uploads", (await import("express")).default.static(uploadDir));

  return httpServer;
}
