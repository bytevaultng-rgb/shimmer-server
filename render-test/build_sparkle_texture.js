/**
 * One-time Sparkle Texture Builder
 * CommonJS-safe (Node 18–25)
 * Builds HIGH-CONTRAST sparkle loop
 * Uploads to R2 and prints download link
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

async function main() {
  const OUT_DIR = path.join(__dirname, "effects");
  const OUT_FILE = path.join(OUT_DIR, "sparkle_loop.mp4");

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log("▶ Building sparkle texture…");

  // ---- BUILD (SYNC) ----
  execSync(`
ffmpeg -y \
-f lavfi -i color=black:s=1920x1920:d=3 \
-filter_complex "
noise=alls=45:allf=t,
eq=contrast=4.0:brightness=0.05,
curves=master='0/0 0.2/0.05 0.5/0.6 1/1',
colorchannelmixer=rr=1.2:gg=0.95:bb=0.6,
gblur=sigma=0.8,
format=yuv420p
" \
-r 30 \
-movflags +faststart \
"${OUT_FILE}"
  `, { stdio: "inherit" });

  if (!fs.existsSync(OUT_FILE)) {
    throw new Error("Sparkle texture not created");
  }

  console.log("✅ Sparkle texture created locally");

  // ---- R2 UPLOAD ----
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const buffer = fs.readFileSync(OUT_FILE);
  const key = `effects/sparkle_loop_${Date.now()}_${crypto
    .randomBytes(4)
    .toString("hex")}.mp4`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "video/mp4",
    })
  );

  const publicUrl = `${process.env.R2_PUBLIC_BASE}/${key}`;

  console.log("=====================================");
  console.log("🎉 DOWNLOAD LINK (COPY THIS):");
  console.log(publicUrl);
  console.log("=====================================");

  // Force stop so Render restarts don’t matter
  process.exit(1);
}

// ---- RUN ----
main().catch((err) => {
  console.error("❌ Sparkle build failed");
  console.error(err);
  process.exit(1);
});
