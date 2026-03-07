import pg from "pg";
import fs from "fs";
import path from "path";

const uploadsDir = path.resolve(process.cwd(), "uploads/kyc");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function saveBase64(base64Data: string, userId: string, type: string): string | null {
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const ext = (match[1].split("/")[1] || "jpg").replace("jpeg", "jpg");
  const filename = `${userId}_${type}_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(match[2], "base64"));
  console.log(`  Saved: ${filename}`);
  return `/uploads/kyc/${filename}`;
}

const client = await pool.connect();
try {
  const { rows } = await client.query(`
    SELECT id, kyc_document_front, kyc_document_back, kyc_selfie
    FROM users
    WHERE kyc_status IN ('pending', 'verified', 'rejected')
      AND (kyc_document_front LIKE 'data:%' OR kyc_selfie LIKE 'data:%')
  `);

  console.log(`Found ${rows.length} users to migrate.`);

  for (const user of rows) {
    console.log(`\nMigrating user: ${user.id}`);
    const setClauses: string[] = [];
    const values: string[] = [];
    let i = 1;

    if (user.kyc_document_front?.startsWith("data:")) {
      const p = saveBase64(user.kyc_document_front, user.id, "front");
      if (p) { setClauses.push(`kyc_document_front = $${i++}`); values.push(p); }
    }
    if (user.kyc_document_back?.startsWith("data:")) {
      const p = saveBase64(user.kyc_document_back, user.id, "back");
      if (p) { setClauses.push(`kyc_document_back = $${i++}`); values.push(p); }
    }
    if (user.kyc_selfie?.startsWith("data:")) {
      const p = saveBase64(user.kyc_selfie, user.id, "selfie");
      if (p) { setClauses.push(`kyc_selfie = $${i++}`); values.push(p); }
    }

    if (setClauses.length > 0) {
      values.push(user.id);
      await client.query(`UPDATE users SET ${setClauses.join(", ")} WHERE id = $${i}`, values);
      console.log(`  DB updated.`);
    }
  }
} finally {
  client.release();
  await pool.end();
}

console.log("\nMigration complete.");
