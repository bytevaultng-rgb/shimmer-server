/**
 * FFmpeg Worker – Box Open → Confetti → Text → Upload to R2 → Print Public Link
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

const ASSETS  = path.join(ROOT, "assets");
const EFFECTS = path.join(ROOT, "effects");

const BG        = path.join(ASSETS, "bg.png");
const BOX_BASE  = path.join(ASSETS, "box_base.png");
const BOX_LID   = path.join(ASSETS, "box_lid.png");
const FONT = path.join(ROOT, "fonts", "Tourney-Bold.ttf");

const CONFETTI  = path.join(EFFECTS, "confetti.mp4");

const OUTPUT_DIR  = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "box_birthday.mp4");

// ---------- ENSURE DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------- VALIDATE INPUT ----------
for (const f of [BG, BOX_BASE, BOX_LID, FONT, CONFETTI]) {
  if (!fs.existsSync(f)) {
    console.error("Missing file:", f);
    process.exit(1);
  }
}

// ---------- FFMPEG ----------
const ffmpegCmd = `
ffmpeg -y
-loop 1 -i "${BG}"
-i "${BOX_BASE}"
-i "${BOX_LID}"
-i "${CONFETTI}"
-filter_complex "
[0:v]scale=1080:1350,format=rgba[bg];
[1:v]scale=320:-1,format=rgba[box];
[2:v]scale=320:-1,format=rgba[lid];

[lid]rotate=-0.6:c=none[lid_rot];

[bg][box]overlay=(W-w)/2:(H-h)/2[scene1];
[scene1][lid_rot]overlay=(W-w)/2:(H-h)/2-180:enable='gte(t,1)'[scene2];

[3:v]scale=1080:1350,format=rgba,trim=1:4,setpts=PTS-STARTPTS[conf];
[scene2][conf]overlay=0:0:enable='gte(t,1)'[scene3];

[scene3]drawtext=
fontfile=${FONT}:
text=HAPPY\\ BIRTHDAY:
fontsize=96:
fontcolor=white:
x=(w-text_w)/2:
y=(h/2-200):
alpha='if(gte(t,1.5),(t-1.5)/0.8,0)':
shadowcolor=black:
shadowx=3:
shadowy=3
"
-t 4
-preset ultrafast
-crf 28
-pix_fmt yuv420p
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

console.log("▶ Running FFmpeg…");

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
  const key = `renders/box_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.mp4`;

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
