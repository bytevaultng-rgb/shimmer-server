const express = require('express');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.get('/ffmpeg-version', (req, res) => {
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      return res.status(500).send('FFmpeg not found or error: ' + err.message);
    }
    res.send({
      message: 'FFmpeg is available',
      sampleFormats: Object.keys(formats).slice(0, 5)
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
