const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

// Load JSON config
const configPath = path.join(__dirname, "config", "sample_config.json");
const originalConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Ensure renders folder exists
const rendersDir = path.join(__dirname, "renders");
if (!fs.existsSync(rendersDir)) {
  fs.mkdirSync(rendersDir);
}

// Helper to build FFmpeg filter_complex for all text regions
function buildFilterComplex(config) {
  const width = config.resolution.split("x")[0];
  const height = config.resolution.split("x")[1];
  const duration = config.duration;

  const filterParts = [];
  const overlayParts = [];

  config.texts.forEach((t, idx) => {
    const maskLabel = `mask_${idx}`;
    const rawLabel = `text_${idx}_raw`;
    const animLabel = `text_${idx}`;

    // Text mask
    filterParts.push(
      `color=c=black:s=${width}x${height}:d=${duration},format=gray,` +
        `drawtext=fontfile=fonts/${t.font}:text='${t.text}':fontsize=${t.size}:x=${t.x}:y=${t.y}[${maskLabel}]`
    );

    // Alphamerge effect
    const effectFile = t.effect.includes(".mp4")
      ? t.effect
      : `effects/${t.effect}.mp4`;
    filterParts.push(`[${idx + 1}:v][${maskLabel}]alphamerge[${rawLabel}]`);

    // Animation
    const s = t.animation.start;
    const d = t.animation.duration;
    let animFilter = "";

    switch (t.animation.type) {
      case "fade_in":
        animFilter = `[${rawLabel}]fade=t=in:st=${s}:d=${d}[${animLabel}]`;
        break;
      case "scale_fade_in":
        animFilter = `[${rawLabel}]fade=t=in:st=${s}:d=${d},scale=` +
          `iw*(0.8+0.2*min((t-${s})/${d}\\,1)):` +
          `ih*(0.8+0.2*min((t-${s})/${d}\\,1))[${animLabel}]`;
        break;
      case "slide_up":
        animFilter = `[${rawLabel}]fade=t=in:st=${s}:d=${d}[${animLabel}]`;
        break;
      default:
        animFilter = `[${rawLabel}]copy[${animLabel}]`;
    }

    filterParts.push(animFilter);

    // Overlay chain
    if (idx === 0) {
      overlayParts.push(`[0:v][${animLabel}]overlay=0:0[tmp0]`);
    } else if (idx < config.texts.length - 1) {
      overlayParts.push(`[tmp${idx - 1}][${animLabel}]overlay=0:0[tmp${idx}]`);
    } else {
      overlayParts.push(`[tmp${idx - 1}][${animLabel}]overlay=0:0[outv]`);
    }
  });

  return filterParts.join(";") + ";" + overlayParts.join(";");
}

// Build FFmpeg command
function buildFFmpegCommand(config, renderType) {
  const inputs = [`-i ${config.template}`];
  config.texts.forEach((t) => {
    const effectFile = t.effect.includes(".mp4")
      ? t.effect
      : `effects/${t.effect}.mp4`;
    inputs.push(`-i ${effectFile}`);
  });

  const filterComplex = buildFilterComplex(config);

  // Output file in renders folder
  let output = renderType === "preview"
    ? path.join(rendersDir, "preview.mp4")
    : path.join(rendersDir, "final.mp4");

  let extraFlags = "-pix_fmt yuv420p -c:v libx264";

  if (renderType === "preview") {
    extraFlags += " -preset ultrafast -crf 28 -s 1280x720 -t 4";
  } else {
    extraFlags += " -preset slow -crf 18";
  }

  const cmd = `ffmpeg -y ${inputs.join(" ")} -filter_complex "${filterComplex}" ${extraFlags} ${output}`;
  return cmd;
}

// Run both preview and final sequentially
async function runRender() {
  const renderTypes = ["preview", "final"];

  for (const type of renderTypes) {
    console.log(`\n--- Rendering ${type.toUpperCase()} ---`);
    const cmd = buildFFmpegCommand(originalConfig, type);
    console.log("Running FFmpeg command:\n", cmd);

    await new Promise((resolve, reject) => {
      const process = exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error(`Error during ${type} render:`, err);
          reject(err);
          return;
        }
        console.log(`FFmpeg ${type} output:\n`, stdout);
        console.error(`FFmpeg ${type} errors (if any):\n`, stderr);
        console.log(`${type.toUpperCase()} render complete!`);
        resolve();
      });
    });
  }

  console.log("\nAll renders completed! Check the 'renders/' folder.");
}

// Start rendering
runRender();
