/**
 * FFmpeg Background Worker
 * One-shot render, then idle
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// ---------- SAFETY GATE ----------
if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  setInterval(() => {}, 60_000); // keep alive
  return;
}

// ---------- PREVENT RE-RUN ----------
if (global.__JOB_RAN__) {
  console.log("Job already ran. Worker idle.");
  setInterval(() => {}, 60_000);
  return;
}
global.__JOB_RAN__ = true;

// ---------- PATHS ----------
const ROOT = __dirname;
const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const FONT = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const SPARKLE = path.join(ROOT, "effects", "sparkle.mp4");

const OUTPUT_DIR = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sparkle_text_test.mp4");
const OUTPUT_KEY = "sparkle_text_test.mp4";

// ---------- ENSURE OUTPUT DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------- FFMPEG ----------
const ffmpegCmd = `
ffmpeg -y
-loop 1 -i "${TEMPLATE}"
-i "${SPARKLE}"
-filter_complex "
  [1:v]scale=1280:720,format=rgba[fx];
  color=black:s=1280x720,format=gray,
    drawtext=fontfile='${FONT}':
      text='HAPPY BIRTHDAY':
      fontsize=120:
      x=(w-text_w)/2:
      y=(h-text_h)/2[mask];
  [fx][mask]alphamerge[txt];
  [0:v]scale=1280:720[bg];
  [bg][txt]overlay=0:0
"
-t 4 -preset ultrafast -crf 28 -pix_fmt yuv420p
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

console.log("Running FFmpeg…");

exec(ffmpegCmd, async (err) => {
  if (err) {
    console.error("FFmpeg failed");
    setInterval(() => {}, 60_000);
    return;
  }

  const fileBuffer = fs.readFileSync(OUTPUT_FILE);

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: OUTPUT_KEY,
    Body: fileBuffer,
    ContentType: "video/mp4",
    ACL: "public-read"
  }));

  console.log("✅ Render uploaded");
  console.log(`${process.env.R2_PUBLIC_BASE}/${OUTPUT_KEY}`);

  console.log("Worker finished job. Going idle.");
  setInterval(() => {}, 60_000); // keep alive
});


