/**
 * One-time Sparkle Texture Builder
 * Creates sparkle_loop.mp4 and uploads to R2
 * Prints a public download link in logs
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// ---------- SAFETY (prevents reruns) ----------
if (process.env.BUILD_SPARKLE === "done") {
  console.log("Sparkle already built. Exiting.");
  process.exit(0);
}

// ---------- PATHS ----------
const OUT_DIR = path.join(__dirname, "effects");
const OUT_FILE = path.join(OUT_DIR, "sparkle_loop.mp4");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// ---------- BUILD SPARKLE ----------
const ffmpegCmd = `
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
`.replace(/\n/g, " ");

console.log("▶ Building sparkle texture…");

exec(ffmpegCmd, async (err) => {
  if (err) {
    console.error("❌ Sparkle build failed");
    process.exit(1);
  }

  if (!fs.existsSync(OUT_FILE)) {
    console.error("❌ Output file missing");
    process.exit(1);
  }

  console.log("✅ Sparkle texture created locally");

  // ---------- UPLOAD TO R2 ----------
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

  console.log("🎉 UPLOAD SUCCESS");
  console.log("DOWNLOAD LINK:");
  console.log(publicUrl);

  console.log("👉 Now set BUILD_SPARKLE=done and redeploy");
  process.exit(0);
});
