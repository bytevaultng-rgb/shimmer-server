/**
 * FFmpeg Background Worker – Option B (SAFE)
 * - Runs ONLY when RUN_RENDER=1
 * - Renders sparkle/glitter masked text
 * - Uploads output to Cloudflare R2
 * - Exits cleanly (no loops)
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

/* ================= SAFETY GATE ================= */
if (process.env.RUN_RENDER !== "1") {
  console.log("RUN_RENDER not set. Worker idle.");
  process.exit(0);
}

/* ================= PATHS ================= */
const ROOT = __dirname;

const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const FONT = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const SPARKLE = path.join(ROOT, "effects", "sparkle.mp4");

const OUTPUT_DIR = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sparkle_text_test.mp4");
const OUTPUT_KEY = "renders/sparkle_text_test.mp4";

/* ================= VALIDATION ================= */
for (const file of [TEMPLATE, FONT, SPARKLE]) {
  if (!fs.existsSync(file)) {
    console.error("Missing file:", file);
    process.exit(1);
  }
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/* ================= FFmpeg COMMAND ================= */
const ffmpegCmd = `
ffmpeg -y \
-loop 1 -i "${TEMPLATE}" \
-i "${SPARKLE}" \
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
" \
-t 4 \
-preset ultrafast \
-crf 28 \
-pix_fmt yuv420p \
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

/* ================= RUN FFmpeg ================= */
console.log("Running FFmpeg…");

exec(ffmpegCmd, async (err, stdout, stderr) => {
  if (err) {
    console.error("FFmpeg failed");
    console.error(stderr);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_FILE) || fs.statSync(OUTPUT_FILE).size === 0) {
    console.error("Render failed: output missing or empty");
    process.exit(1);
  }

  console.log("✅ Render complete");

/* ================= R2 UPLOAD ================= */
  const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });

  const buffer = fs.readFileSync(OUTPUT_FILE);

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: OUTPUT_KEY,
    Body: buffer,
    ContentType: "video/mp4"
  }));

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${OUTPUT_KEY}`;

  console.log("✅ Uploaded to R2");
  console.log("🔗 Public URL:", publicUrl);

  process.exit(0);
});
