const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Paths
const ROOT = __dirname;
const configPath = path.join(ROOT, "config", "sample_config.json");
const rendersDir = path.join(ROOT, "renders");

// Ensure renders folder exists
if (!fs.existsSync(rendersDir)) {
  fs.mkdirSync(rendersDir);
}

// Load config
if (!fs.existsSync(configPath)) {
  console.error("Config file not found:", configPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Validate template
if (!config.template) {
  console.error("No template specified in config");
  process.exit(1);
}

const templatePath = path.join(ROOT, config.template);

if (!fs.existsSync(templatePath)) {
  console.error("Template file does not exist:", templatePath);
  process.exit(1);
}

console.log("Using template:", templatePath);

// Output
const outputPath = path.join(rendersDir, "test-output.mp4");

// Simple FFmpeg command (NO text, NO effects yet)
const cmd = `
ffmpeg -y
-i "${templatePath}"
-t 4
-c:v libx264
-pix_fmt yuv420p
"${outputPath}"
`;

console.log("Running FFmpeg:\n", cmd);

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error("FFmpeg failed");
    console.error(stderr);
    process.exit(1);
  }

  console.log("FFmpeg finished successfully");
  console.log("Output saved to:", outputPath);
});
