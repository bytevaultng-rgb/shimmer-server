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

const OUTPUT_DIR = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sparkle_text_test.mp4");

// ---------- ENSURE DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------- VALIDATE INPUT ----------
for (const f of [TEMPLATE, FONT]) {
  if (!fs.existsSync(f)) {
    console.error("Missing file:", f);
    process.exit(1);
  }
}

// ---------- FFMPEG (WORKING) ----------
const ffmpegCmd = `
ffmpeg -y \
-loop 1 -i "${TEMPLATE}" \
-filter_complex "
[0:v]scale=1280:720,format=rgba[bg];

color=black@0.0:s=1280x720:d=4,format=rgba,
drawtext=fontfile='${FONT}':
text='HAPPY BIRTHDAY':
fontsize=120:
fontcolor=white:
x=(w-text_w)/2:
y=(h-text_h)/2[text];

[text]split=3[text_main][text_mask][text_glow];

nullsrc=s=1280x720,format=rgba,
noise=alls=40:allf=u,
eq=contrast=2.3:brightness=0.1,
colorchannelmixer=rr=1:gg=0.9:bb=0.6:aa=1[sparkle];

[text_mask]alphaextract[mask];
[sparkle][mask]alphamerge[text_sparkle];

[text_glow]gblur=sigma=18,
colorchannelmixer=rr=1:gg=0.85:bb=0.3:aa=1[glow];

[bg][glow]overlay[tmp1];
[tmp1][text_sparkle]overlay[tmp2];
[tmp2][text_main]overlay
" \
-t 4 \
-pix_fmt yuv420p \
-movflags +faststart \
-preset ultrafast \
-crf 26 \
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

  process.exit(0);
});
