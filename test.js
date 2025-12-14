// test.js
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

// Explicit FFmpeg path
const ffmpegPath = path.join(__dirname, 'bin', 'ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

// Output folder
const videosDir = path.join(__dirname, 'public', 'videos');
fs.mkdirSync(videosDir, { recursive: true });

const jobId = 'testvideo';
const outPath = path.join(videosDir, `${jobId}.mp4`);

// Template and sparkle
const templatePath = path.join(__dirname, 'templates', 'christmas1.mp4'); // replace with your template
const sparklePath = path.join(__dirname, 'sparkle.png'); // optional

// Text to overlay
const text = 'HELLO WORLD';
const duration = 5;
const width = 640;
const height = 360;

let command;

// Use template if exists, otherwise black background
if (fs.existsSync(templatePath)) {
  command = ffmpeg(templatePath).loop(duration);
} else {
  command = ffmpeg().input(`color=black:size=${width}x${height}:duration=${duration}`).inputFormat('lavfi');
}

// Add sparkle overlay if it exists
if (fs.existsSync(sparklePath)) {
  command = command.input(sparklePath).loop(1);
  const textFilter = `[0:v][1:v] overlay=0:0:format=auto, drawtext=fontfile='${path.join(__dirname, 'fonts', 'Orbitron-Regular.ttf')}':text='${text}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2`;
  command = command.complexFilter(textFilter);
} else {
  const fontPath = path.join(__dirname, 'fonts', 'Orbitron-Regular.ttf');
  command = command.videoFilter(`drawtext=fontfile='${fontPath}':text='${text}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2`);
}

// Set output options
command
  .outputOptions('-pix_fmt yuv420p', '-r 25')
  .duration(duration)
  .save(outPath)
  .on('start', (cmdline) => console.log('FFmpeg start:', cmdline))
  .on('stderr', console.error)
  .on('error', (err) => console.error('FFmpeg error:', err))
  .on('end', () => console.log('Video generated:', outPath));
