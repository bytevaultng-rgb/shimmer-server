const express = require('express');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Shimmer server running');
});

app.get('/ffmpeg-check', (req, res) => {
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      return res.status(500).json({
        ok: false,
        error: err.message
      });
    }

    res.json({
      ok: true,
      ffmpeg: 'available',
      sampleFormats: Object.keys(formats).slice(0, 10)
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
