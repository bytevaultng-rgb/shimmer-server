const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const input = path.join(root, "templates", "HBD.png");
const outputDir = path.join(root, "renders");
const output = path.join(outputDir, "baseline-test.mp4");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const cmd =
  `ffmpeg -y -loop 1 -i "${input}" ` +
  `-t 4 -c:v libx264 -pix_fmt yuv420p "${output}"`;

console.log("Running FFmpeg:\n", cmd);

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error("FFmpeg failed:");
    console.error(stderr);
    process.exit(1);
  }
  console.log("FFmpeg success!");
  console.log(stdout);
});
