/**
 * Luxury Box Open + Glow + Confetti + Text
 */

const { exec } = require("child_process");
const path = require("path");

const ASSETS = path.join(__dirname, "assets");
const EFFECTS = path.join(__dirname,"effects");
const OUTPUT  = path.join(__dirname, "happy_birthday_box.mp4");

// You can later replace this dynamically
const RECEIVER_NAME = "MARYAM";

const cmd = `
ffmpeg -y
-loop 1 -i "${ASSETS}/bg.png"
-i "${ASSETS}/box_base.png"
-i "${ASSETS}/box_lid.png"
-i "${EFFECTS}/confetti.mp4"
-filter_complex "
[0:v]scale=1080:1350,format=rgba[bg];
[1:v]scale=320:-1,format=rgba[box];
[2:v]scale=320:-1,format=rgba[lid];

[lid]rotate=
if(between(t,0.8,1.3),
-PI/3*(t-0.8)/0.5,
-PI/3):
c=none:ow=rotw(iw):oh=roth(ih),
translate=y=
if(between(t,0.8,1.3),
-140*(t-0.8)/0.5,
-140)
[lid_anim];

[bg][box]overlay=(W-w)/2:(H-h)/2[scene1];
[scene1][lid_anim]overlay=(W-w)/2:(H-h)/2-160[scene2];

[3:v]scale=1080:1350,format=rgba,trim=1.2:3.5,setpts=PTS-STARTPTS[conf];
[scene2][conf]overlay=0:0:enable='gte(t,1.2)'[scene3];

[scene3]
drawtext=
fontfile=${ASSETS}/fonts/PlayfairDisplay-Bold.ttf:
text='HAPPY BIRTHDAY':
fontsize=96:
fontcolor=white:
alpha='if(gte(t,1.5),(t-1.5)/0.6,0)':
x=(w-text_w)/2:
y='(h/2+120)-min(120,(t-1.5)*120)':
shadowcolor=black:
shadowx=3:
shadowy=3
[final]
"
-map "[final]"
-t 4
-r 30
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
