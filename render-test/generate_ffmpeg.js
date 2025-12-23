/**
 * FINAL STABLE – Sparkle Masked Text + Music (Portrait)
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

(async () => {
  if (!process.env.RUN_RENDER) {
    console.log("RUN_RENDER not set. Idle.");
    setInterval(() => {}, 60000);
    return;
  }

  const ROOT = __dirname;

  const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
  const FONT     = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
  const SPARKLE  = path.join(ROOT, "effects", "sparkle.mp4");
  const MUSIC    = path.join(ROOT, "effects", "music.mp3");
  const FONT_SCRIPT = path.join(ROOT, "fonts", "GreatVibes-Regular.ttf");
 
  const OUTPUT_DIR  = path.join(ROOT, "renders");
  const OUTPUT_FILE = path.join(OUTPUT_DIR, "birthday_final.mp4");

  const RECEIVER = "IFEOMA THE BLESSED";

  const MSG1 = "Your vision lights the way for many.";
  const MSG2 = "You lead with purpose, strength, and heart.";
  const MSG3 = "Thank you for inspiring excellence through action.";
  const MSG4 = "May this new year bring joy, growth, and victories.";
  const MSG5 = "Wishing you fulfillment, impact, and greatness.";
  const MSG6 = "May your impact continue to shape generations.";

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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
scale=1080:1920,
format=rgba[fx];

color=black:s=1080x1920,

drawtext=fontfile=${ROOT}/fonts/GreatVibes-Regular.ttf:
text='HAPPY BIRTHDAY':
fontsize=70:fontcolor=white:
x=(w-text_w)/2:y=500:
enable='gte(t,2)',

drawtext=fontfile=${FONT}:
text='${RECEIVER}':
fontsize=72:fontcolor=white:
x=(w-text_w)/2:y=590:
enable='gte(t,2)',

drawtext=fontfile=${FONT}:
text='${MSG1}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=600:
enable='gte(t,6)',

drawtext=fontfile=${FONT}:
text='${MSG2}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=650:
enable='gte(t,8)',

drawtext=fontfile=${FONT}:
text='${MSG3}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=700:
enable='gte(t,10)',

drawtext=fontfile=${FONT}:
text='${MSG4}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=750:
enable='gte(t,12)',

drawtext=fontfile=${FONT}:
text='${MSG5}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=800:
enable='gte(t,14)',

drawtext=fontfile=${FONT}:
text='${MSG6}':
fontsize=36:fontcolor=white:
x=(w-text_w)/2:y=850:
enable='gte(t,16)',

format=gray[textmask];

[fx][textmask]alphamerge[textfx];
[bg][textfx]overlay=0:0[outv]
" \
-map "[outv]" \
-map 2:a \
-af "afade=t=out:st=45:d=3"
-t 48 \
-r 30 \
-preset ultrafast \
-crf 28 \
-pix_fmt yuv420p \
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

  console.log("▶ Rendering FINAL birthday video…");

  exec(ffmpegCmd, async (err, stdout, stderr) => {
    if (stderr) console.log(stderr);

    if (err) {
      console.error("❌ FFmpeg failed");
      process.exit(1);
    }

    console.log("✅ Render SUCCESS:", OUTPUT_FILE);
    
     console.log("Using font:", FONT_SCRIPT);


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
