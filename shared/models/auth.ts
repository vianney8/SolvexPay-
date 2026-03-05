import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  passwordHash: varchar("password_hash"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  kycStatus: varchar("kyc_status").default("not_started"),
  kycRejectionReason: varchar("kyc_rejection_reason"),
  kycFirstName: varchar("kyc_first_name"),
  kycLastName: varchar("kyc_last_name"),
  kycDocumentNumber: varchar("kyc_document_number"),
  kycDocumentFront: varchar("kyc_document_front"),
  kycDocumentBack: varchar("kyc_document_back"),
  kycSelfie: varchar("kyc_selfie"),
  merchantName: varchar("merchant_name"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  customFeeRate: varchar("custom_fee_rate"),
  withdrawalCountry: varchar("withdrawal_country"),
  withdrawalOperator: varchar("withdrawal_operator"),
  withdrawalPhone: varchar("withdrawal_phone"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationCode: varchar("email_verification_code"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  profileImageUrl: true,
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
