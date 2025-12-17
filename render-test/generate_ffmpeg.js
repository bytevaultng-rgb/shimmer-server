const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT = __dirname;
const configPath = path.join(ROOT, "config", "sample_config.json");
const rendersDir = path.join(ROOT, "renders");

// Ensure renders directory
if (!fs.existsSync(rendersDir)) {
  fs.mkdirSync(rendersDir);
}

// Load config
if (!fs.existsSync(configPath)) {
  console.error("Config not found:", configPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

if (!config.template) {
  console.error("Template not defined in config");
  process.exit(1);
}

const templatePath = path.join(ROOT, config.template);

if (!fs.existsSync(templatePath)) {
  console.error("Template file missing:", templatePath);
  process.exit(1);
}

const outputPath = path.join(rendersDir, "baseline-test.mp4");

const cmd = `
ffmpeg -y
-loop 1
-i "${templatePath}"
-t 4
-c:v libx264
-pix_fmt yuv420p
"${outputPath}"
`;

console.log("Running FFmpeg:\n", cmd);

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error("FFmpeg failed:");
    console.error(stderr);
    process.exit(1);
  }

  console.log("FFmpeg completed successfully");
  console.log("Output:", outputPath);
});
