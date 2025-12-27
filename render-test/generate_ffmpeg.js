/**
 * PRODUCTION – Premium Sparkle Birthday Video
 * PNG + MP4 Background + Alpha Sparkle Mask
 */

import { spawn, execSync } from "child_process";
import fs from "fs";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION = 48;

const ROOT = process.cwd();
const OUTPUT_DIR = "/var/data/renders";
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const OUTPUT = `premium_${Date.now()}.mp4`;

/* ---------- ASSETS ---------- */
const PNG_TEMPLATE = "/work/templates/HBD.png";
const VIDEO_BG     = "/work/templates/background.mp4";
const PARTICLES    = "/work/effects/golden_particles_alpha.mov";
const MUSIC        = "/work/effects/music.mp3";

const FONT_TITLE = "/work/fonts/PlayfairDisplay-ExtraBoldItalic.ttf";
const FONT_BODY  = "/work/fonts/Tourney-Bold.ttf";
const FONT_SIGN  = "/work/fonts/GreatVibes-Regular.ttf";

/* ---------- TEXT ---------- */
const TITLE = "HAPPY BIRTHDAY";
const RECEIVER = "IFEOMA THE BLESSED";
const SENDER = "— From Maryam";

const LINES = [
  "Your vision lights the way for many.",
  "You lead with purpose, strength, and heart.",
  "Thank you for inspiring excellence through action.",
  "May this new year bring joy, growth, and victories.",
  "Wishing you fulfillment, impact, and greatness.",
  "May your influence shape generations."
];

/* ---------- LAYOUT ---------- */
const Y_TITLE = 360;
const Y_NAME  = 445;
const BODY_START = 610;
const LINE_GAP = 50;

/* ---------- FFmpeg (Docker) ---------- */
const cmd = [
  "run", "--rm",
  "-v", `${ROOT}/render-test:/work`,
  "-v", `${OUTPUT_DIR}:/out`,
  "jrottenberg/ffmpeg:latest",

  // Inputs
  "-loop", "1", "-i", PNG_TEMPLATE,
  "-stream_loop", "-1", "-i", VIDEO_BG,
  "-stream_loop", "-1", "-i", PARTICLES,
  "-i", MUSIC,

  "-filter_complex",
  `
/* ---- BASE BACKGROUND ---- */
[1:v]scale=${WIDTH}:${HEIGHT},format=rgba[vidbg];
[0:v]scale=${WIDTH}:${HEIGHT},format=rgba[pngbg];
[vidbg][pngbg]overlay=0:0:format=auto[bg];

/* ---- SPARKLE SOURCE ---- */
[2:v]scale=${WIDTH}:${HEIGHT},format=rgba[fx];

/* ---- TEXT MASK ---- */
color=black@0.0:s=${WIDTH}x${HEIGHT}:d=${DURATION},

drawtext=fontfile=${FONT_TITLE}:
text='${TITLE}':
fontsize=62:
fontcolor=white:
x=(w-text_w)/2:
y=${Y_TITLE}:
enable='gte(t,1)',

drawtext=fontfile=${FONT_BODY}:
text='${RECEIVER}':
fontsize=82:
fontcolor=white:
x=(w-text_w)/2:
y=${Y_NAME}:
enable='gte(t,2)',

${LINES.map((line, i) => `
drawtext=fontfile=${FONT_BODY}:
text='${line}':
fontsize=38:
fontcolor=white:
x=(w-text_w)/2:
y=${BODY_START + i * LINE_GAP}:
enable='gte(t,${6 + i * 2})'
`).join(",")},

drawtext=fontfile=${FONT_SIGN}:
text='${SENDER}':
fontsize=42:
fontcolor=white@0.9:
x=(w-text_w)/2:
y=${BODY_START + LINES.length * LINE_GAP + 70}:
enable='gte(t,24)',

format=gray[textmask];

/* ---- MASK + COMPOSE ---- */
[fx][textmask]alphamerge[textfx];
[bg][textfx]overlay=0:0,
unsharp=5:5:0.8,
fade=t=out:st=${DURATION-3}:d=3[v];

/* ---- AUDIO ---- */
[3:a]atrim=0:${DURATION},asetpts=N/SR[a]
`.replace(/\n/g, ""),

  "-map", "[v]",
  "-map", "[a]",
  "-r", `${FPS}`,
  "-t", `${DURATION}`,
  "-c:v", "libx264",
  "-crf", "21",
  "-preset", "medium",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  "-shortest",
  `/out/${OUTPUT}`
];

/* ---------- RUN ---------- */
console.log("🎬 Rendering PREMIUM sparkle video…");
const ff = spawn("docker", cmd, { stdio: "inherit" });

ff.on("exit", (code) => {
  if (code !== 0) {
    console.error("❌ Render failed");
    return;
  }

  console.log("✅ Render complete");

  const localPath = `${OUTPUT_DIR}/${OUTPUT}`;
  const bucket = "bytevaultng-previews";
  const region = "eu-north-1";
  const key = `previews/${OUTPUT}`;

  console.log("⬆️ Uploading preview to S3…");
  execSync(
    `aws s3 cp ${localPath} s3://${bucket}/${key} --region ${region}`,
    { stdio: "inherit" }
  );

  console.log("🎉 PREVIEW READY");
  console.log(`🔗 https://${bucket}.s3.${region}.amazonaws.com/${key}`);
});
