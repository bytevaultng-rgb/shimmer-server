const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const os = require('os');
const fs = require('fs');

ffmpeg.setFfmpegPath('/usr/bin/ffmpeg'); // Render or Linux hosts

module.exports = function renderGlitter(inputFile, text, type = 'video') {
  return new Promise((resolve, reject) => {
    const outputFile = path.join(os.tmpdir(), `glitter-${Date.now()}.mp4`);

    const drawTextFilter = `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${text}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,0,5)'`;

    let command;
    if (type === 'image') {
      // Create video from static image
      command = ffmpeg(inputFile)
        .loop(5) // 5-second video
        .outputOptions('-y')
        .videoFilters(drawTextFilter)
        .size('1080x1920')
        .save(outputFile);
    } else {
      // Video input
      command = ffmpeg(inputFile)
        .outputOptions('-y')
        .videoFilters(drawTextFilter)
        .save(outputFile);
    }

    command
      .on('end', () => resolve(outputFile))
      .on('error', (err) => reject(err));
  });
};
