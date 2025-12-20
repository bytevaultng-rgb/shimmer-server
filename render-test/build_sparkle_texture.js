/**
 * One-time Sparkle Texture Builder
 * Forces single run + prints download link
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const OUT_DIR = path.join(__dirname, "effects");
const OUT_FILE = path.join(OUT_DIR, "sparkle_loop.mp4");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log("▶ Building sparkle texture…");

// 1️⃣ BUILD (SYNC – IMPORTANT)
execSync(`
ffmpeg -y \
-f lavfi -i color=white:s=1920x1920:d=3 \
-filter_complex "
noise=alls=20:allf=t,
eq=contrast=2.2:brightness=-0.05,
colorchannelmixer=rr=1.05:gg=0.95:bb=0.7,
format=yuv420p
" \
-r 30 \
-movflags +faststart \
"${OUT_FILE}"
`, { stdio: "inherit" });

// 2️⃣ UPLOAD
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const buffer = fs.readFileSync(OUT_FILE);
const key = `effects/sparkle_loop_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.mp4`;

await s3.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET,
  Key: key,
  Body: buffer,
  ContentType: "video/mp4",
}));

const publicUrl = `${process.env.R2_PUBLIC_BASE}/${key}`;

console.log("=====================================");
console.log("🎉 DOWNLOAD LINK (COPY THIS):");
console.log(publicUrl);
console.log("=====================================");

// 3️⃣ FORCE STOP (prevents restart loop)
process.exit(1);
