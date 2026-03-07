import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../uploads/kyc");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const sql = neon(process.env.DATABASE_URL);

function saveBase64(base64Data, userId, type) {
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const ext = (match[1].split("/")[1] || "jpg").replace("jpeg", "jpg");
  const filename = `${userId}_${type}_${Date.now()}.${ext}`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, Buffer.from(match[2], "base64"));
  console.log(`  Saved: ${filename}`);
  return `/uploads/kyc/${filename}`;
}

const users = await sql`
  SELECT id, kyc_document_front, kyc_document_back, kyc_selfie
  FROM users
  WHERE kyc_status IN ('pending', 'verified', 'rejected')
    AND (kyc_document_front LIKE 'data:%' OR kyc_selfie LIKE 'data:%')
`;

console.log(`Found ${users.length} users to migrate.`);

for (const user of users) {
  console.log(`\nMigrating user: ${user.id}`);
  const updates = {};

  if (user.kyc_document_front?.startsWith("data:")) {
    const p = saveBase64(user.kyc_document_front, user.id, "front");
    if (p) updates.kyc_document_front = p;
  }
  if (user.kyc_document_back?.startsWith("data:")) {
    const p = saveBase64(user.kyc_document_back, user.id, "back");
    if (p) updates.kyc_document_back = p;
  }
  if (user.kyc_selfie?.startsWith("data:")) {
    const p = saveBase64(user.kyc_selfie, user.id, "selfie");
    if (p) updates.kyc_selfie = p;
  }

  if (Object.keys(updates).length > 0) {
    const setClauses = [];
    const values = [];
    let i = 1;
    if (updates.kyc_document_front) { setClauses.push(`kyc_document_front = $${i++}`); values.push(updates.kyc_document_front); }
    if (updates.kyc_document_back) { setClauses.push(`kyc_document_back = $${i++}`); values.push(updates.kyc_document_back); }
    if (updates.kyc_selfie) { setClauses.push(`kyc_selfie = $${i++}`); values.push(updates.kyc_selfie); }
    values.push(user.id);
    await sql.unsafe(`UPDATE users SET ${setClauses.join(", ")} WHERE id = $${i}`, values);
    console.log(`  DB updated.`);
  }
}

console.log("\nMigration complete.");
