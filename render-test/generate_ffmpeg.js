const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ===== Option B safety gate =====
if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  process.exit(0);
}

// ===== Paths =====
const ROOT = path.resolve(__dirname);
const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const SPARKLE = path.join(ROOT, "effects", "sparkle.mp4");
const FONT = path.join(ROOT, "fonts", "Pacifico-Regular.ttf");
const OUTDIR = path.join(ROOT, "renders");
const OUTPUT = path.join(OUTDIR, "sparkle_text_test.mp4");

// ===== Ensure output dir =====
if (!fs.existsSync(OUTDIR)) {
  fs.mkdirSync(OUTDIR, { recursive: true });
}

// ===== Hard-coded test text =====
const TEXT = "Happy Birthday Maryam";

// ===== FFmpeg command =====
const cmd = `
ffmpeg -y \
-loop 1 -i "${TEMPLATE}" \
-stream_loop -1 -i "${SPARKLE}" \
-filter_complex "
[0:v]scale=1280:720,format=rgba[bg];

[bg]drawtext=
fontfile='${FONT}':
text='${TEXT}':
fontsize=96:
fontcolor=white:
x=(w-text_w)/2:
y=(h-text_h)/2,
format=gray[text_mask];

[1:v]scale=1280:720,format=rgba[sparkle];

[sparkle][text_mask]alphamerge[sparkle_text];

[bg][sparkle_text]overlay=0:0[out]
" \
-map "[out]" \
-t 4 \
-c:v libx264 \
-pix_fmt yuv420p \
-preset ultrafast \
-crf 28 \
"${OUTPUT}"
`;

console.log("Running sparkle text render...");
execSync(cmd, { stdio: "inherit" });
console.log("Sparkle text render complete:", OUTPUT);
