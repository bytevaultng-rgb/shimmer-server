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
const SPARKLE = path.join(ROOT, "effects", "sparkle.mp4");

const OUTPUT_DIR = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sparkle_text_test.mp4");

// ---------- ENSURE DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------- VALIDATE INPUT ----------
for (const f of [TEMPLATE, FONT, SPARKLE]) {
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
-filter_complex "
[0:v]scale=1280:720,format=rgba[bg];

[1:v]scale=1280:720,format=rgba,
eq=contrast=2.8:brightness=0.08:saturation=1.4,
gblur=sigma=0.4[fx];

color=black:s=1280x720,
drawtext=fontfile=${FONT}:
 text=HAPPY\\ BIRTHDAY:
 fontsize=130:
 fontcolor=white:
 x=(w-text_w)/2:
 y=(h-text_h)/2,
format=gray,
eq=contrast=3.8:brightness=0.02[mask];

[fx][mask]alphamerge[sparkle];

[sparkle]
colorchannelmixer=rr=1.25:gg=1.05:bb=0.75,
eq=contrast=1.4:brightness=0.06[sparkle_gold];

[sparkle_gold]gblur=sigma=12[glow];

[bg][glow]overlay=0:0[tmp1];
[tmp1][sparkle_gold]overlay=0:0[tmp2];

[tmp2]
drawtext=fontfile=${FONT}:
 text=HAPPY\\ BIRTHDAY:
 fontsize=130:
 fontcolor=white:
 x=(w-text_w)/2:
 y=(h-text_h)/2
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
    console.error(stderr); // VERY IMPORTANT
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

  console.log("Worker finished job. Going idle.");
  process.exit(0);
});



