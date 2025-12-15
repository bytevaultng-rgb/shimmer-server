const { execSync } = require('child_process');

console.log('Server deploy test running...');
try {
  const output = execSync('ffmpeg -version', { encoding: 'utf8' });
  console.log('FFmpeg version:\n', output);
} catch (err) {
  console.error('FFmpeg not available:', err.message);
}
