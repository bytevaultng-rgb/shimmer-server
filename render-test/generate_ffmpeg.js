/**
 * FINAL STABLE – Sparkle Masked Text + Confetti + Music (Portrait)
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const FONT     = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const SPARKLE  = path.join(ROOT, "effects", "sparkle.mp4");
const CONFETTI = path.join(ROOT, "effects", "confetti_v2.mp4");
const MUSIC    = path.join(ROOT, "effects", "music.mp3");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

const OUTPUT_DIR  = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "birthday_final.mp4");

const RECEIVER = "IFEOMA";

const MSG1 = "Your vision lights the way for many.";
const MSG2 = "You lead with purpose, strength, and heart.";
const MSG3 = "Thank you for inspiring excellence through action.";
const MSG4 = "May this new year bring joy, growth, and victories.";
const MSG5 = "Wishing you fulfillment, impact, and greatness.";

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const ffmpegCmd = `
ffmpeg -y
-loop 1 -i "${TEMPLATE}"
-i "${SPARKLE}"
-i "${CONFETTI}"
-stream_loop -1 -i "${MUSIC}"
-filter_complex "
[0:v]scale=1080:1920,format=rgba[bg];
[1:v]scale=1080:1920,format=rgba[fx];
[2:v]
scale=1080:1920,
chromakey=0x00FF00:0.25:0.1,
format=rgba[conf];

color=black:s=1080x1920,

# --- TITLE ---
drawtext=fontfile=${FONT}:text='HAPPY BIRTHDAY':
fontsize=110:fontcolor=white:
x=(w-text_w)/2:y=360:
enable='between(t,0,6)',

# --- NAME ---
drawtext=fontfile=${FONT}:text='${RECEIVER}':
fontsize=96:fontcolor=white:
x=(w-text_w)/2:y=440:
enable='between(t,6,12)',


drawtext=fontfile=${FONT}:text='${MSG1}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=580:
enable='between(t,12,16)',

drawtext=fontfile=${FONT}:text='${MSG2}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=630:
enable='between(t,16,20)',

drawtext=fontfile=${FONT}:text='${MSG3}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=680:
enable='between(t,20,24)',

drawtext=fontfile=${FONT}:text='${MSG4}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=730:
enable='between(t,24,28)',

drawtext=fontfile=${FONT}:text='${MSG5}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=780:
enable='between(t,28,32)',


drawtext=fontfile=${FONT}:text='HAPPY BIRTHDAY':
fontsize=100:fontcolor=white:
x=(w-text_w)/2:y=320:
enable='gte(t,32)',

drawtext=fontfile=${FONT}:text='${RECEIVER}':
fontsize=88:fontcolor=white:
x=(w-text_w)/2:y=390:
enable='gte(t,32)',

drawtext=fontfile=${FONT}:text='${MSG1}':
fontsize=34:fontcolor=white:
x=(w-text_w)/2:y=520:
enable='gte(t,32)',

drawtext=fontfile=${FONT}:text='${MSG2}':
fontsize=34:fontcolor=white:
x=(w-text_w)/2:y=565:
enable='gte(t,32)',

drawtext=fontfile=${FONT}:text='${MSG3}':
fontsize=34:fontcolor=white:
x=(w-text_w)/2:y=610:
enable='gte(t,32)',

drawtext=fontfile=${FONT}:text='${MSG4}':
fontsize=34:fontcolor=white:
x=(w-text_w)/2:y=655:
enable='gte(t,32)',

drawtext=fontfile=${FONT}:text='${MSG5}':
fontsize=34:fontcolor=white:
x=(w-text_w)/2:y=700:
enable='gte(t,32)',

format=gray[mask];


[fx][mask]alphamerge[textfx];
[bg][conf]overlay=0:0[tmp];
[tmp][textfx]overlay=0:0
"
-map 0:v
-map 3:a
-t 40
-r 30
-preset ultrafast
-crf 28
-pix_fmt yuv420p
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

console.log("▶ Rendering FINAL birthday video…");

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
  const key = `renders/birthday_${Date.now()}_${crypto
    .randomBytes(4)
    .toString("hex")}.mp4`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "video/mp4",
    })
  );

  const link = `${process.env.R2_PUBLIC_BASE}/${key}`;

  console.log("🎉 UPLOAD SUCCESS");
  console.log("PUBLIC LINK:", link);

  process.exit(0);
});
