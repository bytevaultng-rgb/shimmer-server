/**
 * One-time Sparkle Texture Builder (STANDARD)
 * Safe for Render FFmpeg 5.x
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "effects");
const OUT_FILE = path.join(OUT_DIR, "sparkle_loop.mp4");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const cmd = `
ffmpeg -y \
-f lavfi -i color=white:s=1920x1920:d=3 \
-filter_complex "
noise=alls=20:allf=t,
eq=contrast=2.2:brightness=-0.05,
colorchannelmixer=rr=1.05:gg=0.95:bb=0.7,
format=yuv420p
" \
-r 30 \
-movflags +faststart \
"${OUT_FILE}"
`.replace(/\\n/g, " ");

console.log("▶ Building sparkle texture…");

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error(stderr);
    process.exit(1);
  }

  if (!fs.existsSync(OUT_FILE)) {
    console.error("Sparkle texture not created");
    process.exit(1);
  }

  console.log("✅ Sparkle texture created:");
  console.log(OUT_FILE);
  process.exit(0);
});
