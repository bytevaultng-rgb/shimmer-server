const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());
app.use('/renders', express.static(path.join(__dirname, 'renders')));

const fontPath = path.join(__dirname, 'fonts', 'DejaVuSans-Bold.ttf');

// Test route
app.get('/render-test', (req, res) => {
    res.json({ status: "ok", message: "Node server reachable!" });
});

// Render MP4 or static template
app.post('/render-video', (req, res) => {
    const { text, id, type } = req.body; // type: "mp4" or "static"
    const outputFile = path.join(__dirname, 'renders', `${id}.mp4`);

    if (type === 'static') {
        // Convert static PNG to MP4
        ffmpeg(path.join(__dirname, 'templates', 'static.png'))
            .loop(5) // 5 seconds
            .input(path.join(__dirname, 'templates', 'glitter.png'))
            .complexFilter([
                { filter: 'overlay', options: { x: '(main_w-overlay_w)/2', y: '(main_h-overlay_h)/2' } },
                { filter: 'drawtext', options: {
                    fontfile: fontPath,
                    text: text,
                    fontsize: 48,
                    fontcolor: 'white',
                    x: '(w-text_w)/2',
                    y: '(h-text_h)/2',
                    shadowcolor: 'black',
                    shadowx: 2,
                    shadowy: 2
                }}
            ])
            .output(outputFile)
            .on('end', () => res.json({ status: 'ok', url: `/renders/${id}.mp4` }))
            .on('error', err => res.status(500).json({ status: 'error', error: err.message }))
            .run();
    } else {
        // Video template
        ffmpeg(path.join(__dirname, 'templates', 'base.mp4'))
            .input(path.join(__dirname, 'templates', 'glitter.png'))
            .complexFilter([
                { filter: 'overlay', options: { x: '(main_w-overlay_w)/2', y: '(main_h-overlay_h)/2' } },
                { filter: 'drawtext', options: {
                    fontfile: fontPath,
                    text: text,
                    fontsize: 48,
                    fontcolor: 'white',
                    x: '(w-text_w)/2',
                    y: '(h-text_h)/2',
                    shadowcolor: 'black',
                    shadowx: 2,
                    shadowy: 2
                }}
            ])
            .output(outputFile)
            .on('end', () => res.json({ status: 'ok', url: `/renders/${id}.mp4` }))
            .on('error', err => res.status(500).json({ status: 'error', error: err.message }))
            .run();
    }
});

app.listen(PORT, () => console.log(`Shimmer server running on port ${PORT}`));
