/**
 * FFmpeg Render Worker
 * Premium Sparkling Text (LUMA-MASKED particles)
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------- SAFETY ----------
if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  setInterval(() => {}, 60_000);
  return;
}

// ---------- PATHS ----------
const ROOT = __dirname;

const TEMPLATE = path.join(ROOT, "templates", "HBD.png");
const FONT = path.join(ROOT, "fonts", "Tourney-Bold.ttf");
const PARTICLES = path.join(ROOT, "effects", "golden_particles_alpha.mov");

const OUTPUT_DIR = path.join(ROOT, "renders");
const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  `sparkle_${Date.now()}.mp4`
);

// ---------- ENSURE DIR ----------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------- VALIDATE INPUT ----------
for (const f of [TEMPLATE, FONT, PARTICLES]) {
  if (!fs.existsSync(f)) {
    console.error("Missing file:", f);
    process.exit(1);
  }
}

const TEXT = "HAPPY BIRTHDAY";

// ---------- FFMPEG ----------
const ffmpegCmd = `
ffmpeg -y \
-loop 1 -i "${TEMPLATE}" \
-stream_loop -1 -i "${PARTICLES}" \
 -filter_complex "
  [0:v]scale=1280:720,format=rgba[bg];
  [1:v]scale=1280:720,format=rgba[fx];

  color=black:s=1280x720,
  drawtext=fontfile=${FONT}:
    text=HAPPY\\ BIRTHDAY:
    fontsize=120:
    fontcolor=white:
    x=(w-text_w)/2:
    y=(h-text_h)/2,
  format=gray,
  eq=contrast=3.5:brightness=0.05[mask];

  [fx]format=gray,
      eq=contrast=2.2:brightness=0.1,
      gblur=sigma=0.6[fx_luma];

  [fx_luma][mask]alphamerge[textfx];

  [textfx]colorchannelmixer=rr=1.2:gg=0.95:bb=0.6[textgold];
  [textgold]gblur=sigma=14[glow];

  [bg][glow]overlay=0:0[tmp];
  [tmp][textgold]overlay=0:0
" \
-map 0:v \
-t 4 \
-pix_fmt yuv420p \
-movflags +faststart \
"${OUTPUT_FILE}"
`.replace(/\n/g, " ");

console.log("▶ Rendering premium sparkle text…");

exec(ffmpegCmd, (err, stdout, stderr) => {
  if (err) {
    console.error("❌ FFmpeg failed");
    console.error(stderr);
    process.exit(1);
  }

  console.log("✅ Render SUCCESS");
  console.log("OUTPUT:", OUTPUT_FILE);
  process.exit(0);
});
