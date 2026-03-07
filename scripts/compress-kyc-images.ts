import sharp from "sharp";
import fs from "fs";
import path from "path";

const dir = path.resolve(process.cwd(), "uploads/kyc");
const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

console.log(`Compressing ${files.length} KYC images...`);

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const filepath = path.join(dir, file);
  const sizeBefore = fs.statSync(filepath).size;
  totalBefore += sizeBefore;

  const tmpPath = filepath + ".tmp.jpg";
  await sharp(filepath)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(tmpPath);

  const sizeAfter = fs.statSync(tmpPath).size;
  totalAfter += sizeAfter;

  // Replace original only if compressed version is smaller
  if (sizeAfter < sizeBefore) {
    // Rename to .jpg if not already
    const newPath = filepath.replace(/\.(png|jpeg|webp)$/i, ".jpg");
    fs.renameSync(tmpPath, newPath);
    if (newPath !== filepath) {
      fs.unlinkSync(filepath);
      console.log(`  ${file} → ${path.basename(newPath)}: ${(sizeBefore/1024).toFixed(0)}KB → ${(sizeAfter/1024).toFixed(0)}KB`);
    } else {
      console.log(`  ${file}: ${(sizeBefore/1024).toFixed(0)}KB → ${(sizeAfter/1024).toFixed(0)}KB`);
    }
  } else {
    fs.unlinkSync(tmpPath);
    console.log(`  ${file}: already small (${(sizeBefore/1024).toFixed(0)}KB), skipped`);
  }
}

console.log(`\nTotal: ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB`);
console.log("Done.");
