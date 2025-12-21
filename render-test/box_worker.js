/**
 * FFmpeg Worker – Production Box Reveal → Upload → Public Link
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
const CONFETTI  = path.join(EFFECTS, "confetti.mp4");
const FONT      = path.join(ROOT, "fonts", "Tourney-Bold.ttf");

const OUTPUT_DIR  = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "box_birthday.mp4");

// ---------- ENSURE DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------- VALIDATE ----------
for (const f of [BG, BOX_BASE, BOX_LID, CONFETTI, FONT]) {
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

[bg][box]overlay=
x=(W-w)/2:
y='-450+min(450,t*450)'
[scene1];

[lid]rotate='-PI/3*min(1,(t-0.8)/0.6)':c=none[lid_anim];
[scene1][lid_anim]overlay=
x=(W-w)/2:
y='-450+min(450,t*450)-160'
[scene2];

[3:v]scale=320:200,format=rgba,trim=1.2:4,setpts=PTS-STARTPTS[conf];
[scene2][conf]overlay=
x=(W-320)/2:
y='(H/2)-40':
enable='gte(t,1.2)'
[scene3];

[scene3]drawtext=
fontfile=${FONT}:
text=HAPPY\\ BIRTHDAY:
fontsize=96:
fontcolor=white:
x=(w-text_w)/2:
y='(h/2+120)-(t-1.6)*120':
alpha='if(gte(t,1.6),(t-1.6)/0.8,0)':
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
  const key = `renders/box_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.mp4`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "video/mp4",
    })
  );

  const publicUrl = `${process.env.R2_PUBLIC_BASE}/${key}`;

  console.log("🎉 UPLOAD SUCCESS");
  console.log("PUBLIC LINK:", publicUrl);

  process.exit(0);
});
