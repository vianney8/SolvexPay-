import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { authStorage } from "./storage";
import { registerSchema, loginSchema } from "@shared/models/auth";
import { sendVerificationEmail } from "../../services/resend";

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

  app.post("/api/auth/register", async (req, res) => {
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
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }

      res.status(201).json({ requiresVerification: true, email, userId: user.id });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
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
        const { passwordHash: _, ...safeUser } = user;
        return res.json(safeUser);
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
      const { passwordHash: _, ...safeUser } = updatedUser!;
      res.json(safeUser);
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ message: "Erreur lors de la vérification" });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
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

  app.post("/api/auth/login", async (req, res) => {
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

      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
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
