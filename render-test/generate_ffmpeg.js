/**
 * FFmpeg Worker – Safe Option B (FINAL)
 * Sparkle / Glitter alpha-masked text test
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------- HARD IDLE BLOCK ----------
if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  setInterval(() => {}, 60_000); // stay alive forever
  return;
}

// ---------- PATHS ----------
const ROOT = __dirname;

const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const FONT = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const SPARKLE = path.join(ROOT, "effects", "sparkle.mp4");

const OUTPUT_DIR = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sparkle_text_test.mp4");

// ---------- ENSURE OUTPUT DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log("Created renders directory:", OUTPUT_DIR);
}

// ---------- VALIDATE INPUT FILES ----------
for (const f of [TEMPLATE, FONT, SPARKLE]) {
  if (!fs.existsSync(f)) {
    console.error("Missing file:", f);
    setInterval(() => {}, 60_000); // idle instead of exit
    return;
  }
}

// ---------- FFMPEG COMMAND ----------
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

// ---------- RUN ----------
console.log("Running FFmpeg:\n", ffmpegCmd);

exec(ffmpegCmd, (error, stdout, stderr) => {
  if (error) {
    console.error("FFmpeg execution failed");
    console.error(stderr);
    setInterval(() => {}, 60_000);
    return;
  }

  if (!fs.existsSync(OUTPUT_FILE) || fs.statSync(OUTPUT_FILE).size === 0) {
    console.error("Output file invalid");
    setInterval(() => {}, 60_000);
    return;
  }

  console.log("✅ Sparkle/glitter render SUCCESS");
  console.log("Output:", OUTPUT_FILE);
  console.log("File size:", fs.statSync(OUTPUT_FILE).size, "bytes");

  // 🔒 IMPORTANT: GO IDLE, DO NOT EXIT
  console.log("Worker finished job. Going idle.");
  setInterval(() => {}, 60_000);
});
