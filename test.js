const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Paths
const projectRoot = __dirname;
const fontPath = path.join(projectRoot, 'fonts', 'Orbitron-Regular.ttf');
const sparklePath = path.join(projectRoot, 'sparkle.png');
const videosDir = path.join(projectRoot, 'public', 'videos');

// Ensure videos folder exists
fs.mkdirSync(videosDir, { recursive: true });

const outputPath = path.join(videosDir, 'sparkle_text.mp4');

// Generate animated sparkle text directly
ffmpeg()
  // Black background via lavfi
  .input('color=black:size=640x360:duration=5')
  .inputFormat('lavfi')

  // Sparkle image
  .input(sparklePath)
  .loop(5) // repeat over 5 seconds

  // Apply complex filters
  .complexFilter([
    // 1. Create text mask
    {
      filter: 'drawtext',
      options: {
        fontfile: fontPath,
        text: 'HELLO WORLD',
        fontsize: 60,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: '(h-text_h)/2'
      },
      inputs: '0:v',
      outputs: 'textmask'
    },
    // 2. Scale sparkle
    {
      filter: 'scale',
      options: { w: 640, h: 360 },
      inputs: '1:v',
      outputs: 'sparkleScaled'
    },
    // 3. Merge sparkle with text mask
    {
      filter: 'alphamerge',
      inputs: ['sparkleScaled', 'textmask'],
      outputs: 'sparkleText'
    },
    // 4. Overlay on black background
    {
      filter: 'overlay',
      options: { format: 'auto' },
      inputs: ['0:v', 'sparkleText']
    }
  ])
  .outputOptions('-pix_fmt yuv420p', '-r 25', '-movflags faststart', '-t 5')
  .save(outputPath)
  .on('start', (cmd) => console.log('FFmpeg started:', cmd))
  .on('error', (err) => console.error('FFmpeg error:', err))
  .on('end', () => console.log('Sparkle text video generated at', outputPath));
