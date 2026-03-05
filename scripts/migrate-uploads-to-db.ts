import fs from "fs";
import path from "path";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq, like, or } from "drizzle-orm";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

function fileToBase64(filePath: string): string | null {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  MANQUANT: ${fullPath}`);
    return null;
  }
  const buf = fs.readFileSync(fullPath);
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  console.log(`  Lu: ${filePath} (${Math.round(buf.length / 1024)} Ko)`);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function migrate() {
  console.log("Recherche des utilisateurs avec des fichiers sur disque...");

  const usersWithFiles = await db
    .select()
    .from(users)
    .where(
      or(
        like(users.kycDocumentFront, "/uploads/%"),
        like(users.kycDocumentBack, "/uploads/%"),
        like(users.kycSelfie, "/uploads/%"),
        like(users.profileImageUrl, "/uploads/%")
      )
    );

  console.log(`${usersWithFiles.length} utilisateur(s) trouvé(s).`);

  for (const user of usersWithFiles) {
    console.log(`\nTraitement: ${user.email}`);
    const updates: Partial<typeof user> = {};

    if (user.kycDocumentFront?.startsWith("/uploads/")) {
      const b64 = fileToBase64(user.kycDocumentFront);
      if (b64) updates.kycDocumentFront = b64;
    }
    if (user.kycDocumentBack?.startsWith("/uploads/")) {
      const b64 = fileToBase64(user.kycDocumentBack);
      if (b64) updates.kycDocumentBack = b64;
    }
    if (user.kycSelfie?.startsWith("/uploads/")) {
      const b64 = fileToBase64(user.kycSelfie);
      if (b64) updates.kycSelfie = b64;
    }
    if (user.profileImageUrl?.startsWith("/uploads/")) {
      const b64 = fileToBase64(user.profileImageUrl);
      if (b64) updates.profileImageUrl = b64;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, user.id));
      console.log(`  Sauvegardé en base de données: ${Object.keys(updates).join(", ")}`);
    } else {
      console.log(`  Rien à migrer.`);
    }
  }

  console.log("\nMigration terminée.");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
