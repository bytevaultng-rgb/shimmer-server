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
    setInterval(() => {}, 60000);
    return;
  }

  const ROOT = __dirname;

  const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
  const FONT     = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
  const SPARKLE  = path.join(ROOT, "effects", "sparkle.mp4");
  const CONFETTI = path.join(ROOT, "effects", "confetti.mp4");
  const MUSIC    = path.join(ROOT, "effects", "music.mp3");

  const OUTPUT_DIR  = path.join(ROOT, "renders");
  const OUTPUT_FILE = path.join(OUTPUT_DIR, "birthday_sparkle.mp4");

  const RECEIVER = "IFEOMA";

  const MSG1 = "Your vision lights the way for many.";
  const MSG2 = "You lead with purpose, strength, and heart.";
  const MSG3 = "Thank you for inspiring excellence through action.";
  const MSG4 = "May this new year bring joy, growth, and victories.";
  const MSG5 = "Wishing you fulfillment, impact, and continued greatness.";

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const f of [TEMPLATE, FONT, SPARKLE, CONFETTI, MUSIC]) {
    if (!fs.existsSync(f)) {
      console.error("Missing file:", f);
      process.exit(1);
    }
  }

  const ffmpegCmd = `
ffmpeg -y
-loop 1 -i "${TEMPLATE}"
-stream_loop -1 -i "${SPARKLE}"
-i "${CONFETTI}"
-stream_loop -1 -i "${MUSIC}"
-filter_complex "
[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=rgba[bg];
[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=rgba[fx];

color=black:s=1080x1920,
drawtext=fontfile=${FONT}:text='HAPPY BIRTHDAY':fontsize=110:fontcolor=white:x=(w-text_w)/2:y=360:enable='between(t,0,6)',
drawtext=fontfile=${FONT}:text='${RECEIVER}':fontsize=96:fontcolor=white:x=(w-text_w)/2:y=440:enable='between(t,6,12)',
drawtext=fontfile=${FONT}:text='${MSG1}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=580:enable='between(t,12,40)',
drawtext=fontfile=${FONT}:text='${MSG2}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=630:enable='between(t,16,40)',
drawtext=fontfile=${FONT}:text='${MSG3}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=680:enable='between(t,20,40)',
drawtext=fontfile=${FONT}:text='${MSG4}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=730:enable='between(t,24,40)',
drawtext=fontfile=${FONT}:text='${MSG5}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=780:enable='between(t,28,40)',
format=gray[mask];

[fx][mask]alphamerge[textfx];

[2:v]scale=1080:1920,format=rgba[conf];

[bg][conf]overlay=0:0[tmp];
[tmp][textfx]overlay=0:0,
zoompan=z='if(lte(t,36),1,1+0.002*(t-36))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':fps=30
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
