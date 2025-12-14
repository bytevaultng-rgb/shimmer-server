// scripts/postinstall.js
const { execSync } = require('child_process');
const os = require('os');

if (os.platform() !== 'win32') {
  try {
    execSync('chmod +x ./bin/ffmpeg', { stdio: 'inherit' });
    console.log('FFmpeg binary made executable.');
  } catch (err) {
    console.error('Failed to chmod FFmpeg:', err);
  }
} else {
  console.log('Skipping chmod on Windows.');
}
