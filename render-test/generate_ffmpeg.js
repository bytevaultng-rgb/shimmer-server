/**
 * FFmpeg Worker – Sparkle Mask + Gold Glow + Confetti + Music (Portrait)
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
const MUSIC    = path.join(ROOT, "effects", "music.mp3");

const OUTPUT_DIR  = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "birthday_sparkle.mp4");

// ---------- TEXT ----------
const RECEIVER_NAME = "IFEOMA";

const MSG1 = "Your vision lights the way for many.";
const MSG2 = "You lead with purpose, strength, and heart.";
const MSG3 = "Thank you for inspiring excellence through action.";
const MSG4 = "May this new year bring joy, growth, and victories.";

// ---------- ENSURE DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------- VALIDATE ----------
for (const f of [TEMPLATE, FONT, SPARKLE, MUSIC]) {
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
-stream_loop -1 -i "${MUSIC}"
-filter_complex "
[0:v]
scale=1080:1920:force_original_aspect_ratio=decrease,
pad=1080:1920:(ow-iw)/2:(oh-ih)/2,
format=rgba[bg];

[1:v]
scale=1080:1920:force_original_aspect_ratio=decrease,
pad=1080:1920:(ow-iw)/2:(oh-ih)/2,
format=rgba,
eq=saturation=1.4:contrast=1.1,
colorbalance=rs=0.08:gs=0.04:bs=-0.05[fx];

color=black:s=1080x1920,
drawtext=fontfile=${FONT}:text='HAPPY BIRTHDAY':fontsize=120:fontcolor=white:x=(w-text_w)/2:y=(h/2)-260:enable='between(t,0,6)',
drawtext=fontfile=${FONT}:text='${RECEIVER_NAME}':fontsize=110:fontcolor=white:x=(w-text_w)/2:y=(h/2)-260:enable='between(t,6,12)',
drawtext=fontfile=${FONT}:text='${MSG1}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=(h/2)-40:enable='between(t,12,16)',
drawtext=fontfile=${FONT}:text='${MSG2}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=(h/2)+20:enable='between(t,16,20)',
drawtext=fontfile=${FONT}:text='${MSG3}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=(h/2)+80:enable='between(t,20,24)',
drawtext=fontfile=${FONT}:text='${MSG4}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=(h/2)+140:enable='gte(t,24)',
format=gray[mask];

[mask]boxblur=14:2[glowmask];

[fx][glowmask]alphamerge[glow];
[fx][mask]alphamerge[textfx];

color=white@0.45:s=1080x1920,
noise=alls=18:allf=t+u,
format=rgba[confetti];

[bg][confetti]overlay=0:0[tmp1];
[tmp1][glow]overlay=0:0[tmp2];
[tmp2][textfx]overlay=0:0
"
-map 0:v
-map 2:a
-af "afade=t=in:st=0:d=2,afade=t=out:st=28:d=2"
-shortest
-t 30
-r 30
-preset ultrafast
-crf 28
-pix_fmt yuv420p
"${OUTPUT_FILE}"
`;


console.log("Running FFmpeg…");

exec(ffmpegCmd, async (err, stdout, stderr) => {
  if (err) {
    console.error("❌ FFmpeg failed");
    console.error(stderr);
    process.exit(1);
  }

  console.log("✅ Render SUCCESS");

  // ---------- R2 UPLOAD ----------
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const buffer = fs.readFileSync(OUTPUT_FILE);
  const key = `renders/birthday_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.mp4`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "video/mp4",
    })
  );

  console.log("🎉 UPLOAD SUCCESS");
  console.log("PUBLIC LINK:", `${process.env.R2_PUBLIC_BASE}/${key}`);
  process.exit(0);
});
