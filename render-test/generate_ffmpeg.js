const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// ---- SAFETY GATE (Option B) ----
if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  process.exit(0);
}

// ---- Paths ----
const base = "/opt/render/project/src/render-test";

const TEMPLATE = path.join(base, "templates/HBD.png");
const SPARKLE = path.join(base, "effects/sparkle.mp4");
const FONT = path.join(base, "fonts/Tourney-Bold.ttf");
const OUTDIR = path.join(base, "renders");
const OUTPUT = path.join(OUTDIR, "sparkle_text_test.mp4");

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);

// ---- Hardcoded test text ----
const TEXT = "HAPPY BIRTHDAY";

// ---- FFmpeg pipeline ----
const cmd = `
ffmpeg -y \
-loop 1 -i "${TEMPLATE}" \
-i "${SPARKLE}" \
-filter_complex "
[1:v]format=rgba[fx];
color=black:s=1280x720,format=gray,
drawtext=fontfile='${FONT}':
text='${TEXT}':
fontsize=120:
x=(w-text_w)/2:
y=(h-text_h)/2[mask];
[fx][mask]alphamerge[txt];
[0:v][txt]overlay=0:0
" \
-t 4 \
-preset ultrafast \
-crf 28 \
-pix_fmt yuv420p \
"${OUTPUT}"
`.replace(/\n/g, " ");

console.log("Running FFmpeg:\n", cmd);

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error("FFmpeg failed:", stderr);
    process.exit(1);
  }
  console.log("Sparkle text render complete:", OUTPUT);
});
