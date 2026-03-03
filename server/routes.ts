import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, generateApiKey, generateSlug, generateReference } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, registerAuthRoutes } from "./replit_integrations/auth";
import { omniPayService, isApiKeyConfigured, verifyCallbackSignature, omnipayStatusToString, type OmniPayCallbackPayload } from "./services/omnipay";
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

const SUPPORTED_CURRENCIES = ["XOF", "XAF", "CDF"] as const;

const SUPPORTED_OPERATORS = ["MTN", "Moov", "Orange", "TMoney", "Wave", "Vodacom", "Airtel"] as const;
const SUPPORTED_COUNTRIES = ["BJ", "BF", "TG", "CM", "CI", "COD", "COG"] as const;

const depositSchema = z.object({
  amount: z.number().min(100, "Montant minimum: 100"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("XOF"),
  phoneNumber: z.string().min(8, "Numero de telephone invalide"),
  operator: z.string().min(1, "Operateur requis"),
  country: z.string().min(2, "Pays requis"),
  customerName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  otp: z.string().optional(),
  description: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().min(100, "Montant minimum: 100"),
  phoneNumber: z.string().min(8, "Numero de telephone invalide"),
  operator: z.string().min(1, "Operateur requis"),
  country: z.string().min(2, "Pays requis"),
});

const transferSchema = z.object({
  amount: z.number().min(500, "Montant minimum: 500"),
  phoneNumber: z.string().min(8, "Numero de telephone invalide"),
  operator: z.string().min(1, "Operateur requis"),
  country: z.string().min(2, "Pays requis"),
  firstName: z.string().min(1, "Prenom du destinataire requis"),
  lastName: z.string().min(1, "Nom du destinataire requis"),
});

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
  phoneNumber: z.string().min(8, "Numero de telephone invalide"),
  operator: z.string().min(1, "Operateur requis"),
  country: z.string().min(2, "Pays requis"),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
});

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
      
      const { amount, currency, phoneNumber, operator, country, customerName, firstName, lastName, otp, description } = validation.data;

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configure" });
      }

      let wallet = await storage.getWallet(userId);
      if (!wallet) {
        wallet = await storage.createWallet(userId);
      }

      const fullName = customerName || req.user?.name || req.user?.firstName || "Client";
      const nameParts = fullName.trim().split(" ");
      const resolvedFirstName = firstName || nameParts[0] || "Client";
      const resolvedLastName = lastName || nameParts.slice(1).join(" ") || "SolvexPay";

      const reference = generateReference();
      const isWave = operator.toLowerCase() === "wave";
      const returnUrl = isWave ? `https://solvexpay.site/api/payment/callback?reference=${reference}` : undefined;

      const depositResponse = await omniPayService.deposit({
        msisdn: phoneNumber,
        amount,
        reference,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        otp,
        operator: isWave || operator.toLowerCase() === "mixx" ? operator : undefined,
        returnUrl,
      });

      const depositFeeRate = ["BF", "COG"].includes(country) ? 0.06 : 0.05;
      const depositFees = Math.round(amount * depositFeeRate);

      const transaction = await storage.createTransaction({
        userId,
        type: "deposit",
        amount: amount.toString(),
        currency,
        provider: operator,
        phoneNumber,
        reference,
        status: "pending",
        description: description || "Depot SolvexPay",
        fees: String(depositFees),
      } as any);

      res.json({
        ...transaction,
        omnipayId: depositResponse.id,
        paymentUrl: depositResponse.payment_url,
      });
    } catch (error: any) {
      console.error("Error creating deposit:", error);
      res.status(500).json({ message: error.message || "Echec du depot" });
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
      const currency = "XOF";

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configure" });
      }

      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Aucun portefeuille trouve" });
      }

      const balanceKey = `balance${currency}` as keyof typeof wallet;
      const currentBalance = parseFloat((wallet[balanceKey] as string) || "0");
      if (currentBalance < amount) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      const fullName = req.user?.name || req.user?.firstName || "Client";
      const nameParts = fullName.trim().split(" ");
      const resolvedFirstName = nameParts[0] || "Client";
      const resolvedLastName = nameParts.slice(1).join(" ") || "SolvexPay";

      const reference = generateReference();
      const isWave = operator.toLowerCase() === "wave";

      const transferResponse = await omniPayService.transfer({
        msisdn: phoneNumber,
        amount,
        reference,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        operator: isWave ? operator : undefined,
      });

      const transaction = await storage.createTransaction({
        userId,
        type: "withdrawal",
        amount: amount.toString(),
        currency,
        provider: "omnipay",
        phoneNumber,
        reference,
        status: "pending",
        description: `Retrait vers ${phoneNumber}`,
      });

      await storage.updateWalletBalance(userId, currency, -amount);

      res.json({
        ...transaction,
        omnipayId: transferResponse.id,
      });
    } catch (error: any) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: error.message || "Echec du retrait" });
    }
  });

  app.post("/api/transactions/transfer", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const validation = transferSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { amount, phoneNumber, operator, country, firstName, lastName } = validation.data;
      const currency = "XOF";

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configure" });
      }

      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Aucun portefeuille trouve" });
      }

      const currentBalance = parseFloat((wallet.balanceXOF as string) || "0");
      if (currentBalance < amount) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      const reference = generateReference();
      const isWave = operator.toLowerCase() === "wave";

      const transferResponse = await omniPayService.transfer({
        msisdn: phoneNumber,
        amount,
        reference,
        firstName,
        lastName,
        operator: isWave ? operator : undefined,
      });

      const transaction = await storage.createTransaction({
        userId,
        type: "transfer",
        amount: amount.toString(),
        currency,
        provider: "omnipay",
        phoneNumber,
        reference,
        status: "pending",
        description: `Transfert vers ${firstName} ${lastName} (${phoneNumber})`,
      });

      await storage.updateWalletBalance(userId, currency, -amount);

      res.json({
        ...transaction,
        omnipayId: transferResponse.id,
      });
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      res.status(500).json({ message: error.message || "Echec du transfert" });
    }
  });

  app.post("/api/transactions/verify", isAuthenticated, async (req: any, res) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ message: "Reference requise" });
      }

      const result = await omniPayService.getStatus(reference);
      const statusStr = omnipayStatusToString(result.status ?? 0);

      const transaction = await storage.getTransactionByReference(reference);
      if (transaction && transaction.status === "pending") {
        if (statusStr === "completed") {
          await storage.updateTransactionStatus(transaction.id, "completed");
          if (transaction.type === "deposit") {
            const grossAmount = parseFloat(transaction.amount);
            const txFees = parseFloat((transaction as any).fees || "0") || 0;
            const netAmount = grossAmount - txFees;
            await storage.updateWalletBalance(
              transaction.userId,
              transaction.currency,
              netAmount > 0 ? netAmount : grossAmount
            );
          }
        } else if (statusStr === "failed") {
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

      res.json({ success: result.success, status: statusStr, omnipayStatus: result.status });
    } catch (error: any) {
      console.error("Verify error:", error);
      res.status(500).json({ message: error.message || "Erreur de verification" });
    }
  });

  app.post("/api/payment-links/verify-public", async (req, res) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ message: "Reference requise" });
      }

      const result = await omniPayService.getStatus(reference);
      const statusStr = omnipayStatusToString(result.status ?? 0);

      const transaction = await storage.getTransactionByReference(reference);
      if (transaction && transaction.status === "pending") {
        if (statusStr === "completed") {
          await storage.updateTransactionStatus(transaction.id, "completed");
          if (transaction.type === "deposit") {
            const grossAmt = parseFloat(transaction.amount);
            const txFees2 = parseFloat((transaction as any).fees || "0") || 0;
            const netAmt = grossAmt - txFees2;
            await storage.updateWalletBalance(
              transaction.userId,
              transaction.currency,
              netAmt > 0 ? netAmt : grossAmt
            );
          }
        } else if (statusStr === "failed") {
          await storage.updateTransactionStatus(transaction.id, "failed");
        }
      }

      res.json({ success: result.success, status: statusStr });
    } catch (error: any) {
      console.error("Public verify error:", error);
      res.status(500).json({ message: error.message || "Erreur de verification" });
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
      
      const { phoneNumber, operator, country, customerName, customerEmail } = validation.data;

      const paymentLink = await storage.getPaymentLinkBySlug(slug);
      
      if (!paymentLink) {
        return res.status(404).json({ message: "Lien de paiement introuvable" });
      }

      if (!paymentLink.isActive) {
        return res.status(400).json({ message: "Ce lien de paiement est inactif" });
      }

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configure" });
      }

      const reference = generateReference();
      const fullName = customerName || "Client";
      const nameParts = fullName.trim().split(" ");
      const resolvedFirstName = nameParts[0] || "Client";
      const resolvedLastName = nameParts.slice(1).join(" ") || "SolvexPay";
      const isWave = operator.toLowerCase() === "wave";
      const returnUrl = isWave
        ? `https://solvexpay.site/pay/${slug}?status=callback&reference=${reference}`
        : undefined;

      const linkAmount = parseFloat(paymentLink.amount);
      const feeRate = ["BF", "COG"].includes(country) ? 0.06 : 0.05;
      const feesAmount = Math.round(linkAmount * feeRate);

      const depositResponse = await omniPayService.deposit({
        msisdn: phoneNumber,
        amount: linkAmount,
        reference,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        operator: isWave || operator.toLowerCase() === "mixx" ? operator : undefined,
        returnUrl,
      });

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
        fees: String(feesAmount),
        payerName: customerName || undefined,
        payerEmail: customerEmail || undefined,
        payerCountry: country,
        payerOperator: operator,
      } as any);

      await storage.incrementPaymentLinkUsage(paymentLink.id);

      res.json({
        ...transaction,
        omnipayId: depositResponse.id,
        paymentUrl: depositResponse.payment_url,
      });
    } catch (error: any) {
      console.error("Error processing payment:", error);
      res.status(500).json({ message: error.message || "Echec du paiement" });
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

  app.post("/api/webhooks/omnipay", async (req, res) => {
    try {
      const payload = req.body as OmniPayCallbackPayload;
      console.log("OmniPay callback received:", payload);

      const callbackKey = omniPayService.getCallbackKey();
      if (callbackKey && payload.signature) {
        const isValid = verifyCallbackSignature(payload, callbackKey);
        if (!isValid) {
          console.error("OmniPay callback: invalid signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      const { reference, status: statusCode, type } = payload;
      if (!reference) {
        return res.json({ received: true });
      }

      const statusStr = omnipayStatusToString(Number(statusCode));
      const transaction = await storage.getTransactionByReference(reference);

      if (!transaction || transaction.status !== "pending") {
        return res.json({ received: true });
      }

      if (statusStr === "completed") {
        await storage.updateTransactionStatus(transaction.id, "completed");
        if (transaction.type === "deposit") {
          const grossAmtWh = parseFloat(transaction.amount);
          const txFeesWh = parseFloat((transaction as any).fees || "0") || 0;
          const netAmtWh = grossAmtWh - txFeesWh;
          await storage.updateWalletBalance(
            transaction.userId,
            transaction.currency,
            netAmtWh > 0 ? netAmtWh : grossAmtWh
          );
          console.log(`OmniPay callback: deposit ${reference} completed, wallet credited`);
        } else if (transaction.type === "withdrawal") {
          console.log(`OmniPay callback: transfer ${reference} completed`);
        }
      } else if (statusStr === "failed") {
        await storage.updateTransactionStatus(transaction.id, "failed");
        if (transaction.type === "withdrawal") {
          await storage.updateWalletBalance(
            transaction.userId,
            transaction.currency,
            parseFloat(transaction.amount)
          );
          console.log(`OmniPay callback: transfer ${reference} failed, balance refunded`);
        } else {
          console.log(`OmniPay callback: payment ${reference} failed`);
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("OmniPay callback processing error:", error);
      res.status(500).json({ error: "Callback processing failed" });
    }
  });

  app.get("/api/payment/callback", async (req, res) => {
    const { reference } = req.query;
    console.log(`OmniPay payment redirect callback: reference=${reference}`);

    if (reference && typeof reference === "string") {
      try {
        const result = await omniPayService.getStatus(reference);
        const statusStr = omnipayStatusToString(result.status ?? 0);
        const transaction = await storage.getTransactionByReference(reference);
        if (transaction && transaction.status === "pending") {
          if (statusStr === "completed") {
            await storage.updateTransactionStatus(transaction.id, "completed");
            if (transaction.type === "deposit") {
              await storage.updateWalletBalance(
                transaction.userId,
                transaction.currency,
                parseFloat(transaction.amount)
              );
            }
          } else if (statusStr === "failed") {
            await storage.updateTransactionStatus(transaction.id, "failed");
          }
        }
      } catch (error) {
        console.error("Callback verify error:", error);
      }
    }

    res.redirect(`/deposit?status=callback`);
  });

  app.get("/api/settings/webhook-urls", isAuthenticated, async (req, res) => {
    const baseUrl = "https://solvexpay.site";

    res.json({
      callbackUrl: `${baseUrl}/api/webhooks/omnipay`,
      returnUrl: `${baseUrl}/api/payment/callback`,
      domain: "solvexpay.site",
      instructions: "Configurez ces URLs dans votre tableau de bord OmniPay dans Mon Compte > URL de Callback.",
      steps: [
        "1. Connectez-vous a votre compte OmniPay sur omnipay.webtechci.com",
        "2. Allez dans Mon Compte > URL de Callback",
        "3. Configurez l'URL de callback: https://solvexpay.site/api/webhooks/omnipay",
        "4. Copiez la cle de callback et configurez-la comme OMNIPAY_CALLBACK_KEY",
        "5. Configurez votre cle API comme OMNIPAY_API_KEY"
      ]
    });
  });

  // ─── ADMIN ROUTES ─────────────────────────────────────────────────────────

  app.get("/api/admin/users", isAdmin, async (_req, res) => {
    try {
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { desc } = await import("drizzle-orm");
      const allUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
      const usersWithWallets = await Promise.all(
        allUsers.map(async (u) => {
          const wallet = await storage.getWallet(u.id);
          const { passwordHash: _, ...safeUser } = u;
          return { ...safeUser, wallet };
        })
      );
      res.json(usersWithWallets);
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats", isAdmin, async (_req, res) => {
    try {
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { count, sum, eq } = await import("drizzle-orm");
      const { transactions: txTable, wallets: walletsTable } = await import("@shared/schema");

      const [userCount] = await db.select({ count: count() }).from(usersTable);
      const [txCount] = await db.select({ count: count() }).from(txTable);
      const [depositSum] = await db.select({ total: sum(txTable.amount) }).from(txTable).where(eq(txTable.type, "deposit"));
      const [withdrawalSum] = await db.select({ total: sum(txTable.amount) }).from(txTable).where(eq(txTable.type, "withdrawal"));
      const [transferSum] = await db.select({ total: sum(txTable.amount) }).from(txTable).where(eq(txTable.type, "transfer"));
      const [pendingCount] = await db.select({ count: count() }).from(txTable).where(eq(txTable.status, "pending"));
      const [completedCount] = await db.select({ count: count() }).from(txTable).where(eq(txTable.status, "completed"));
      const [failedCount] = await db.select({ count: count() }).from(txTable).where(eq(txTable.status, "failed"));
      const [walletTotal] = await db.select({ total: sum(walletsTable.balanceXOF) }).from(walletsTable);

      res.json({
        userCount: userCount.count,
        transactionCount: txCount.count,
        totalDeposits: parseFloat(depositSum.total || "0"),
        totalWithdrawals: parseFloat(withdrawalSum.total || "0"),
        totalTransfers: parseFloat(transferSum.total || "0"),
        pendingTransactions: pendingCount.count,
        completedTransactions: completedCount.count,
        failedTransactions: failedCount.count,
        totalWalletBalance: parseFloat(walletTotal.total || "0"),
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/transactions", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { desc } = await import("drizzle-orm");
      const { transactions: txTable } = await import("@shared/schema");
      const limit = parseInt(req.query.limit as string) || 100;
      const allTx = await db.select().from(txTable).orderBy(desc(txTable.createdAt)).limit(limit);
      res.json(allTx);
    } catch (error) {
      console.error("Admin transactions error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/transactions/:id/status", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["pending", "completed", "failed"].includes(status)) {
        return res.status(400).json({ message: "Statut invalide" });
      }
      const tx = await storage.updateTransactionStatus(id, status);
      res.json(tx);
    } catch (error) {
      console.error("Admin update tx status error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/users/:id/password", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
      }
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.default.hash(password, 10);
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Admin change password error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/users/:id/balance", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, motif } = req.body;
      if (typeof amount !== "number") {
        return res.status(400).json({ message: "Montant invalide" });
      }
      if (!motif || motif.trim().length < 3) {
        return res.status(400).json({ message: "Motif requis (min 3 caractères)" });
      }
      let wallet = await storage.getWallet(id);
      if (!wallet) wallet = await storage.createWallet(id);
      const updatedWallet = await storage.updateWalletBalance(id, "XOF", amount);
      await storage.createTransaction({
        userId: id,
        type: amount >= 0 ? "deposit" : "withdrawal",
        amount: Math.abs(amount).toString(),
        currency: "XOF",
        provider: "admin",
        phoneNumber: "",
        reference: generateReference(),
        status: "completed",
        description: `Ajustement admin: ${motif}`,
      });
      res.json(updatedWallet);
    } catch (error) {
      console.error("Admin balance adjustment error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/users/:id/toggle-admin", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isAdmin: adminVal } = req.body;
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const [updated] = await db
        .update(usersTable)
        .set({ isAdmin: !!adminVal, updatedAt: new Date() })
        .where(eq(usersTable.id, id))
        .returning();
      const { passwordHash: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Admin toggle admin error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // ─── END ADMIN ROUTES ──────────────────────────────────────────────────────

  app.use("/uploads", (await import("express")).default.static(uploadDir));

  return httpServer;
}
