const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const templatePath = path.join(__dirname, "templates", "HBD.png");
const outputDir = path.join(__dirname, "renders");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const outputPath = path.join(outputDir, "baseline-test.mp4");

const cmd = `ffmpeg -y -loop 1 -i "${templatePath}" -vf scale=1280:720 -t 4 -preset ultrafast -crf 28 -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;

console.log("Running FFmpeg:\n", cmd);

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error("FFmpeg failed:", err);
    process.exit(1); // tell Render this run failed
  }

  console.log("FFmpeg finished successfully");
  process.exit(0); // tell Render this run is DONE
});
