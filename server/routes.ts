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
  websiteUrl: z.string().url("URL invalide").optional().or(z.literal("")).nullable(),
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
      if (req.user.kycStatus !== "verified") {
        return res.status(403).json({ message: "Vérification KYC requise pour effectuer un retrait", kycRequired: true });
      }
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
      if (req.user.kycStatus !== "verified") {
        return res.status(403).json({ message: "Vérification KYC requise pour effectuer un transfert", kycRequired: true });
      }
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
      if (req.user.kycStatus !== "verified") {
        return res.status(403).json({ message: "Vérification KYC requise pour créer une clé API", kycRequired: true });
      }
      const validation = createApiKeySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { name, websiteUrl } = validation.data;

      const { key, prefix, hash } = generateApiKey();

      const apiKey = await storage.createApiKey({
        userId,
        name,
        keyPrefix: prefix,
        keyHash: hash,
        fullKey: key,
        environment: "live",
        isActive: true,
        websiteUrl: websiteUrl || null,
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

  app.patch("/api/admin/users/:id/kyc", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { kycStatus, rejectionReason } = req.body;
      if (!["not_started", "pending", "verified", "rejected"].includes(kycStatus)) {
        return res.status(400).json({ message: "Statut KYC invalide" });
      }
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const updateData: any = { kycStatus, updatedAt: new Date() };
      if (kycStatus === "rejected" && rejectionReason) updateData.kycRejectionReason = rejectionReason;
      if (kycStatus === "verified") updateData.kycRejectionReason = null;
      const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Utilisateur introuvable" });
      const { passwordHash: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Admin KYC update error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/users/:id/block", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const [updated] = await db.update(usersTable).set({ isBlocked: !!isBlocked, updatedAt: new Date() }).where(eq(usersTable.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Utilisateur introuvable" });
      const { passwordHash: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Admin block user error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/users/:id/fee", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { customFeeRate } = req.body;
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const [updated] = await db.update(usersTable).set({ customFeeRate: customFeeRate ? String(customFeeRate) : null, updatedAt: new Date() }).where(eq(usersTable.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Utilisateur introuvable" });
      const { passwordHash: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Admin fee update error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/users/:id/transactions", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const txList = await storage.getTransactions(id);
      res.json(txList);
    } catch (error) {
      console.error("Admin user tx error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/big-users", isAdmin, async (req, res) => {
    try {
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { desc, count, sum, eq } = await import("drizzle-orm");
      const { transactions: txTable, wallets: walletsTable } = await import("@shared/schema");
      const allUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
      const enriched = await Promise.all(allUsers.map(async (u) => {
        const wallet = await storage.getWallet(u.id);
        const txs = await storage.getTransactions(u.id);
        const totalVolume = txs.reduce((s, t) => s + parseFloat(t.amount), 0);
        const last24h = txs.filter(t => t.createdAt && Date.now() - new Date(t.createdAt).getTime() < 86400000);
        const { passwordHash: _, ...safe } = u;
        return { ...safe, wallet, txCount: txs.length, totalVolume, last24hCount: last24h.length, last24hVolume: last24h.reduce((s, t) => s + parseFloat(t.amount), 0) };
      }));
      const sorted = enriched.sort((a, b) => parseFloat(b.wallet?.balanceXOF || "0") - parseFloat(a.wallet?.balanceXOF || "0"));
      res.json(sorted.slice(0, 50));
    } catch (error) {
      console.error("Admin big users error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/commissions", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { sum, count, eq, and, gte, lt } = await import("drizzle-orm");
      const { transactions: txTable } = await import("@shared/schema");
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalFees] = await db.select({ total: sum(txTable.fees) }).from(txTable).where(eq(txTable.status, "completed"));
      const [monthFees] = await db.select({ total: sum(txTable.fees) }).from(txTable).where(and(eq(txTable.status, "completed"), gte(txTable.createdAt, startOfMonth)));
      const [lastMonthFees] = await db.select({ total: sum(txTable.fees) }).from(txTable).where(and(eq(txTable.status, "completed"), gte(txTable.createdAt, startOfLastMonth), lt(txTable.createdAt, endOfLastMonth)));
      const [totalVolume] = await db.select({ total: sum(txTable.amount) }).from(txTable).where(eq(txTable.status, "completed"));
      const [monthVolume] = await db.select({ total: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.status, "completed"), gte(txTable.createdAt, startOfMonth)));
      const [txCountCompleted] = await db.select({ count: count() }).from(txTable).where(eq(txTable.status, "completed"));

      res.json({
        totalFees: parseFloat(totalFees.total || "0"),
        monthFees: parseFloat(monthFees.total || "0"),
        lastMonthFees: parseFloat(lastMonthFees.total || "0"),
        totalVolume: parseFloat(totalVolume.total || "0"),
        monthVolume: parseFloat(monthVolume.total || "0"),
        completedTxCount: txCountCompleted.count,
        estimatedOmniPayCut: parseFloat(totalVolume.total || "0") * 0.02,
        estimatedNetRevenue: parseFloat(totalFees.total || "0") - parseFloat(totalVolume.total || "0") * 0.02,
      });
    } catch (error) {
      console.error("Admin commissions error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/stats/period", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { count, sum, eq, and, gte } = await import("drizzle-orm");
      const { transactions: txTable } = await import("@shared/schema");
      const period = (req.query.period as string) || "month";
      const now = new Date();
      let since: Date;
      if (period === "day") since = new Date(now.getTime() - 86400000);
      else if (period === "week") since = new Date(now.getTime() - 7 * 86400000);
      else since = new Date(now.getFullYear(), now.getMonth(), 1);

      const [pTotal] = await db.select({ count: count(), volume: sum(txTable.amount) }).from(txTable).where(gte(txTable.createdAt, since));
      const [pCompleted] = await db.select({ count: count() }).from(txTable).where(and(eq(txTable.status, "completed"), gte(txTable.createdAt, since)));
      const [pFailed] = await db.select({ count: count() }).from(txTable).where(and(eq(txTable.status, "failed"), gte(txTable.createdAt, since)));
      const [pPending] = await db.select({ count: count() }).from(txTable).where(and(eq(txTable.status, "pending"), gte(txTable.createdAt, since)));
      const [pDeposits] = await db.select({ count: count(), volume: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.type, "deposit"), gte(txTable.createdAt, since)));
      const [pWithdrawals] = await db.select({ count: count(), volume: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.type, "withdrawal"), gte(txTable.createdAt, since)));
      const [pTransfers] = await db.select({ count: count(), volume: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.type, "transfer"), gte(txTable.createdAt, since)));
      const [pFees] = await db.select({ total: sum(txTable.fees) }).from(txTable).where(and(eq(txTable.status, "completed"), gte(txTable.createdAt, since)));

      res.json({
        period,
        since: since.toISOString(),
        total: pTotal.count,
        volume: parseFloat(pTotal.volume || "0"),
        completed: pCompleted.count,
        failed: pFailed.count,
        pending: pPending.count,
        successRate: pTotal.count > 0 ? Math.round((pCompleted.count / pTotal.count) * 100) : 0,
        deposits: { count: pDeposits.count, volume: parseFloat(pDeposits.volume || "0") },
        withdrawals: { count: pWithdrawals.count, volume: parseFloat(pWithdrawals.volume || "0") },
        transfers: { count: pTransfers.count, volume: parseFloat(pTransfers.volume || "0") },
        fees: parseFloat(pFees.total || "0"),
      });
    } catch (error) {
      console.error("Admin period stats error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/payment-methods", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { paymentMethods: pmTable } = await import("@shared/schema");
      const methods = await db.select().from(pmTable);
      if (methods.length === 0) {
        const defaultMethods = [
          { code: "MTN", name: "MTN Mobile Money", category: "mobile_money", isActive: true, inMaintenance: false, feeType: "percentage", feeValue: "5", countries: ["BJ", "CI", "CM", "COG"] },
          { code: "Orange", name: "Orange Money", category: "mobile_money", isActive: true, inMaintenance: false, feeType: "percentage", feeValue: "5", countries: ["CI", "BF", "CM", "ML", "SN"] },
          { code: "Moov", name: "Moov Money", category: "mobile_money", isActive: true, inMaintenance: false, feeType: "percentage", feeValue: "5", countries: ["BJ", "CI", "BF", "TG", "ML"] },
          { code: "Wave", name: "Wave", category: "mobile_money", isActive: true, inMaintenance: false, feeType: "percentage", feeValue: "5", countries: ["CI", "SN"] },
          { code: "TMoney", name: "T-Money", category: "mobile_money", isActive: true, inMaintenance: false, feeType: "percentage", feeValue: "5", countries: ["TG"] },
          { code: "Free", name: "Free Money", category: "mobile_money", isActive: true, inMaintenance: false, feeType: "percentage", feeValue: "5", countries: ["SN"] },
          { code: "Airtel", name: "Airtel Money", category: "mobile_money", isActive: true, inMaintenance: false, feeType: "percentage", feeValue: "5", countries: ["COD", "COG"] },
          { code: "Vodacom", name: "Vodacom M-Pesa", category: "mobile_money", isActive: true, inMaintenance: false, feeType: "percentage", feeValue: "5", countries: ["COD"] },
        ];
        const inserted = await db.insert(pmTable).values(defaultMethods as any).returning();
        return res.json(inserted);
      }
      res.json(methods);
    } catch (error) {
      console.error("Admin payment methods error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/payment-methods/:code", isAdmin, async (req, res) => {
    try {
      const { code } = req.params;
      const { isActive, inMaintenance, feeValue, feeType } = req.body;
      const { db } = await import("./db");
      const { paymentMethods: pmTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const updateData: any = { updatedAt: new Date() };
      if (isActive !== undefined) updateData.isActive = isActive;
      if (inMaintenance !== undefined) updateData.inMaintenance = inMaintenance;
      if (feeValue !== undefined) updateData.feeValue = String(feeValue);
      if (feeType !== undefined) updateData.feeType = feeType;
      const [updated] = await db.update(pmTable).set(updateData).where(eq(pmTable.code, code)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Admin update payment method error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // OmniPay balance
  app.get("/api/admin/omnipay/balance", isAdmin, async (req, res) => {
    try {
      const balances = await omniPayService.getBalance();
      res.json(balances);
    } catch (error) {
      console.error("Admin OmniPay balance error:", error);
      res.status(500).json({ message: "Impossible de récupérer le solde OmniPay" });
    }
  });

  // All wallets for admin view
  app.get("/api/admin/wallets", isAdmin, async (req, res) => {
    try {
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { desc } = await import("drizzle-orm");
      const allUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
      const result = await Promise.all(allUsers.map(async (u) => {
        const wallet = await storage.getWallet(u.id);
        const { passwordHash: _, ...safe } = u;
        return { ...safe, wallet };
      }));
      res.json(result);
    } catch (error) {
      console.error("Admin wallets error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Admin deposit into a user wallet via OmniPay
  app.post("/api/admin/wallets/:userId/deposit", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, phoneNumber, operator, motif, firstName, lastName } = req.body;
      if (!amount || !phoneNumber) return res.status(400).json({ message: "Montant et téléphone requis" });
      const reference = generateReference();
      const depositResult = await omniPayService.deposit({
        msisdn: phoneNumber.replace(/^\+/, "").replace(/^00/, ""),
        amount: parseFloat(amount),
        reference,
        firstName: firstName || "Admin",
        lastName: lastName || "Dépôt",
        operator: operator || undefined,
      });
      if (depositResult.success !== 1) {
        return res.status(400).json({ message: depositResult.message || "Erreur OmniPay" });
      }
      let wallet = await storage.getWallet(userId);
      if (!wallet) wallet = await storage.createWallet(userId);
      await storage.updateWalletBalance(userId, "XOF", parseFloat(amount));
      const tx = await storage.createTransaction({
        userId,
        type: "deposit",
        amount: String(amount),
        currency: "XOF",
        provider: operator || "omnipay",
        phoneNumber,
        reference,
        status: "completed",
        description: `Dépôt admin via OmniPay: ${motif || "Alimentation wallet"}`,
      });
      res.json({ success: true, transaction: tx, omnipayRef: depositResult.reference });
    } catch (error) {
      console.error("Admin wallet deposit error:", error);
      res.status(500).json({ message: "Erreur lors du dépôt" });
    }
  });

  // Migrate funds from one wallet to another (internal)
  app.post("/api/admin/wallets/migrate", isAdmin, async (req, res) => {
    try {
      const { fromUserId, toUserId, amount, motif } = req.body;
      if (!fromUserId || !toUserId || !amount) return res.status(400).json({ message: "Paramètres manquants" });
      if (fromUserId === toUserId) return res.status(400).json({ message: "Les wallets doivent être différents" });
      const fromWallet = await storage.getWallet(fromUserId);
      if (!fromWallet || parseFloat(fromWallet.balanceXOF) < parseFloat(amount)) {
        return res.status(400).json({ message: "Solde insuffisant dans le wallet source" });
      }
      const reference = generateReference();
      await storage.updateWalletBalance(fromUserId, "XOF", -parseFloat(amount));
      let toWallet = await storage.getWallet(toUserId);
      if (!toWallet) toWallet = await storage.createWallet(toUserId);
      await storage.updateWalletBalance(toUserId, "XOF", parseFloat(amount));
      await storage.createTransaction({ userId: fromUserId, type: "transfer", amount: String(amount), currency: "XOF", provider: "admin", phoneNumber: "", reference, status: "completed", description: `Migration admin vers ${toUserId}: ${motif || ""}` });
      await storage.createTransaction({ userId: toUserId, type: "deposit", amount: String(amount), currency: "XOF", provider: "admin", phoneNumber: "", reference: generateReference(), status: "completed", description: `Migration admin depuis ${fromUserId}: ${motif || ""}` });
      res.json({ success: true });
    } catch (error) {
      console.error("Admin wallet migrate error:", error);
      res.status(500).json({ message: "Erreur lors de la migration" });
    }
  });

  // All KYC submissions
  app.get("/api/admin/kyc", isAdmin, async (req, res) => {
    try {
      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { inArray, desc } = await import("drizzle-orm");
      const kycUsers = await db.select().from(usersTable).where(inArray(usersTable.kycStatus as any, ["pending", "verified", "rejected"])).orderBy(desc(usersTable.updatedAt));
      const result = kycUsers.map(u => { const { passwordHash: _, ...safe } = u; return safe; });
      res.json(result);
    } catch (error) {
      console.error("Admin KYC list error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Fee configs
  app.get("/api/admin/fee-configs", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { feeConfigs: fcTable } = await import("@shared/schema");
      const configs = await db.select().from(fcTable);
      if (configs.length === 0) {
        const types = ["deposit", "withdrawal", "transfer"];
        const countries = ["default", "BJ", "CI", "BF", "TG", "SN", "ML", "CM", "COD", "COG"];
        const defaults = types.flatMap(type => countries.map(country => ({
          type,
          country,
          feeRate: country === "BF" || country === "COG" ? "6" : "5",
          minAmount: "100",
          maxAmount: null,
          isActive: true,
        })));
        const inserted = await db.insert(fcTable).values(defaults as any).returning();
        return res.json(inserted);
      }
      res.json(configs);
    } catch (error) {
      console.error("Admin fee configs error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/fee-configs/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { feeRate, minAmount, maxAmount, isActive } = req.body;
      const { db } = await import("./db");
      const { feeConfigs: fcTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const updateData: any = { updatedAt: new Date() };
      if (feeRate !== undefined) updateData.feeRate = String(feeRate);
      if (minAmount !== undefined) updateData.minAmount = String(minAmount);
      if (maxAmount !== undefined) updateData.maxAmount = maxAmount ? String(maxAmount) : null;
      if (isActive !== undefined) updateData.isActive = isActive;
      const [updated] = await db.update(fcTable).set(updateData).where(eq(fcTable.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Admin fee config update error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // All payment links (admin view)
  app.get("/api/admin/payment-links", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { paymentLinks: plTable } = await import("@shared/schema");
      const { users: usersTable } = await import("@shared/models/auth");
      const { desc } = await import("drizzle-orm");
      const links = await db.select().from(plTable).orderBy(desc(plTable.createdAt));
      const enriched = await Promise.all(links.map(async (link) => {
        const [user] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email }).from(usersTable).where((await import("drizzle-orm")).eq(usersTable.id, link.userId));
        return { ...link, user: user || null };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Admin payment links error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/payment-links/:id/toggle", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const { db } = await import("./db");
      const { paymentLinks: plTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [updated] = await db.update(plTable).set({ isActive: !!isActive }).where(eq(plTable.id, id)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Admin toggle payment link error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // All API keys (admin view)
  app.get("/api/admin/api-keys", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { apiKeys: akTable } = await import("@shared/schema");
      const { users: usersTable } = await import("@shared/models/auth");
      const { desc } = await import("drizzle-orm");
      const keys = await db.select().from(akTable).orderBy(desc(akTable.createdAt));
      const enriched = await Promise.all(keys.map(async (key) => {
        const [user] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email }).from(usersTable).where((await import("drizzle-orm")).eq(usersTable.id, key.userId));
        const { keyHash: _, ...safeKey } = key;
        return { ...safeKey, user: user || null };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Admin API keys error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/api-keys/:id/toggle", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const { db } = await import("./db");
      const { apiKeys: akTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [updated] = await db.update(akTable).set({ isActive: !!isActive }).where(eq(akTable.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Clé non trouvée" });
      const { keyHash: _, ...safeKey } = updated;
      res.json(safeKey);
    } catch (error) {
      console.error("Admin toggle API key error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Reset all stats (delete all transactions)
  app.post("/api/admin/stats/reset", isAdmin, async (req, res) => {
    try {
      const { confirm } = req.body;
      if (confirm !== "CONFIRMER_RESET") {
        return res.status(400).json({ message: "Confirmation invalide" });
      }
      const { db } = await import("./db");
      const { transactions: txTable } = await import("@shared/schema");
      await db.delete(txTable);
      res.json({ success: true, message: "Toutes les statistiques ont été réinitialisées" });
    } catch (error) {
      console.error("Admin stats reset error:", error);
      res.status(500).json({ message: "Erreur lors de la réinitialisation" });
    }
  });

  // ─── END ADMIN ROUTES ──────────────────────────────────────────────────────

  app.use("/uploads", (await import("express")).default.static(uploadDir));

  return httpServer;
}
