const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "effects", "sparkle_loop.mp4");

if (!fs.existsSync(path.dirname(OUT))) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
}

const cmd = `
ffmpeg -y \
-f lavfi -i nullsrc=s=2048x2048:d=4 \
-filter_complex "
noise=alls=35:allf=t,
eq=contrast=3.4:brightness=0.18,
colorchannelmixer=rr=1.15:gg=0.9:bb=0.55,
tblend=all_mode=average,
gblur=sigma=1.5,
format=yuv420p
" \
-r 30 \
-movflags +faststart \
"${OUT}"
`.replace(/\n/g, " ");

console.log("Building sparkle texture…");

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error(stderr);
    process.exit(1);
  }
  console.log("Sparkle texture created:", OUT);
});
