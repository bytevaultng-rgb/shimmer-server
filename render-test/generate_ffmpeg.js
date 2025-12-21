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
const RECEIVER_NAME = "MARYAM";
const MESSAGE_LINE  = "Wishing you joy and happiness!";

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
-i "${SPARKLE}"
-i "${CONFETTI}"
-filter_complex "
  [0:v]scale=1280:720,format=rgba[bg];
  [1:v]scale=1280:720,format=rgba[fx];
  [2:v]scale=1280:720,format=rgba,trim=0:4,setpts=PTS-STARTPTS[conf];

  color=black:s=1280x720,
  drawtext=fontfile=${FONT}:
    text=HAPPY\\ BIRTHDAY:
    fontsize=110:
    fontcolor=white:
    x=(w-text_w)/2:
    y=h*0.30,
  drawtext=fontfile=${FONT}:
    text=${RECEIVER_NAME}:
    fontsize=120:
    fontcolor=white:
    x=(w-text_w)/2:
    y=h*0.42,
  drawtext=fontfile=${FONT}:
    text=${MESSAGE_LINE}:
    fontsize=56:
    fontcolor=white:
    x=(w-text_w)/2:
    y=h*0.58,
  format=gray[mask];

  [fx][mask]alphamerge[textfx];
  [bg][textfx]overlay=0:0[tmp];
  [tmp][conf]overlay=0:0:enable='gte(t,0.5)'
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
