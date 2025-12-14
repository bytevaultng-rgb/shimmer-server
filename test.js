// test.js
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

// === CONFIG ===
const videosDir = path.join(__dirname, 'public', 'videos');
fs.mkdirSync(videosDir, { recursive: true });
const outPath = path.join(videosDir, `test_output.mp4`);

const backgroundPath = path.join(__dirname, 'templates', 'christmas1.mp4'); // your template
const sparklePath = path.join(__dirname, 'sparkle.png'); // sparkle overlay
const fontPath = path.join(__dirname, 'fonts', 'Orbitron-Regular.ttf').replace(/\\/g, '/');
const text = 'HELLO WORLD'; // optional overlay text

if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

console.log('Using FFmpeg:', path.join(__dirname, 'bin', 'ffmpeg'));

ffmpeg(backgroundPath)
  .setFfmpegPath(path.join(__dirname, 'bin', 'ffmpeg'))
  .input(sparklePath)
  .complexFilter([
    `[0:v][1:v] overlay=0:0:format=auto`,
    `drawtext=fontfile='${fontPath}':text='${text}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2`
  ])
  .outputOptions('-movflags faststart', '-pix_fmt yuv420p', '-r 25')
  .on('start', (cmd) => console.log('FFmpeg start:', cmd))
  .on('stderr', console.error)
  .on('error', (err) => console.error('FFmpeg error:', err))
  .on('end', () => console.log('Video created at', outPath))
  .save(outPath);
