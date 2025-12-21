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
const FONT     = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const SPARKLE  = path.join(ROOT, "effects", "sparkle.mp4");
const CONFETTI = path.join(ROOT, "effects", "confetti.mp4");

// ---------- TEXT ----------
const RECEIVER_NAME = "IFEOMA";
const MESSAGE_LINE_1 = "Your vision lights the way for many.";
const MESSAGE_LINE_2 = "Thank you for leading with purpose, strength, and heart.";
const MESSAGE_LINE_3 = "May the year ahead reward you with joy, growth, and remarkable victories.";

// ---------- OUTPUT ----------
const OUTPUT_DIR  = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sparkle_text_test.mp4");

// ---------- ENSURE DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------- VALIDATE INPUT ----------
for (const f of [TEMPLATE, FONT, SPARKLE, CONFETTI]) {
  if (!fs.existsSync(f)) {
    console.error("Missing file:", f);
    process.exit(1);
  }
}

// ---------- FFMPEG ----------
const ffmpegCmd = `
ffmpeg -y
-loop 1 -i "${TEMPLATE}"
-stream_loop -1 -i "${SPARKLE}"
-filter_complex "
  [0:v]scale=1280:720,format=rgba[bg];
  [1:v]scale=1280:720,format=rgba[fx];

  color=black:s=1280x720,
  drawtext=fontfile=${FONT}:
    text=HAPPY\\ BIRTHDAY:
    fontsize=120:
    fontcolor=white:
    x=(w-text_w)/2:
    y=h*0.45:
    enable='between(t,0,6)',
  drawtext=fontfile=${FONT}:
    text=${RECEIVER_NAME}:
    fontsize=110:
    fontcolor=white:
    x=(w-text_w)/2:
    y=h*0.45:
    enable='between(t,6,12)',
  drawtext=fontfile=${FONT}:
    text=${MESSAGE_LINE_1}:
    fontsize=46:
    fontcolor=white:
    x=(w-text_w)/2:
    y=h*0.60:
    enable='between(t,12,16)',
  drawtext=fontfile=${FONT}:
    text=${MESSAGE_LINE_2}:
    fontsize=46:
    fontcolor=white:
    x=(w-text_w)/2:
    y=h*0.68:
    enable='between(t,16,20)',
  drawtext=fontfile=${FONT}:
    text=${MESSAGE_LINE_3}:
    fontsize=46:
    fontcolor=white:
    x=(w-text_w)/2:
    y=h*0.76:
    enable='gte(t,20)',
  format=gray[mask];

  [fx][mask]alphamerge[textfx];
  [bg][textfx]overlay=0:0
"
-t 30
-r 30
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

  console.log("✅ Render SUCCESS");

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const fileBuffer = fs.readFileSync(OUTPUT_FILE);
  const key = `renders/sparkle_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.mp4`;

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

  process.exit(0);
});
