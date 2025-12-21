/**
 * FFmpeg Worker – Sparkle Masked Birthday (Stable)
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  setInterval(() => {}, 60000);
  return;
}

const ROOT = __dirname;

const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const FONT     = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const SPARKLE  = path.join(ROOT, "effects", "sparkle.mp4");
const MUSIC    = path.join(ROOT, "effects", "music.mp3");

const OUTPUT_DIR  = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "birthday_sparkle.mp4");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const RECEIVER = "IFEOMA";

const L1 = "Your vision lights the way for many.";
const L2 = "You lead with purpose, strength, and heart.";
const L3 = "Thank you for inspiring excellence through action.";
const L4 = "May this year bring joy, growth, and victories.";

const ffmpegCmd = `
ffmpeg -y
-loop 1 -i "${TEMPLATE}"
-stream_loop -1 -i "${SPARKLE}"
-stream_loop -1 -i "${MUSIC}"
-filter_complex "
[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,
pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=rgba[bg];

[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,
pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=rgba[fx];

color=black:s=1080x1920,
drawtext=fontfile=${FONT}:text='HAPPY BIRTHDAY':fontsize=120:x=(w-text_w)/2:y=(h/2)-300:enable='between(t,0,6)',
drawtext=fontfile=${FONT}:text='${RECEIVER}':fontsize=110:x=(w-text_w)/2:y=(h/2)-220:enable='between(t,6,12)',
drawtext=fontfile=${FONT}:text='${L1}':fontsize=42:x=(w-text_w)/2:y=(h/2)-40:enable='between(t,12,16)',
drawtext=fontfile=${FONT}:text='${L2}':fontsize=42:x=(w-text_w)/2:y=(h/2)+10:enable='between(t,16,20)',
drawtext=fontfile=${FONT}:text='${L3}':fontsize=42:x=(w-text_w)/2:y=(h/2)+60:enable='between(t,20,24)',
drawtext=fontfile=${FONT}:text='${L4}':fontsize=42:x=(w-text_w)/2:y=(h/2)+110:enable='gte(t,24)',
format=gray[mask];

[fx][mask]alphamerge[textfx];

color=white@0.35:s=1080x1920,
noise=alls=20:allf=t+u,format=rgba[confetti];

[bg][confetti]overlay=0:0[tmp];
[tmp][textfx]overlay=0:0
"
-map 0:v
-map 2:a
-af "afade=t=in:d=2,afade=t=out:st=28:d=2"
-shortest
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
  console.log("✅ Render SUCCESS:", OUTPUT_FILE);
  process.exit(0);
});

// ---------- R2 UPLOAD ----------
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const fileBuffer = fs.readFileSync(OUTPUT_FILE);
const key = `renders/birthday_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.mp4`;

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

