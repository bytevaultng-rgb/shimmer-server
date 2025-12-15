const ffmpeg = require('fluent-ffmpeg');

console.log('Server deploy test running...');

// Check FFmpeg version
ffmpeg.getAvailableFormats((err, formats) => {
  if (err) {
    console.error('FFmpeg not found or error:', err.message);
    process.exit(1);
  }
  console.log('FFmpeg is available. Sample formats:', Object.keys(formats).slice(0, 5)); // show 5 formats
  console.log('Test completed successfully.');
  process.exit(0);
});
