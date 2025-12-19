/**
 * Background Worker Entrypoint
 * - NO web server
 * - Runs once per deploy
 * - Triggers FFmpeg worker safely
 * - Exits cleanly
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------- SAFETY ----------
if (!process.env.RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  process.exit(0);
}

// ---------- PATH ----------
const OUTPUT_FILE = path.join(
  __dirname,
  "render-test",
  "renders",
  "sparkle_text_test.mp4"
);

// ---------- CLEAN OLD OUTPUT ----------
if (fs.existsSync(OUTPUT_FILE)) {
  fs.unlinkSync(OUTPUT_FILE);
  console.log("Old render deleted");
}

// ---------- RUN RENDER ----------
console.log("Starting render job...");

exec(
  "node render-test/generate_ffmpeg.js",
  { env: process.env },
  (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    if (error) {
      console.error("Render failed");
      process.exit(1);
    }

    if (!fs.existsSync(OUTPUT_FILE)) {
      console.error("Render finished but output missing");
      process.exit(1);
    }

    const size = fs.statSync(OUTPUT_FILE).size;
    if (size === 0) {
      console.error("Output file is empty");
      process.exit(1);
    }

    console.log("✅ Render completed successfully");
    console.log("File size:", size, "bytes");

    // ---------- EXIT CLEAN ----------
    process.exit(0);
  }
);
