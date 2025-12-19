/**
 * FFmpeg Worker – Safe Option B
 * - Runs ONLY when RUN_RENDER=1
 * - Creates output directories
 * - Verifies output file existence
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------- SAFETY GATE ----------
if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  process.exit(0);
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
const requiredFiles = [
  { name: "Template", path: TEMPLATE },
  { name: "Font", path: FONT },
  { name: "Sparkle effect", path: SPARKLE }
];

for (const f of requiredFiles) {
  if (!fs.existsSync(f.path)) {
    console.error(`Missing ${f.name}:`, f.path);
    process.exit(1);
  }
}

// ---------- FFMPEG COMMAND ----------
const ffmpegCmd = `
ffmpeg -y \
-loop 1 -i "${TEMPLATE}" \
-i "${SPARKLE}" \
-filter_complex "
  [1:v]format=rgba[fx];
  color=black:s=1280x720,format=gray,
  drawtext=fontfile='${FONT}':
    text='HAPPY BIRTHDAY':
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
"${OUTPUT_FILE}"
`;

// ---------- RUN ----------
console.log("Running FFmpeg:\n", ffmpegCmd);

exec(ffmpegCmd, (error, stdout, stderr) => {
  if (error) {
    console.error("FFmpeg execution failed");
    console.error(stderr);
    process.exit(1);
  }

  // ---------- VERIFY OUTPUT ----------
  if (fs.existsSync(OUTPUT_FILE)) {
    const size = fs.statSync(OUTPUT_FILE).size;
    if (size > 0) {
      console.log("Sparkle/glitter render SUCCESS");
      console.log("Output:", OUTPUT_FILE);
      console.log("File size:", size, "bytes");
    } else {
      console.error("Output file created but size is 0 bytes");
      process.exit(1);
    }
  } else {
    console.error("FFmpeg finished but output file was NOT created");
    process.exit(1);
  }

  // ---------- CLEAN EXIT ----------
  process.exit(0);
});
