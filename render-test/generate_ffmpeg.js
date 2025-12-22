/**
 * FFmpeg Worker – Sparkle Mask + Gold Pulse Glow + Confetti + Music (Portrait)
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

(async () => {
  if (!process.env.RUN_RENDER) {
    console.log("RUN_RENDER not set. Worker idle.");
    setInterval(() => {}, 60_000);
    return;
  }

  const ROOT = __dirname;

  const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
  const FONT     = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
  const SPARKLE  = path.join(ROOT, "effects", "sparkle.mp4");
  const MUSIC    = path.join(ROOT, "effects", "music.mp3");

  const OUTPUT_DIR  = path.join(ROOT, "renders");
  const OUTPUT_FILE = path.join(OUTPUT_DIR, "birthday_sparkle.mp4");

  const RECEIVER = "IFEOMA";

  // Messages are manually wrapped (this is the correct FFmpeg way)
  const MSG1 = "Your vision lights\nthe way for many.";
  const MSG2 = "You lead with purpose,\nstrength, and heart.";
  const MSG3 = "Thank you for inspiring\nexcellence through action.";
  const MSG4 = "May this new year bring joy,\ngrowth, and victories.";

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const f of [TEMPLATE, FONT, SPARKLE, MUSIC]) {
    if (!fs.existsSync(f)) {
      console.error("Missing file:", f);
      process.exit(1);
    }
  }

  const ffmpegCmd = `
ffmpeg -y \
-loop 1 -i "${TEMPLATE}" \
-stream_loop -1 -i "${SPARKLE}" \
-stream_loop -1 -i "${MUSIC}" \
-filter_complex "
[0:v]
scale=1080:1920:force_original_aspect_ratio=decrease,
pad=1080:1920:(ow-iw)/2:(oh-ih)/2,
format=rgba[bg];

[1:v]
scale=1080:1920:force_original_aspect_ratio=decrease,
pad=1080:1920:(ow-iw)/2:(oh-ih)/2,
format=rgba[fx];

color=black:s=1080x1920,

drawtext=fontfile=${FONT}:text='HAPPY BIRTHDAY':
fontsize=120:fontcolor=white:
x=(w-text_w)/2:y=(h/2)-220:
enable='between(t,0,6)',

drawtext=fontfile=${FONT}:text='${RECEIVER}':
fontsize=110:fontcolor=white:
x=(w-text_w)/2:y=(h/2)-140:
enable='between(t,6,12)',

# ===== STATIC MESSAGE BLOCK (NO MOVEMENT) =====
drawtext=fontfile=${FONT}:text='${MSG1}':
fontsize=44:fontcolor=white:line_spacing=10:
x=(w-text_w)/2:y=(h/2)-20:
alpha='if(between(t,12,16),(t-12)/1, if(between(t,16,27),1,0))',

drawtext=fontfile=${FONT}:text='${MSG2}':
fontsize=44:fontcolor=white:line_spacing=10:
x=(w-text_w)/2:y=(h/2)+30:
alpha='if(between(t,16,20),(t-16)/1, if(between(t,20,27),1,0))',

drawtext=fontfile=${FONT}:text='${MSG3}':
fontsize=44:fontcolor=white:line_spacing=10:
x=(w-text_w)/2:y=(h/2)+80:
alpha='if(between(t,20,24),(t-20)/1, if(between(t,24,27),1,0))',

drawtext=fontfile=${FONT}:text='${MSG4}':
fontsize=44:fontcolor=white:line_spacing=10:
x=(w-text_w)/2:y=(h/2)+130:
alpha='if(between(t,24,27),(t-24)/1,1)',

format=gray[mask];

[mask]boxblur=30:5[blurred];
color=#d4af37@0.45:s=1080x1920,
geq=a='0.35+0.15*sin(2*PI*t/6)'[gold];
[gold][blurred]alphamerge[textglow];

[fx][mask]alphamerge[textfx];

# ===== VISIBLE LUXURY CONFETTI =====
color=white@0.55:s=1080x1920,
noise=alls=28:allf=t+u,
boxblur=2:1,
format=rgba[confetti];


[bg][confetti]overlay=0:0[tmp1];
[tmp1][textglow]overlay=0:0[tmp2];
[tmp2][textfx]overlay=0:0
" \
-map 0:v \
-map 2:a \
-shortest \
-t 30 \
-r 30 \
-preset ultrafast \
-crf 28 \
-pix_fmt yuv420p \
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

  console.log("Running FFmpeg…");

  exec(ffmpegCmd, async (err) => {
    if (err) {
      console.error("❌ FFmpeg failed");
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
})();
