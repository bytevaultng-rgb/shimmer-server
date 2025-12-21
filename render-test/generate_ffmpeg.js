/**
 * Stable Luxury Box + Confetti + Text + Name Pop + Shimmer
 */

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const BASE    = __dirname;
const ASSETS  = path.join(BASE, "assets");
const EFFECTS = path.join(BASE, "effects");
const OUTPUT  = path.join(BASE, "happy_birthday_box.mp4");

// simple inputs (later from PHP)
const RECEIVER_NAME = "MARYAM";
const USE_SHIMMER = true; // toggle ON/OFF

const SHIMMER_INPUT = USE_SHIMMER
  ? `-i "${EFFECTS}/sparkle.mp4"`
  : "";

const SHIMMER_OVERLAY = USE_SHIMMER
  ? `
    [4:v]scale=1080:1350,format=rgba,trim=0:4,setpts=PTS-STARTPTS[sh];
    [scene4][sh]overlay=0:0:enable='gte(t,1.6)'[scene5];
  `
  : `
    [scene4]null[scene5];
  `;

const cmd = `
ffmpeg -y
-loop 1 -i "${ASSETS}/bg.png"
-i "${ASSETS}/box_base.png"
-i "${ASSETS}/box_lid.png"
-i "${EFFECTS}/confetti.mp4"
${SHIMMER_INPUT}
-filter_complex "
[0:v]scale=1080:1350,format=rgba[bg];
[1:v]scale=320:-1,format=rgba[box];
[2:v]scale=320:-1,format=rgba[lid];

[lid]rotate=-0.6:c=none[lid_rot];

[bg][box]overlay=(W-w)/2:(H-h)/2[scene1];
[scene1][lid_rot]overlay=(W-w)/2:(H-h)/2-180:enable='gte(t,1)'[scene2];

[3:v]scale=1080:1350,format=rgba,trim=1:4,setpts=PTS-STARTPTS[conf];
[scene2][conf]overlay=0:0:enable='gte(t,1)'[scene3];

[scene3]drawtext=
fontfile=${ASSETS}/fonts/PlayfairDisplay-Bold.ttf:
text='HAPPY BIRTHDAY':
fontsize=96:
fontcolor=white:
x=(w-text_w)/2:
y=(h/2-220):
alpha='if(gte(t,1.4),(t-1.4)/0.8,0)':
shadowcolor=black:
shadowx=3:
shadowy=3
[scene4];

[scene4]drawtext=
fontfile=${ASSETS}/fonts/PlayfairDisplay-Bold.ttf:
text='${RECEIVER_NAME}':
fontsize=72:
fontcolor=gold:
x=(w-text_w)/2:
y=(h/2-120):
alpha='if(gte(t,2.0),(t-2.0)/0.6,0)':
shadowcolor=black:
shadowx=2:
shadowy=2
[name];

${SHIMMER_OVERLAY}

"
-map "[scene5]"
-t 4
-r 25
-pix_fmt yuv420p
"${OUTPUT}"
`.replace(/\n/g, " ");

console.log("▶ Rendering luxury birthday video…");

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error("❌ FFmpeg failed");
    console.error(stderr);
    return;
  }
  console.log("✅ Render complete:", OUTPUT);
});
