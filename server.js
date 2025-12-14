// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
app.use(bodyParser.json());

// === CONFIG ===
const SERVICE_URL = (process.env.SERVICE_URL || '').trim().replace(/\/$/, '');
const PORT = process.env.PORT || 3000;

// Set Linux FFmpeg path explicitly
const ffmpegPath = path.join(__dirname, 'bin', 'ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

// ROOT HEALTH CHECK
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'shimmer-server',
    message: 'Server is running'
  });
});

// In-memory job store
const jobs = {};

// Render endpoint
app.post('/render', async (req, res) => {
  const payload = req.body || {};
  if (!payload.template) return res.status(400).json({ error: 'template is required' });

  const jobId = randomBytes(6).toString('hex');
  jobs[jobId] = { status: 'processing', createdAt: Date.now(), videoUrl: null };

  generateVideo(jobId, payload)
    .then((url) => {
      jobs[jobId].status = 'done';
      jobs[jobId].videoUrl = url;
      console.log(`Job ${jobId} done -> ${url}`);
    })
    .catch((err) => {
      console.error('Render failed', err);
      jobs[jobId].status = 'failed';
      jobs[jobId].error = err && err.message ? err.message : String(err);
    });

  res.status(202).json({ jobId });
});

// Check job status
app.get('/render/status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// Serve videos folder
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos')));

// === VIDEO GENERATION ===
async function generateVideo(jobId, payload) {
  const videosDir = path.join(__dirname, 'public', 'videos');
  fs.mkdirSync(videosDir, { recursive: true });
  const outPath = path.join(videosDir, `${jobId}.mp4`);

  const duration = Number(payload.duration) || 5;
  const width = payload.width || 640;
  const height = payload.height || 360;
  const text = payload.text || '';

  const templatePath = path.join(__dirname, 'templates', payload.template);
  const sparklePath = path.join(__dirname, 'sparkle.png');

  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  return new Promise((resolve, reject) => {
    let command;

    if (fs.existsSync(templatePath)) {
      command = ffmpeg(templatePath).loop(duration);
    } else {
      command = ffmpeg().input(`color=black:size=${width}x${height}:duration=${duration}`).inputFormat('lavfi');
    }

    if (fs.existsSync(sparklePath)) {
      command = command.input(sparklePath).loop(1);
      const textFilter = `[0:v]drawtext=fontfile='${path.join(__dirname, 'fonts', 'Orbitron-Regular.ttf')}':text='${text}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2[textmask];[1:v]scale=${width}:${height}[sparkleScaled];[sparkleScaled][textmask]alphamerge[sparkleText];[0:v][sparkleText]overlay=format=auto`;
      command = command.complexFilter(textFilter);
    } else if (text) {
      const fontPath = path.join(__dirname, 'fonts', 'Orbitron-Regular.ttf');
      command = command.videoFilter(`drawtext=fontfile='${fontPath}':text='${text}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2`);
    }

    command
      .outputOptions('-pix_fmt yuv420p', '-r 25')
      .duration(duration)
      .save(outPath)
      .on('start', (cmdline) => console.log('FFmpeg start:', cmdline))
      .on('stderr', console.error)
      .on('error', reject)
      .on('end', () => {
        const url = `${SERVICE_URL || `http://localhost:${PORT}`}/videos/${jobId}.mp4`;
        resolve(url);
      });
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on 0.0.0.0:${PORT}`);
  if (!SERVICE_URL) console.log(`TIP: Set SERVICE_URL env for correct video URLs.`);
});
