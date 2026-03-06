import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage, generateApiKey, generateSlug, generateReference } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, registerAuthRoutes } from "./replit_integrations/auth";
import { omniPayService, isApiKeyConfigured, verifyCallbackSignature, omnipayStatusToString, type OmniPayCallbackPayload } from "./services/omnipay";
import { testResendConnection } from "./services/resend";
import { z } from "zod";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import axios from "axios";

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Trop de requêtes de paiement. Attendez 1 minute avant de réessayer." },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Trop de vérifications. Attendez 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
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
  amount: z.number().min(0, "Montant invalide"),
  allowCustomAmount: z.boolean().optional().default(false),
  currency: z.enum(SUPPORTED_CURRENCIES).default("XOF"),
  description: z.string().optional(),
  redirectUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().optional(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1, "Nom requis"),
  appName: z.string().min(1, "Nom de l'application requis"),
  websiteUrl: z.string().url("URL invalide").optional().or(z.literal("")).nullable(),
});

const updateApiKeySchema = z.object({
  isActive: z.boolean().optional(),
  redirectUrl: z.string().url("URL invalide").optional().or(z.literal("")).nullable(),
  webhookUrl: z.string().url("URL invalide").optional().or(z.literal("")).nullable(),
  appName: z.string().min(1).optional(),
});

const updatePaymentLinkSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  allowCustomAmount: z.boolean().optional(),
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
  customAmount: z.number().min(100).optional(),
});

function getOmniPayOperatorCode(operator: string, country: string): string {
  const op = operator.toUpperCase();
  const co = country.toUpperCase();
  const mapping: Record<string, Record<string, string>> = {
    MOOV:     { BJ: "moov_benin", CI: "moov", TG: "moov_togo", BF: "moov_bf", ML: "moov_ml" },
    ORANGE:   { CI: "orange", SN: "orange_sn", CM: "orange_cm", BF: "orange_bf", ML: "orange_ml", COD: "orange_cong" },
    MTN:      { BJ: "mtn", CI: "mtn", CM: "mtn_cm", COG: "" },
    TMONEY:   { TG: "tmoney" },
    WAVE:     { CI: "wave", SN: "wave" },
    FREE:     { SN: "free_sn" },
    VODACOM:  { COD: "" },
    AIRTEL:   { COD: "", COG: "" },
  };
  return mapping[op]?.[co] ?? op.toLowerCase();
}

function getCountryCurrency(country: string): string {
  const XAF_COUNTRIES = ["CM", "COG"];
  const CDF_COUNTRIES = ["COD"];
  const c = country.toUpperCase();
  if (XAF_COUNTRIES.includes(c)) return "XAF";
  if (CDF_COUNTRIES.includes(c)) return "CDF";
  return "XOF";
}

function toXOFEquivalent(amount: number, currency: string): number {
  if (currency === "CDF") return Math.floor(amount * 0.22);
  return Math.floor(amount);
}

async function checkOperatorMaintenance(operator: string, country: string): Promise<string | null> {
  try {
    const { db } = await import("./db");
    const { paymentMethods: pmTable } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const [pm] = await db.select().from(pmTable).where(eq(pmTable.code, operator));
    if (!pm) return null;
    if (pm.isActive === false) return `L'opérateur ${operator} n'est pas disponible`;
    if (pm.inMaintenance) return `${operator} est actuellement en maintenance`;
    if ((pm.maintenanceCountries || []).includes(country)) return `${operator} est en maintenance dans ce pays`;
    return null;
  } catch {
    return `Service temporairement indisponible. Réessayez dans quelques instants.`;
  }
}

async function forwardToMerchantWebhooks(transaction: any) {
  try {
    const merchantApiKeys = await storage.getApiKeys(transaction.userId);
    const activeKeysWithWebhook = merchantApiKeys.filter(
      (k) => k.isActive && !(k as any).adminLocked && (k as any).webhookUrl
    );
    if (activeKeysWithWebhook.length === 0) return;

    const statusStr = transaction.status as string;
    const webhookPayload = {
      event: statusStr === "completed" ? "transaction.completed" : "transaction.failed",
      transaction: {
        id: transaction.id,
        status: statusStr,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        operator: transaction.provider,
        phone: transaction.phoneNumber,
        reference: transaction.reference,
        fees: transaction.fees ? parseFloat(transaction.fees) : 0,
        net_amount: transaction.fees
          ? parseFloat(transaction.amount) - parseFloat(transaction.fees)
          : parseFloat(transaction.amount),
        payer_name: transaction.payerName || null,
        payer_email: transaction.payerEmail || null,
        payer_country: transaction.payerCountry || null,
        created_at: transaction.createdAt,
      },
      timestamp: new Date().toISOString(),
    };

    for (const k of activeKeysWithWebhook) {
      const webhookUrl = (k as any).webhookUrl as string;
      const webhookSecret = (k as any).webhookSecret as string | undefined;
      const bodyStr = JSON.stringify(webhookPayload);
      const signature = webhookSecret
        ? `sha256=${crypto.createHmac("sha256", webhookSecret).update(bodyStr).digest("hex")}`
        : undefined;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (signature) headers["x-solvexpay-signature"] = signature;
      axios.post(webhookUrl, webhookPayload, { headers, timeout: 10000 }).catch((err) => {
        console.error(`Webhook delivery failed to ${webhookUrl}:`, err.message);
      });
    }
  } catch (err) {
    console.error("forwardToMerchantWebhooks error:", err);
  }
}

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

  app.post("/api/transactions/deposit", isAuthenticated, paymentLimiter, async (req: any, res) => {
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
      const returnUrl = isWave ? `https://solvexpay.com/api/payment/callback?reference=${reference}` : undefined;
      const omniDepositOperator = getOmniPayOperatorCode(operator, country);

      const depositResponse = await omniPayService.deposit({
        msisdn: phoneNumber,
        amount,
        reference,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        otp,
        operator: omniDepositOperator,
        returnUrl,
      });

      const depositFeeRate = parseFloat((await storage.getSystemSetting("fee_deposit")) || "7") / 100;
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

  app.post("/api/transactions/withdraw", isAuthenticated, paymentLimiter, async (req: any, res) => {
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
      const localCurrency = getCountryCurrency(country);
      const amountXOF = toXOFEquivalent(amount, localCurrency);

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configuré" });
      }

      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Aucun portefeuille trouvé" });
      }

      const currentBalance = parseFloat(String(wallet.balanceXOF || "0"));
      if (currentBalance < amountXOF) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      const reference = generateReference();
      const withdrawalMode = (await storage.getSystemSetting("withdrawalMode")) || "auto";

      const withdrawalFeeRate = parseFloat((await storage.getSystemSetting("fee_withdrawal")) || "7") / 100;
      const withdrawalFees = Math.round(amountXOF * withdrawalFeeRate);

      // Net amount sent to user = requested amount minus fees
      const netAmountXOF = amountXOF - withdrawalFees;
      const netAmountLocal = localCurrency === "CDF"
        ? Math.round(netAmountXOF / 0.22)
        : netAmountXOF;

      if (withdrawalMode === "manual") {
        const transaction = await storage.createTransaction({
          userId,
          type: "withdrawal",
          amount: amount.toString(),
          currency: localCurrency,
          provider: operator,
          phoneNumber,
          reference,
          status: "pending",
          description: `Retrait vers ${phoneNumber} via ${operator}`,
          fees: String(withdrawalFees),
        } as any);
        await storage.updateWalletBalance(userId, localCurrency, -amount);
        return res.json({ ...transaction, mode: "manual" });
      }

      const fullName = req.user?.name || req.user?.firstName || "Client";
      const nameParts = fullName.trim().split(" ");
      const resolvedFirstName = nameParts[0] || "Client";
      const resolvedLastName = nameParts.slice(1).join(" ") || "SolvexPay";

      const isWave = operator.toLowerCase() === "wave";

      console.log(`Initiating OmniPay withdrawal for reference: ${reference} (Country: ${country}, Operator: ${operator}), amount: ${amount}, fees: ${withdrawalFees}, net: ${netAmountLocal}`);
      const transferResponse = await omniPayService.transfer({
        msisdn: phoneNumber,
        amount: netAmountLocal,
        reference,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        operator: getOmniPayOperatorCode(operator, country),
      });
      console.log(`OmniPay withdrawal response for ${reference}:`, transferResponse);

      const transaction = await storage.createTransaction({
        userId,
        type: "withdrawal",
        amount: amount.toString(),
        currency: localCurrency,
        provider: operator,
        phoneNumber,
        reference,
        status: "pending",
        description: `Retrait vers ${phoneNumber} via ${operator}`,
        fees: String(withdrawalFees),
      } as any);

      await storage.updateWalletBalance(userId, localCurrency, -amount);

      res.json({
        ...transaction,
        omnipayId: transferResponse.id,
      });
    } catch (error: any) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: error.message || "Echec du retrait" });
    }
  });

  app.post("/api/transactions/transfer", isAuthenticated, paymentLimiter, async (req: any, res) => {
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
      const localCurrency = getCountryCurrency(country);
      const amountXOF = toXOFEquivalent(amount, localCurrency);

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configure" });
      }

      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Aucun portefeuille trouve" });
      }

      const currentBalance = parseFloat((wallet.balanceXOF as string) || "0");
      const transferFeeRate = parseFloat((await storage.getSystemSetting("fee_transfer")) || "7") / 100;
      const transferFees = Math.round(amountXOF * transferFeeRate);
      const totalDeductedXOF = amountXOF + transferFees;

      if (currentBalance < totalDeductedXOF) {
        return res.status(400).json({ message: "Solde insuffisant" });
      }

      const reference = generateReference();
      const isWave = operator.toLowerCase() === "wave";

      console.log(`Initiating OmniPay transfer for reference: ${reference} (Country: ${country}, Operator: ${operator})`);
      const transferResponse = await omniPayService.transfer({
        msisdn: phoneNumber,
        amount,
        reference,
        firstName,
        lastName,
        operator: getOmniPayOperatorCode(operator, country),
      });
      console.log(`OmniPay transfer response for ${reference}:`, transferResponse);

      const transaction = await storage.createTransaction({
        userId,
        type: "transfer",
        amount: amount.toString(),
        currency: localCurrency,
        provider: "omnipay",
        phoneNumber,
        reference,
        status: "pending",
        description: `Transfert vers ${firstName} ${lastName} (${phoneNumber})`,
        fees: String(transferFees),
      } as any);

      await storage.updateWalletBalance(userId, "XOF", -totalDeductedXOF);

      res.json({
        ...transaction,
        omnipayId: transferResponse.id,
      });
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      res.status(500).json({ message: error.message || "Echec du transfert" });
    }
  });

  app.post("/api/transactions/verify", isAuthenticated, verifyLimiter, async (req: any, res) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ message: "Reference requise" });
      }

      const result = await omniPayService.getStatus(reference);
      const statusStr = omnipayStatusToString(result.status ?? 0);

      const transaction = await storage.getTransactionByReference(reference);
      if (transaction) {
        if (statusStr === "completed") {
          const updated = await storage.updateTransactionStatusIfPending(transaction.id, "completed");
          if (updated && transaction.type === "deposit") {
            const grossAmount = parseFloat(transaction.amount);
            const txFees = parseFloat((transaction as any).fees || "0") || 0;
            const netAmount = grossAmount - txFees;
            await storage.updateWalletBalance(
              transaction.userId,
              transaction.currency,
              netAmount > 0 ? netAmount : grossAmount
            );
            const completedTx = await storage.getTransactionByReference(reference);
            if (completedTx) forwardToMerchantWebhooks(completedTx);
          }
        } else if (statusStr === "failed") {
          const updated = await storage.updateTransactionStatusIfPending(transaction.id, "failed");
          if (updated && transaction.type === "withdrawal") {
            await storage.updateWalletBalance(
              transaction.userId,
              transaction.currency,
              parseFloat(transaction.amount)
            );
          }
          if (updated) {
            const failedTx = await storage.getTransactionByReference(reference);
            if (failedTx) forwardToMerchantWebhooks(failedTx);
          }
        }
      }

      const frontendStatus = statusStr === "completed" ? "SUCCESS" : statusStr === "failed" ? "FAILED" : "PENDING";
      res.json({ success: result.success, status: frontendStatus, omnipayStatus: result.status });
    } catch (error: any) {
      console.error("Verify error:", error);
      res.status(500).json({ message: error.message || "Erreur de verification" });
    }
  });

  app.post("/api/payment-links/verify-public", verifyLimiter, async (req, res) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ message: "Reference requise" });
      }

      const result = await omniPayService.getStatus(reference);
      const statusStr = omnipayStatusToString(result.status ?? 0);

      const transaction = await storage.getTransactionByReference(reference);
      if (transaction) {
        if (statusStr === "completed") {
          const updated = await storage.updateTransactionStatusIfPending(transaction.id, "completed");
          if (updated && transaction.type === "deposit") {
            const grossAmt = parseFloat(transaction.amount);
            const txFees2 = parseFloat((transaction as any).fees || "0") || 0;
            const netAmt = grossAmt - txFees2;
            await storage.updateWalletBalance(
              transaction.userId,
              transaction.currency,
              netAmt > 0 ? netAmt : grossAmt
            );
            const completedTx = await storage.getTransactionByReference(reference);
            if (completedTx) forwardToMerchantWebhooks(completedTx);
          }
        } else if (statusStr === "failed") {
          const updated = await storage.updateTransactionStatusIfPending(transaction.id, "failed");
          if (updated) {
            const failedTx = await storage.getTransactionByReference(reference);
            if (failedTx) forwardToMerchantWebhooks(failedTx);
          }
        }
      }

      const publicFrontendStatus = statusStr === "completed" ? "SUCCESS" : statusStr === "failed" ? "FAILED" : "PENDING";
      res.json({ success: result.success, status: publicFrontendStatus });
    } catch (error: any) {
      console.error("Public verify error:", error);
      res.status(500).json({ message: error.message || "Erreur de verification" });
    }
  });

  // ─── Hosted API Payment Page Routes ──────────────────────────────────────────

  app.get("/api/payment-api/public/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getTransactionById(id);
      if (!transaction || (transaction as any).apiKeyId === null || (transaction as any).apiKeyId === undefined) {
        return res.status(404).json({ message: "Paiement introuvable" });
      }
      if (!["pending", "completed", "failed"].includes(transaction.status)) {
        return res.status(404).json({ message: "Paiement introuvable" });
      }
      const { db } = await import("./db");
      const { eq: eqFn } = await import("drizzle-orm");
      const { users: usersTable } = await import("@shared/models/auth");
      const [merchant] = await db.select({
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        merchantName: usersTable.merchantName,
      }).from(usersTable).where(eqFn(usersTable.id, transaction.userId));
      const displayName = merchant?.merchantName || (merchant ? `${merchant.firstName || ""} ${merchant.lastName || ""}`.trim() : "") || "SolvexPay";
      const apiKeyRow = await storage.getApiKeys(transaction.userId);
      const matchingKey = (transaction as any).apiKeyId
        ? apiKeyRow.find((k) => k.id === (transaction as any).apiKeyId)
        : null;
      const appName = (matchingKey as any)?.appName || displayName;
      res.json({
        id: transaction.id,
        status: transaction.status,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        fees: transaction.fees ? parseFloat(transaction.fees) : 0,
        description: transaction.description,
        payerCountry: (transaction as any).payerCountry || null,
        appName,
        merchantName: displayName,
        phoneNumber: transaction.phoneNumber || null,
        provider: transaction.provider || null,
        reference: transaction.reference,
        redirectUrl: (matchingKey as any)?.redirectUrl || null,
        createdAt: transaction.createdAt,
      });
    } catch (err) {
      console.error("payment-api/public/:id error:", err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/payment-api/public/:id/pay", async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getTransactionById(id);
      if (!transaction || transaction.status !== "pending") {
        return res.status(404).json({ message: "Paiement introuvable ou déjà traité" });
      }
      const validation = publicPaySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      const { phoneNumber, operator, country, customerName, customerEmail } = validation.data;

      const maintError = await checkOperatorMaintenance(operator, country);
      if (maintError) {
        return res.status(400).json({ message: maintError });
      }

      if (!isApiKeyConfigured()) {
        return res.status(503).json({ message: "Service de paiement non configuré" });
      }
      const amount = parseFloat(transaction.amount);
      const fullName = (customerName || "Client SolvexPay").trim();
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Client";
      const lastName = nameParts.slice(1).join(" ") || "SolvexPay";
      const isWave = operator.toLowerCase() === "wave";
      const returnUrl = isWave
        ? `https://solvexpay.com/pay-api/${id}?status=callback&reference=${transaction.reference}`
        : undefined;
      const omniOperator = getOmniPayOperatorCode(operator, country);
      const depositResponse = await omniPayService.deposit({
        msisdn: phoneNumber,
        amount,
        reference: transaction.reference,
        firstName,
        lastName,
        operator: omniOperator,
        returnUrl,
      });
      const { db } = await import("./db");
      const { eq: eqFn } = await import("drizzle-orm");
      const { transactions: txTable } = await import("@shared/schema");
      await db.update(txTable).set({
        phoneNumber,
        provider: operator.toUpperCase(),
        payerName: customerName || null,
        payerEmail: customerEmail || null,
        payerCountry: country,
        payerOperator: operator.toUpperCase(),
      } as any).where(eqFn(txTable.id, id));
      res.json({
        reference: transaction.reference,
        paymentUrl: depositResponse.payment_url || null,
        status: "pending",
      });
    } catch (err: any) {
      console.error("payment-api/public/:id/pay error:", err);
      res.status(500).json({ message: err.message || "Erreur lors du paiement" });
    }
  });

  app.post("/api/payment-api/public/:id/verify", verifyLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getTransactionById(id);
      if (!transaction) {
        return res.status(404).json({ message: "Paiement introuvable" });
      }
      if (transaction.status !== "pending") {
        const publicStatus = transaction.status === "completed" ? "SUCCESS" : transaction.status === "failed" ? "FAILED" : "PENDING";
        return res.json({ success: true, status: publicStatus });
      }
      const result = await omniPayService.getStatus(transaction.reference);
      const statusStr = omnipayStatusToString(result.status ?? 0);
      if (statusStr === "completed") {
        const updated = await storage.updateTransactionStatusIfPending(transaction.id, "completed");
        if (updated) {
          const grossAmt = parseFloat(transaction.amount);
          const txFees = parseFloat((transaction as any).fees || "0") || 0;
          const netAmt = grossAmt - txFees;
          await storage.updateWalletBalance(transaction.userId, transaction.currency, netAmt > 0 ? netAmt : grossAmt);
          const completedTx = await storage.getTransactionById(transaction.id);
          if (completedTx) forwardToMerchantWebhooks(completedTx);
        }
      } else if (statusStr === "failed") {
        const updated = await storage.updateTransactionStatusIfPending(transaction.id, "failed");
        if (updated) {
          const failedTx = await storage.getTransactionById(transaction.id);
          if (failedTx) forwardToMerchantWebhooks(failedTx);
        }
      }
      const publicStatus = statusStr === "completed" ? "SUCCESS" : statusStr === "failed" ? "FAILED" : "PENDING";
      res.json({ success: result.success, status: publicStatus });
    } catch (err: any) {
      console.error("payment-api/public/:id/verify error:", err);
      res.status(500).json({ message: err.message || "Erreur de vérification" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────

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
      
      const { name, amount, currency, description, redirectUrl, imageUrl, allowCustomAmount } = validation.data;

      const paymentLink = await storage.createPaymentLink({
        userId,
        name,
        amount: amount.toString(),
        currency,
        description,
        redirectUrl: redirectUrl || null,
        imageUrl: imageUrl || null,
        allowCustomAmount: allowCustomAmount ?? false,
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
      const { name, amount, allowCustomAmount, description, redirectUrl, imageUrl, isActive } = validation.data;
      if (name !== undefined) updateData.name = name;
      if (amount !== undefined) updateData.amount = amount.toString();
      if (allowCustomAmount !== undefined) updateData.allowCustomAmount = allowCustomAmount;
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
      const { db } = await import("./db");
      const { paymentLinks: plTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [existing] = await db.select().from(plTable).where(eq(plTable.id, id));
      if (existing?.adminLocked) {
        return res.status(403).json({ message: "Ce lien a été verrouillé par l'administrateur.", adminLocked: true });
      }
      await storage.deletePaymentLink(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment link:", error);
      res.status(500).json({ message: "Failed to delete payment link" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const notifs = await storage.getActiveNotifications();
      res.json(notifs);
    } catch {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/admin/test-email", isAdmin, async (req: any, res) => {
    try {
      const { to } = req.body;
      const targetEmail = to || req.user?.email;
      if (!targetEmail) {
        return res.status(400).json({ message: "Adresse email manquante" });
      }
      const result = await testResendConnection(targetEmail);
      if (result.success) {
        res.json({ success: true, message: `Email de test envoyé à ${targetEmail}`, id: result.id });
      } else {
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error: any) {
      console.error("[Admin] Test email error:", error?.message);
      res.status(500).json({ success: false, message: error?.message || "Erreur lors du test" });
    }
  });

  app.get("/api/admin/notifications", isAdmin, async (req: any, res) => {
    try {
      const notifs = await storage.getAllNotifications();
      res.json(notifs);
    } catch {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/admin/notifications", isAdmin, async (req: any, res) => {
    try {
      const { title, message, color } = req.body;
      if (!title || !message) return res.status(400).json({ message: "Title and message are required" });
      const notif = await storage.createNotification({ title, message, color: color || "blue", isActive: true });
      res.json(notif);
    } catch {
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.patch("/api/admin/notifications/:id", isAdmin, async (req: any, res) => {
    try {
      const notif = await storage.updateNotification(req.params.id, req.body);
      if (!notif) return res.status(404).json({ message: "Not found" });
      res.json(notif);
    } catch {
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  app.delete("/api/admin/notifications/:id", isAdmin, async (req: any, res) => {
    try {
      await storage.deleteNotification(req.params.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  const SUPPORT_LINK_KEYS = [
    "support_link_whatsapp_direct",
    "support_link_whatsapp_group",
    "support_link_email",
    "support_link_whatsapp_channel",
    "support_link_facebook",
  ];
  const SUPPORT_LINK_DEFAULTS: Record<string, string> = {
    support_link_whatsapp_direct: "https://wa.me/22891840498",
    support_link_whatsapp_group: "https://chat.whatsapp.com/FeGmjzHa1VG7v4VGo0Rxbd",
    support_link_email: "mailto:support@solvexpay.com",
    support_link_whatsapp_channel: "https://whatsapp.com/channel/0029Vb3WFkb2ZjCZTb0Dq11F",
    support_link_facebook: "https://www.facebook.com/profile.php?id=61574706268491",
  };

  app.get("/api/support-links", async (req, res) => {
    try {
      const links: Record<string, string> = {};
      for (const key of SUPPORT_LINK_KEYS) {
        links[key] = (await storage.getSystemSetting(key)) || SUPPORT_LINK_DEFAULTS[key];
      }
      res.json(links);
    } catch {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.put("/api/admin/support-links", isAdmin, async (req: any, res) => {
    try {
      for (const key of SUPPORT_LINK_KEYS) {
        if (req.body[key] !== undefined) {
          await storage.setSystemSetting(key, String(req.body[key]));
        }
      }
      const links: Record<string, string> = {};
      for (const key of SUPPORT_LINK_KEYS) {
        links[key] = (await storage.getSystemSetting(key)) || SUPPORT_LINK_DEFAULTS[key];
      }
      res.json(links);
    } catch {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/service-fees", async (req, res) => {
    try {
      const deposit = parseFloat((await storage.getSystemSetting("fee_deposit")) || "7");
      const withdrawal = parseFloat((await storage.getSystemSetting("fee_withdrawal")) || "7");
      const transfer = parseFloat((await storage.getSystemSetting("fee_transfer")) || "7");
      res.json({ deposit, withdrawal, transfer });
    } catch {
      res.json({ deposit: 7, withdrawal: 7, transfer: 7 });
    }
  });

  app.get("/api/payment-methods/public", async (req, res) => {
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
      console.error("Public payment methods error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/payment-links/public/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const paymentLink = await storage.getPaymentLinkBySlug(slug);
      
      if (!paymentLink) {
        return res.status(404).json({ message: "Payment link not found" });
      }

      const { db } = await import("./db");
      const { eq: eqFn } = await import("drizzle-orm");
      const { users: usersTable } = await import("@shared/models/auth");
      const [creator] = await db.select({
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        merchantName: usersTable.merchantName,
      }).from(usersTable).where(eqFn(usersTable.id, paymentLink.userId));

      const displayName = creator?.merchantName || (creator ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim() : "") || "SolvexPay";

      res.json({ ...paymentLink, merchantName: displayName });
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
      
      const { phoneNumber, operator, country, customerName, customerEmail, customAmount } = validation.data;

      const paymentLink = await storage.getPaymentLinkBySlug(slug);
      
      if (!paymentLink) {
        return res.status(404).json({ message: "Lien de paiement introuvable" });
      }

      if (!paymentLink.isActive) {
        return res.status(400).json({ message: "Ce lien de paiement est inactif" });
      }

      const maintError = await checkOperatorMaintenance(operator, country);
      if (maintError) {
        return res.status(400).json({ message: maintError });
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
        ? `https://solvexpay.com/pay/${slug}?status=callback&reference=${reference}`
        : undefined;

      const fixedAmount = parseFloat(paymentLink.amount);
      let linkAmount: number;
      if ((paymentLink as any).allowCustomAmount) {
        if (!customAmount || customAmount < 100) {
          return res.status(400).json({ message: "Montant invalide (minimum 100)" });
        }
        if (fixedAmount > 0 && customAmount < fixedAmount) {
          return res.status(400).json({ message: `Montant minimum: ${fixedAmount} XOF` });
        }
        linkAmount = customAmount;
      } else {
        linkAmount = fixedAmount;
      }
      const feeRate = parseFloat((await storage.getSystemSetting("fee_deposit")) || "7") / 100;
      const feesAmount = Math.round(linkAmount * feeRate);

      console.log(`Initiating payment for link ${slug} with reference: ${reference}`);
      const depositResponse = await omniPayService.deposit({
        msisdn: phoneNumber,
        amount: linkAmount,
        reference,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        operator: getOmniPayOperatorCode(operator, country),
        returnUrl,
      });
      console.log(`Payment response for ${reference}:`, depositResponse);

      const transaction = await storage.createTransaction({
        userId: paymentLink.userId,
        type: "deposit",
        amount: linkAmount.toString(),
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
      
      const { name, appName, websiteUrl } = validation.data;

      const { key, prefix, hash } = generateApiKey();
      const webhookSecret = `whs_live_${crypto.randomBytes(24).toString("hex")}`;

      const apiKey = await storage.createApiKey({
        userId,
        name,
        appName: appName || null,
        keyPrefix: prefix,
        keyHash: hash,
        fullKey: key,
        webhookSecret,
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
      const validation = updateApiKeySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { db } = await import("./db");
      const { apiKeys: akTable } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const [existing] = await db.select().from(akTable).where(and(eq(akTable.id, id), eq(akTable.userId, req.user.id)));
      if (!existing) return res.status(404).json({ message: "Clé non trouvée" });
      if (existing.adminLocked && validation.data.isActive !== undefined) {
        return res.status(403).json({ message: "Cette clé a été verrouillée par l'administrateur.", adminLocked: true });
      }

      const updateData: Record<string, any> = {};
      if (validation.data.isActive !== undefined) updateData.isActive = validation.data.isActive;
      if (validation.data.redirectUrl !== undefined) updateData.redirectUrl = validation.data.redirectUrl || null;
      if (validation.data.webhookUrl !== undefined) updateData.webhookUrl = validation.data.webhookUrl || null;
      if (validation.data.appName !== undefined) updateData.appName = validation.data.appName;

      const apiKey = await storage.updateApiKey(id, updateData);
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

  // ─── API V1 — EXTERNAL DEVELOPER ENDPOINTS ──────────────────────────────────

  async function authenticateApiKey(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization as string | undefined;
    if (!authHeader || !authHeader.startsWith("Bearer sk_live_")) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Clé API manquante ou invalide. Utilisez: Authorization: Bearer sk_live_xxxx", status: 401 }
      });
    }
    const keyValue = authHeader.replace("Bearer ", "").trim();
    const apiKey = await storage.findApiKeyByFullKey(keyValue);
    if (!apiKey) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Clé API introuvable.", status: 401 } });
    }
    if (!apiKey.isActive || (apiKey as any).adminLocked) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Clé API désactivée ou verrouillée.", status: 401 } });
    }
    await storage.updateApiKey(apiKey.id, { lastUsedAt: new Date() } as any);
    req.merchantApiKey = apiKey;
    req.merchantUserId = apiKey.userId;
    next();
  }

  // ── Checkout redirect : GET /api/v1/checkout?key=sk_live_...&amount=...&description=... ──
  app.get("/api/v1/checkout", async (req: any, res) => {
    try {
      const { key, amount: amountStr, description, customer_name, customer_email, country, metadata } = req.query as Record<string, string>;

      if (!key) return res.status(400).send("Paramètre 'key' manquant.");
      const apiKey = await storage.findApiKeyByFullKey(key.trim());
      if (!apiKey || !apiKey.isActive || (apiKey as any).adminLocked) {
        return res.status(401).send("Clé API invalide ou désactivée.");
      }

      const amount = parseFloat(amountStr);
      if (!amountStr || isNaN(amount) || amount < 100) {
        return res.status(400).send("Paramètre 'amount' invalide (minimum 100).");
      }

      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { eq: eqFn } = await import("drizzle-orm");
      const [merchantUser] = await db.select().from(usersTable).where(eqFn(usersTable.id, apiKey.userId));
      if (!merchantUser || merchantUser.kycStatus !== "verified") {
        return res.status(403).send("KYC non vérifié ou compte introuvable.");
      }

      await storage.updateApiKey(apiKey.id, { lastUsedAt: new Date() } as any);

      const appName = (apiKey as any).appName || `${merchantUser.firstName || ""} ${merchantUser.lastName || ""}`.trim() || "SolvexPay";
      const feeRate = parseFloat((await storage.getSystemSetting("fee_api")) || "7") / 100;
      const feesAmount = Math.round(amount * feeRate);
      const reference = generateReference();

      const transaction = await storage.createTransaction({
        userId: apiKey.userId,
        type: "deposit",
        amount: String(amount),
        currency: "XOF",
        provider: null,
        phoneNumber: null,
        reference,
        status: "pending",
        description: description || `Paiement via API — ${appName}`,
        fees: String(feesAmount),
        payerName: customer_name || null,
        payerEmail: customer_email || null,
        payerCountry: country || null,
        payerOperator: null,
        apiKeyId: apiKey.id,
      } as any);

      return res.redirect(`/pay-api/${transaction.id}`);
    } catch (err: any) {
      console.error("API v1 checkout redirect error:", err);
      return res.status(500).send("Erreur serveur.");
    }
  });

  app.post("/api/v1/deposit", authenticateApiKey, async (req: any, res) => {
    try {
      const { amount, phone, operator, country, description, customer_name, customer_email, metadata } = req.body;

      if (!amount || typeof amount !== "number" || amount < 100) {
        return res.status(400).json({ error: { code: "INVALID_AMOUNT", message: "Montant invalide (minimum 100 XOF).", status: 400 } });
      }

      const { users: usersTable } = await import("@shared/models/auth");
      const { db } = await import("./db");
      const { eq: eqFn } = await import("drizzle-orm");
      const [merchantUser] = await db.select().from(usersTable).where(eqFn(usersTable.id, req.merchantUserId));
      if (!merchantUser) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Compte marchand introuvable.", status: 404 } });
      }
      if (merchantUser.kycStatus !== "verified") {
        return res.status(403).json({ error: { code: "KYC_REQUIRED", message: "Vérification KYC requise pour utiliser l'API.", status: 403 } });
      }

      const appName = (req.merchantApiKey as any).appName || `${merchantUser.firstName || ""} ${merchantUser.lastName || ""}`.trim() || "SolvexPay";
      const apiKeyId = req.merchantApiKey?.id;
      const feeRate = parseFloat((await storage.getSystemSetting("fee_api")) || "7") / 100;
      const feesAmount = Math.round(amount * feeRate);
      const reference = generateReference();

      // ── Toutes les intégrations → page de paiement hébergée SolvexPay ──
      const transaction = await storage.createTransaction({
        userId: req.merchantUserId,
        type: "deposit",
        amount: String(amount),
        currency: "XOF",
        provider: operator ? operator.toUpperCase() : null,
        phoneNumber: phone || null,
        reference,
        status: "pending",
        description: description || `Paiement via API — ${appName}`,
        fees: String(feesAmount),
        payerName: customer_name || null,
        payerEmail: customer_email || null,
        payerCountry: country || null,
        payerOperator: operator ? operator.toUpperCase() : null,
        apiKeyId: apiKeyId || null,
      } as any);

      const hostedUrl = `https://solvexpay.com/pay-api/${transaction.id}`;
      res.status(201).json({
        id: transaction.id,
        status: "pending",
        amount,
        currency: "XOF",
        reference,
        description: transaction.description,
        fees: feesAmount,
        net_amount: amount - feesAmount,
        payment_url: hostedUrl,
        hosted_page: true,
        created_at: transaction.createdAt,
        metadata: metadata || null,
      });
    } catch (error: any) {
      console.error("API v1 deposit error:", error);
      if (error.message?.includes("OmniPay") || error.message?.includes("omnipay")) {
        return res.status(503).json({ error: { code: "PROVIDER_UNAVAILABLE", message: error.message, status: 503 } });
      }
      res.status(500).json({ error: { code: "SERVER_ERROR", message: error.message || "Erreur interne.", status: 500 } });
    }
  });

  app.get("/api/v1/transactions/:id", authenticateApiKey, async (req: any, res) => {
    try {
      const { id } = req.params;
      const transaction = await storage.getTransactionById(id);
      if (!transaction || transaction.userId !== req.merchantUserId) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Transaction introuvable.", status: 404 } });
      }
      res.json({
        id: transaction.id,
        status: transaction.status,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        operator: transaction.provider,
        phone: transaction.phoneNumber,
        country: (transaction as any).payerCountry || null,
        reference: transaction.reference,
        description: transaction.description,
        fees: transaction.fees ? parseFloat(transaction.fees) : 0,
        net_amount: transaction.fees
          ? parseFloat(transaction.amount) - parseFloat(transaction.fees)
          : parseFloat(transaction.amount),
        payer_name: (transaction as any).payerName || null,
        payer_email: (transaction as any).payerEmail || null,
        created_at: transaction.createdAt,
        completed_at: transaction.status === "completed" ? (transaction as any).updatedAt || null : null,
      });
    } catch (error: any) {
      console.error("API v1 get transaction error:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "Erreur interne.", status: 500 } });
    }
  });

  app.get("/api/v1/balance", authenticateApiKey, async (req: any, res) => {
    try {
      const wallet = await storage.getWallet(req.merchantUserId);
      const balance = wallet ? parseFloat(wallet.balanceXOF) : 0;
      res.json({
        balance,
        currency: "XOF",
        available: balance,
        updated_at: wallet?.updatedAt || new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("API v1 balance error:", error);
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "Erreur interne.", status: 500 } });
    }
  });

  // ─── END API V1 ───────────────────────────────────────────────────────────────

  app.post("/api/upload", isAuthenticated, upload.single("image"), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }
    const base64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";
    const imageUrl = `data:${mimeType};base64,${base64}`;
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

      // Forward to merchant webhook URLs
      if (statusStr === "completed" || statusStr === "failed") {
        const finalTx = await storage.getTransactionByReference(reference);
        if (finalTx) forwardToMerchantWebhooks(finalTx);
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

    res.redirect(`/deposit?status=callback&reference=${encodeURIComponent(String(reference || ""))}`);
  });

  app.get("/api/settings/webhook-urls", isAuthenticated, async (req, res) => {
    const baseUrl = "https://solvexpay.com";

    res.json({
      callbackUrl: `${baseUrl}/api/webhooks/omnipay`,
      returnUrl: `${baseUrl}/api/payment/callback`,
      domain: "solvexpay.com",
      instructions: "Configurez ces URLs dans votre tableau de bord OmniPay dans Mon Compte > URL de Callback.",
      steps: [
        "1. Connectez-vous a votre compte OmniPay sur omnipay.webtechci.com",
        "2. Allez dans Mon Compte > URL de Callback",
        "3. Configurez l'URL de callback: https://solvexpay.com/api/webhooks/omnipay",
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

  app.get("/api/admin/financial-summary", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { sum, eq, and, ne } = await import("drizzle-orm");
      const { transactions: txTable, wallets: walletsTable } = await import("@shared/schema");

      const [omnipayDeposits] = await db.select({ total: sum(txTable.amount), fees: sum(txTable.fees) })
        .from(txTable).where(and(eq(txTable.type, "deposit"), eq(txTable.status, "completed"), ne(txTable.provider, "admin")));

      const [adminDeposits] = await db.select({ total: sum(txTable.amount) })
        .from(txTable).where(and(eq(txTable.type, "deposit"), eq(txTable.status, "completed"), eq(txTable.provider, "admin")));

      const [withdrawals] = await db.select({ total: sum(txTable.amount), fees: sum(txTable.fees) })
        .from(txTable).where(and(eq(txTable.type, "withdrawal"), eq(txTable.status, "completed")));

      const [transfers] = await db.select({ total: sum(txTable.amount), fees: sum(txTable.fees) })
        .from(txTable).where(and(eq(txTable.type, "transfer"), eq(txTable.status, "completed")));

      const [walletTotal] = await db.select({ total: sum(walletsTable.balanceXOF) }).from(walletsTable);

      const [allFees] = await db.select({ total: sum(txTable.fees) })
        .from(txTable).where(eq(txTable.status, "completed"));

      res.json({
        omnipayDeposits: parseFloat(omnipayDeposits.total || "0"),
        omnipayDepositFees: parseFloat(omnipayDeposits.fees || "0"),
        adminDeposits: parseFloat(adminDeposits.total || "0"),
        withdrawals: parseFloat(withdrawals.total || "0"),
        withdrawalFees: parseFloat(withdrawals.fees || "0"),
        transfers: parseFloat(transfers.total || "0"),
        transferFees: parseFloat(transfers.fees || "0"),
        totalWalletBalance: parseFloat(walletTotal.total || "0"),
        totalFees: parseFloat(allFees.total || "0"),
      });
    } catch (error) {
      console.error("Financial summary error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/transactions", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { desc, eq: eqOp } = await import("drizzle-orm");
      const { transactions: txTable } = await import("@shared/schema");
      const { users: usersTable } = await import("@shared/models/auth");
      const limit = parseInt(req.query.limit as string) || 100;
      const rows = await db
        .select({
          tx: txTable,
          userFirstName: usersTable.firstName,
          userLastName: usersTable.lastName,
          userEmail: usersTable.email,
        })
        .from(txTable)
        .leftJoin(usersTable, eqOp(txTable.userId, usersTable.id))
        .orderBy(desc(txTable.createdAt))
        .limit(limit);
      const allTx = rows.map(r => ({
        ...r.tx,
        userDisplayName: r.userFirstName && r.userLastName
          ? `${r.userFirstName} ${r.userLastName}`
          : r.userFirstName || r.userLastName || r.userEmail || "—",
        userEmail: r.userEmail,
      }));
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

      const transaction = await storage.getTransactionById(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction introuvable" });
      }

      if (status === "completed" && transaction.type === "withdrawal" && transaction.status === "pending") {
        if (!isApiKeyConfigured()) {
          return res.status(503).json({ message: "Service de paiement OmniPay non configuré" });
        }

        const amount = parseFloat(transaction.amount);
        const txFees = parseFloat((transaction as any).fees || "0");
        const txCurrency = (transaction as any).currency || "XOF";
        const operator = (transaction as any).provider || "";
        const phoneNumber = (transaction as any).phoneNumber || "";

        // Net amount to send = stored amount minus stored fees
        const amountXOFForNet = txCurrency === "CDF" ? Math.floor(amount * 0.22) : amount;
        const netXOF = amountXOFForNet - txFees;
        const netAmountLocal = txCurrency === "CDF" ? Math.round(netXOF / 0.22) : netXOF;

        const { users: usersTable } = await import("@shared/models/auth");
        const { db: dbInst } = await import("./db");
        const { eq: eqDyn } = await import("drizzle-orm");
        const [txUser] = await dbInst.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
          .from(usersTable).where(eqDyn(usersTable.id, transaction.userId));

        const resolvedFirstName = txUser?.firstName || "Client";
        const resolvedLastName = txUser?.lastName || "SolvexPay";

        const txCountry = (transaction as any).payerCountry || "BJ";
        const omnipayOperator = getOmniPayOperatorCode(operator, txCountry);

        console.log(`Admin: initiating OmniPay transfer for manual withdrawal tx ${id} (${phoneNumber}, ${omnipayOperator}, amount: ${amount}, fees: ${txFees}, net: ${netAmountLocal})`);
        try {
          const transferResponse = await omniPayService.transfer({
            msisdn: phoneNumber,
            amount: netAmountLocal,
            reference: transaction.reference,
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            operator: omnipayOperator,
          });
          console.log(`Admin: OmniPay transfer response for tx ${id}:`, transferResponse);

          const tx = await storage.updateTransactionStatus(id, "completed");
          return res.json({ ...tx, omnipayId: transferResponse.id, omnipayTriggered: true });
        } catch (omnipayError: any) {
          console.error(`Admin: OmniPay transfer failed for tx ${id}:`, omnipayError);
          return res.status(502).json({
            message: `Échec du paiement OmniPay: ${omnipayError.message || "Erreur inconnue"}`,
            omnipayError: true,
          });
        }
      }

      if (status === "failed" && transaction.type === "withdrawal" && transaction.status === "pending") {
        await storage.updateTransactionStatus(id, "failed");
        await storage.updateWalletBalance(transaction.userId, transaction.currency, parseFloat(transaction.amount));
        const tx = await storage.getTransactionById(id);
        return res.json({ ...tx, refunded: true });
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

  app.get("/api/admin/service-fees", isAdmin, async (req, res) => {
    try {
      const deposit = parseFloat((await storage.getSystemSetting("fee_deposit")) || "7");
      const withdrawal = parseFloat((await storage.getSystemSetting("fee_withdrawal")) || "7");
      const transfer = parseFloat((await storage.getSystemSetting("fee_transfer")) || "7");
      const api = parseFloat((await storage.getSystemSetting("fee_api")) || "7");
      res.json({ deposit, withdrawal, transfer, api });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/service-fees", isAdmin, async (req, res) => {
    try {
      const { deposit, withdrawal, transfer, api } = req.body;
      if (deposit !== undefined) {
        const v = parseFloat(deposit);
        if (isNaN(v) || v < 0 || v > 100) return res.status(400).json({ message: "Valeur invalide pour dépôt (0-100)" });
        await storage.setSystemSetting("fee_deposit", String(v));
      }
      if (withdrawal !== undefined) {
        const v = parseFloat(withdrawal);
        if (isNaN(v) || v < 0 || v > 100) return res.status(400).json({ message: "Valeur invalide pour retrait (0-100)" });
        await storage.setSystemSetting("fee_withdrawal", String(v));
      }
      if (transfer !== undefined) {
        const v = parseFloat(transfer);
        if (isNaN(v) || v < 0 || v > 100) return res.status(400).json({ message: "Valeur invalide pour transfert (0-100)" });
        await storage.setSystemSetting("fee_transfer", String(v));
      }
      if (api !== undefined) {
        const v = parseFloat(api);
        if (isNaN(v) || v < 0 || v > 100) return res.status(400).json({ message: "Valeur invalide pour API (0-100)" });
        await storage.setSystemSetting("fee_api", String(v));
      }
      const updated = {
        deposit: parseFloat((await storage.getSystemSetting("fee_deposit")) || "7"),
        withdrawal: parseFloat((await storage.getSystemSetting("fee_withdrawal")) || "7"),
        transfer: parseFloat((await storage.getSystemSetting("fee_transfer")) || "7"),
        api: parseFloat((await storage.getSystemSetting("fee_api")) || "7"),
      };
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/omnipay-rates", isAdmin, async (req, res) => {
    try {
      const deposit = parseFloat((await storage.getSystemSetting("omnipay_rate_deposit")) || "3");
      const withdrawal = parseFloat((await storage.getSystemSetting("omnipay_rate_withdrawal")) || "3");
      res.json({ deposit, withdrawal });
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/omnipay-rates", isAdmin, async (req, res) => {
    try {
      const { deposit, withdrawal } = req.body;
      if (deposit !== undefined) {
        const v = parseFloat(deposit);
        if (isNaN(v) || v < 0 || v > 100) return res.status(400).json({ message: "Valeur invalide (0-100)" });
        await storage.setSystemSetting("omnipay_rate_deposit", String(v));
      }
      if (withdrawal !== undefined) {
        const v = parseFloat(withdrawal);
        if (isNaN(v) || v < 0 || v > 100) return res.status(400).json({ message: "Valeur invalide (0-100)" });
        await storage.setSystemSetting("omnipay_rate_withdrawal", String(v));
      }
      const updated = {
        deposit: parseFloat((await storage.getSystemSetting("omnipay_rate_deposit")) || "3"),
        withdrawal: parseFloat((await storage.getSystemSetting("omnipay_rate_withdrawal")) || "3"),
      };
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/commissions", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { sum, count, eq, and, gte, lt } = await import("drizzle-orm");
      const { transactions: txTable, adminWithdrawals: awTable } = await import("@shared/schema");
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const omnipayDepositRate = parseFloat((await storage.getSystemSetting("omnipay_rate_deposit")) || "3") / 100;
      const omnipayWithdrawalRate = parseFloat((await storage.getSystemSetting("omnipay_rate_withdrawal")) || "3") / 100;

      const [totalFees] = await db.select({ total: sum(txTable.fees) }).from(txTable).where(eq(txTable.status, "completed"));
      const [monthFees] = await db.select({ total: sum(txTable.fees) }).from(txTable).where(and(eq(txTable.status, "completed"), gte(txTable.createdAt, startOfMonth)));
      const [lastMonthFees] = await db.select({ total: sum(txTable.fees) }).from(txTable).where(and(eq(txTable.status, "completed"), gte(txTable.createdAt, startOfLastMonth), lt(txTable.createdAt, endOfLastMonth)));
      const [totalVolume] = await db.select({ total: sum(txTable.amount) }).from(txTable).where(eq(txTable.status, "completed"));
      const [monthVolume] = await db.select({ total: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.status, "completed"), gte(txTable.createdAt, startOfMonth)));
      const [txCountCompleted] = await db.select({ count: count() }).from(txTable).where(eq(txTable.status, "completed"));

      const [depositFees] = await db.select({ fees: sum(txTable.fees), volume: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.status, "completed"), eq(txTable.type, "deposit"), eq(txTable.provider, "omnipay")));
      const [withdrawalFees] = await db.select({ fees: sum(txTable.fees), volume: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.status, "completed"), eq(txTable.type, "withdrawal")));
      const [transferFees] = await db.select({ fees: sum(txTable.fees), volume: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.status, "completed"), eq(txTable.type, "transfer")));
      const [apiFees] = await db.select({ fees: sum(txTable.fees), volume: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.status, "completed"), eq(txTable.type, "deposit")));
      const [monthDepositFees] = await db.select({ fees: sum(txTable.fees), volume: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.status, "completed"), eq(txTable.type, "deposit"), eq(txTable.provider, "omnipay"), gte(txTable.createdAt, startOfMonth)));
      const [monthWithdrawalFees] = await db.select({ fees: sum(txTable.fees), volume: sum(txTable.amount) }).from(txTable).where(and(eq(txTable.status, "completed"), eq(txTable.type, "withdrawal"), gte(txTable.createdAt, startOfMonth)));

      // Total admin profit withdrawals (completed only deducted, pending reserved)
      const [withdrawnCompleted] = await db.select({ total: sum(awTable.amount) }).from(awTable).where(eq(awTable.status, "completed"));
      const [withdrawnPending] = await db.select({ total: sum(awTable.amount) }).from(awTable).where(eq(awTable.status, "pending"));

      const totalDepositFees = parseFloat(depositFees.fees || "0");
      const totalWithdrawalFees = parseFloat(withdrawalFees.fees || "0");
      const totalTransferFees = parseFloat(transferFees.fees || "0");
      const totalDepositVolume = parseFloat(depositFees.volume || "0");
      const totalWithdrawalVolume = parseFloat(withdrawalFees.volume || "0");
      const monthDepositFeesVal = parseFloat(monthDepositFees.fees || "0");
      const monthWithdrawalFeesVal = parseFloat(monthWithdrawalFees.fees || "0");
      const monthDepositVolumeVal = parseFloat(monthDepositFees.volume || "0");
      const monthWithdrawalVolumeVal = parseFloat(monthWithdrawalFees.volume || "0");

      const omnipayCostDeposit = Math.round(totalDepositVolume * omnipayDepositRate);
      const omnipayCostWithdrawal = Math.round(totalWithdrawalVolume * omnipayWithdrawalRate);
      const omnipayCostDepositMonth = Math.round(monthDepositVolumeVal * omnipayDepositRate);
      const omnipayCostWithdrawalMonth = Math.round(monthWithdrawalVolumeVal * omnipayWithdrawalRate);
      const totalOmniPayCost = omnipayCostDeposit + omnipayCostWithdrawal;
      const totalAdminFees = parseFloat(totalFees.total || "0");
      const adminNetProfit = totalAdminFees - totalOmniPayCost;
      const monthAdminFees = parseFloat(monthFees.total || "0");
      const monthOmniPayCost = omnipayCostDepositMonth + omnipayCostWithdrawalMonth;
      const monthNetProfit = monthAdminFees - monthOmniPayCost;

      const totalWithdrawn = parseFloat(withdrawnCompleted.total || "0");
      const pendingWithdrawn = parseFloat(withdrawnPending.total || "0");
      const availableBalance = Math.max(0, adminNetProfit - totalWithdrawn);

      res.json({
        totalFees: totalAdminFees,
        monthFees: monthAdminFees,
        lastMonthFees: parseFloat(lastMonthFees.total || "0"),
        totalVolume: parseFloat(totalVolume.total || "0"),
        monthVolume: parseFloat(monthVolume.total || "0"),
        completedTxCount: txCountCompleted.count,
        totalDepositFees,
        totalWithdrawalFees,
        totalTransferFees,
        totalDepositVolume,
        totalWithdrawalVolume,
        omnipayCostDeposit,
        omnipayCostWithdrawal,
        totalOmniPayCost,
        adminNetProfit,
        monthDepositFees: monthDepositFeesVal,
        monthWithdrawalFees: monthWithdrawalFeesVal,
        monthOmniPayCost,
        monthNetProfit,
        omnipayDepositRate: omnipayDepositRate * 100,
        omnipayWithdrawalRate: omnipayWithdrawalRate * 100,
        estimatedOmniPayCut: totalOmniPayCost,
        estimatedNetRevenue: adminNetProfit,
        totalWithdrawn,
        pendingWithdrawn,
        availableBalance,
      });
    } catch (error) {
      console.error("Admin commissions error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Profit transactions — completed transactions with fees for admin revenue view
  app.get("/api/admin/profit-transactions", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { desc, eq: eqOp, and, isNotNull, gt } = await import("drizzle-orm");
      const { transactions: txTable } = await import("@shared/schema");
      const { users: usersTable } = await import("@shared/models/auth");
      const { sql: sqlFn } = await import("drizzle-orm");
      const limit = parseInt(req.query.limit as string) || 200;
      const rows = await db
        .select({
          tx: txTable,
          userFirstName: usersTable.firstName,
          userLastName: usersTable.lastName,
          userEmail: usersTable.email,
        })
        .from(txTable)
        .leftJoin(usersTable, eqOp(txTable.userId, usersTable.id))
        .where(and(eqOp(txTable.status, "completed"), isNotNull(txTable.fees), gt(txTable.fees, sqlFn`0`)))
        .orderBy(desc(txTable.createdAt))
        .limit(limit);
      const result = rows.map(r => ({
        ...r.tx,
        userDisplayName: r.userFirstName && r.userLastName
          ? `${r.userFirstName} ${r.userLastName}`
          : r.userFirstName || r.userLastName || r.userEmail || "—",
        userEmail: r.userEmail,
      }));
      res.json(result);
    } catch (error) {
      console.error("Admin profit transactions error:", error);
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

  app.get("/api/admin/stats/countries", isAdmin, async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { sql, ne, isNotNull } = await import("drizzle-orm");
      const { transactions: txTable } = await import("@shared/schema");
      const { users: usersTable } = await import("@shared/models/auth");

      const txByCountry = await db
        .select({
          country: txTable.payerCountry,
          txCount: sql<number>`count(*)::int`,
          uniqueUsers: sql<number>`count(distinct ${txTable.userId})::int`,
          totalVolume: sql<number>`sum(${txTable.amount}::numeric)::float`,
        })
        .from(txTable)
        .where(isNotNull(txTable.payerCountry))
        .groupBy(txTable.payerCountry)
        .orderBy(sql`count(*) desc`);

      const usersByWithdrawalRaw = await db.execute(sql`
        SELECT
          CASE
            WHEN phone LIKE '+229%' THEN 'BJ'
            WHEN phone LIKE '+225%' THEN 'CI'
            WHEN phone LIKE '+221%' THEN 'SN'
            WHEN phone LIKE '+228%' THEN 'TG'
            WHEN phone LIKE '+237%' THEN 'CM'
            WHEN phone LIKE '+224%' THEN 'GN'
            WHEN phone LIKE '+223%' THEN 'ML'
            WHEN phone LIKE '+226%' THEN 'BF'
            WHEN phone LIKE '+227%' THEN 'NE'
            WHEN phone LIKE '+243%' THEN 'COD'
            WHEN phone LIKE '+242%' THEN 'COG'
            WHEN phone LIKE '+233%' THEN 'GH'
            WHEN phone LIKE '+234%' THEN 'NG'
            ELSE NULL
          END AS country,
          COUNT(*)::int AS count
        FROM users
        WHERE phone IS NOT NULL
        GROUP BY 1
        HAVING CASE
          WHEN phone LIKE '+229%' THEN 'BJ'
          WHEN phone LIKE '+225%' THEN 'CI'
          WHEN phone LIKE '+221%' THEN 'SN'
          WHEN phone LIKE '+228%' THEN 'TG'
          WHEN phone LIKE '+237%' THEN 'CM'
          WHEN phone LIKE '+224%' THEN 'GN'
          WHEN phone LIKE '+223%' THEN 'ML'
          WHEN phone LIKE '+226%' THEN 'BF'
          WHEN phone LIKE '+227%' THEN 'NE'
          WHEN phone LIKE '+243%' THEN 'COD'
          WHEN phone LIKE '+242%' THEN 'COG'
          WHEN phone LIKE '+233%' THEN 'GH'
          WHEN phone LIKE '+234%' THEN 'NG'
          ELSE NULL
        END IS NOT NULL
        ORDER BY count DESC
      `);
      const usersByWithdrawal = usersByWithdrawalRaw.rows.map((r: any) => ({
        country: r.country,
        count: Number(r.count),
      }));

      res.json({ txByCountry, usersByWithdrawal });
    } catch (error) {
      console.error("Stats countries error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/liquidity-analysis", isAdmin, async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const caseExpr = `
        CASE
          WHEN u.withdrawal_country IS NOT NULL THEN u.withdrawal_country
          WHEN u.phone LIKE '+229%' THEN 'BJ'
          WHEN u.phone LIKE '+225%' THEN 'CI'
          WHEN u.phone LIKE '+221%' THEN 'SN'
          WHEN u.phone LIKE '+228%' THEN 'TG'
          WHEN u.phone LIKE '+237%' THEN 'CM'
          WHEN u.phone LIKE '+224%' THEN 'GN'
          WHEN u.phone LIKE '+223%' THEN 'ML'
          WHEN u.phone LIKE '+226%' THEN 'BF'
          WHEN u.phone LIKE '+227%' THEN 'NE'
          WHEN u.phone LIKE '+243%' THEN 'COD'
          WHEN u.phone LIKE '+242%' THEN 'COG'
          ELSE NULL
        END
      `;

      const walletRows = await db.execute(sql.raw(`
        WITH effective AS (
          SELECT (${caseExpr}) AS country, w.balance_xof, u.id
          FROM users u
          INNER JOIN wallets w ON w.user_id = u.id
        )
        SELECT
          country,
          COALESCE(SUM(balance_xof::numeric), 0)::float AS "totalBalance",
          COUNT(DISTINCT id)::int AS "userCount"
        FROM effective
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY "totalBalance" DESC
      `));

      const pendingRows = await db.execute(sql.raw(`
        WITH effective AS (
          SELECT (${caseExpr}) AS country, t.amount
          FROM transactions t
          INNER JOIN users u ON u.id = t.user_id
          WHERE t.type = 'withdrawal' AND t.status = 'pending'
        )
        SELECT
          country,
          COALESCE(SUM(amount::numeric), 0)::float AS "pendingAmount",
          COUNT(*)::int AS "pendingCount"
        FROM effective
        WHERE country IS NOT NULL
        GROUP BY country
      `));

      res.json({
        walletsByCountry: walletRows.rows,
        pendingByCountry: pendingRows.rows,
      });
    } catch (error) {
      console.error("Liquidity analysis error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/payment-methods/:code", isAdmin, async (req, res) => {
    try {
      const { code } = req.params;
      const { isActive, inMaintenance, maintenanceCountries, feeValue, feeType } = req.body;
      const { db } = await import("./db");
      const { paymentMethods: pmTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const updateData: any = { updatedAt: new Date() };
      if (isActive !== undefined) updateData.isActive = isActive;
      if (inMaintenance !== undefined) updateData.inMaintenance = inMaintenance;
      if (maintenanceCountries !== undefined) updateData.maintenanceCountries = maintenanceCountries;
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
  app.post("/api/admin/payment-methods/global-maintenance", isAdmin, async (req, res) => {
    try {
      const { inMaintenance } = req.body;
      const { db } = await import("./db");
      const { paymentMethods: pmTable } = await import("@shared/schema");
      await db.update(pmTable).set({ inMaintenance: !!inMaintenance, maintenanceCountries: [], updatedAt: new Date() });
      const methods = await db.select().from(pmTable);
      res.json(methods);
    } catch (error) {
      console.error("Admin global maintenance error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.get("/api/admin/omnipay/balance", isAdmin, async (req, res) => {
    try {
      const balances = await omniPayService.getBalance();
      res.json(balances);
    } catch (error) {
      console.error("Admin OmniPay balance error:", error);
      res.status(500).json({ message: "Impossible de récupérer le solde OmniPay" });
    }
  });

  app.post("/api/admin/omnipay/withdraw", isAdmin, async (req: any, res) => {
    try {
      const { amount, phoneNumber, operator, recipientName, note } = req.body;
      if (!amount || !phoneNumber || !operator) {
        return res.status(400).json({ message: "Montant, numéro et opérateur requis" });
      }
      const parsedAmount = parseFloat(String(amount));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: "Montant invalide" });
      }
      const { db } = await import("./db");
      const { adminWithdrawals } = await import("@shared/schema");
      const reference = `ADMIN-WD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const nameParts = (recipientName || "Admin SolvexPay").trim().split(" ");
      const firstName = nameParts[0] || "Admin";
      const lastName = nameParts.slice(1).join(" ") || "SolvexPay";
      const transferResult = await omniPayService.transfer({
        msisdn: phoneNumber,
        amount: parsedAmount,
        reference,
        firstName,
        lastName,
        operator,
      });
      const statusStr = omnipayStatusToString(transferResult.status ?? 0);
      const [inserted] = await db.insert(adminWithdrawals).values({
        amount: String(parsedAmount),
        phoneNumber,
        operator,
        recipientName: recipientName || null,
        reference,
        omnipayId: transferResult.id ? String(transferResult.id) : null,
        status: statusStr,
        note: note || null,
      }).returning();
      res.json({ success: true, withdrawal: inserted, omnipayStatus: statusStr });
    } catch (error: any) {
      console.error("Admin OmniPay withdraw error:", error);
      res.status(500).json({ message: error.message || "Erreur lors du retrait OmniPay" });
    }
  });

  app.get("/api/admin/omnipay/withdrawals", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { adminWithdrawals } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      const history = await db.select().from(adminWithdrawals).orderBy(desc(adminWithdrawals.createdAt)).limit(100);
      res.json(history);
    } catch (error) {
      console.error("Admin withdrawals history error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.post("/api/admin/omnipay/withdrawals/:id/check", isAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { adminWithdrawals } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [wd] = await db.select().from(adminWithdrawals).where(eq(adminWithdrawals.id, req.params.id));
      if (!wd) return res.status(404).json({ message: "Retrait introuvable" });
      const result = await omniPayService.getStatus(wd.reference);
      const statusStr = omnipayStatusToString(result.status ?? 0);
      await db.update(adminWithdrawals).set({ status: statusStr, updatedAt: new Date() }).where(eq(adminWithdrawals.id, wd.id));
      res.json({ status: statusStr, omnipayStatus: result.status });
    } catch (error: any) {
      console.error("Admin withdrawal check error:", error);
      res.status(500).json({ message: error.message || "Erreur vérification statut" });
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

      const { db: dbClient } = await import("./db");
      const { wallets: walletsTable, transactions: txTable } = await import("@shared/schema");
      const { eq: eqFn, sql: sqlRaw, and: andFn } = await import("drizzle-orm");

      await dbClient.transaction(async (trx) => {
        await trx.update(walletsTable)
          .set({ balanceXOF: sqlRaw`${walletsTable.balanceXOF} - ${parseFloat(amount)}`, updatedAt: new Date() })
          .where(andFn(eqFn(walletsTable.userId, fromUserId), sqlRaw`${walletsTable.balanceXOF} >= ${parseFloat(amount)}`));

        const [existingToWallet] = await trx.select().from(walletsTable).where(eqFn(walletsTable.userId, toUserId));
        if (!existingToWallet) {
          await trx.insert(walletsTable).values({ userId: toUserId });
        }

        await trx.update(walletsTable)
          .set({ balanceXOF: sqlRaw`${walletsTable.balanceXOF} + ${parseFloat(amount)}`, updatedAt: new Date() })
          .where(eqFn(walletsTable.userId, toUserId));

        const refFrom = generateReference();
        const refTo = generateReference();
        await trx.insert(txTable).values([
          { userId: fromUserId, type: "transfer", amount: String(amount), currency: "XOF", provider: "admin", phoneNumber: "", reference: refFrom, status: "completed", description: `Migration admin vers ${toUserId}: ${motif || ""}` },
          { userId: toUserId, type: "deposit", amount: String(amount), currency: "XOF", provider: "admin", phoneNumber: "", reference: refTo, status: "completed", description: `Migration admin depuis ${fromUserId}: ${motif || ""}` },
        ]);
      });

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
      const [updated] = await db.update(plTable).set({ isActive: !!isActive, adminLocked: !isActive }).where(eq(plTable.id, id)).returning();
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
      const setActive = !!isActive;
      const [updated] = await db.update(akTable).set({ isActive: setActive, adminLocked: !setActive }).where(eq(akTable.id, id)).returning();
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

  app.get("/api/admin/system-settings", isAdmin, async (_req, res) => {
    try {
      const withdrawalMode = (await storage.getSystemSetting("withdrawalMode")) || "auto";
      res.json({ withdrawalMode });
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  app.patch("/api/admin/system-settings", isAdmin, async (req, res) => {
    try {
      const { withdrawalMode } = req.body;
      if (withdrawalMode && ["auto", "manual"].includes(withdrawalMode)) {
        await storage.setSystemSetting("withdrawalMode", withdrawalMode);
      }
      res.json({ withdrawalMode: withdrawalMode || "auto" });
    } catch (error) {
      res.status(500).json({ message: "Erreur" });
    }
  });

  // ─── END ADMIN ROUTES ──────────────────────────────────────────────────────

  return httpServer;
}
