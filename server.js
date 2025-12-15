// server.js
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple root route
app.get('/', (req, res) => {
  res.send('Server is running. Try /ffmpeg-test to check FFmpeg.');
});

// Route to test FFmpeg version
app.get('/ffmpeg-test', (req, res) => {
  ffmpeg()._getFfmpegVersion((err, version) => {
    if (err) {
      console.error('FFmpeg error:', err);
      return res.status(500).send(`FFmpeg not working: ${err.message}`);
    }
    res.send(`FFmpeg is working! Version: ${version}`);
  });
});

// Optional: simple video conversion test (comment out if unnecessary)
app.get('/convert', (req, res) => {
  const inputPath = path.join(__dirname, 'input.mp4'); // replace with your test video
  const outputPath = path.join(__dirname, 'output.mp4');

  ffmpeg(inputPath)
    .output(outputPath)
    .on('end', () => res.send('Video converted successfully!'))
    .on('error', (err) => {
      console.error('Conversion error:', err);
      res.status(500).send(`Conversion failed: ${err.message}`);
    })
    .run();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
