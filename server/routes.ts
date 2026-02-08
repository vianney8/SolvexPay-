import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, generateApiKey, generateSlug, generateReference } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { sendavaPayService, verifyWebhookSignature, isApiKeyConfigured } from "./services/sendavapay";
import { z } from "zod";

const SUPPORTED_CURRENCIES = ["XOF"] as const;
const SUPPORTED_PROVIDERS = ["mtn", "orange", "wave", "moov", "free", "airtel", "solvexpay"] as const;

const depositWithdrawSchema = z.object({
  amount: z.number().min(100, "Montant minimum: 100"),
  currency: z.enum(SUPPORTED_CURRENCIES),
  provider: z.enum(SUPPORTED_PROVIDERS),
  phoneNumber: z.string().min(8, "Numéro de téléphone invalide"),
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
  environment: z.enum(["test", "live"]),
});

const publicPaySchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS),
  phoneNumber: z.string().min(8, "Numéro de téléphone invalide"),
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
      
      const validation = depositWithdrawSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { amount, currency, provider, phoneNumber } = validation.data;

      let wallet = await storage.getWallet(userId);
      if (!wallet) {
        wallet = await storage.createWallet(userId);
      }

      const transaction = await storage.createTransaction({
        userId,
        type: "deposit",
        amount: amount.toString(),
        currency,
        provider,
        phoneNumber,
        reference: generateReference(),
        status: "completed",
        description: `Dépôt via ${provider}`,
      });

      await storage.updateWalletBalance(userId, currency, amount);

      res.json(transaction);
    } catch (error) {
      console.error("Error creating deposit:", error);
      res.status(500).json({ message: "Failed to create deposit" });
    }
  });

  app.post("/api/transactions/withdraw", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const validation = depositWithdrawSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { amount, currency, provider, phoneNumber } = validation.data;

      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "No wallet found" });
      }

      const balanceKey = `balance${currency}` as keyof typeof wallet;
      const currentBalance = parseFloat(wallet[balanceKey] as string || "0");
      
      if (currentBalance < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const transaction = await storage.createTransaction({
        userId,
        type: "withdrawal",
        amount: amount.toString(),
        currency,
        provider,
        phoneNumber,
        reference: generateReference(),
        status: "completed",
        description: `Retrait vers ${provider}`,
      });

      await storage.updateWalletBalance(userId, currency, -amount);

      res.json(transaction);
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: "Failed to create withdrawal" });
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
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const paymentLink = await storage.updatePaymentLink(id, { isActive });
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
      
      const { provider, phoneNumber } = validation.data;

      const paymentLink = await storage.getPaymentLinkBySlug(slug);
      
      if (!paymentLink) {
        return res.status(404).json({ message: "Payment link not found" });
      }

      if (!paymentLink.isActive) {
        return res.status(400).json({ message: "Payment link is inactive" });
      }

      if (provider === "solvexpay") {
        if (!isApiKeyConfigured()) {
          return res.status(503).json({ message: "Service de paiement SolvexPay non configuré" });
        }
        
        try {
          const paymentResponse = await sendavaPayService.createPayment({
            amount: parseFloat(paymentLink.amount),
            currency: paymentLink.currency,
            description: paymentLink.description || paymentLink.name,
            externalReference: `${slug}-${Date.now()}`,
            customerPhone: phoneNumber,
          });

          if (paymentResponse.success && paymentResponse.data.paymentUrl) {
            const transaction = await storage.createTransaction({
              userId: paymentLink.userId,
              type: "deposit",
              amount: paymentLink.amount,
              currency: paymentLink.currency,
              provider: "solvexpay",
              phoneNumber,
              reference: paymentResponse.data.reference,
              status: "pending",
              description: `Paiement SolvexPay: ${paymentLink.name}`,
            });

            await storage.incrementPaymentLinkUsage(paymentLink.id);

            return res.json({
              ...transaction,
              paymentUrl: paymentResponse.data.paymentUrl,
              redirectToPayment: true,
            });
          } else {
            return res.status(400).json({ message: "Échec de la création du paiement" });
          }
        } catch (error: any) {
          console.error("SolvexPay payment error:", error);
          return res.status(500).json({ message: error.message || "Erreur de paiement SolvexPay" });
        }
      }

      const transaction = await storage.createTransaction({
        userId: paymentLink.userId,
        type: "deposit",
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        provider,
        phoneNumber,
        reference: generateReference(),
        status: "completed",
        description: `Paiement via lien: ${paymentLink.name}`,
      });

      await storage.updateWalletBalance(
        paymentLink.userId, 
        paymentLink.currency, 
        parseFloat(paymentLink.amount)
      );

      await storage.incrementPaymentLinkUsage(paymentLink.id);

      res.json(transaction);
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  app.post("/api/webhooks/sendavapay", async (req, res) => {
    try {
      const signature = req.headers["x-sendavapay-signature"] as string || "";
      const event = req.headers["x-sendavapay-event"] as string;
      
      if (!verifyWebhookSignature(req.body, signature)) {
        console.error("Invalid webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      const { data } = req.body;

      if (event === "payment.completed") {
        const { reference, amount } = data;
        
        const transaction = await storage.getTransactionByReference(reference);
        if (transaction && transaction.status === "pending") {
          await storage.updateTransactionStatus(transaction.id, "completed");
          await storage.updateWalletBalance(
            transaction.userId,
            transaction.currency,
            parseFloat(transaction.amount)
          );
        }
      } else if (event === "payment.failed") {
        const { reference } = data;
        const transaction = await storage.getTransactionByReference(reference);
        if (transaction && transaction.status === "pending") {
          await storage.updateTransactionStatus(transaction.id, "failed");
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  app.post("/api/payments/verify", isAuthenticated, async (req: any, res) => {
    try {
      const { reference } = req.body;
      
      if (!reference) {
        return res.status(400).json({ message: "Reference requise" });
      }

      const verifyResponse = await sendavaPayService.verifyPayment(reference);
      
      if (verifyResponse.success && verifyResponse.data.status === "completed") {
        const transaction = await storage.getTransactionByReference(reference);
        if (transaction && transaction.status === "pending") {
          await storage.updateTransactionStatus(transaction.id, "completed");
          await storage.updateWalletBalance(
            transaction.userId,
            transaction.currency,
            parseFloat(transaction.amount)
          );
        }
      }

      res.json(verifyResponse);
    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(500).json({ message: error.message || "Erreur de vérification" });
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
      
      const { name, environment } = validation.data;

      const { key, prefix, hash } = generateApiKey();

      const apiKey = await storage.createApiKey({
        userId,
        name,
        keyPrefix: prefix,
        keyHash: hash,
        environment,
        isActive: true,
      });

      res.json({ ...apiKey, key });
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

  return httpServer;
}
