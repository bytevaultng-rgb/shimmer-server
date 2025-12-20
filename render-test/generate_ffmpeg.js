/**
 * FFmpeg Worker – Render → Upload to R2 → Print Public Link
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// ---------- SAFETY ----------
if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  setInterval(() => {}, 60_000);
  return;
}

// ---------- PATHS ----------
const ROOT = __dirname;

const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const FONT = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const SPARKLE_PNG = path.join(ROOT, "effects", "sparkle.png");
const GLOW_MP4 = path.join(ROOT, "effects", "glow.mp4");

const OUTPUT_DIR = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sparkle_text_test.mp4");

// ---------- ENSURE DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------- VALIDATE INPUT ----------
for (const f of [TEMPLATE, FONT, SPARKLE_PNG, GLOW_MP4]) {
  if (!fs.existsSync(f)) {
    console.error("Missing file:", f);
    process.exit(1);
  }
}

// ---------- FFMPEG ----------
const ffmpegCmd = `
ffmpeg -y
-loop 1 -i "${TEMPLATE}"
-loop 1 -i "${SPARKLE_PNG}"
-i "${GLOW_MP4}"
 -filter_complex "
  [0:v]scale=1280:720,format=rgba[bg];

  [1:v]scale=1280:720,format=rgba[sparkle];

  [2:v]scale=1280:720,format=rgba,gblur=sigma=12[glow];

  color=black:s=1280x720,format=rgba,
  drawtext=fontfile=${FONT}:
    text=HAPPY\\ BIRTHDAY:
    fontsize=120:
    fontcolor=white:
    x=(w-text_w)/2:
    y=(h-text_h)/2[txt];

  [txt]alphaextract[mask];

  [sparkle][mask]alphamerge[text_glitter];
  [glow][mask]alphamerge[text_glow];

  [bg][text_glitter]overlay=0:0[tmp];
  [tmp][text_glow]overlay=0:0
"
-t 4
-shortest
-preset ultrafast
-crf 28
-pix_fmt yuv420p
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

console.log("Running FFmpeg…");

exec(ffmpegCmd, async (err, stdout, stderr) => {
  if (err) {
    console.error("❌ FFmpeg failed");
    console.error(stderr);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_FILE)) {
    console.error("Render failed: output missing");
    process.exit(1);
  }

  console.log("✅ Render SUCCESS");

  // ---------- R2 CLIENT ----------
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const fileBuffer = fs.readFileSync(OUTPUT_FILE);
  const key = `renders/sparkle_${Date.now()}_${crypto
    .randomBytes(4)
    .toString("hex")}.mp4`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: "video/mp4",
    })
  );

  const publicUrl = `${process.env.R2_PUBLIC_BASE}/${key}`;

  console.log("🎉 UPLOAD SUCCESS");
  console.log("PUBLIC LINK:", publicUrl);

  console.log("Worker finished job. Going idle.");
  process.exit(0);
});
