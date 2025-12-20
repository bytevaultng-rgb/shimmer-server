/**
 * FFmpeg Background Worker – RUN ONCE, NO REPEAT
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------- PATHS ----------
const ROOT = __dirname;

const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const FONT = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const SPARKLE = path.join(ROOT, "effects", "sparkle.mp4");

const OUTPUT_DIR = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sparkle_text_test.mp4");

// 🔒 LOCK FILE (THIS STOPS REPEATS)
const LOCK_FILE = path.join(ROOT, ".render.lock");

// ---------- STOP IF ALREADY RAN ----------
if (fs.existsSync(LOCK_FILE)) {
  console.log("Render already completed. Worker idle.");
  setInterval(() => {}, 60_000); // stay alive
  return;
}

// ---------- ENSURE DIR ----------
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------- VALIDATE FILES ----------
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
  [1:v]scale=1280:720,format=rgba[fx];
  color=black:s=1280x720,format=gray,
    drawtext=fontfile='${FONT}':
      text='HAPPY BIRTHDAY':
      fontsize=120:
      x=(w-text_w)/2:
      y=(h-text_h)/2[mask];
  [fx][mask]alphamerge[txt];
  [0:v]scale=1280:720[bg];
  [bg][txt]overlay=0:0
"
-t 4
-preset ultrafast
-crf 28
-pix_fmt yuv420p
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

console.log("Running FFmpeg…");

exec(ffmpegCmd, (err, stdout, stderr) => {
  if (err) {
    console.error("FFmpeg failed");
    console.error(stderr);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_FILE) || fs.statSync(OUTPUT_FILE).size === 0) {
    console.error("Output not created");
    process.exit(1);
  }

  // 🔒 CREATE LOCK
  fs.writeFileSync(LOCK_FILE, new Date().toISOString());

  console.log("✅ Render SUCCESS");
  console.log("Output:", OUTPUT_FILE);

  // ✅ STAY IDLE (Render will NOT rerun FFmpeg)
  console.log("Worker idle.");
  setInterval(() => {}, 60_000);
});

