/**
 * Generate Premium Confetti (Alpha) → Upload to Cloudflare R2 → Print Public URL
 */

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE
} = process.env;

if (!R2_ACCOUNT_ID) {
  console.error("❌ Missing R2 env vars");
  process.exit(1);
}

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

const OUTPUT = path.join(__dirname, "../confetti_alpha_premium.mov");
const R2_KEY = `overlays/confetti_alpha_premium.mov`;

const ffmpegCmd = `
ffmpeg -y \
-f lavfi -i color=black@0.0:s=750x1334:d=5 \
-filter_complex "
geq=
r='255*random(1)':
g='200*random(2)':
b='80*random(3)':
a='if(gt(random(4),0.992),255,0)',
boxblur=2,
fps=30
" \
-pix_fmt yuva444p10le \
-c:v prores_ks \
-profile:v 4444 \
"${OUTPUT}"
`.replace(/\n/g, " ");

console.log("▶ Generating premium confetti overlay...");

exec(ffmpegCmd, async (err, stdout, stderr) => {
  if (err) {
    console.error("❌ FFmpeg failed");
    console.error(stderr);
    process.exit(1);
  }

  console.log("✅ Confetti generated");

  console.log("▶ Uploading to Cloudflare R2...");

  const fileStream = fs.createReadStream(OUTPUT);

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: R2_KEY,
      Body: fileStream,
      ContentType: "video/quicktime",
      ACL: "public-read"
    })
  );

  const publicUrl = `${R2_PUBLIC_BASE}/${R2_KEY}`;

  console.log("✅ Upload complete");
  console.log("🔗 PUBLIC LINK:");
  console.log(publicUrl);
});
