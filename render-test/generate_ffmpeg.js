const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// ================= CONFIG =================
const RUN_RENDER = process.env.RUN_RENDER === "1";

if (!RUN_RENDER) {
  console.log("RUN_RENDER not set. Worker idle.");
  process.exit(0);
}

const BASE_DIR = path.resolve(__dirname);
const TEMPLATE = path.join(BASE_DIR, "templates", "HBD.png");
const RENDERS_DIR = path.join(BASE_DIR, "renders");
const OUTPUT = path.join(RENDERS_DIR, "phase1-preview.mp4");

// Ensure renders dir exists
if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

// ===== TEXT DEFINITIONS (PHASE 1) =====
const texts = [
  {
    text: "HAPPY BIRTHDAY",
    font: "Tourney-Bold.ttf",
    size: 120,
    y: 200,
    anim: "fade"
  },
  {
    text: "Maryam",
    font: "Pacifico-Regular.ttf",
    size: 96,
    y: 360,
    anim: "slide"
  }
];

// ===== BUILD FILTER =====
let filterParts = [];
let lastLabel = "base";

filterParts.push(
  `[0:v]scale=1280:720,format=yuv420p[base]`
);

texts.forEach((t, i) => {
  const label = `txt${i}`;
  const fontPath = path.join(BASE_DIR, "fonts", t.font).replace(/\\/g, "/");

  let animFilter = "";

  if (t.anim === "fade") {
    animFilter = `fade=t=in:st=0:d=1`;
  } else if (t.anim === "slide") {
    animFilter = `fade=t=in:st=0:d=1`;
  }

  filterParts.push(
    `[${lastLabel}]drawtext=fontfile='${fontPath}':text='${t.text}':fontsize=${t.size}:x=(w-text_w)/2:y=${t.y}:fontcolor=white,${animFilter}[${label}]`
  );

  lastLabel = label;
});

const filterComplex = filterParts.join(";");

// ===== FFmpeg COMMAND (SAFE) =====
const cmd = `
ffmpeg -y
-loop 1 -i "${TEMPLATE}"
-vf "${filterComplex}"
-t 4
-preset ultrafast
-crf 28
-c:v libx264
-pix_fmt yuv420p
"${OUTPUT}"
`.replace(/\n/g, " ").trim();

console.log("Running FFmpeg:\n", cmd);

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error("FFmpeg failed:", stderr);
    process.exit(1);
  }
  console.log("FFmpeg completed successfully");
});
