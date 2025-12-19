const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

if (process.env.RUN_RENDER !== "true") {
  console.log("RUN_RENDER not set. Worker idle.");
  setInterval(() => {}, 1000 * 60 * 60); // keep worker alive
  return;
}

const templatePath = path.join(__dirname, "templates", "HBD.png");
const outputDir = path.join(__dirname, "renders");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const outputPath = path.join(outputDir, "baseline-test.mp4");

const cmd = `ffmpeg -y -loop 1 -i "${templatePath}" -vf scale=1280:720 -t 4 -preset ultrafast -crf 28 -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;

console.log("Running FFmpeg:\n", cmd);

exec(cmd, (err) => {
  if (err) {
    console.error("FFmpeg failed:", err);
    process.exit(1);
  }

  console.log("FFmpeg finished successfully");
  process.exit(0);
});
