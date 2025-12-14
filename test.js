const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const ffmpegPath = path.join(__dirname, 'bin', 'ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

console.log('Using FFmpeg:', ffmpegPath);

const fontPath = path.join(__dirname, 'fonts', 'Orbitron-Regular.ttf');
const sparklePath = path.join(__dirname, 'sparkle.png');
const outputPath = path.join(__dirname, 'public', 'videos', 'sparkle_text.mp4');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

ffmpeg()
  // background
  .input('color=c=black:s=640x360:d=5')
  .inputFormat('lavfi')

  // sparkle texture
  .input(sparklePath)
  .loop(5)

  .complexFilter([
    // draw text alpha mask
    {
      filter: 'drawtext',
      inputs: '0:v',
      outputs: 'textmask',
      options: {
        fontfile: fontPath,
        text: 'HELLO WORLD',
        fontsize: 60,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: '(h-text_h)/2'
      }
    },
    // scale sparkle
    {
      filter: 'scale',
      inputs: '1:v',
      outputs: 'sparkleScaled',
      options: { w: 640, h: 360 }
    },
    // mask sparkle with text
    {
      filter: 'alphamerge',
      inputs: ['sparkleScaled', 'textmask'],
      outputs: 'sparkleText'
    },
    // overlay result
    {
      filter: 'overlay',
      inputs: ['0:v', 'sparkleText']
    }
  ])

  .outputOptions([
    '-r 25',
    '-movflags faststart'
  ])
  .output(outputPath)

  .on('start', cmd => console.log('FFmpeg started:', cmd))
  .on('end', () => console.log('Sparkle text video generated'))
  .on('error', err => console.error('FFmpeg error:', err.message))

  .run();
