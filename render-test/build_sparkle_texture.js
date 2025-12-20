const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

// ---------- SAFETY GUARD (prevents reruns) ----------
if (process.env.SPARKLE_BUILT === "true") {
  console.log("Sparkle already built. Exiting.");
  process.exit(0);
}

// ---------- PATH ----------
const OUT = path.join(__dirname, "effects", "sparkle_loop.mp4");

if (!fs.existsSync(path.dirname(OUT))) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
}

// ---------- FFMPEG COMMAND ----------
const ffmpegCmd = `
ffmpeg -y \
-f lavfi -i color=white:s=2048x2048:d=4 \
-filter_complex "
noise=alls=25:allf=t,
eq=contrast=2.8:brightness=-0.1,
curves=master='0/0 0.4/0.12 1/1',
format=rgb24
" \
-r 30 \
-movflags +faststart \
"${OUT}"
`.replace(/\n/g, " ");

console.log("Building sparkle texture…");

exec(ffmpegCmd, (err, stdout, stderr) => {
  if (err) {
    console.error(stderr);
    process.exit(1);
  }

  if (!fs.existsSync(OUT)) {
    console.error("Sparkle build failed: output missing");
    process.exit(1);
  }

  console.log("Sparkle texture created:", OUT);
  console.log("👉 Set SPARKLE_BUILT=true in Render env and redeploy");
  process.exit(0);
});
