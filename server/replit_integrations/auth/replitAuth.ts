import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import rateLimit from "express-rate-limit";
import { authStorage } from "./storage";
import { registerSchema, loginSchema } from "@shared/models/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../services/resend";
import { sanitizeUser } from "./userUtils";

const RESEND_WINDOW_MS = 25 * 60 * 1000;
const RESEND_MAX = 5;
const resendTracker = new Map<string, { count: number; windowStart: number }>();

function checkResendLimit(key: string): { allowed: boolean; minutesLeft: number } {
  const now = Date.now();
  const entry = resendTracker.get(key);
  if (!entry || now - entry.windowStart >= RESEND_WINDOW_MS) {
    resendTracker.set(key, { count: 1, windowStart: now });
    return { allowed: true, minutesLeft: 0 };
  }
  if (entry.count >= RESEND_MAX) {
    const minutesLeft = Math.ceil((RESEND_WINDOW_MS - (now - entry.windowStart)) / 60000);
    return { allowed: false, minutesLeft };
  }
  entry.count++;
  return { allowed: true, minutesLeft: 0 };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Trop d'inscriptions depuis cette adresse. Réessayez dans 1 heure." },
  standardHeaders: true,
  legacyHeaders: false,
});

const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Trop de tentatives. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Trop de demandes de réinitialisation. Réessayez dans 1 heure." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

function generateVerificationCode(): string {
  return String(randomInt(100000, 999999));
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { fullName, email, phone, password } = validation.data;

      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Un compte avec cet email existe déjà" });
      }

      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await authStorage.createUser({
        email,
        firstName,
        lastName,
        phone,
        passwordHash,
        emailVerified: false,
      });

      const code = generateVerificationCode();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await authStorage.updateUserVerificationCode(user.id, code, expiry);

      try {
        await sendVerificationEmail(email, code, firstName);
        console.log(`[Email] Verification email sent to ${email}`);
      } catch (emailErr: any) {
        console.error("[Email] Failed to send verification email:", emailErr?.message || emailErr);
      }

      res.status(201).json({ requiresVerification: true, email, userId: user.id });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  app.post("/api/auth/verify-email", codeLimiter, async (req, res) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ message: "Données manquantes" });
      }

      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }

      if (user.emailVerified) {
        (req.session as any).userId = user.id;
        return res.json(sanitizeUser(user));
      }

      if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
        return res.status(400).json({ message: "Aucun code de vérification trouvé. Demandez un nouveau code." });
      }

      if (new Date() > new Date(user.emailVerificationExpiry)) {
        return res.status(400).json({ message: "Le code a expiré. Demandez un nouveau code.", expired: true });
      }

      if (user.emailVerificationCode !== String(code).trim()) {
        return res.status(400).json({ message: "Code incorrect. Vérifiez votre email et réessayez." });
      }

      await authStorage.markEmailVerified(user.id);

      const updatedUser = await authStorage.getUser(user.id);
      (req.session as any).userId = user.id;
      res.json(sanitizeUser(updatedUser!));
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ message: "Erreur lors de la vérification" });
    }
  });

  app.post("/api/auth/resend-verification", codeLimiter, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "Données manquantes" });
      }

      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email déjà vérifié" });
      }

      const limit = checkResendLimit(`verify:${userId}`);
      if (!limit.allowed) {
        return res.status(429).json({
          message: `Limite atteinte. Vous avez déjà demandé ${RESEND_MAX} codes. Réessayez dans ${limit.minutesLeft} minute(s).`,
          minutesLeft: limit.minutesLeft,
        });
      }

      const code = generateVerificationCode();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await authStorage.updateUserVerificationCode(user.id, code, expiry);

      await sendVerificationEmail(user.email!, code, user.firstName || "");
      res.json({ success: true });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Erreur lors de l'envoi du code" });
    }
  });

  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email requis" });

      const user = await authStorage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Aucun compte SolvexPay n'est associé à cette adresse email." });
      }

      const limit = checkResendLimit(`reset:${user.id}`);
      if (!limit.allowed) {
        return res.status(429).json({
          message: `Limite atteinte. Vous avez déjà demandé ${RESEND_MAX} codes. Réessayez dans ${limit.minutesLeft} minute(s).`,
          minutesLeft: limit.minutesLeft,
        });
      }

      const code = generateVerificationCode();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await authStorage.setPasswordResetCode(user.id, code, expiry);

      try {
        await sendPasswordResetEmail(email, code, user.firstName || "");
        console.log(`[Email] Password reset email sent to ${email}`);
      } catch (emailErr: any) {
        console.error("[Email] Failed to send password reset email:", emailErr?.message);
      }

      res.json({ success: true, userId: user.id });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Erreur lors de l'envoi du code" });
    }
  });

  app.post("/api/auth/verify-reset-code", codeLimiter, async (req, res) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) return res.status(400).json({ message: "Données manquantes" });

      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

      if (!user.passwordResetCode || !user.passwordResetExpiry) {
        return res.status(400).json({ message: "Aucun code trouvé. Recommencez la procédure." });
      }

      if (new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(400).json({ message: "Le code a expiré. Recommencez la procédure.", expired: true });
      }

      if (user.passwordResetCode !== String(code).trim()) {
        return res.status(400).json({ message: "Code incorrect. Vérifiez votre email et réessayez." });
      }

      res.json({ success: true, userId });
    } catch (error) {
      console.error("Verify reset code error:", error);
      res.status(500).json({ message: "Erreur lors de la vérification" });
    }
  });

  app.post("/api/auth/reset-password", codeLimiter, async (req, res) => {
    try {
      const { userId, code, newPassword } = req.body;
      if (!userId || !code || !newPassword) return res.status(400).json({ message: "Données manquantes" });

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
      }

      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

      if (!user.passwordResetCode || !user.passwordResetExpiry) {
        return res.status(400).json({ message: "Session expirée. Recommencez la procédure." });
      }

      if (new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(400).json({ message: "Le code a expiré. Recommencez la procédure." });
      }

      if (user.passwordResetCode !== String(code).trim()) {
        return res.status(400).json({ message: "Code invalide." });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await authStorage.resetPassword(user.id, passwordHash);

      (req.session as any).userId = user.id;
      const updatedUser = await authStorage.getUser(user.id);
      res.json(sanitizeUser(updatedUser!));
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Erreur lors de la réinitialisation" });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { email, password } = validation.data;

      const user = await authStorage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      if (user.isBlocked) {
        return res.status(403).json({ message: "Votre compte a été suspendu. Contactez le support.", blocked: true });
      }

      if (!user.emailVerified && !user.isAdmin) {
        const code = generateVerificationCode();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        await authStorage.updateUserVerificationCode(user.id, code, expiry);
        try {
          await sendVerificationEmail(email, code, user.firstName || "");
        } catch (emailErr) {
          console.error("Failed to send verification email:", emailErr);
        }
        return res.status(403).json({
          requiresVerification: true,
          email,
          userId: user.id,
          message: "Veuillez vérifier votre email avant de vous connecter.",
        });
      }

      (req.session as any).userId = user.id;

      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erreur lors de la connexion" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await authStorage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.isBlocked && !user.isAdmin) {
    return res.status(403).json({ message: "Votre compte a été suspendu. Contactez le support.", blocked: true });
  }

  (req as any).user = user;
  next();
};

export const isPartner: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await authStorage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user.isPartner && !user.isAdmin) {
    return res.status(403).json({ message: "Acces refuse - Partenaire requis" });
  }

  (req as any).user = user;
  next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await authStorage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user.isAdmin) {
    return res.status(403).json({ message: "Acces refuse - Administrateur requis" });
  }

  (req as any).user = user;
  next();
};
