import { 
  transactions, 
  paymentLinks, 
  apiKeys, 
  wallets,
  type Transaction, 
  type InsertTransaction,
  type PaymentLink,
  type InsertPaymentLink,
  type ApiKey,
  type InsertApiKey,
  type Wallet,
  type InsertWallet,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

export interface IStorage {
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(userId: string): Promise<Wallet>;
  updateWalletBalance(userId: string, currency: string, amount: number): Promise<Wallet>;
  
  getTransactions(userId: string): Promise<Transaction[]>;
  getTransactionByReference(reference: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined>;
  
  getPaymentLinks(userId: string): Promise<PaymentLink[]>;
  getPaymentLinkBySlug(slug: string): Promise<PaymentLink | undefined>;
  createPaymentLink(paymentLink: InsertPaymentLink): Promise<PaymentLink>;
  updatePaymentLink(id: string, data: Partial<PaymentLink>): Promise<PaymentLink | undefined>;
  deletePaymentLink(id: string): Promise<void>;
  incrementPaymentLinkUsage(id: string): Promise<void>;
  
  getApiKeys(userId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<void>;
  
  getStats(userId: string): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    transactionCount: number;
    paymentLinksCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet;
  }

  async createWallet(userId: string): Promise<Wallet> {
    const [wallet] = await db
      .insert(wallets)
      .values({ userId })
      .returning();
    return wallet;
  }

  async updateWalletBalance(userId: string, currency: string, amount: number): Promise<Wallet> {
    const validCurrencies = ["XOF", "NGN", "GHS", "KES"];
    if (!validCurrencies.includes(currency)) {
      throw new Error(`Invalid currency: ${currency}`);
    }
    
    let updateSet: Record<string, any> = { updatedAt: new Date() };
    
    switch (currency) {
      case "XOF":
        updateSet.balanceXOF = sql`${wallets.balanceXOF} + ${amount}`;
        break;
      case "NGN":
        updateSet.balanceNGN = sql`${wallets.balanceNGN} + ${amount}`;
        break;
      case "GHS":
        updateSet.balanceGHS = sql`${wallets.balanceGHS} + ${amount}`;
        break;
      case "KES":
        updateSet.balanceKES = sql`${wallets.balanceKES} + ${amount}`;
        break;
    }
    
    const [wallet] = await db
      .update(wallets)
      .set(updateSet)
      .where(eq(wallets.userId, userId))
      .returning();
    return wallet;
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionByReference(reference: string): Promise<Transaction | undefined> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.reference, reference));
    return tx;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [tx] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return tx;
  }

  async updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined> {
    const [tx] = await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.id, id))
      .returning();
    return tx;
  }

  async getPaymentLinks(userId: string): Promise<PaymentLink[]> {
    return db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.userId, userId))
      .orderBy(desc(paymentLinks.createdAt));
  }

  async getPaymentLinkBySlug(slug: string): Promise<PaymentLink | undefined> {
    const [link] = await db.select().from(paymentLinks).where(eq(paymentLinks.slug, slug));
    return link;
  }

  async createPaymentLink(paymentLink: InsertPaymentLink): Promise<PaymentLink> {
    const [link] = await db
      .insert(paymentLinks)
      .values(paymentLink)
      .returning();
    return link;
  }

  async updatePaymentLink(id: string, data: Partial<PaymentLink>): Promise<PaymentLink | undefined> {
    const [link] = await db
      .update(paymentLinks)
      .set(data)
      .where(eq(paymentLinks.id, id))
      .returning();
    return link;
  }

  async deletePaymentLink(id: string): Promise<void> {
    await db.delete(paymentLinks).where(eq(paymentLinks.id, id));
  }

  async incrementPaymentLinkUsage(id: string): Promise<void> {
    await db
      .update(paymentLinks)
      .set({ timesUsed: sql`${paymentLinks.timesUsed} + 1` })
      .where(eq(paymentLinks.id, id));
  }

  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [key] = await db
      .insert(apiKeys)
      .values(apiKey)
      .returning();
    return key;
  }

  async updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const [key] = await db
      .update(apiKeys)
      .set(data)
      .where(eq(apiKeys.id, id))
      .returning();
    return key;
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async getStats(userId: string): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    transactionCount: number;
    paymentLinksCount: number;
  }> {
    const txs = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.status, "completed")));
    
    const links = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.userId, userId));

    const totalDeposits = txs
      .filter((t) => t.type === "deposit")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalWithdrawals = txs
      .filter((t) => t.type === "withdrawal")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      totalDeposits,
      totalWithdrawals,
      transactionCount: txs.length,
      paymentLinksCount: links.length,
    };
  }
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `sk_${randomBytes(24).toString("hex")}`;
  const prefix = key.substring(0, 12);
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

export function generateSlug(): string {
  return randomBytes(8).toString("hex");
}

export function generateReference(): string {
  return `REF-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export const storage = new DatabaseStorage();
