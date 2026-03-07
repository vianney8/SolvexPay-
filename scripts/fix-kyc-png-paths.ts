import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

const renames: [string, string, string][] = [
  ["63f9d628-2e9b-4004-a593-545875456c08", "front",  "1772846111573"],
  ["63f9d628-2e9b-4004-a593-545875456c08", "back",   "1772846111575"],
  ["63f9d628-2e9b-4004-a593-545875456c08", "selfie", "1772846111576"],
  ["941ead30-f57d-46c5-b4da-b187bbfc44dc", "front",  "1772846112049"],
  ["941ead30-f57d-46c5-b4da-b187bbfc44dc", "back",   "1772846112050"],
  ["941ead30-f57d-46c5-b4da-b187bbfc44dc", "selfie", "1772846112051"],
];

const colMap: Record<string, string> = {
  front: "kyc_document_front",
  back: "kyc_document_back",
  selfie: "kyc_selfie",
};

for (const [uid, type, ts] of renames) {
  const col = colMap[type];
  const oldPath = `/uploads/kyc/${uid}_${type}_${ts}.png`;
  const newPath = `/uploads/kyc/${uid}_${type}_${ts}.jpg`;
  const r = await client.query(
    `UPDATE users SET ${col} = $1 WHERE id = $2 AND ${col} = $3`,
    [newPath, uid, oldPath]
  );
  console.log(`${uid.slice(0, 8)} ${type}: ${r.rowCount} row updated`);
}

client.release();
await pool.end();
console.log("Done.");
