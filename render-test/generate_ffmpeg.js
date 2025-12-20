/**
 * FFmpeg Background Worker (ONE-SHOT)
 * - Runs only when RUN_RENDER=1
 * - Renders sparkle text
 * - Uploads to Cloudflare R2
 * - Logs public URL
 * - Exits cleanly
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");

// ---------- SAFETY GATE ----------
if (process.env.RUN_RENDER !== "1") {
  console.log("RUN_RENDER not set. Worker idle.");
  process.exit(0);
}

// ---------- PATHS ----------
const ROOT = __dirname;

const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const FONT = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const SPARKLE = path.join(ROOT, "effects", "sparkle.mp4");

const OUTPUT_DIR = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  `sparkle_${Date.now()}.mp4`
);

// ---------- ENSURE DIR ----------
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------- VALIDATE FILES ----------
[TEMPLATE, FONT, SPARKLE].forEach(f => {
  if (!fs.existsSync(f)) {
    console.error("Missing file:", f);
    process.exit(1);
  }
});

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
-t 4
-preset ultrafast
-crf 28
-pix_fmt yuv420p
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

console.log("🎬 Running FFmpeg...");
exec(ffmpegCmd, async (err, stdout, stderr) => {
  if (err) {
    console.error(stderr);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_FILE)) {
    console.error("Output not created");
    process.exit(1);
  }

  // ---------- R2 CONFIG ----------
  const s3 = new AWS.S3({
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    signatureVersion: "v4",
    region: "auto"
  });

  const key = `renders/${path.basename(OUTPUT_FILE)}`;

  console.log("☁ Uploading to R2...");

  await s3.putObject({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: fs.createReadStream(OUTPUT_FILE),
    ContentType: "video/mp4"
  }).promise();

  const publicUrl = `${process.env.R2_PUBLIC_BASE}/${key}`;

  console.log("✅ RENDER COMPLETE");
  console.log("🔗 PUBLIC URL:");
  console.log(publicUrl);

  process.exit(0);
});
