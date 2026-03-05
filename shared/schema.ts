import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // deposit, withdrawal
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XOF"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  provider: text("provider"), // MTN, Orange, Wave, etc.
  phoneNumber: text("phone_number"),
  reference: text("reference").notNull(),
  description: text("description"),
  fees: decimal("fees", { precision: 12, scale: 2 }),
  payerName: text("payer_name"),
  payerEmail: text("payer_email"),
  payerCountry: text("payer_country"),
  payerOperator: text("payer_operator"),
  apiKeyId: varchar("api_key_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_transactions_user").on(table.userId)]);

export const paymentLinks = pgTable("payment_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  merchantName: text("merchant_name"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XOF"),
  description: text("description"),
  redirectUrl: text("redirect_url"),
  imageUrl: text("image_url"),
  slug: text("slug").notNull().unique(),
  allowCustomAmount: boolean("allow_custom_amount").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  adminLocked: boolean("admin_locked").notNull().default(false),
  timesUsed: decimal("times_used", { precision: 10, scale: 0 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_payment_links_user").on(table.userId)]);

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  appName: text("app_name"),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  fullKey: text("full_key"),
  webhookSecret: text("webhook_secret"),
  environment: text("environment").notNull().default("live"),
  websiteUrl: text("website_url"),
  redirectUrl: text("redirect_url"),
  webhookUrl: text("webhook_url"),
  isActive: boolean("is_active").notNull().default(true),
  adminLocked: boolean("admin_locked").notNull().default(false),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_api_keys_user").on(table.userId)]);

export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  balanceXOF: decimal("balance_xof", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default("mobile_money"),
  isActive: boolean("is_active").notNull().default(true),
  inMaintenance: boolean("in_maintenance").notNull().default(false),
  maintenanceCountries: text("maintenance_countries").array().default([]),
  feeType: text("fee_type").notNull().default("percentage"),
  feeValue: decimal("fee_value", { precision: 5, scale: 2 }).notNull().default("5"),
  countries: text("countries").array().default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true });
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const feeConfigs = pgTable("fee_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  country: text("country").notNull().default("default"),
  feeRate: decimal("fee_rate", { precision: 5, scale: 2 }).notNull().default("5"),
  minAmount: decimal("min_amount", { precision: 12, scale: 2 }).default("0"),
  maxAmount: decimal("max_amount", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_fee_configs_type_country").on(table.type, table.country)]);

export const insertFeeConfigSchema = createInsertSchema(feeConfigs).omit({ id: true });
export type FeeConfig = typeof feeConfigs.$inferSelect;
export type InsertFeeConfig = z.infer<typeof insertFeeConfigSchema>;

export const adminWithdrawals = pgTable("admin_withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XOF"),
  phoneNumber: text("phone_number").notNull(),
  operator: text("operator").notNull(),
  recipientName: text("recipient_name"),
  reference: text("reference").notNull(),
  omnipayId: text("omnipay_id"),
  status: text("status").notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AdminWithdrawal = typeof adminWithdrawals.$inferSelect;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  message: text("message").notNull(),
  color: text("color").notNull().default("blue"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Insert schemas
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentLinkSchema = createInsertSchema(paymentLinks).omit({
  id: true,
  createdAt: true,
  timesUsed: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type PaymentLink = typeof paymentLinks.$inferSelect;
export type InsertPaymentLink = z.infer<typeof insertPaymentLinkSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
