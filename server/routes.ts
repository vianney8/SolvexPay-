import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, generateApiKey, generateSlug, generateReference } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { sendavaPayService, isApiKeyConfigured, verifyWebhookSignature } from "./services/sendavapay";
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
  description: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().min(100, "Montant minimum: 100"),
  phoneNumber: z.string().min(8, "Numero de telephone invalide"),
  operator: z.string().min(1, "Operateur requis"),
  country: z.string().min(2, "Pays requis"),
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
      
      const { amount, currency, phoneNumber, operator, country, customerName, description } = validation.data;

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configure" });
      }

      let wallet = await storage.getWallet(userId);
      if (!wallet) {
        wallet = await storage.createWallet(userId);
      }

      const callbackUrl = `https://solvexpay.site/api/payment/callback`;

      const paymentResponse = await sendavaPayService.createPayment({
        amount,
        phoneNumber,
        operator,
        country,
        customerName: customerName || req.user.firstName || "",
        description: description || "Depot SolvexPay",
        callbackUrl,
      });

      const reference = paymentResponse.reference;

      const transaction = await storage.createTransaction({
        userId,
        type: "deposit",
        amount: amount.toString(),
        currency,
        provider: "sendavapay",
        phoneNumber,
        reference,
        status: "pending",
        description: description || "Depot SolvexPay",
      });

      res.json({
        ...transaction,
        sendavaReference: reference,
        sendavaStatus: paymentResponse.status,
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

      const reference = withdrawResponse.reference;

      const transaction = await storage.createTransaction({
        userId,
        type: "withdrawal",
        amount: amount.toString(),
        currency,
        provider: "sendavapay",
        phoneNumber,
        reference,
        status: withdrawResponse.status === "SUCCESS" ? "completed" : "pending",
        description: `Retrait vers ${phoneNumber}`,
      });

      await storage.updateWalletBalance(userId, currency, -amount);

      res.json({
        ...transaction,
        sendavaReference: reference,
      });
    } catch (error: any) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: error.message || "Echec du retrait" });
    }
  });

  app.post("/api/transactions/verify", isAuthenticated, async (req: any, res) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ message: "Reference requise" });
      }

      const result = await sendavaPayService.verifyPayment(reference);
      const status = result.status || "PENDING";

      if (status === "SUCCESS") {
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
      } else if (status === "FAILED" || status === "CANCELLED") {
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

      res.json({ success: result.success, status });
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

      const result = await sendavaPayService.verifyPayment(reference);
      const status = result.status || "PENDING";

      if (status === "SUCCESS") {
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
      } else if (status === "FAILED" || status === "CANCELLED") {
        const transaction = await storage.getTransactionByReference(reference);
        if (transaction && transaction.status === "pending") {
          await storage.updateTransactionStatus(transaction.id, "failed");
        }
      }

      res.json({ success: result.success, status });
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
      
      const { phoneNumber, operator, country, customerName } = validation.data;

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

      const callbackUrl = `https://solvexpay.site/pay/${slug}?status=callback`;

      const paymentResponse = await sendavaPayService.createPayment({
        amount: parseFloat(paymentLink.amount),
        phoneNumber,
        operator,
        country,
        customerName: customerName || "",
        description: paymentLink.description || paymentLink.name,
        callbackUrl,
      });

      const reference = paymentResponse.reference;

      const transaction = await storage.createTransaction({
        userId: paymentLink.userId,
        type: "deposit",
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        provider: "sendavapay",
        phoneNumber,
        reference,
        status: "pending",
        description: `Paiement via lien: ${paymentLink.name}`,
      });

      await storage.incrementPaymentLinkUsage(paymentLink.id);

      res.json({
        ...transaction,
        sendavaReference: reference,
        sendavaStatus: paymentResponse.status,
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

  app.post("/api/webhooks/sendavapay", async (req, res) => {
    try {
      const signature = req.headers["x-sendavapay-signature"] as string;
      const event = req.headers["x-sendavapay-event"] as string;

      const webhookSecret = process.env.SENDAVAPAY_API_SECRET || "";

      if (signature && webhookSecret) {
        const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
        if (!isValid) {
          console.error("SendavaPay webhook: invalid signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      const body = req.body;
      console.log(`SendavaPay webhook event: ${event}`, body);

      const reference = body.reference || body.data?.reference;
      if (!reference) {
        return res.json({ received: true });
      }

      const transaction = await storage.getTransactionByReference(reference);

      if (event === "payment.completed") {
        if (transaction && transaction.status === "pending") {
          await storage.updateTransactionStatus(transaction.id, "completed");
          if (transaction.type === "deposit") {
            await storage.updateWalletBalance(
              transaction.userId,
              transaction.currency,
              parseFloat(transaction.amount)
            );
          }
          console.log(`Webhook: deposit ${reference} completed, wallet credited`);
        }
      } else if (event === "payment.failed") {
        if (transaction && transaction.status === "pending") {
          await storage.updateTransactionStatus(transaction.id, "failed");
          if (transaction.type === "withdrawal") {
            await storage.updateWalletBalance(
              transaction.userId,
              transaction.currency,
              parseFloat(transaction.amount)
            );
          }
          console.log(`Webhook: transaction ${reference} failed`);
        }
      } else if (event === "credit.completed") {
        if (transaction && transaction.status === "pending") {
          await storage.updateTransactionStatus(transaction.id, "completed");
          console.log(`Webhook: credit ${reference} completed`);
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.get("/api/payment/callback", async (req, res) => {
    const { reference, status } = req.query;
    console.log(`Payment callback: reference=${reference}, status=${status}`);

    if (reference && typeof reference === "string") {
      try {
        const result = await sendavaPayService.verifyPayment(reference);
        const paymentStatus = result.status || "PENDING";

        const transaction = await storage.getTransactionByReference(reference);
        if (transaction && transaction.status === "pending") {
          if (paymentStatus === "SUCCESS") {
            await storage.updateTransactionStatus(transaction.id, "completed");
            if (transaction.type === "deposit") {
              await storage.updateWalletBalance(
                transaction.userId,
                transaction.currency,
                parseFloat(transaction.amount)
              );
            }
          } else if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
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
      webhookUrl: `${baseUrl}/api/webhooks/sendavapay`,
      callbackUrl: `${baseUrl}/api/payment/callback`,
      domain: "solvexpay.site",
      instructions: "Configurez ces URLs dans votre tableau de bord SendavaPay (sendavapay.com/dashboard) dans les parametres webhook et callback.",
      steps: [
        "1. Connectez-vous a votre compte SendavaPay sur sendavapay.com/dashboard",
        "2. Allez dans Parametres > Webhooks",
        "3. Ajoutez l'URL du webhook: https://solvexpay.site/api/webhooks/sendavapay",
        "4. Ajoutez l'URL de callback/redirection: https://solvexpay.site/api/payment/callback",
        "5. Copiez le secret de signature webhook et configurez-le comme SENDAVAPAY_API_SECRET",
        "6. Activez les evenements: payment.completed, payment.failed, credit.completed"
      ]
    });
  });

  app.use("/uploads", (await import("express")).default.static(uploadDir));

  return httpServer;
}
