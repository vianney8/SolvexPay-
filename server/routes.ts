import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, generateApiKey, generateSlug, generateReference } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { z } from "zod";

const SUPPORTED_CURRENCIES = ["XOF", "NGN", "GHS", "KES"] as const;
const SUPPORTED_PROVIDERS = ["mtn", "orange", "wave", "moov", "free", "airtel"] as const;

const depositWithdrawSchema = z.object({
  amount: z.number().min(100, "Montant minimum: 100"),
  currency: z.enum(SUPPORTED_CURRENCIES),
  provider: z.enum(SUPPORTED_PROVIDERS),
  phoneNumber: z.string().min(8, "Numéro de téléphone invalide"),
});

const createPaymentLinkSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  amount: z.number().min(100, "Montant minimum: 100"),
  currency: z.enum(SUPPORTED_CURRENCIES),
  description: z.string().optional(),
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions/deposit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
      const paymentLinks = await storage.getPaymentLinks(userId);
      res.json(paymentLinks);
    } catch (error) {
      console.error("Error fetching payment links:", error);
      res.status(500).json({ message: "Failed to fetch payment links" });
    }
  });

  app.post("/api/payment-links", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const validation = createPaymentLinkSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { name, amount, currency, description } = validation.data;

      const paymentLink = await storage.createPaymentLink({
        userId,
        name,
        amount: amount.toString(),
        currency,
        description,
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

  app.get("/api/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apiKeys = await storage.getApiKeys(userId);
      res.json(apiKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
